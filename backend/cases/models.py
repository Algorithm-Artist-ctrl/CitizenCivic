import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.utils import generate_case_number


class CaseStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    REVIEWED = 'REVIEWED', 'Reviewed'
    FORWARDED = 'FORWARDED', 'Forwarded'
    ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    RESOLUTION_REPORTED = 'RESOLUTION_REPORTED', 'Resolution Reported'
    VERIFICATION_PENDING = 'VERIFICATION_PENDING', 'Verification Pending'
    VERIFIED_RESOLVED = 'VERIFIED_RESOLVED', 'Verified Resolved'
    REJECTED = 'REJECTED', 'Rejected'
    DUPLICATE = 'DUPLICATE', 'Duplicate'
    DISPUTED_CLOSURE = 'DISPUTED_CLOSURE', 'Disputed Closure'
    REOPENED = 'REOPENED', 'Reopened'
    ESCALATED = 'ESCALATED', 'Escalated'
    UNABLE_TO_RESOLVE = 'UNABLE_TO_RESOLVE', 'Unable to Resolve'


# ────────────────────────────────────────────────────────
# State-machine transition table
# {current_status: {target_status: [allowed_roles]}}
# ────────────────────────────────────────────────────────
VALID_TRANSITIONS = {
    'DRAFT': {
        'SUBMITTED': ['CITIZEN'],
    },
    'SUBMITTED': {
        'REVIEWED': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
        'REJECTED': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'REVIEWED': {
        'FORWARDED': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
        'DUPLICATE': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'FORWARDED': {
        'ACKNOWLEDGED': ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'ACKNOWLEDGED': {
        'IN_PROGRESS': ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'IN_PROGRESS': {
        'RESOLUTION_REPORTED': ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
        'ESCALATED': ['SUPERVISOR', 'ADMIN'],
        'UNABLE_TO_RESOLVE': ['OPERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'RESOLUTION_REPORTED': {
        'VERIFICATION_PENDING': ['OPERATOR', 'MODERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'VERIFICATION_PENDING': {
        'VERIFIED_RESOLVED': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
        'DISPUTED_CLOSURE': ['CITIZEN'],
    },
    'DISPUTED_CLOSURE': {
        'IN_PROGRESS': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
        'VERIFIED_RESOLVED': ['MODERATOR', 'SUPERVISOR', 'ADMIN'],
    },
    'REJECTED': {
        'SUBMITTED': ['CITIZEN'],
    },
    'ESCALATED': {
        'IN_PROGRESS': ['SUPERVISOR', 'ADMIN'],
    },
}


class Case(models.Model):
    """Central model representing a civic problem report."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=20, unique=True, db_index=True)
    primary_reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reported_cases',
    )
    category = models.ForeignKey(
        'areas.Category',
        on_delete=models.PROTECT,
        related_name='cases',
    )
    service_area = models.ForeignKey(
        'areas.ServiceArea',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
    )
    assigned_operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cases',
    )
    status = models.CharField(
        max_length=30,
        choices=CaseStatus.choices,
        default=CaseStatus.DRAFT,
        db_index=True,
    )
    description = models.TextField()
    landmark = models.CharField(max_length=300, blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_hotspot = models.BooleanField(default=False, db_index=True)
    linked_primary_case = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicate_cases',
        help_text='Link to the primary case when this is marked as duplicate',
    )
    external_reference = models.CharField(
        max_length=200, blank=True, null=True,
        help_text='External partner system tracking ID',
    )
    rejection_reason = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'

    def __str__(self):
        return f'{self.case_number} [{self.status}]'

    def save(self, *args, **kwargs):
        if not self.case_number:
            self.case_number = generate_case_number()
        super().save(*args, **kwargs)

    # ── State-machine helpers ──────────────────────────

    def get_valid_transitions(self, user_role):
        """Return a list of status values the given role may transition this case to."""
        targets = VALID_TRANSITIONS.get(self.status, {})
        return [target for target, roles in targets.items() if user_role in roles]

    def can_transition_to(self, new_status, user_role):
        """Check whether the role is allowed to move this case to new_status."""
        allowed_roles = VALID_TRANSITIONS.get(self.status, {}).get(new_status, [])
        return user_role in allowed_roles

    def transition_to(self, new_status, actor, reason='', evidence_refs=None):
        """
        Execute a state transition:
        1. Validate the transition
        2. Create a CaseTransition record
        3. Create an AuditLog entry
        4. Update milestone timestamps
        5. Save the case
        """
        from core.models import AuditLog

        if not self.can_transition_to(new_status, actor.role):
            valid = self.get_valid_transitions(actor.role)
            raise ValueError(
                f'Invalid transition from {self.status} to {new_status} '
                f'for role {actor.role}. Valid targets: {valid}'
            )

        old_status = self.status
        self.status = new_status

        # Update milestone timestamps
        now = timezone.now()
        if new_status == CaseStatus.ACKNOWLEDGED:
            self.acknowledged_at = now
        elif new_status in (CaseStatus.RESOLUTION_REPORTED, CaseStatus.VERIFIED_RESOLVED):
            self.resolved_at = now
        if new_status == CaseStatus.VERIFIED_RESOLVED:
            self.verified_at = now

        self.save()

        # Create transition record
        CaseTransition.objects.create(
            case=self,
            from_status=old_status,
            to_status=new_status,
            actor=actor,
            reason=reason,
            evidence_refs=evidence_refs,
        )

        # Create audit log entry
        AuditLog.objects.create(
            actor=actor,
            action='CASE_TRANSITION',
            resource_type='Case',
            resource_id=self.id,
            changes={
                'from_status': old_status,
                'to_status': new_status,
                'reason': reason,
            },
        )


class CaseTransition(models.Model):
    """Immutable record of every case status change."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='transitions',
    )
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='case_transitions',
    )
    reason = models.TextField(blank=True, default='')
    evidence_refs = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Case Transition'
        verbose_name_plural = 'Case Transitions'

    def __str__(self):
        return f'{self.case.case_number}: {self.from_status} → {self.to_status}'


class CaseObservation(models.Model):
    """Follow-up observation attached to a case by any user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='observations',
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='observations',
    )
    description = models.TextField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    observed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observed_at']

    def __str__(self):
        return f'Observation on {self.case.case_number} by {self.reporter}'


class CaseEvidence(models.Model):
    """File evidence (photos, documents) attached to a case."""

    class EvidenceType(models.TextChoices):
        PHOTO = 'PHOTO', 'Photo'
        BEFORE_PHOTO = 'BEFORE_PHOTO', 'Before Photo'
        AFTER_PHOTO = 'AFTER_PHOTO', 'After Photo'
        DOCUMENT = 'DOCUMENT', 'Document'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='evidence',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='uploaded_evidence',
    )
    evidence_type = models.CharField(
        max_length=20,
        choices=EvidenceType.choices,
        default=EvidenceType.PHOTO,
    )
    file = models.FileField(upload_to='evidence/%Y/%m/%d/')
    content_type = models.CharField(max_length=100)
    file_size = models.IntegerField()
    ai_metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Case Evidence'
        verbose_name_plural = 'Case Evidence'

    def __str__(self):
        return f'{self.evidence_type} for {self.case.case_number}'


class Feedback(models.Model):
    """Citizen/stakeholder feedback on a case."""

    class FeedbackType(models.TextChoices):
        SATISFACTION = 'SATISFACTION', 'Satisfaction'
        DISPUTE = 'DISPUTE', 'Dispute'
        COMMENT = 'COMMENT', 'Comment'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='feedback',
    )
    feedback_type = models.CharField(
        max_length=20,
        choices=FeedbackType.choices,
        default=FeedbackType.COMMENT,
    )
    rating = models.IntegerField(null=True, blank=True, help_text='1-5 stars')
    comment = models.TextField(blank=True, default='')
    is_dispute = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.feedback_type} on {self.case.case_number} by {self.user}'


class HotspotCheck(models.Model):
    """Scheduled follow-up checks for hotspot cases."""

    class CheckType(models.TextChoices):
        SEVEN_DAY = 'SEVEN_DAY', '7-Day Check'
        THIRTY_DAY = 'THIRTY_DAY', '30-Day Check'

    class Result(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CLEAN = 'CLEAN', 'Clean'
        RECURRENCE = 'RECURRENCE', 'Recurrence'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='hotspot_checks',
    )
    follow_up_case = models.ForeignKey(
        Case,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hotspot_followups',
    )
    check_type = models.CharField(max_length=20, choices=CheckType.choices)
    result = models.CharField(
        max_length=20,
        choices=Result.choices,
        default=Result.PENDING,
    )
    scheduled_for = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_for']

    def __str__(self):
        return f'{self.check_type} for {self.original_case.case_number}'
