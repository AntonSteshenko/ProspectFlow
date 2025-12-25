"""
User models for ProspectFlow.

Custom user model will be implemented in Step 2.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """
    Custom user model for ProspectFlow.

    Extends Django's AbstractUser with UUID primary key.
    Additional fields and methods will be added in Step 2.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Override username to make email the primary identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email
