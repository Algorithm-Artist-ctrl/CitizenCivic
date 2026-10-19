from django.contrib import admin

from .models import Case, CaseTransition, CaseObservation, CaseEvidence, Feedback, HotspotCheck


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['case_number', 'status', 'category', 'primary_reporter', 'assigned_operator', 'created_at']
    list_filter = ['status', 'is_hotspot', 'category']
    search_fields = ['case_number', 'description', 'landmark']
    raw_id_fields = ['primary_reporter', 'assigned_operator', 'category', 'service_area']
    readonly_fields = ['case_number', 'created_at', 'updated_at', 'acknowledged_at', 'resolved_at', 'verified_at']


@admin.register(CaseTransition)
class CaseTransitionAdmin(admin.ModelAdmin):
    list_display = ['case', 'from_status', 'to_status', 'actor', 'created_at']
    list_filter = ['to_status']
    raw_id_fields = ['case', 'actor']
    readonly_fields = ['id', 'created_at']


@admin.register(CaseObservation)
class CaseObservationAdmin(admin.ModelAdmin):
    list_display = ['case', 'reporter', 'observed_at', 'created_at']
    raw_id_fields = ['case', 'reporter']


@admin.register(CaseEvidence)
class CaseEvidenceAdmin(admin.ModelAdmin):
    list_display = ['case', 'uploaded_by', 'evidence_type', 'file_size', 'created_at']
    list_filter = ['evidence_type']
    raw_id_fields = ['case', 'uploaded_by']


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['case', 'user', 'feedback_type', 'rating', 'is_dispute', 'created_at']
    list_filter = ['feedback_type', 'is_dispute']
    raw_id_fields = ['case', 'user']


@admin.register(HotspotCheck)
class HotspotCheckAdmin(admin.ModelAdmin):
    list_display = ['original_case', 'check_type', 'result', 'scheduled_for', 'completed_at']
    list_filter = ['check_type', 'result']
    raw_id_fields = ['original_case', 'follow_up_case']
