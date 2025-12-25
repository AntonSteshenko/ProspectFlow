"""
Serializers for user authentication and management.

Handles user registration, profile data, and validation.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Validates password strength and creates new user accounts.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text="Password must meet Django's validation requirements"
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirm password (must match password field)"
    )

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'password', 'password_confirm']
        read_only_fields = ['id']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': False},  # Username is optional, email is primary auth
        }

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "Password fields didn't match."
            })
        return attrs

    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')

        # If username not provided, use email prefix
        if not validated_data.get('username'):
            validated_data['username'] = validated_data['email'].split('@')[0]

        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile data.

    Returns user information (no password).
    """

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'email', 'date_joined']
