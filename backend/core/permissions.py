from rest_framework.permissions import BasePermission


class IsOwnerOrStaff(BasePermission):
    """
    Object-level permission: allows access if the user is the case's
    primary_reporter OR has a staff-level role.
    """

    STAFF_ROLES = {'MODERATOR', 'OPERATOR', 'SUPERVISOR', 'ADMIN'}

    def has_object_permission(self, request, view, obj):
        if request.user.role in self.STAFF_ROLES:
            return True
        reporter = getattr(obj, 'primary_reporter', None) or getattr(obj, 'user', None)
        return reporter == request.user


class IsModerator(BasePermission):
    """Allows moderators, supervisors, and admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'MODERATOR', 'SUPERVISOR', 'ADMIN',
        )


class IsOperator(BasePermission):
    """Allows operators, supervisors, and admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'OPERATOR', 'SUPERVISOR', 'ADMIN',
        )


class IsSupervisor(BasePermission):
    """Allows supervisors and admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            'SUPERVISOR', 'ADMIN',
        )


class IsAdmin(BasePermission):
    """Allows only admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsCitizen(BasePermission):
    """Allows only citizens."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CITIZEN'


class CanTransitionCase(BasePermission):
    """
    Checks whether the requesting user's role is allowed to perform
    the requested state transition on a Case.
    """

    def has_object_permission(self, request, view, obj):
        new_status = request.data.get('new_status')
        if not new_status:
            return False
        return obj.can_transition_to(new_status, request.user.role)
