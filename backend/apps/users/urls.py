"""
URL configuration for users app.

Authentication endpoints:
- POST /api/auth/register - User registration
- POST /api/auth/login - Obtain JWT token
- POST /api/auth/refresh - Refresh JWT token
- GET /api/auth/me - Get current user profile
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UserRegistrationView, UserProfileView

app_name = 'users'

urlpatterns = [
    # User registration
    path('register/', UserRegistrationView.as_view(), name='register'),

    # JWT token management
    path('login/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User profile
    path('me/', UserProfileView.as_view(), name='profile'),
]
