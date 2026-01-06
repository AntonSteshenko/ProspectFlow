"""
Geocoding service for converting addresses to GPS coordinates.

Uses Nominatim (OpenStreetMap) for free geocoding with rate limiting.
Stores coordinates in Contact.data JSONB field.
"""
import time
import logging
from typing import Dict, Optional
from django.conf import settings
import requests

logger = logging.getLogger(__name__)


class GeocodingService:
    """
    Geocoding service using Nominatim (OpenStreetMap).

    Provides free geocoding with proper rate limiting (1 req/sec) and error handling.
    Respects GEOCODING_ENABLED feature flag from settings.

    Rate Limiting:
        Nominatim requires maximum 1 request per second. This service automatically
        enforces this limit using time.sleep() between requests.

    Feature Flag:
        Geocoding can be enabled/disabled via GEOCODING_ENABLED environment variable.
        All methods check is_enabled() before processing.

    Error Handling:
        Network errors and invalid addresses return None instead of raising exceptions.
        Errors are logged for debugging.

    Example Usage:
        # Check if enabled
        if GeocodingService.is_enabled():
            # Geocode an address
            result = GeocodingService.geocode_address("123 Main St, Springfield, IL")
            if result:
                lat = result['latitude']
                lon = result['longitude']

            # Build address from template
            address = GeocodingService.build_address_from_template(
                contact_data={'street': '123 Main', 'city': 'Springfield'},
                template={'fields': ['street', 'city'], 'separator': ', '}
            )

    Methods:
        is_enabled: Check if geocoding feature is enabled
        geocode_address: Convert address string to GPS coordinates
        build_address_from_template: Compose address from contact fields
        validate_template: Validate template configuration structure
    """

    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    RATE_LIMIT_SECONDS = 1.0
    USER_AGENT = "ProspectFlow/1.0"  # Required by Nominatim usage policy
    _last_request_time = 0  # Class variable to track rate limiting

    @classmethod
    def is_enabled(cls) -> bool:
        """
        Check if geocoding feature is enabled in settings.

        Returns:
            bool: True if GEOCODING_ENABLED=True in environment, False otherwise

        Example:
            if GeocodingService.is_enabled():
                # Proceed with geocoding
                pass
        """
        return getattr(settings, 'GEOCODING_ENABLED', False)

    @classmethod
    def geocode_address(cls, address: str) -> Optional[Dict]:
        """
        Geocode an address string to GPS coordinates using Nominatim with fallback strategy.

        Tries progressively simpler address formats if specific address not found:
        1. Full address (street + number, city, province)
        2. Street without number (street, city, province)
        3. City and province only

        Automatically enforces 1 req/sec rate limit. Returns None on failure
        instead of raising exceptions for graceful error handling in batch operations.

        Args:
            address: Full address string to geocode (e.g., "Via Roma 123, Milano, MI, Italy")

        Returns:
            dict: {
                'latitude': float,
                'longitude': float,
                'display_name': str,  # Full formatted address from Nominatim
                'precision': str      # 'exact', 'street', or 'city' to indicate accuracy
            }
            None: If geocoding fails (invalid address, network error, feature disabled)

        Example:
            result = GeocodingService.geocode_address("Via Roma 123, Milano, MI, Italy")
            if result:
                print(f"Coordinates: {result['latitude']}, {result['longitude']}")
                print(f"Precision: {result['precision']}")
            else:
                print("Geocoding failed")

        Note:
            - Respects 1 request/second rate limit (Nominatim requirement)
            - Requires User-Agent header (Nominatim policy)
            - Uses fallback strategy for better success rate
        """
        # Check if feature is enabled
        if not cls.is_enabled():
            logger.warning("Geocoding is disabled. Enable GEOCODING_ENABLED in settings.")
            return None

        # Validate address
        if not address or not address.strip():
            logger.warning("Empty address provided for geocoding")
            return None

        # Try with full address first
        result = cls._geocode_request(address, precision='exact')
        if result:
            return result

        # Fallback: Try without street number (remove numbers from first part)
        parts = address.split(',')
        if len(parts) >= 2:
            # Remove numbers from street name
            import re
            street_cleaned = re.sub(r'\s+\d+.*?(?=,|$)', '', parts[0]).strip()
            if street_cleaned and street_cleaned != parts[0]:
                fallback_address = ', '.join([street_cleaned] + parts[1:])
                logger.debug(f"Trying fallback without number: {fallback_address}")
                result = cls._geocode_request(fallback_address, precision='street')
                if result:
                    return result

        # Final fallback: Try with just city and province (last 2-3 parts)
        if len(parts) >= 2:
            city_only = ', '.join(parts[-3:] if len(parts) >= 3 else parts[-2:])
            logger.debug(f"Trying final fallback with city only: {city_only}")
            result = cls._geocode_request(city_only, precision='city')
            if result:
                return result

        logger.warning(f"All geocoding attempts failed for: {address}")
        return None

    @classmethod
    def _geocode_request(cls, address: str, precision: str = 'exact') -> Optional[Dict]:
        """
        Internal method to make actual geocoding request to Nominatim.

        Args:
            address: Address string to geocode
            precision: Precision level ('exact', 'street', 'city')

        Returns:
            dict with latitude, longitude, display_name, precision or None
        """
        # Enforce rate limiting (1 request per second)
        current_time = time.time()
        time_since_last_request = current_time - cls._last_request_time
        if time_since_last_request < cls.RATE_LIMIT_SECONDS:
            sleep_time = cls.RATE_LIMIT_SECONDS - time_since_last_request
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)

        try:
            # Make request to Nominatim
            params = {
                'q': address.strip(),
                'format': 'json',
                'limit': 1,
                'addressdetails': 0
            }
            headers = {
                'User-Agent': cls.USER_AGENT
            }

            logger.debug(f"Geocoding ({precision}): {address}")
            response = requests.get(
                cls.NOMINATIM_URL,
                params=params,
                headers=headers,
                timeout=10
            )

            # Update last request time
            cls._last_request_time = time.time()

            # Check response
            response.raise_for_status()
            results = response.json()

            if not results or len(results) == 0:
                logger.debug(f"No results for {precision} address: {address}")
                return None

            # Extract coordinates from first result
            result = results[0]
            return {
                'latitude': float(result['lat']),
                'longitude': float(result['lon']),
                'display_name': result.get('display_name', ''),
                'precision': precision
            }

        except requests.RequestException as e:
            logger.error(f"Geocoding request failed for '{address}': {str(e)}")
            return None
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f"Failed to parse response for '{address}': {str(e)}")
            return None

    @classmethod
    def _clean_italian_address(cls, address: str) -> str:
        """
        Clean Italian address prefixes that Nominatim doesn't recognize.

        Removes common Italian locality prefixes like FRAZIONE, REGIONE, LOCALITA', etc.

        Args:
            address: Raw address string

        Returns:
            Cleaned address string
        """
        import re

        # Italian address prefixes to remove
        prefixes = [
            r'^FRAZIONE\s+',
            r'^FRAZ\.?\s+',
            r'^FR\.?\s+',
            r'^REGIONE\s+',
            r'^REG\.?\s+',
            r"^LOCALITA['']?\s+",
            r'^LOC\.?\s+',
            r'^BORGATA\s+',
            r'^STRADA\s+',
            r'^STR\.?\s+',
        ]

        for prefix in prefixes:
            address = re.sub(prefix, '', address, flags=re.IGNORECASE)

        return address.strip()

    @classmethod
    def build_address_from_template(cls, contact_data: dict, template: dict) -> str:
        """
        Build address string from contact JSONB data using template configuration.

        Extracts values from contact_data for fields specified in template and
        joins them with the configured separator. Skips empty/None values.
        Automatically appends "Italy" if not already in the address to improve
        Nominatim geocoding accuracy.

        Args:
            contact_data: Contact.data JSONB field containing contact information
            template: Template configuration with structure:
                {
                    'fields': ['street', 'city', 'state', 'zip'],
                    'separator': ', '
                }

        Returns:
            str: Composed address string (e.g., "123 Main St, Springfield, IL, 62701, Italy")
                 Empty string if no valid fields found

        Example:
            contact_data = {
                'street': '123 Main St',
                'city': 'Springfield',
                'state': 'IL',
                'zip': '62701'
            }
            template = {
                'fields': ['street', 'city', 'state', 'zip'],
                'separator': ', '
            }
            address = GeocodingService.build_address_from_template(contact_data, template)
            # Returns: "123 Main St, Springfield, IL, 62701, Italy"

        Note:
            - Handles missing fields gracefully (skips them)
            - Strips whitespace from values
            - Automatically adds "Italy" if not present
            - Returns empty string if no valid fields found
        """
        if not template or not isinstance(template, dict):
            logger.warning("Invalid template provided to build_address_from_template")
            return ""

        fields = template.get('fields', [])
        separator = template.get('separator', ', ')

        if not fields or not isinstance(fields, list):
            logger.warning("Template missing 'fields' list")
            return ""

        # Extract values for each field, skipping empty/None values
        values = []
        for field in fields:
            value = contact_data.get(field)
            if value and str(value).strip():
                # Clean Italian prefixes from the first field (usually street address)
                cleaned_value = str(value).strip()
                if len(values) == 0:  # First field
                    cleaned_value = cls._clean_italian_address(cleaned_value)
                values.append(cleaned_value)

        # Join with separator
        address = separator.join(values)

        # Add "Italy" if not already present (improves Nominatim results)
        if address and not any(country.lower() in address.lower() for country in ['italy', 'italia']):
            address = f"{address}, Italy"
            logger.debug(f"Added 'Italy' to address: {address}")

        logger.debug(f"Built address from template: {address}")
        return address

    @classmethod
    def validate_template(cls, template: dict) -> bool:
        """
        Validate geocoding template configuration structure.

        Checks that template has required fields and correct types.

        Args:
            template: Template configuration to validate

        Returns:
            bool: True if valid, False otherwise

        Example:
            template = {
                'fields': ['street', 'city'],
                'separator': ', '
            }
            is_valid = GeocodingService.validate_template(template)  # True

            invalid_template = {'fields': []}
            is_valid = GeocodingService.validate_template(invalid_template)  # False

        Required Structure:
            - 'fields': list with at least 1 element
            - 'separator': string (can be empty)
        """
        if not template or not isinstance(template, dict):
            return False

        # Check 'fields' exists and is a non-empty list
        fields = template.get('fields')
        if not fields or not isinstance(fields, list) or len(fields) == 0:
            return False

        # Check 'separator' exists and is a string
        separator = template.get('separator')
        if separator is None or not isinstance(separator, str):
            return False

        return True
