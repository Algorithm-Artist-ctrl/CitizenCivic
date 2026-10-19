import django_filters

from .models import Case


class CaseFilter(django_filters.FilterSet):
    """Filter for cases: status, category, service_area, date range, hotspot."""

    status = django_filters.CharFilter(field_name='status', lookup_expr='exact')
    category = django_filters.UUIDFilter(field_name='category__id')
    service_area = django_filters.UUIDFilter(field_name='service_area__id')
    is_hotspot = django_filters.BooleanFilter(field_name='is_hotspot')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Case
        fields = ['status', 'category', 'service_area', 'is_hotspot', 'created_after', 'created_before']
