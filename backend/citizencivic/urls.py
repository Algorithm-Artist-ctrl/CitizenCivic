"""
CitizenCivic URL Configuration
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import health_check, spa_or_api_root

urlpatterns = [
    # Health checks
    path('health/', health_check, name='health-check'),
    path('api/health/', health_check, name='api-health-check'),

    # Admin & APIs
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/areas/', include('areas.urls')),
    path('api/v1/cases/', include('cases.urls')),
    path('api/v1/rewards/', include('rewards.urls')),

    # Root & SPA catch-all for React frontend client
    path('', spa_or_api_root, name='root'),
    re_path(r'^(?!api/|admin/|static/|media/|health/).*$', spa_or_api_root, name='spa-catchall'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
