"""
CitizenCivic URL Configuration
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import health_check, home_view, login_view, register_view, spa_page_view

urlpatterns = [
    # Health checks
    path('health/', health_check, name='health-check'),
    path('api/health/', health_check, name='api-health-check'),

    # Direct Web & Auth routes
    path('', home_view, name='home'),
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),

    # Admin Portal
    path('admin/', admin.site.urls),

    # REST APIs (All existing routes and include prefixes preserved)
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/areas/', include('areas.urls')),
    path('api/v1/cases/', include('cases.urls')),
    path('api/v1/rewards/', include('rewards.urls')),

    # Frontend SPA Catch-all (for /cases, /report, etc.)
    re_path(r'^(?!api/|admin/|static/|media/|health/).*$', spa_page_view, name='spa-fallback'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
