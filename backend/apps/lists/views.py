"""
Views for contact lists, contacts, column mappings, and activities.

Provides REST API endpoints for managing contact data.
"""
import csv
import io
import openpyxl
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from django.shortcuts import get_object_or_404
from django.db.models import F, OrderBy, Subquery, OuterRef, Case, When, Value, CharField
from django.db.models.expressions import RawSQL

from .models import ContactList, Contact, Activity
from .serializers import (
    ContactListSerializer,
    ContactListDetailSerializer,
    ContactListCreateSerializer,
    ContactSerializer,
    FileUploadSerializer,
    ActivitySerializer,
    ActivityCreateSerializer,
    ActivityUpdateSerializer,
    ExportRequestSerializer
)
from .permissions import IsOwner, IsContactListOwner, IsActivityOwnerOrReadOnly
from services.upload_service import UploadService
from services.parser_service import ParserService
from services.contact_service import ContactService
from services.activity_service import ActivityService
from services.geocoding_service import GeocodingService
from tasks.geocoding_tasks import geocode_contact_list


def _extract_columns_from_file(file) -> list[str]:
    """
    Extract column names from CSV or XLSX file header.

    Args:
        file: Uploaded file object

    Returns:
        list: Ordered list of column names from the file header

    Raises:
        ValueError: If file format is unsupported
    """
    ext = file.name.lower().split('.')[-1]
    file.seek(0)

    try:
        if ext == 'csv':
            content = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            return list(reader.fieldnames or [])
        elif ext in ['xlsx', 'xls']:
            workbook = openpyxl.load_workbook(file, read_only=True)
            sheet = workbook.active
            columns = [str(cell.value) if cell.value is not None else ''
                      for cell in sheet[1]]
            workbook.close()
            return columns
        else:
            return []
    finally:
        file.seek(0)


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

            # Extract column order from file header
            columns = _extract_columns_from_file(file)

            # Save the uploaded file
            contact_list.uploaded_file = file
            contact_list.metadata = contact_list.metadata or {}
            contact_list.metadata['file_name'] = file.name
            contact_list.metadata['file_size'] = file.size
            contact_list.metadata['total_rows'] = preview_data['total_rows']
            contact_list.metadata['column_order'] = columns
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

    @extend_schema(
        summary="Start geocoding contacts",
        description="Trigger asynchronous geocoding task for all contacts using configured address template. Returns task ID for progress tracking.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'force': {
                        'type': 'boolean',
                        'description': 'Re-geocode contacts that already have coordinates (default: false)'
                    }
                }
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'task_id': {'type': 'string', 'description': 'Celery task ID for progress tracking'},
                    'message': {'type': 'string', 'description': 'Confirmation message'},
                    'total_contacts': {'type': 'integer', 'description': 'Number of contacts to geocode'}
                }
            },
            400: {'description': 'Geocoding disabled, template not configured, or already processing'}
        },
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['post'], url_path='geocode')
    def geocode_contacts(self, request, pk=None):
        """
        Start geocoding task for contact list.

        Validates geocoding is enabled and template is configured before
        triggering async Celery task.

        Args:
            request: HTTP request with optional 'force' parameter
            pk: ContactList primary key

        Returns:
            Response with task_id, message, and total_contacts

        Errors:
            400: If geocoding disabled, template not configured, or already processing
        """
        contact_list = self.get_object()

        # Validate feature enabled
        if not GeocodingService.is_enabled():
            return Response(
                {'error': 'Geocoding feature is disabled. Enable GEOCODING_ENABLED in settings.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate template configured
        template = contact_list.metadata.get('geocoding_template')
        if not template or not GeocodingService.validate_template(template):
            return Response(
                {'error': 'Geocoding template not configured. Please configure address template in list settings.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already processing
        if contact_list.metadata.get('geocoding_status') == 'processing':
            return Response(
                {'error': 'Geocoding already in progress for this list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get force parameter
        force = request.data.get('force', False)

        # Count contacts to geocode
        contacts_queryset = contact_list.contacts.filter(is_deleted=False)
        if not force:
            contacts_queryset = contacts_queryset.exclude(data__has_key='latitude')

        total = contacts_queryset.count()

        if total == 0:
            return Response(
                {'message': 'No contacts to geocode. All contacts already have coordinates.', 'total_contacts': 0},
                status=status.HTTP_200_OK
            )

        # Start async task
        task = geocode_contact_list.delay(str(contact_list.id), force=force)

        return Response({
            'task_id': task.id,
            'message': f'Geocoding started for {total} contacts',
            'total_contacts': total
        })

    @extend_schema(
        summary="Get geocoding status",
        description="Check the status and progress of the geocoding task for this contact list.",
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'geocoding_status': {
                        'type': 'string',
                        'enum': ['idle', 'processing', 'completed', 'failed'],
                        'description': 'Current geocoding status'
                    },
                    'geocoding_progress': {
                        'type': 'object',
                        'description': 'Progress information (if processing)',
                        'properties': {
                            'current': {'type': 'integer'},
                            'total': {'type': 'integer'},
                            'percentage': {'type': 'number'}
                        }
                    },
                    'geocoding_results': {
                        'type': 'object',
                        'description': 'Final results (if completed)',
                        'properties': {
                            'total': {'type': 'integer'},
                            'success': {'type': 'integer'},
                            'failed': {'type': 'integer'},
                            'skipped': {'type': 'integer'}
                        }
                    },
                    'geocoding_started_at': {'type': 'string', 'format': 'date-time'},
                    'geocoding_completed_at': {'type': 'string', 'format': 'date-time'}
                }
            }
        },
        tags=["Contact Lists"]
    )
    @action(detail=True, methods=['get'], url_path='geocode-status')
    def geocode_status(self, request, pk=None):
        """
        Get current geocoding status and progress.

        Returns metadata with geocoding_status, progress, and results.

        Args:
            request: HTTP request
            pk: ContactList primary key

        Returns:
            Response with geocoding status, progress, and results from metadata
        """
        contact_list = self.get_object()

        return Response({
            'geocoding_status': contact_list.metadata.get('geocoding_status', 'idle'),
            'geocoding_progress': contact_list.metadata.get('geocoding_progress'),
            'geocoding_results': contact_list.metadata.get('geocoding_results'),
            'geocoding_started_at': contact_list.metadata.get('geocoding_started_at'),
            'geocoding_completed_at': contact_list.metadata.get('geocoding_completed_at'),
            'geocoding_error': contact_list.metadata.get('geocoding_error')
        })


@extend_schema_view(
    list=extend_schema(
        summary="List contacts",
        description="Get all contacts in a contact list with optional field-specific search and ordering.",
        parameters=[
            OpenApiParameter('search', str, description='Search query text'),
            OpenApiParameter('search_field', str, description='Specific JSONB field to search in (e.g., email, company). Required for search to work.'),
            OpenApiParameter('ordering', str, description='Field to order by. Prefix with - for descending (e.g., -company, first_name)'),
            OpenApiParameter('in_pipeline', str, description='Filter by pipeline status (true/false)'),
            OpenApiParameter('status', str, description='Comma-separated status values to filter by (not_contacted, in_working, dropped, converted)'),
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

        Supports search and ordering query parameters.
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
        search_field = self.request.query_params.get('search_field')
        if search:
            list_id = self.kwargs.get('list_pk') or queryset.first().list_id
            contact_list = ContactList.objects.get(id=list_id)
            queryset = ContactService.search_contacts(contact_list, search, search_field)

        # Filter for pipeline contacts if requested
        in_pipeline = self.request.query_params.get('in_pipeline')
        if in_pipeline == 'true':
            queryset = queryset.filter(in_pipeline=True)

        # Filter by status if requested
        status_param = self.request.query_params.get('status')
        if status_param:
            # Parse comma-separated status values
            requested_statuses = [s.strip() for s in status_param.split(',') if s.strip()]

            if requested_statuses:
                # Subquery to get the latest activity's result for each contact
                latest_activity = Activity.objects.filter(
                    contact=OuterRef('pk'),
                    is_deleted=False
                ).order_by('-created_at').values('result')[:1]

                # Annotate contacts with computed status based on latest activity result
                queryset = queryset.annotate(
                    latest_result=Subquery(latest_activity)
                ).annotate(
                    computed_status=Case(
                        # Map activity results to status values
                        When(latest_result='followup', then=Value('in_working')),
                        When(latest_result='no', then=Value('dropped')),
                        When(latest_result='lead', then=Value('converted')),
                        # No activities = not_contacted
                        default=Value('not_contacted'),
                        output_field=CharField()
                    )
                ).filter(computed_status__in=requested_statuses)

        # Apply ordering if provided
        ordering = self.request.query_params.get('ordering')
        if ordering:
            # Handle JSONB field ordering
            # Format: "field_name" for ASC or "-field_name" for DESC
            if ordering.startswith('-'):
                field_name = ordering[1:]
                descending = True
            else:
                field_name = ordering
                descending = False

            # Use CASE expression to detect numeric values and cast them
            # This allows proper numeric sorting (2 < 10) instead of string sorting ("10" < "2")
            # Regex pattern: optional minus, digits, optional decimal point and more digits
            numeric_sort = RawSQL(
                """
                CASE
                    WHEN data->>%s ~ '^-?[0-9]+\.?[0-9]*$'
                    THEN (data->>%s)::NUMERIC
                END
                """,
                (field_name, field_name)
            )

            # Fallback to string sorting for non-numeric values
            string_sort = RawSQL("data->>%s", (field_name,))

            # Order by numeric values first, then string values, with NULLs last
            queryset = queryset.order_by(
                OrderBy(numeric_sort, descending=descending, nulls_last=True),
                OrderBy(string_sort, descending=descending, nulls_last=True)
            )
        else:
            # Default ordering by creation date
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        ContactService.soft_delete_contact(instance)

    @extend_schema(
        summary="Toggle contact in/out of pipeline",
        description="Add or remove contact from active pipeline.",
        request=None,
        responses={200: ContactSerializer},
        tags=["Contacts"]
    )
    @action(detail=True, methods=['post'], url_path='toggle-pipeline')
    def toggle_pipeline(self, request, pk=None):
        """
        Toggle contact in_pipeline flag.

        Returns minimal response for performance (optimistic updates on frontend).
        """
        contact = self.get_object()
        contact.in_pipeline = not contact.in_pipeline
        # Only update specific fields for better performance
        contact.save(update_fields=['in_pipeline', 'updated_at'])

        # Return minimal data (not full serializer) - reduces payload from ~2-10KB to ~100 bytes
        return Response({
            'id': str(contact.id),
            'in_pipeline': contact.in_pipeline,
        })

    @extend_schema(
        summary="Bulk pipeline operations",
        description="Add all filtered contacts to pipeline or clear entire pipeline.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'action': {
                        'type': 'string',
                        'enum': ['add_filtered', 'clear_all'],
                        'description': 'add_filtered: add current filtered contacts to pipeline, clear_all: remove all from pipeline'
                    },
                    'search': {'type': 'string', 'description': 'Search query (for add_filtered)'},
                    'search_field': {'type': 'string', 'description': 'Field to search in (for add_filtered)'}
                },
                'required': ['action']
            }
        },
        responses={200: {'type': 'object', 'properties': {'updated_count': {'type': 'integer'}}}},
        tags=["Contacts"]
    )
    @action(detail=False, methods=['post'], url_path='bulk-pipeline')
    def bulk_pipeline(self, request, list_pk=None):
        """
        Bulk pipeline operations.

        Actions:
        - add_filtered: Add all currently filtered contacts to pipeline
        - clear_all: Remove all contacts from pipeline
        """
        action = request.data.get('action')

        if action not in ['add_filtered', 'clear_all']:
            return Response(
                {'error': 'Invalid action. Must be add_filtered or clear_all'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get base queryset
        list_id = list_pk or self.kwargs.get('list_pk')
        if list_id:
            contact_list = get_object_or_404(
                ContactList,
                id=list_id,
                owner=request.user
            )
            queryset = contact_list.contacts.filter(is_deleted=False)
        else:
            queryset = Contact.objects.filter(
                list__owner=request.user,
                is_deleted=False
            )

        if action == 'add_filtered':
            # Apply same filters as get_queryset
            search = request.data.get('search')
            search_field = request.data.get('search_field')

            if search and search_field:
                list_id_for_search = list_pk or queryset.first().list_id
                contact_list_for_search = ContactList.objects.get(id=list_id_for_search)
                queryset = ContactService.search_contacts(contact_list_for_search, search, search_field)

            # Update filtered contacts to in_pipeline=True
            updated_count = queryset.update(in_pipeline=True)

        elif action == 'clear_all':
            # Clear all contacts in the list
            updated_count = queryset.update(in_pipeline=False)

        return Response({'updated_count': updated_count})

    @extend_schema(
        summary="Export contacts to CSV",
        description="Export filtered contacts with selected fields to CSV",
        request=ExportRequestSerializer,
        responses={200: {'type': 'string', 'format': 'binary'}},
        tags=["Contacts"]
    )
    @action(detail=False, methods=['post'], url_path='export')
    def export_contacts(self, request, list_pk=None):
        """Export contacts to CSV with selected fields."""
        from django.http import HttpResponse, QueryDict
        from services.export_service import ExportService

        # Validate request data
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get export parameters
        fields = serializer.validated_data.get('fields', [])
        include_status = serializer.validated_data.get('include_status', False)
        include_activities = serializer.validated_data.get('include_activities_count', False)
        include_pipeline = serializer.validated_data.get('include_pipeline', False)

        # Temporarily inject filter parameters from POST body into query_params
        # so get_queryset() can apply them using existing logic
        original_query_params = request.query_params
        modified_query_params = QueryDict(mutable=True)
        modified_query_params.update(original_query_params)

        # Add filter parameters from request body
        if serializer.validated_data.get('search'):
            modified_query_params['search'] = serializer.validated_data['search']
        if serializer.validated_data.get('search_field'):
            modified_query_params['search_field'] = serializer.validated_data['search_field']
        if serializer.validated_data.get('in_pipeline') is not None:
            modified_query_params['in_pipeline'] = 'true' if serializer.validated_data['in_pipeline'] else 'false'
        if serializer.validated_data.get('status'):
            modified_query_params['status'] = serializer.validated_data['status']
        if serializer.validated_data.get('ordering'):
            modified_query_params['ordering'] = serializer.validated_data['ordering']

        # Temporarily replace query_params
        request._request.GET = modified_query_params

        # Apply filters using existing get_queryset logic
        queryset = self.get_queryset()

        # Restore original query_params
        request._request.GET = original_query_params

        # Generate CSV
        csv_content = ExportService.generate_csv(
            queryset,
            fields,
            include_status,
            include_activities,
            include_pipeline
        )

        # Return CSV file
        list_id = list_pk or self.kwargs.get('list_pk')
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="contacts_{list_id}.csv"'
        return response


@extend_schema_view(
    list=extend_schema(
        summary="List activities for a contact",
        description="Get all activities/comments for a contact. Only activities from contacts owned by the current user are returned.",
        tags=["Activities"]
    ),
    create=extend_schema(
        summary="Create a comment",
        description="Add a new comment to a contact. Author is automatically set to the current user.",
        tags=["Activities"]
    ),
    retrieve=extend_schema(
        summary="Get activity details",
        description="Get detailed information about a specific activity/comment.",
        tags=["Activities"]
    ),
    update=extend_schema(
        summary="Update comment",
        description="Update a comment. Only the author can edit their own comments. Edit history is tracked in metadata.",
        tags=["Activities"]
    ),
    partial_update=extend_schema(
        summary="Partially update comment",
        description="Partially update a comment. Only the author can edit their own comments.",
        tags=["Activities"]
    ),
    destroy=extend_schema(
        summary="Delete comment",
        description="Soft delete a comment. Only the author can delete their own comments.",
        tags=["Activities"]
    ),
)
class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Activity CRUD operations.

    Supports nested routes: /contacts/{contact_pk}/activities/
    Only returns activities from contacts owned by the current user.
    """
    permission_classes = [IsAuthenticated, IsActivityOwnerOrReadOnly]
    pagination_class = None  # Disable pagination - return all activities for a contact

    def get_queryset(self):
        """
        Return activities owned by the current user.

        If nested route (contact_pk), filter by that contact.
        Otherwise, return all activities from user's contacts.
        """
        contact_id = self.kwargs.get('contact_pk')
        if contact_id:
            contact = get_object_or_404(Contact, id=contact_id, list__owner=self.request.user)
            return ActivityService.get_contact_activities(contact, include_deleted=False)

        # Non-nested route: all activities from user's contacts
        return Activity.objects.filter(
            contact__list__owner=self.request.user,
            is_deleted=False
        ).select_related('contact', 'author').order_by('-created_at')

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            return ActivityCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ActivityUpdateSerializer
        return ActivitySerializer

    def perform_create(self, serializer):
        """
        Create activity with permission check.

        Ensures user owns the contact before allowing activity creation.
        """
        contact = serializer.validated_data['contact']
        if contact.list.owner != self.request.user:
            raise PermissionDenied("You don't own this contact")

        # Create via service and save the instance
        activity = ActivityService.create_activity(
            contact=contact,
            user=self.request.user,
            activity_type=serializer.validated_data['type'],
            result=serializer.validated_data['result'],
            date=serializer.validated_data.get('date'),
            content=serializer.validated_data.get('content', '')
        )
        # Assign to serializer instance so DRF can return it
        serializer.instance = activity

    def perform_update(self, serializer):
        """
        Update activity with permission check.

        Uses ActivityService to handle edit history and permissions.
        """
        try:
            activity = ActivityService.update_activity(
                activity=self.get_object(),
                user=self.request.user,
                activity_type=serializer.validated_data.get('type'),
                result=serializer.validated_data.get('result'),
                date=serializer.validated_data.get('date'),
                content=serializer.validated_data.get('content')
            )
            # Assign to serializer instance so DRF can return it
            serializer.instance = activity
        except (PermissionError, ValueError) as e:
            raise PermissionDenied(str(e))

    def perform_destroy(self, instance):
        """
        Soft delete activity.

        Uses ActivityService to handle soft delete with permissions.
        """
        try:
            ActivityService.delete_activity(activity=instance, user=self.request.user)
        except (PermissionError, ValueError) as e:
            raise PermissionDenied(str(e))

