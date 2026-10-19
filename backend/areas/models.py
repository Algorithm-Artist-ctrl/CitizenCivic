import uuid

from django.db import models


class ServiceArea(models.Model):
    """Geographic service area with responsible team information."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    name_hi = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius_meters = models.IntegerField(default=1000)
    responsible_team_name = models.CharField(max_length=200)
    contact_info = models.TextField(blank=True, null=True)
    escalation_rules = models.JSONField(default=dict, blank=True)
    operating_hours = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Service Area'
        verbose_name_plural = 'Service Areas'

    def __str__(self):
        return self.name


class Category(models.Model):
    """Classification categories for civic reports."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_en = models.CharField(max_length=150)
    name_hi = models.CharField(max_length=150, blank=True, default='')
    slug = models.SlugField(max_length=150, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name_en']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name_en
