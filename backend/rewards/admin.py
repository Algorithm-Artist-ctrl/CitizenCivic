from django.contrib import admin
from .models import RewardConfig, RewardLedger


@admin.register(RewardConfig)
class RewardConfigAdmin(admin.ModelAdmin):
    list_display = ('action_type', 'points_value', 'is_active')
    list_editable = ('points_value', 'is_active')


@admin.register(RewardLedger)
class RewardLedgerAdmin(admin.ModelAdmin):
    list_display = ('user', 'points', 'reason', 'related_case', 'created_at')
    list_filter = ('reason', 'created_at')
    search_fields = ('user__email', 'user__display_name', 'reason', 'idempotency_key')
    readonly_fields = ('id', 'created_at', 'idempotency_key')
