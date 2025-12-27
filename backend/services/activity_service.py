"""
Activity service for managing contact interactions.

Handles activity CRUD operations, permission checks, and edit history tracking.
"""
from typing import List, Optional
from django.db import transaction
from django.utils import timezone
from apps.lists.models import Activity, Contact
from apps.users.models import User


class ActivityService:
    """
    Service for activity management operations.

    Methods:
        create_activity: Create a new activity
        update_activity: Update activity with edit history
        delete_activity: Soft delete an activity
        get_contact_activities: Get all activities for a contact
    """

    @classmethod
    @transaction.atomic
    def create_activity(
        cls,
        contact: Contact,
        user: User,
        activity_type: str,
        result: str,
        date=None,
        content: str = ""
    ) -> Activity:
        """
        Create a new activity.

        Args:
            contact: Contact instance
            user: User creating the activity
            activity_type: One of 'call', 'email', 'visit'
            result: One of 'no', 'followup', 'lead'
            date: Activity date (optional)
            content: Notes/description (optional)

        Returns:
            Activity: Created activity instance

        Example:
            activity = ActivityService.create_activity(
                contact=contact,
                user=request.user,
                activity_type='call',
                result='followup',
                date=date(2025, 1, 15),
                content="Client interested, follow up next week"
            )
        """
        return Activity.objects.create(
            contact=contact,
            author=user,
            type=activity_type,
            result=result,
            date=date,
            content=content.strip() if content else "",
            metadata={}
        )

    @classmethod
    @transaction.atomic
    def update_activity(
        cls,
        activity: Activity,
        user: User,
        activity_type: str = None,
        result: str = None,
        date=None,
        content: str = None
    ) -> Activity:
        """
        Update activity with edit history tracking.

        Args:
            activity: Activity instance to update
            user: User updating the activity
            activity_type: New activity type (optional)
            result: New result (optional)
            date: New date (optional, use False to clear)
            content: New content (optional)

        Returns:
            Activity: Updated activity instance

        Raises:
            PermissionError: If user is not the author
            ValueError: If activity is deleted

        Example:
            activity = ActivityService.update_activity(
                activity=activity,
                user=request.user,
                result='lead',
                content="Client confirmed purchase"
            )
        """
        if activity.author != user:
            raise PermissionError("Only the author can edit this activity")
        if activity.is_deleted:
            raise ValueError("Cannot edit deleted activity")

        # Store edit history in metadata
        activity.metadata.setdefault('edit_history', [])
        activity.metadata['edit_history'].append({
            'timestamp': timezone.now().isoformat(),
            'previous_data': {
                'type': activity.type,
                'result': activity.result,
                'date': activity.date.isoformat() if activity.date else None,
                'content': activity.content
            }
        })

        if activity_type is not None:
            activity.type = activity_type
        if result is not None:
            activity.result = result
        if date is not None:
            activity.date = date
        if content is not None:
            activity.content = content.strip()

        activity.is_edited = True
        activity.save()
        return activity

    @classmethod
    @transaction.atomic
    def delete_activity(cls, activity: Activity, user: User) -> Activity:
        """
        Soft delete an activity.

        Args:
            activity: Activity instance to delete
            user: User deleting the activity

        Returns:
            Activity: Deleted activity instance

        Raises:
            PermissionError: If user is not the author
            ValueError: If activity is already deleted

        Example:
            activity = ActivityService.delete_activity(
                activity=activity,
                user=request.user
            )
        """
        if activity.author != user:
            raise PermissionError("Only the author can delete this activity")
        if activity.is_deleted:
            raise ValueError("Activity already deleted")

        activity.is_deleted = True
        activity.save()
        return activity

    @classmethod
    def get_contact_activities(
        cls,
        contact: Contact,
        include_deleted: bool = False
    ) -> List[Activity]:
        """
        Get all activities for a contact.

        Args:
            contact: Contact instance
            include_deleted: Include soft-deleted activities (default: False)

        Returns:
            QuerySet: Filtered Activity queryset ordered by created_at desc

        Example:
            # Get all active activities
            activities = ActivityService.get_contact_activities(contact)

            # Get all activities including deleted
            all_activities = ActivityService.get_contact_activities(
                contact, include_deleted=True
            )
        """
        queryset = contact.activities.select_related('author')

        if not include_deleted:
            queryset = queryset.filter(is_deleted=False)

        return queryset.order_by('-created_at')
