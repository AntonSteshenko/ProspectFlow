"""
Views for contact lists, contacts, and column mappings.

Provides REST API endpoints for managing contact data.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from django.shortcuts import get_object_or_404

from .models import ContactList, Contact, ColumnMapping
from .serializers import (
    ContactListSerializer,
    ContactListDetailSerializer,
    ContactListCreateSerializer,
    ContactSerializer,
    ColumnMappingSerializer,
    FileUploadSerializer
)
from .permissions import IsOwner, IsContactListOwner
from services.upload_service import UploadService
from services.parser_service import ParserService
from services.contact_service import ContactService


@extend_schema_view(
    list=extend_schema(
        summary="List contact lists",
        description="Get all contact lists owned by the authenticated user.",
        tags=["Contact Lists"]
    ),
    create=extend_schema(
        summary="Create contact list",
        description="Create a new empty contact list.",
        tags=["Contact Lists"]
    ),
    retrieve=extend_schema(
        summary="Get contact list details",
        description="Get detailed information about a specific contact list including recent contacts.",
        tags=["Contact Lists"]
    ),
    update=extend_schema(
        summary="Update contact list",
        description="Update contact list name or metadata.",
        tags=["Contact Lists"]
    ),
    partial_update=extend_schema(
        summary="Partially update contact list",
        description="Update specific fields of a contact list.",
        tags=["Contact Lists"]
    ),
    destroy=extend_schema(
        summary="Delete contact list",
        description="Delete a contact list and all its contacts.",
        tags=["Contact Lists"]
    ),
)
class ContactListViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ContactList CRUD operations.

    Automatically filters lists to show only those owned by the current user.
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        """Return only contact lists owned by the current user."""
        return ContactList.objects.filter(owner=self.request.user).select_related('owner')

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            return ContactListCreateSerializer
        elif self.action == 'retrieve':
            return ContactListDetailSerializer
        return ContactListSerializer

    @extend_schema(
        summary="Upload file to contact list",
        description="Upload a CSV or XLSX file and get a preview with column headers for mapping.",
        request=FileUploadSerializer,
        responses={200: dict},
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['post'], url_path='upload')
    def upload_file(self, request, pk=None):
        """
        Upload CSV/XLSX file and return preview with headers.

        Returns:
            - headers: List of column names
            - preview: First 5 rows
            - total_rows: Total number of rows in file
        """
        contact_list = self.get_object()

        # Validate file upload
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['file']

        try:
            # Get preview data
            preview_data = UploadService.parse_preview(file)

            # Save the uploaded file
            contact_list.uploaded_file = file
            contact_list.metadata = contact_list.metadata or {}
            contact_list.metadata['file_name'] = file.name
            contact_list.metadata['file_size'] = file.size
            contact_list.metadata['total_rows'] = preview_data['total_rows']
            contact_list.save()

            return Response({
                'message': 'File uploaded successfully',
                'headers': preview_data['headers'],
                'preview': preview_data['rows'],
                'total_rows': preview_data['total_rows'],
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Save column mappings",
        description="Save column mappings for the uploaded file.",
        request={'mappings': dict},
        responses={200: dict},
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['post'], url_path='save-mappings')
    def save_mappings(self, request, pk=None):
        """
        Save column mappings.

        Expects:
            mappings: Dict of {original_column: {type: mapped_field, customName: optional}}
        """
        contact_list = self.get_object()
        mappings = request.data.get('mappings', {})

        try:
            # Update existing mappings
            for original_column, mapping_data in mappings.items():
                mapped_field = mapping_data.get('type', '')
                custom_name = mapping_data.get('customName')

                # Update or create the mapping
                column_mapping, created = ColumnMapping.objects.update_or_create(
                    list=contact_list,
                    original_column=original_column,
                    defaults={
                        'mapped_field': mapped_field if mapped_field != 'custom' else (custom_name or ''),
                    }
                )

            return Response({
                'message': 'Mappings saved successfully',
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Import contacts from uploaded file",
        description="Import all contacts from uploaded file with all fields as JSONB.",
        responses={200: dict},
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['post'], url_path='import')
    def import_contacts(self, request, pk=None):
        """
        Import contacts from uploaded file.

        All CSV/XLSX columns are saved directly to JSONB data field.
        """
        contact_list = self.get_object()

        # Check if file was uploaded
        if not contact_list.uploaded_file:
            return Response(
                {'error': 'No file uploaded. Please upload a file first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse entire file
            file_path = contact_list.uploaded_file.path
            with open(file_path, 'rb') as f:
                data = ParserService.parse_file(f)

            # Delete existing contacts to avoid duplicates
            contact_list.contacts.all().delete()

            # Create contacts directly from data (no mapping needed)
            contacts_created = 0
            for row in data:
                # Save all fields as-is in JSONB
                Contact.objects.create(
                    list=contact_list,
                    data=row  # All columns stored in JSONB
                )
                contacts_created += 1

            # Update list status
            contact_list.status = 'completed'
            contact_list.save()

            return Response({
                'message': 'Contacts imported successfully',
                'contacts_created': contacts_created,
            })

        except Exception as e:
            contact_list.status = 'failed'
            contact_list.save()
            return Response(
                {'error': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Process uploaded file",
        description="Process the uploaded file with column mappings and create contacts.",
        request={'mappings': dict},
        responses={200: dict},
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['post'], url_path='process')
    def process_file(self, request, pk=None):
        """
        Process uploaded file with column mappings.

        Expects:
            - file: The file to process
            - mappings: Dict of {original_column: mapped_field}

        Creates Contact records and ColumnMapping records.
        """
        contact_list = self.get_object()

        # Validate file
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['file']
        mappings = request.data.get('mappings', {})

        try:
            # Parse entire file
            data = ParserService.parse_file(file)

            # Apply column mappings
            mapped_data = ParserService.apply_mappings(data, mappings)

            # Validate data
            valid_rows, invalid_rows = ParserService.validate_data(mapped_data)

            # Create contacts
            contacts = ContactService.create_contacts(contact_list, valid_rows)

            # Save column mappings
            for original, mapped in mappings.items():
                ColumnMapping.objects.update_or_create(
                    list=contact_list,
                    original_column=original,
                    defaults={'mapped_field': mapped}
                )

            return Response({
                'message': 'File processed successfully',
                'contacts_created': len(contacts),
                'invalid_rows': len(invalid_rows),
                'invalid_data': invalid_rows if invalid_rows else None,
            })

        except ValueError as e:
            contact_list.status = 'failed'
            contact_list.save()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema_view(
    list=extend_schema(
        summary="List contacts",
        description="Get all contacts in a contact list with optional search.",
        parameters=[
            OpenApiParameter('search', str, description='Search query'),
        ],
        tags=["Contacts"]
    ),
    retrieve=extend_schema(
        summary="Get contact details",
        description="Get detailed information about a specific contact.",
        tags=["Contacts"]
    ),
    update=extend_schema(
        summary="Update contact",
        description="Update contact JSONB data.",
        tags=["Contacts"]
    ),
    partial_update=extend_schema(
        summary="Partially update contact",
        description="Update specific fields in contact JSONB data.",
        tags=["Contacts"]
    ),
    destroy=extend_schema(
        summary="Delete contact",
        description="Soft delete a contact (sets is_deleted=True).",
        tags=["Contacts"]
    ),
)
class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact CRUD operations.

    Supports search via query parameter: ?search=query
    Only returns non-deleted contacts by default.
    """
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, IsContactListOwner]

    def get_queryset(self):
        """
        Return contacts owned by the current user.

        Supports search query parameter.
        """
        # Get contact list ID from URL if nested route
        list_id = self.kwargs.get('list_pk')

        if list_id:
            contact_list = get_object_or_404(
                ContactList,
                id=list_id,
                owner=self.request.user
            )
            queryset = contact_list.contacts.filter(is_deleted=False)
        else:
            # If not nested, get all contacts from user's lists
            queryset = Contact.objects.filter(
                list__owner=self.request.user,
                is_deleted=False
            ).select_related('list')

        # Apply search if provided
        search = self.request.query_params.get('search')
        if search:
            list_id = self.kwargs.get('list_pk') or queryset.first().list_id
            contact_list = ContactList.objects.get(id=list_id)
            queryset = ContactService.search_contacts(contact_list, search)

        return queryset.order_by('-created_at')

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        ContactService.soft_delete_contact(instance)


@extend_schema_view(
    list=extend_schema(
        summary="List column mappings",
        description="Get all column mappings for a contact list.",
        tags=["Column Mappings"]
    ),
    create=extend_schema(
        summary="Create column mapping",
        description="Create a new column mapping for a contact list.",
        tags=["Column Mappings"]
    ),
)
class ColumnMappingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ColumnMapping CRUD operations.

    Usually accessed as nested route under ContactList.
    """
    serializer_class = ColumnMappingSerializer
    permission_classes = [IsAuthenticated, IsContactListOwner]
    http_method_names = ['get', 'post', 'delete']  # No PUT/PATCH

    def get_queryset(self):
        """Return column mappings for lists owned by the current user."""
        list_id = self.kwargs.get('list_pk')

        if list_id:
            contact_list = get_object_or_404(
                ContactList,
                id=list_id,
                owner=self.request.user
            )
            return contact_list.column_mappings.all()

        return ColumnMapping.objects.filter(
            list__owner=self.request.user
        ).select_related('list')
