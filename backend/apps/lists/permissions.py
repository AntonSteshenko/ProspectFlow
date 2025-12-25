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
