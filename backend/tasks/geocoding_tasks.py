"""
Celery tasks for asynchronous geocoding operations.

Handles batch geocoding of contact lists with rate limiting,
progress tracking, and error handling.
"""
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from apps.lists.models import ContactList, Contact
from services.geocoding_service import GeocodingService
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='tasks.geocode_contact_list')
def geocode_contact_list(self, list_id: str, force: bool = False):
    """
    Async task to geocode all contacts in a contact list.

    Processes contacts in batch with rate limiting (1 req/sec for Nominatim).
    Updates ContactList.metadata with progress and final results.
    Stores GPS coordinates in Contact.data JSONB field.

    Args:
        self: Celery task instance (bind=True)
        list_id: UUID string of ContactList to geocode
        force: If True, re-geocode contacts that already have coordinates
               If False (default), only geocode contacts without coordinates

    Returns:
        dict: Summary statistics with structure:
            {
                'total': int,           # Total contacts processed
                'success': int,         # Successfully geocoded
                'failed': int,          # Failed geocoding attempts
                'skipped': int          # Already had coordinates (when force=False)
            }

    Metadata Updates:
        ContactList.metadata is updated with:
        - geocoding_status: 'processing' | 'completed' | 'failed'
        - geocoding_started_at: ISO timestamp when task started
        - geocoding_completed_at: ISO timestamp when task completed
        - geocoding_progress: {
            'current': int,      # Number of contacts processed so far
            'total': int,        # Total contacts to process
            'percentage': float  # Completion percentage
          }
        - geocoding_results: Final statistics (total, success, failed, skipped)

    Contact Updates:
        Contact.data is updated with:
        - latitude: float         # GPS latitude coordinate
        - longitude: float        # GPS longitude coordinate
        - geocoded_at: ISO timestamp of when geocoding occurred
        - geocoding_error: str    # Error message if geocoding failed (only on error)

    Example:
        # Trigger task
        task = geocode_contact_list.delay('uuid-here', force=False)

        # Check progress (in view)
        contact_list = ContactList.objects.get(id='uuid-here')
        progress = contact_list.metadata.get('geocoding_progress')
        # {'current': 50, 'total': 100, 'percentage': 50.0}

        # Get final results
        result = task.get()  # Wait for completion
        # {'total': 100, 'success': 95, 'failed': 5, 'skipped': 0}

    Error Handling:
        - Invalid addresses: Logged and counted as 'failed'
        - Network errors: Logged and counted as 'failed'
        - Missing template: Task fails with error status
        - Feature disabled: Task fails with error status

    Note:
        - Respects GEOCODING_ENABLED setting
        - Requires geocoding_template in ContactList.metadata
        - Rate limited to 1 request/second (Nominatim requirement)
        - Progress updated every 10 contacts for performance
    """
    # Initialize result counters
    stats = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'skipped': 0
    }

    try:
        # Load contact list
        try:
            contact_list = ContactList.objects.get(id=list_id)
        except ContactList.DoesNotExist:
            logger.error(f"ContactList with id {list_id} not found")
            return {'error': 'Contact list not found'}

        # Check if geocoding is enabled
        if not GeocodingService.is_enabled():
            error_msg = "Geocoding feature is disabled"
            logger.error(error_msg)
            _update_metadata_failed(contact_list, error_msg)
            return {'error': error_msg}

        # Validate template exists
        template = contact_list.metadata.get('geocoding_template')
        if not template or not GeocodingService.validate_template(template):
            error_msg = "Geocoding template not configured or invalid"
            logger.error(f"{error_msg} for list {list_id}")
            _update_metadata_failed(contact_list, error_msg)
            return {'error': error_msg}

        # Get contacts to geocode
        contacts_queryset = contact_list.contacts.filter(is_deleted=False)

        if not force:
            # Only geocode contacts without existing coordinates
            contacts_queryset = contacts_queryset.exclude(data__has_key='latitude')

        contacts = list(contacts_queryset)
        total_count = len(contacts)

        logger.info(f"Starting geocoding for {total_count} contacts in list {list_id} (force={force})")

        # Initialize metadata
        contact_list.metadata = contact_list.metadata or {}
        contact_list.metadata['geocoding_status'] = 'processing'
        contact_list.metadata['geocoding_started_at'] = timezone.now().isoformat()
        contact_list.metadata['geocoding_progress'] = {
            'current': 0,
            'total': total_count,
            'percentage': 0.0
        }
        contact_list.save(update_fields=['metadata'])

        # Process each contact
        for index, contact in enumerate(contacts, start=1):
            stats['total'] += 1

            # Build address from template
            address = GeocodingService.build_address_from_template(
                contact.data,
                template
            )

            if not address:
                # No address fields found
                logger.warning(f"Could not build address for contact {contact.id}")
                stats['failed'] += 1
                contact.data['geocoding_error'] = 'No address fields found'
                contact.save(update_fields=['data'])
                continue

            # Geocode the address
            result = GeocodingService.geocode_address(address)

            if result:
                # Success - update contact with coordinates
                contact.data['latitude'] = result['latitude']
                contact.data['longitude'] = result['longitude']
                contact.data['geocoded_at'] = timezone.now().isoformat()
                contact.data['geocoding_precision'] = result.get('precision', 'exact')

                # Clear any previous error
                if 'geocoding_error' in contact.data:
                    del contact.data['geocoding_error']

                contact.save(update_fields=['data'])
                stats['success'] += 1
                logger.info(f"Geocoded contact {contact.id}: {result['latitude']}, {result['longitude']} (precision: {result.get('precision', 'exact')})")
            else:
                # Failed - log error
                stats['failed'] += 1
                contact.data['geocoding_error'] = 'Address not found or geocoding failed'
                contact.save(update_fields=['data'])
                logger.warning(f"Failed to geocode contact {contact.id} with address: {address}")

            # Update progress every 10 contacts
            if index % 10 == 0 or index == total_count:
                percentage = (index / total_count * 100) if total_count > 0 else 0
                contact_list.metadata['geocoding_progress'] = {
                    'current': index,
                    'total': total_count,
                    'percentage': round(percentage, 2)
                }
                contact_list.save(update_fields=['metadata'])
                logger.info(f"Geocoding progress: {index}/{total_count} ({percentage:.1f}%)")

        # Finalize metadata
        contact_list.metadata['geocoding_status'] = 'completed'
        contact_list.metadata['geocoding_completed_at'] = timezone.now().isoformat()
        contact_list.metadata['geocoding_results'] = stats
        contact_list.save(update_fields=['metadata'])

        logger.info(f"Geocoding completed for list {list_id}: {stats}")
        return stats

    except Exception as e:
        # Unexpected error - update metadata and re-raise
        logger.exception(f"Unexpected error in geocoding task for list {list_id}")
        try:
            contact_list = ContactList.objects.get(id=list_id)
            _update_metadata_failed(contact_list, str(e))
        except Exception:
            pass  # Don't fail if we can't update metadata
        raise


def _update_metadata_failed(contact_list: ContactList, error_message: str):
    """
    Helper function to update ContactList metadata with failed status.

    Args:
        contact_list: ContactList instance to update
        error_message: Error message to store
    """
    contact_list.metadata = contact_list.metadata or {}
    contact_list.metadata['geocoding_status'] = 'failed'
    contact_list.metadata['geocoding_error'] = error_message
    contact_list.metadata['geocoding_completed_at'] = timezone.now().isoformat()
    contact_list.save(update_fields=['metadata'])
