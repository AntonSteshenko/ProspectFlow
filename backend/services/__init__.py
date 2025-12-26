"""
Business logic services for ProspectFlow.

Services isolate business logic from views and models.
This makes code testable, reusable, and AI-extensible.

Available services:
- auth_service.py - Authentication and user management
- upload_service.py - File upload handling
- parser_service.py - CSV/XLSX parsing
- contact_service.py - Contact management operations
- activity_service.py - Activity and comment management
"""

from .activity_service import ActivityService

__all__ = ['ActivityService']
