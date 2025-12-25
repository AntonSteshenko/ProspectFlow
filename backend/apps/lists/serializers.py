"""
Serializers for contact lists, contacts, and column mappings.

Handles validation and serialization of JSONB data.
"""
from rest_framework import serializers
from .models import ContactList, Contact, ColumnMapping


class ColumnMappingSerializer(serializers.ModelSerializer):
    """
    Serializer for column mappings.

    Maps original CSV column names to standardized field names.
    """

    class Meta:
        model = ColumnMapping
        fields = ['id', 'original_column', 'mapped_field', 'created_at']
        read_only_fields = ['id', 'created_at']


class ContactSerializer(serializers.ModelSerializer):
    """
    Serializer for individual contacts.

    The 'data' field is JSONB and stores all contact information dynamically.
    No schema changes needed when adding new contact fields.
    """

    class Meta:
        model = Contact
        fields = ['id', 'list', 'data', 'created_at', 'updated_at', 'is_deleted']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_data(self, value):
        """
        Validate that data is a dictionary.

        Args:
            value: The JSONB data value

        Returns:
            dict: Validated data

        Raises:
            ValidationError: If data is not a dictionary
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Data must be a JSON object (dictionary).")
        return value


class ContactListSerializer(serializers.ModelSerializer):
    """
    Serializer for contact lists.

    Includes contact count and metadata JSONB field.
    """

    contact_count = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source='owner.email', read_only=True)

    class Meta:
        model = ContactList
        fields = [
            'id', 'name', 'owner', 'owner_email', 'status',
            'metadata', 'contact_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'owner_email', 'created_at', 'updated_at']

    def get_contact_count(self, obj):
        """Return count of non-deleted contacts."""
        return obj.contacts.filter(is_deleted=False).count()

    def validate_metadata(self, value):
        """
        Validate that metadata is a dictionary.

        Args:
            value: The JSONB metadata value

        Returns:
            dict: Validated metadata

        Raises:
            ValidationError: If metadata is not a dictionary
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be a JSON object (dictionary).")
        return value


class ContactListDetailSerializer(ContactListSerializer):
    """
    Detailed contact list serializer with nested contacts.

    Used for detail view to include recent contacts.
    """

    recent_contacts = serializers.SerializerMethodField()
    column_mappings = ColumnMappingSerializer(many=True, read_only=True)

    class Meta(ContactListSerializer.Meta):
        fields = ContactListSerializer.Meta.fields + ['recent_contacts', 'column_mappings']

    def get_recent_contacts(self, obj):
        """Return 10 most recent non-deleted contacts."""
        recent = obj.contacts.filter(is_deleted=False).order_by('-created_at')[:10]
        return ContactSerializer(recent, many=True).data


class ContactListCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new contact lists.

    Automatically sets the owner to the current user.
    """

    class Meta:
        model = ContactList
        fields = ['id', 'name', 'metadata']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create contact list with current user as owner."""
        validated_data['owner'] = self.context['request'].user
        validated_data['status'] = 'processing'  # Default status
        return super().create(validated_data)


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for file upload validation.

    Validates CSV/XLSX files and size limits.
    """

    file = serializers.FileField(
        help_text="CSV or XLSX file to upload (max 10MB)"
    )

    def validate_file(self, value):
        """
        Validate file type and size.

        Args:
            value: Uploaded file

        Returns:
            File: Validated file

        Raises:
            ValidationError: If file type or size is invalid
        """
        # Check file extension
        valid_extensions = ['.csv', '.xlsx', '.xls']
        ext = value.name.lower().split('.')[-1]
        if f'.{ext}' not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed types: {', '.join(valid_extensions)}"
            )

        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File too large. Maximum size is 10MB. Your file is {value.size / (1024 * 1024):.2f}MB."
            )

        return value
