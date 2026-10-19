"""
CitizenCivic Core Views: Health check, API root, and SPA frontend serving.
"""

from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, JsonResponse


def health_check(request):
    """
    Service health check for Render, load balancers, and monitoring.
    """
    return JsonResponse({
        "status": "healthy",
        "service": "CitizenCivic",
        "version": "1.0.0",
    })


def spa_or_api_root(request):
    """
    Serves the React SPA index.html if available, or returns an API directory.
    """
    # Look for built React index.html in several common locations
    candidate_paths = [
        settings.BASE_DIR.parent / "frontend" / "dist" / "index.html",
        settings.BASE_DIR.parent / "dist" / "index.html",
        settings.STATIC_ROOT / "index.html",
    ]

    for index_path in candidate_paths:
        if index_path.exists():
            with open(index_path, "r", encoding="utf-8") as f:
                return HttpResponse(f.read(), content_type="text/html")

    # If frontend has not been compiled, provide a clean JSON API index
    return JsonResponse({
        "status": "online",
        "service": "CitizenCivic Core API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/v1/auth/",
            "cases": "/api/v1/cases/",
            "areas": "/api/v1/areas/",
            "rewards": "/api/v1/rewards/",
            "health": "/health/",
        },
        "documentation": "Connect a React frontend or use the endpoints above.",
    })
