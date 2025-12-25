"""
URL configuration for lists app.

Provides REST API routes for:
- Contact lists (CRUD + file upload/process)
- Contacts (CRUD + search)
- Column mappings (list, create, delete)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import ContactListViewSet, ContactViewSet, ColumnMappingViewSet

app_name = 'lists'

# Main router for top-level resources
router = DefaultRouter()
router.register(r'lists', ContactListViewSet, basename='contactlist')
router.register(r'contacts', ContactViewSet, basename='contact')

# Nested routers for list-specific resources
lists_router = routers.NestedDefaultRouter(router, r'lists', lookup='list')
lists_router.register(r'contacts', ContactViewSet, basename='list-contacts')
lists_router.register(r'mappings', ColumnMappingViewSet, basename='list-mappings')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(lists_router.urls)),
]
