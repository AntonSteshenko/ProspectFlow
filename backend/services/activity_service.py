"""
Activity service for managing contact activities and comments.

Handles comment CRUD operations, permission checks, and edit history tracking.
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
        create_user_comment: Create a new user comment
        update_user_comment: Update comment with edit history
        delete_user_comment: Soft delete a comment
        get_contact_activities: Get all activities for a contact
        create_system_event: Create system-generated event (future use)
    """

    @classmethod
    @transaction.atomic
    def create_user_comment(cls, contact: Contact, user: User, content: str) -> Activity:
        """
        Create a new user comment.

        Args:
            contact: Contact instance to add comment to
            user: User creating the comment
            content: Comment text

        Returns:
            Activity: Created comment activity

        Example:
            activity = ActivityService.create_user_comment(
                contact=contact,
                user=request.user,
                content="Great prospect, follow up next week"
            )
        """
        return Activity.objects.create(
            contact=contact,
            author=user,
            type='user_comment',
            content=content.strip(),
            metadata={}
        )

    @classmethod
    @transaction.atomic
    def update_user_comment(cls, activity: Activity, content: str, user: User) -> Activity:
        """
        Update comment - stores edit history in metadata.

        Args:
            activity: Activity instance to update
            content: New comment text
            user: User updating the comment

        Returns:
            Activity: Updated activity

        Raises:
            PermissionError: If user is not the author
            ValueError: If activity is not a user_comment or is deleted

        Example:
            activity = ActivityService.update_user_comment(
                activity=activity,
                content="Updated: Follow up scheduled for Friday",
                user=request.user
            )
        """
        if activity.author != user:
            raise PermissionError("Only the author can edit this comment")
        if activity.type != 'user_comment' or activity.is_deleted:
            raise ValueError("Cannot edit this activity")

        # Store edit history
        activity.metadata.setdefault('edit_history', [])
        activity.metadata['edit_history'].append({
            'timestamp': timezone.now().isoformat(),
            'previous_content': activity.content
        })

        activity.content = content.strip()
        activity.is_edited = True
        activity.save()
        return activity

    @classmethod
    @transaction.atomic
    def delete_user_comment(cls, activity: Activity, user: User) -> Activity:
        """
        Soft delete a comment.

        Args:
            activity: Activity instance to delete
            user: User deleting the comment

        Returns:
            Activity: Deleted activity

        Raises:
            PermissionError: If user is not the author
            ValueError: If activity is not a user_comment or already deleted

        Example:
            activity = ActivityService.delete_user_comment(
                activity=activity,
                user=request.user
            )
        """
        if activity.author != user:
            raise PermissionError("Only the author can delete this comment")
        if activity.type != 'user_comment' or activity.is_deleted:
            raise ValueError("Cannot delete this activity")

        activity.is_deleted = True
        activity.save()
        return activity

    @classmethod
    def get_contact_activities(
        cls,
        contact: Contact,
        include_deleted: bool = False,
        activity_type: Optional[str] = None
    ) -> List[Activity]:
        """
        Get all activities for a contact.

        Args:
            contact: Contact instance
            include_deleted: Include soft-deleted activities (default: False)
            activity_type: Filter by specific type (optional)

        Returns:
            QuerySet: Filtered Activity queryset ordered by created_at desc

        Example:
            # Get all active comments
            activities = ActivityService.get_contact_activities(contact)

            # Get all activities including deleted
            all_activities = ActivityService.get_contact_activities(
                contact, include_deleted=True
            )

            # Get only user comments
            comments = ActivityService.get_contact_activities(
                contact, activity_type='user_comment'
            )
        """
        queryset = contact.activities.select_related('author')

        if not include_deleted:
            queryset = queryset.filter(is_deleted=False)
        if activity_type:
            queryset = queryset.filter(type=activity_type)

        return queryset.order_by('-created_at')

    @classmethod
    @transaction.atomic
    def create_system_event(cls, contact: Contact, event_type: str, content: str, metadata: dict = None) -> Activity:
        """
        Create system-generated event (for future use).

        Args:
            contact: Contact instance
            event_type: Type of system event ('system_event', 'status_change', 'field_update')
            content: Event description
            metadata: Additional event data (optional)

        Returns:
            Activity: Created system event

        Example:
            activity = ActivityService.create_system_event(
                contact=contact,
                event_type='status_change',
                content='Status changed from Lead to Qualified',
                metadata={'old_status': 'lead', 'new_status': 'qualified'}
            )
        """
        return Activity.objects.create(
            contact=contact,
            author=None,
            type=event_type,
            content=content,
            metadata=metadata or {}
        )
