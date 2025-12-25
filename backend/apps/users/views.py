"""
Views for user authentication and management.

Provides API endpoints for:
- User registration
- User profile retrieval
- JWT token management (via simplejwt)
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view
from .serializers import UserRegistrationSerializer, UserSerializer
from .models import User


@extend_schema_view(
    post=extend_schema(
        summary="Register new user",
        description="Create a new user account with email and password. Returns user data upon successful registration.",
        tags=["Authentication"]
    )
)
class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.

    Allows anyone to create a new account.
    Returns user data (no password) upon successful registration.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """Create user and return user data."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Return user data without password
        user_serializer = UserSerializer(user)
        return Response(
            user_serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema_view(
    get=extend_schema(
        summary="Get current user profile",
        description="Retrieve the authenticated user's profile information.",
        tags=["Authentication"]
    )
)
class UserProfileView(generics.RetrieveAPIView):
    """
    User profile endpoint.

    Returns the authenticated user's profile data.
    Requires valid JWT token.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Return the current authenticated user."""
        return self.request.user
