import json
import uuid
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

# Methods that mutate data and should be audit-logged
AUDITABLE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

# Paths to skip (noisy auth endpoints, admin assets, etc.)
SKIP_PATHS = {'/api/v1/auth/login/', '/api/v1/auth/token/refresh/'}


class AuditLogMiddleware(MiddlewareMixin):
    """
    Middleware that creates AuditLog entries for mutating HTTP requests.
    Runs *after* the view has processed the request so we can check response status.
    """

    def process_response(self, request, response):
        if request.method not in AUDITABLE_METHODS:
            return response

        if request.path in SKIP_PATHS:
            return response

        # Only log successful mutations (2xx)
        if not (200 <= response.status_code < 300):
            return response

        # Lazy import to avoid circular dependency at startup
        from core.models import AuditLog

        actor = request.user if hasattr(request, 'user') and request.user.is_authenticated else None

        # Derive resource info from the URL path
        path_parts = [p for p in request.path.strip('/').split('/') if p]
        resource_type = path_parts[-1] if path_parts else 'unknown'

        # Try to extract a resource ID from the response body
        resource_id = None
        try:
            if hasattr(response, 'data') and isinstance(response.data, dict):
                resource_id = response.data.get('id')
        except Exception:
            pass

        # Best-effort parse of request body for changes
        changes = None
        try:
            if request.body:
                changes = json.loads(request.body)
        except Exception:
            pass

        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR')

            AuditLog.objects.create(
                actor=actor,
                action=f'{request.method} {request.path}',
                resource_type=resource_type,
                resource_id=resource_id or uuid.uuid4(),
                changes=changes,
                ip_address=ip,
            )
        except Exception as exc:
            logger.warning('AuditLogMiddleware: failed to create audit log: %s', exc)

        return response
