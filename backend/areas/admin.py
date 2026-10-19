from django.contrib import admin

from .models import ServiceArea, Category


@admin.register(ServiceArea)
class ServiceAreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'responsible_team_name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'responsible_team_name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'slug', 'is_active', 'sort_order']
    list_filter = ['is_active']
    search_fields = ['name_en', 'slug']
    prepopulated_fields = {'slug': ('name_en',)}
