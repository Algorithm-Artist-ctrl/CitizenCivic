from rest_framework import serializers
from .models import RewardConfig, RewardLedger


class RewardConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardConfig
        fields = ['id', 'action_type', 'points_value', 'is_active', 'description']


class RewardLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardLedger
        fields = ['id', 'user', 'points', 'reason', 'related_case', 'idempotency_key', 'created_at']
        read_only_fields = fields


class UserPointsSummarySerializer(serializers.Serializer):
    total_points = serializers.IntegerField()
    recent_entries = RewardLedgerSerializer(many=True)


class LeaderboardEntrySerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    display_name = serializers.CharField()
    total_points = serializers.IntegerField()
