"""
CitizenCivic Core Views: Health check, API root, and Frontend SPA serving.
"""

from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from accounts.views import LoginView, RegisterView


def health_check(request):
    """Service health check for Render, monitoring, and uptime checks."""
    return JsonResponse({
        "status": "healthy",
        "service": "CitizenCivic",
        "version": "1.0.0",
    })


def _render_spa_or_json(request, title="CitizenCivic"):
    """
    Renders index.html template for browser requests, or returns API JSON.
    """
    is_json = (
        request.headers.get("accept", "").startswith("application/json")
        or request.GET.get("format") == "json"
    )

    if not is_json:
        # Check templates directory
        template_file = settings.BASE_DIR / "templates" / "index.html"
        if template_file.exists():
            return render(request, "index.html")

        # Fallback to dist directory if present
        dist_candidate = settings.BASE_DIR.parent / "frontend" / "dist" / "index.html"
        if dist_candidate.exists():
            with open(dist_candidate, "r", encoding="utf-8") as f:
                return HttpResponse(f.read(), content_type="text/html")

    return JsonResponse({
        "status": "online",
        "platform": "CitizenCivic",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/v1/auth/",
            "login": "/api/v1/auth/login/",
            "register": "/api/v1/auth/register/",
            "cases": "/api/v1/cases/",
            "areas": "/api/v1/areas/",
            "rewards": "/api/v1/rewards/",
            "health": "/health/",
        },
    })


def home_view(request):
    """Root homepage / dashboard."""
    return _render_spa_or_json(request)


@csrf_exempt
def login_view(request):
    """
    Handles /login/:
    - POST: delegates to JWT LoginView (TokenObtainPairView)
    - GET: renders the CitizenCivic login interface (or returns API JSON)
    """
    if request.method == "POST":
        return LoginView.as_view()(request)
    return _render_spa_or_json(request, title="CitizenCivic Login")


@csrf_exempt
def register_view(request):
    """
    Handles /register/:
    - POST: delegates to RegisterView
    - GET: renders the CitizenCivic registration interface (or returns API JSON)
    """
    if request.method == "POST":
        return RegisterView.as_view()(request)
    return _render_spa_or_json(request, title="CitizenCivic Register")


def spa_page_view(request):
    """Catch-all for SPA client routing (/cases, /report, etc.)."""
    return _render_spa_or_json(request)
