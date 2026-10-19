from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'display_name', 'role', 'is_verified', 'is_active', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active']
    search_fields = ['email', 'display_name', 'username']
    ordering = ['-created_at']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('CitizenCivic', {
            'fields': ('role', 'phone_hash', 'display_name', 'preferred_language', 'is_verified'),
        }),
    )
