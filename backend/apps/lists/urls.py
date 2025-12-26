"""
URL configuration for lists app.

Provides REST API routes for:
- Contact lists (CRUD + file upload/process)
- Contacts (CRUD + search)
- Column mappings (list, create, delete)
- Activities (CRUD for contact comments/events)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import ContactListViewSet, ContactViewSet, ActivityViewSet

app_name = 'lists'

# Main router for top-level resources
router = DefaultRouter()
router.register(r'lists', ContactListViewSet, basename='contactlist')
router.register(r'contacts', ContactViewSet, basename='contact')

# Nested routers for list-specific resources
lists_router = routers.NestedDefaultRouter(router, r'lists', lookup='list')
lists_router.register(r'contacts', ContactViewSet, basename='list-contacts')

# Nested router for contact-specific activities
contacts_router = routers.NestedDefaultRouter(router, r'contacts', lookup='contact')
contacts_router.register(r'activities', ActivityViewSet, basename='contact-activities')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(lists_router.urls)),
    path('', include(contacts_router.urls)),
]
