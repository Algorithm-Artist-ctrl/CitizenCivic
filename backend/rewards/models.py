import uuid
from django.conf import settings
from django.db import models


class RewardActionType(models.TextChoices):
    REPORT_SUBMITTED = 'REPORT_SUBMITTED', 'Report Submitted'
    REPORT_VERIFIED = 'REPORT_VERIFIED', 'Report Verified'
    FEEDBACK_GIVEN = 'FEEDBACK_GIVEN', 'Feedback Given'
    OBSERVATION_ADDED = 'OBSERVATION_ADDED', 'Observation Added'


class RewardConfig(models.Model):
    """Configurable reward points for actions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action_type = models.CharField(max_length=50, choices=RewardActionType.choices, unique=True)
    points_value = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['action_type']

    def __str__(self):
        return f'{self.action_type} ({self.points_value} pts)'


class RewardLedger(models.Model):
    """Immutable audit trail of points credited to users."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reward_entries',
    )
    points = models.IntegerField()
    reason = models.CharField(max_length=200)
    related_case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reward_entries',
    )
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} +{self.points} pts ({self.reason})'
