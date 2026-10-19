from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'actor', 'action', 'resource_type', 'resource_id']
    list_filter = ['action', 'resource_type']
    search_fields = ['action', 'resource_type']
    readonly_fields = ['id', 'actor', 'action', 'resource_type', 'resource_id', 'changes', 'ip_address', 'created_at']
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
