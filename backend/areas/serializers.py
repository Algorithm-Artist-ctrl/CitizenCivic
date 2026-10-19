from rest_framework import serializers

from .models import ServiceArea, Category


class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = [
            'id', 'name', 'name_hi', 'description',
            'latitude', 'longitude', 'radius_meters',
            'responsible_team_name', 'contact_info',
            'escalation_rules', 'operating_hours',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id', 'name_en', 'name_hi', 'slug',
            'description', 'is_active', 'sort_order', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
