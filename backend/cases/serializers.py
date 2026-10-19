from django.utils import timezone
from rest_framework import serializers

from areas.serializers import CategorySerializer, ServiceAreaSerializer
from .models import (
    Case, CaseTransition, CaseObservation, CaseEvidence,
    Feedback, HotspotCheck, CaseStatus,
)


# ────────────────────────────────────────────────────────
# Nested / read-only serializers
# ────────────────────────────────────────────────────────

class CaseTransitionSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.display_name', read_only=True)

    class Meta:
        model = CaseTransition
        fields = [
            'id', 'from_status', 'to_status', 'actor', 'actor_name',
            'reason', 'evidence_refs', 'created_at',
        ]
        read_only_fields = fields


class CaseEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.display_name', read_only=True)

    class Meta:
        model = CaseEvidence
        fields = [
            'id', 'case', 'uploaded_by', 'uploaded_by_name',
            'evidence_type', 'file', 'content_type', 'file_size',
            'ai_metadata', 'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'content_type', 'file_size', 'created_at']


class CaseObservationSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.display_name', read_only=True)

    class Meta:
        model = CaseObservation
        fields = [
            'id', 'case', 'reporter', 'reporter_name',
            'description', 'latitude', 'longitude',
            'observed_at', 'created_at',
        ]
        read_only_fields = ['id', 'reporter', 'reporter_name', 'created_at']


class FeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'case', 'user', 'user_name',
            'feedback_type', 'rating', 'comment',
            'is_dispute', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'user_name', 'created_at']

    def validate_rating(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class HotspotCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotspotCheck
        fields = [
            'id', 'original_case', 'follow_up_case',
            'check_type', 'result', 'scheduled_for',
            'completed_at', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ────────────────────────────────────────────────────────
# Case serializers
# ────────────────────────────────────────────────────────

class CaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    category_name = serializers.CharField(source='category.name_en', read_only=True)
    reporter_name = serializers.CharField(source='primary_reporter.display_name', read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'status', 'category', 'category_name',
            'primary_reporter', 'reporter_name', 'landmark',
            'latitude', 'longitude', 'is_hotspot',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class CaseDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with nested timeline."""

    category_detail = CategorySerializer(source='category', read_only=True)
    service_area_detail = ServiceAreaSerializer(source='service_area', read_only=True)
    transitions = CaseTransitionSerializer(many=True, read_only=True)
    evidence = CaseEvidenceSerializer(many=True, read_only=True)
    observations = CaseObservationSerializer(many=True, read_only=True)
    feedback = FeedbackSerializer(many=True, read_only=True)
    valid_transitions = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'primary_reporter', 'status',
            'category', 'category_detail',
            'service_area', 'service_area_detail',
            'assigned_operator', 'description', 'landmark',
            'latitude', 'longitude', 'is_hotspot',
            'linked_primary_case', 'external_reference',
            'rejection_reason',
            'created_at', 'updated_at',
            'acknowledged_at', 'resolved_at', 'verified_at',
            'transitions', 'evidence', 'observations', 'feedback',
            'valid_transitions',
        ]
        read_only_fields = fields

    def get_valid_transitions(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_valid_transitions(request.user.role)
        return []


class CaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for citizen case submission."""

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'status', 'category', 'service_area',
            'description', 'landmark', 'latitude', 'longitude', 'created_at',
        ]
        read_only_fields = ['id', 'case_number', 'status', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        case = Case(
            primary_reporter=user,
            **validated_data,
        )
        case.save()
        # Auto-transition from DRAFT → SUBMITTED
        case.transition_to('SUBMITTED', actor=user, reason='Initial submission')
        return case


class CaseTransitionRequestSerializer(serializers.Serializer):
    """Serializer for status transition requests."""

    new_status = serializers.ChoiceField(choices=CaseStatus.choices)
    reason = serializers.CharField(required=False, default='', allow_blank=True)
    evidence_refs = serializers.JSONField(required=False, default=None)
