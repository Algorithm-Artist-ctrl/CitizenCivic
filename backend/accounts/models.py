import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with role-based access control for CitizenCivic."""

    class Role(models.TextChoices):
        CITIZEN = 'CITIZEN', 'Citizen'
        MODERATOR = 'MODERATOR', 'Moderator'
        OPERATOR = 'OPERATOR', 'Operator'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        ADMIN = 'ADMIN', 'Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CITIZEN,
        db_index=True,
    )
    phone_hash = models.CharField(
        max_length=128, blank=True, null=True,
        help_text='SHA-256 hash of the phone number',
    )
    display_name = models.CharField(max_length=150, blank=True, default='')
    preferred_language = models.CharField(
        max_length=5,
        choices=[('en', 'English'), ('hi', 'Hindi')],
        default='en',
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return f'{self.display_name or self.username} ({self.role})'
