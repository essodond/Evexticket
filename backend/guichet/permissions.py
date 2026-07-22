from rest_framework.permissions import BasePermission
from django.core.exceptions import ObjectDoesNotExist


def get_admin_company(user):
    """Return the company managed by ``user``, if any."""
    if not user or not user.is_authenticated:
        return None

    company = user.admin_companies.first()
    if company is not None:
        return company

    try:
        return user.company_admin
    except (AttributeError, ObjectDoesNotExist):
        return None


class IsAgentGuichet(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated
            and hasattr(request.user, 'agentguichet')
            and request.user.agentguichet.actif
        )


class IsAdminCompagnie(BasePermission):
    def has_permission(self, request, view):
        return get_admin_company(request.user) is not None


class IsAdminCompagnieOrAgentGuichet(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (
            (hasattr(user, 'agentguichet') and user.agentguichet.actif)
            or get_admin_company(user) is not None
        )
