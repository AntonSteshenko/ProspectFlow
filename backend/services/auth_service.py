"""
Authentication service for user management.

Handles user registration and authentication logic.
Isolates business rules from views for testability and reusability.
"""
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class AuthService:
    """
    Service class for authentication operations.

    Methods:
        register_user: Create new user account with validation
        get_user_by_email: Retrieve user by email address
    """

    @staticmethod
    @transaction.atomic
    def register_user(email, password, username=None, first_name='', last_name=''):
        """
        Register a new user account.

        Args:
            email (str): User email address (used as login)
            password (str): Plain text password (will be hashed)
            username (str, optional): Username. Defaults to email prefix if not provided
            first_name (str, optional): User's first name
            last_name (str, optional): User's last name

        Returns:
            User: Created user instance

        Raises:
            ValidationError: If email already exists or validation fails
        """
        # Generate username from email if not provided
        if not username:
            username = email.split('@')[0]

        # Create user with hashed password
        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        return user

    @staticmethod
    def get_user_by_email(email):
        """
        Retrieve user by email address.

        Args:
            email (str): User email address

        Returns:
            User or None: User instance if found, None otherwise
        """
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return None
