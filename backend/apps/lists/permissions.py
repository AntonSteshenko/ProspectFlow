"""
Permission classes for object-level access control.

Ensures users can only access their own contact lists and contacts.
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to access it.

    Checks if the object has an 'owner' attribute that matches the request user.
    Used for ContactList objects.
    """

    def has_object_permission(self, request, view, obj):
        """
        Return True if the user is the owner of the object.

        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The object being accessed (must have 'owner' attribute)

        Returns:
            bool: True if obj.owner == request.user
        """
        return obj.owner == request.user


class IsContactListOwner(permissions.BasePermission):
    """
    Object-level permission for Contact and ColumnMapping models.

    Checks if the user owns the parent ContactList.
    Used for Contact and ColumnMapping objects that have a 'list' FK.
    """

    def has_object_permission(self, request, view, obj):
        """
        Return True if the user owns the parent ContactList.

        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The object being accessed (must have 'list' FK to ContactList)

        Returns:
            bool: True if obj.list.owner == request.user
        """
        return obj.list.owner == request.user


class IsActivityOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission for Activity objects.

    - Read: User must own the parent ContactList
    - Create: Allowed if user owns ContactList
    - Update/Delete: Only author of the activity
    """

    def has_permission(self, request, view):
        """
        Check if user has permission to access activities.

        Args:
            request: The HTTP request
            view: The view being accessed

        Returns:
            bool: True if user owns the parent ContactList
        """
        contact_id = view.kwargs.get('contact_pk')
        if contact_id:
            try:
                from .models import Contact
                contact = Contact.objects.select_related('list').get(id=contact_id)
                return contact.list.owner == request.user
            except Contact.DoesNotExist:
                return False
        return True

    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission for specific activity.

        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The Activity object being accessed

        Returns:
            bool: True if user has permission
        """
        # User must own parent ContactList
        if obj.contact.list.owner != request.user:
            return False

        # Read access for owner
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write access: only author of the activity (and not already deleted)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            return (obj.author == request.user and not obj.is_deleted)

        return False
