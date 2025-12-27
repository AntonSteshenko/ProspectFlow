"""
Serializers for contact lists, contacts, and activities.

Handles validation and serialization of JSONB data.
"""
from rest_framework import serializers
from .models import ContactList, Contact, Activity



class ContactSerializer(serializers.ModelSerializer):
    """
    Serializer for individual contacts.

    The 'data' field is JSONB and stores all contact information dynamically.
    No schema changes needed when adding new contact fields.
    Includes calculated 'status' field based on latest activity.
    """

    activities_count = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = ['id', 'list', 'data', 'status', 'activities_count',
                  'created_at', 'updated_at', 'is_deleted']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def get_activities_count(self, obj):
        """Return count of non-deleted activities for this contact."""
        return obj.activities.filter(is_deleted=False).count()

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

    class Meta(ContactListSerializer.Meta):
        fields = ContactListSerializer.Meta.fields + ['recent_contacts']

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


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for Activity with author info and permissions.

    Includes computed fields for author display and permission checks.
    """

    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'contact', 'author', 'author_email', 'author_name',
            'type', 'result', 'date', 'content', 'metadata',
            'is_edited', 'is_deleted', 'created_at', 'updated_at',
            'can_edit', 'can_delete'
        ]
        read_only_fields = [
            'id', 'author', 'created_at', 'updated_at',
            'is_edited', 'is_deleted'
        ]

    def get_author_name(self, obj):
        """
        Get display name for author.

        Returns full name if available, otherwise email username, or 'System' for null authors.
        """
        if not obj.author:
            return 'System'
        if obj.author.first_name or obj.author.last_name:
            return f"{obj.author.first_name} {obj.author.last_name}".strip()
        return obj.author.email.split('@')[0]

    def get_can_edit(self, obj):
        """Check if current user can edit this activity."""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return (obj.author == request.user and not obj.is_deleted)

    def get_can_delete(self, obj):
        """Check if current user can delete this activity."""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return (obj.author == request.user and not obj.is_deleted)


class ActivityCreateSerializer(serializers.ModelSerializer):
    """
    Create activities - automatically sets author to current user.

    Requires contact, type, result fields. Date and content are optional.
    """

    class Meta:
        model = Activity
        fields = ['contact', 'type', 'result', 'date', 'content']

    def validate_date(self, value):
        """Allow any date (past or future)."""
        return value

    def create(self, validated_data):
        """Create activity with current user as author."""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class ActivityUpdateSerializer(serializers.ModelSerializer):
    """
    Update activities - allows updating type, result, date, and content.

    Stores edit history in metadata and sets is_edited flag.
    """

    class Meta:
        model = Activity
        fields = ['type', 'result', 'date', 'content']

    def update(self, instance, validated_data):
        """Update activity and store edit history in metadata."""
        from django.utils import timezone

        # Store edit history in metadata
        instance.metadata.setdefault('edit_history', [])
        instance.metadata['edit_history'].append({
            'timestamp': timezone.now().isoformat(),
            'previous_data': {
                'type': instance.type,
                'result': instance.result,
                'date': instance.date.isoformat() if instance.date else None,
                'content': instance.content
            }
        })

        instance.type = validated_data.get('type', instance.type)
        instance.result = validated_data.get('result', instance.result)
        instance.date = validated_data.get('date', instance.date)
        instance.content = validated_data.get('content', instance.content)
        instance.is_edited = True
        instance.save()
        return instance
