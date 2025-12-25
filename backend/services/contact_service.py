"""
Contact service for managing contact records.

Handles contact CRUD operations, search, and bulk operations.
"""
from typing import List, Dict
from django.db import transaction
from django.db.models import Q
from apps.lists.models import Contact, ContactList


class ContactService:
    """
    Service for contact management operations.

    Methods:
        create_contacts: Bulk create contacts from parsed data
        search_contacts: Search contacts in JSONB data
        update_contact: Update contact JSONB data
        soft_delete_contact: Mark contact as deleted
        bulk_soft_delete: Delete multiple contacts
    """

    @classmethod
    @transaction.atomic
    def create_contacts(cls, contact_list: ContactList, data: List[Dict]) -> List[Contact]:
        """
        Bulk create contacts from parsed data.

        Args:
            contact_list: ContactList instance to add contacts to
            data: List of contact dictionaries (JSONB data)

        Returns:
            list: Created Contact instances

        Example:
            data = [
                {'first_name': 'John', 'email': 'john@example.com'},
                {'first_name': 'Jane', 'email': 'jane@example.com'}
            ]
        """
        contacts = [
            Contact(list=contact_list, data=row)
            for row in data
        ]

        created_contacts = Contact.objects.bulk_create(contacts)

        # Update contact list metadata
        contact_list.metadata = contact_list.metadata or {}
        contact_list.metadata['total_contacts'] = len(created_contacts)
        contact_list.metadata['last_import'] = str(contact_list.updated_at)
        contact_list.status = 'completed'
        contact_list.save()

        return created_contacts

    @classmethod
    def search_contacts(cls, contact_list: ContactList, query: str):
        """
        Search contacts by text query in JSONB data.

        Uses PostgreSQL's JSONB contains operator for efficient search.

        Args:
            contact_list: ContactList to search within
            query: Search query string

        Returns:
            QuerySet: Filtered Contact queryset
        """
        if not query:
            return contact_list.contacts.filter(is_deleted=False)

        # Search in common fields
        # Note: This is a simple implementation. For production,
        # consider using PostgreSQL full-text search or dedicated search engine
        contacts = contact_list.contacts.filter(
            is_deleted=False
        ).filter(
            Q(data__icontains=query)  # Simple JSONB contains search
        )

        return contacts

    @classmethod
    @transaction.atomic
    def update_contact(cls, contact: Contact, data: Dict) -> Contact:
        """
        Update contact JSONB data.

        Args:
            contact: Contact instance to update
            data: New or updated fields (will be merged with existing data)

        Returns:
            Contact: Updated contact instance
        """
        # Merge new data with existing data
        contact.data.update(data)
        contact.save()
        return contact

    @classmethod
    @transaction.atomic
    def soft_delete_contact(cls, contact: Contact) -> Contact:
        """
        Soft delete a contact (set is_deleted=True).

        Args:
            contact: Contact instance to delete

        Returns:
            Contact: Deleted contact instance
        """
        contact.is_deleted = True
        contact.save()
        return contact

    @classmethod
    @transaction.atomic
    def bulk_soft_delete(cls, contact_ids: List[str]) -> int:
        """
        Soft delete multiple contacts by ID.

        Args:
            contact_ids: List of contact UUIDs to delete

        Returns:
            int: Number of contacts deleted
        """
        count = Contact.objects.filter(
            id__in=contact_ids,
            is_deleted=False
        ).update(is_deleted=True)

        return count

    @classmethod
    def get_contact_stats(cls, contact_list: ContactList) -> Dict:
        """
        Get statistics for a contact list.

        Args:
            contact_list: ContactList instance

        Returns:
            dict: Statistics about the contact list
        """
        total = contact_list.contacts.count()
        active = contact_list.contacts.filter(is_deleted=False).count()
        deleted = contact_list.contacts.filter(is_deleted=True).count()

        return {
            'total': total,
            'active': active,
            'deleted': deleted,
        }
