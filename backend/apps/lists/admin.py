"""
Admin configuration for lists app.

Provides admin interfaces for ContactList, Contact, ColumnMapping, and Activity models
with appropriate list displays, filters, and search capabilities.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import ContactList, Contact, ColumnMapping, Activity


@admin.register(ContactList)
class ContactListAdmin(admin.ModelAdmin):
    """Admin interface for ContactList model."""

    list_display = ['name', 'owner_email', 'status', 'contact_count', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at', 'updated_at']
    search_fields = ['name', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = [
        ('Basic Information', {
            'fields': ['id', 'name', 'owner', 'status']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse'],
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def owner_email(self, obj):
        """Display owner email."""
        return obj.owner.email
    owner_email.short_description = 'Owner'
    owner_email.admin_order_field = 'owner__email'

    def contact_count(self, obj):
        """Display number of contacts in this list."""
        count = obj.contacts.filter(is_deleted=False).count()
        return format_html('<strong>{}</strong>', count)
    contact_count.short_description = 'Contacts'

    def get_queryset(self, request):
        """Optimize queries with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('owner')


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    """Admin interface for Contact model."""

    list_display = ['contact_info', 'list_name', 'is_deleted', 'created_at', 'updated_at']
    list_filter = ['is_deleted', 'created_at', 'updated_at', 'list']
    search_fields = ['data', 'list__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = [
        ('Basic Information', {
            'fields': ['id', 'list', 'is_deleted']
        }),
        ('Contact Data (JSONB)', {
            'fields': ['data'],
            'description': 'All contact fields are stored as JSONB. Edit the JSON to modify contact information.',
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def contact_info(self, obj):
        """Display contact name or email."""
        return str(obj)
    contact_info.short_description = 'Contact'

    def list_name(self, obj):
        """Display contact list name."""
        return obj.list.name
    list_name.short_description = 'List'
    list_name.admin_order_field = 'list__name'

    def get_queryset(self, request):
        """Optimize queries with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('list', 'list__owner')


@admin.register(ColumnMapping)
class ColumnMappingAdmin(admin.ModelAdmin):
    """Admin interface for ColumnMapping model."""

    list_display = ['mapping_display', 'list_name', 'created_at']
    list_filter = ['created_at', 'list']
    search_fields = ['original_column', 'mapped_field', 'list__name']
    readonly_fields = ['id', 'created_at']
    ordering = ['list', 'created_at']

    fieldsets = [
        ('Basic Information', {
            'fields': ['id', 'list']
        }),
        ('Mapping', {
            'fields': ['original_column', 'mapped_field'],
            'description': 'Maps original CSV column names to standardized field names.',
        }),
        ('Timestamps', {
            'fields': ['created_at'],
            'classes': ['collapse'],
        }),
    ]

    def mapping_display(self, obj):
        """Display mapping in arrow format."""
        return format_html(
            '<span style="color: #666;">{}</span> → <strong>{}</strong>',
            obj.original_column,
            obj.mapped_field
        )
    mapping_display.short_description = 'Mapping'

    def list_name(self, obj):
        """Display contact list name."""
        return obj.list.name
    list_name.short_description = 'List'
    list_name.admin_order_field = 'list__name'

    def get_queryset(self, request):
        """Optimize queries with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('list', 'list__owner')


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Admin interface for Activity model."""

    list_display = ['activity_info', 'contact_info', 'author_info', 'type', 'is_edited', 'is_deleted', 'created_at']
    list_filter = ['type', 'is_deleted', 'is_edited', 'created_at', 'updated_at']
    search_fields = ['content', 'contact__data', 'author__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'is_edited']
    ordering = ['-created_at']

    fieldsets = [
        ('Basic Information', {
            'fields': ['id', 'contact', 'author', 'type']
        }),
        ('Content', {
            'fields': ['content'],
        }),
        ('Metadata (JSONB)', {
            'fields': ['metadata'],
            'classes': ['collapse'],
            'description': 'Stores edit history and other flexible data.',
        }),
        ('Status', {
            'fields': ['is_deleted', 'is_edited'],
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def activity_info(self, obj):
        """Display activity content preview."""
        preview = obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
        return format_html('<span title="{}">{}</span>', obj.content, preview)
    activity_info.short_description = 'Content'

    def contact_info(self, obj):
        """Display contact name."""
        return str(obj.contact)
    contact_info.short_description = 'Contact'
    contact_info.admin_order_field = 'contact'

    def author_info(self, obj):
        """Display author email or 'System'."""
        if obj.author:
            return obj.author.email
        return format_html('<em>System</em>')
    author_info.short_description = 'Author'
    author_info.admin_order_field = 'author__email'

    def get_queryset(self, request):
        """Optimize queries with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('contact', 'contact__list', 'author')
