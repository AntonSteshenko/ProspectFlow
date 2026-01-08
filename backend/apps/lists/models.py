"""
Models for contact lists and contacts.

This module implements the core data models for ProspectFlow:
- ContactList: Container for imported contact lists with flexible metadata
- Contact: Individual contact records with JSONB schema
- ColumnMapping: User-defined mappings from CSV columns to contact fields
"""
import uuid
from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex


class ContactList(models.Model):
    """
    A contact list uploaded and owned by a user.

    Uses JSONB metadata field for extensibility without migrations.
    Status field tracks processing state (processing, completed, failed).
    """

    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Name of the contact list")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contact_lists',
        help_text="User who owns this contact list"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='processing',
        db_index=True,
        help_text="Processing status of the list"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible JSONB field for future extensions (file info, stats, etc.)"
    )
    uploaded_file = models.FileField(
        upload_to='uploads/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text="Uploaded CSV/XLSX file"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contact_lists'
        ordering = ['-created_at']
        verbose_name = 'Contact List'
        verbose_name_plural = 'Contact Lists'
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            GinIndex(fields=['metadata'], name='contactlist_metadata_gin'),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"


class Contact(models.Model):
    """
    Individual contact within a ContactList.

    Uses JSONB data field to store ALL contact fields dynamically.
    No schema changes needed when adding new contact fields.
    Supports soft delete via is_deleted flag.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list = models.ForeignKey(
        ContactList,
        on_delete=models.CASCADE,
        related_name='contacts',
        help_text="Contact list this contact belongs to"
    )
    data = models.JSONField(
        default=dict,
        help_text="All contact fields stored as JSONB (first_name, email, company, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag - deleted contacts remain in DB"
    )
    in_pipeline = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Contact is actively being worked on (pipeline)"
    )

    class Meta:
        db_table = 'contacts'
        ordering = ['-created_at']
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'
        indexes = [
            models.Index(fields=['list', '-created_at']),
            models.Index(fields=['list', 'is_deleted']),
            models.Index(fields=['list', 'in_pipeline']),
            GinIndex(fields=['data'], name='contact_data_gin'),
        ]

    @property
    def status(self) -> str:
        """
        Calculate contact status based on latest activity result.

        Returns:
            - 'not_contacted': No activities
            - 'in_working': Latest activity result = followup
            - 'dropped': Latest activity result = no
            - 'converted': Latest activity result = lead
        """
        latest_activity = self.activities.filter(is_deleted=False).order_by('-created_at').first()

        if not latest_activity:
            return 'not_contacted'

        result_to_status = {
            'followup': 'in_working',
            'no': 'dropped',
            'lead': 'converted',
        }

        return result_to_status.get(latest_activity.result, 'not_contacted')

    def __str__(self):
        # Try to display meaningful info from JSONB data
        # Handle corrupted data (if data is not a dict)
        if not isinstance(self.data, dict):
            return f"Contact {str(self.id)[:8]} (corrupted data)"

        first_name = self.data.get('first_name', '')
        last_name = self.data.get('last_name', '')
        email = self.data.get('email', '')

        if first_name or last_name:
            return f"{first_name} {last_name}".strip()
        elif email:
            return email
        else:
            return f"Contact {str(self.id)[:8]}"


class Activity(models.Model):
    """
    Activity/interaction record for a contact.

    Tracks contact interactions (calls, emails, visits) with results.
    Uses JSONB metadata for flexible data storage (e.g., edit history).
    Soft delete enabled for audit trail.
    """

    TYPE_CHOICES = [
        ('call', 'Call'),
        ('email', 'Email'),
        ('visit', 'Visit'),
        ('research', 'Research'),
    ]

    RESULT_CHOICES = [
        ('no', 'No'),
        ('followup', 'Follow-up'),
        ('lead', 'Lead'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="Contact this activity belongs to"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities',
        help_text="User who created this activity"
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        db_index=True,
        help_text="Type of activity"
    )
    result = models.CharField(
        max_length=20,
        choices=RESULT_CHOICES,
        db_index=True,
        help_text="Result of the activity"
    )
    date = models.DateField(
        null=True,
        blank=True,
        help_text="Activity date (when it happened or is scheduled)"
    )
    content = models.TextField(
        blank=True,
        help_text="Activity notes/description"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible JSONB field (edit history, event data, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag"
    )
    is_edited = models.BooleanField(
        default=False,
        help_text="True if this activity has been edited"
    )

    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
        indexes = [
            models.Index(fields=['contact', '-created_at']),
            models.Index(fields=['contact', 'type', '-created_at']),
            GinIndex(fields=['metadata'], name='activity_metadata_gin'),
        ]

    def __str__(self):
        author_name = self.author.email if self.author else 'System'
        return f"{self.get_type_display()} by {author_name} on {self.contact}"


