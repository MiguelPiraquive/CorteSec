"""
BaseAccessPolicy - RBAC + ABAC
"""

from rest_access_policy import AccessPolicy
from rest_framework import permissions
import logging

from .utils import build_permission_codes, check_permission

logger = logging.getLogger('access_policy')


class BaseAccessPolicy(AccessPolicy):
    """Clase base para policies con RBAC + ABAC."""

    id = None
    resource_name = None
    extra_permission_codes = []

    # Statements requeridos por rest_access_policy.
    # Permiten que el flujo llegue a nuestro check_permission() RBAC.
    statements = [
        {
            "action": ["*"],
            "principal": ["authenticated"],
            "effect": "allow",
        }
    ]

    ACTION_MAP = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'change',
        'partial_update': 'change',
        'destroy': 'delete',
    }

    METHOD_MAP = {
        'GET': 'view',
        'POST': 'add',
        'PUT': 'change',
        'PATCH': 'change',
        'DELETE': 'delete',
    }

    def _get_action(self, request, view):
        action = getattr(view, 'action', None)
        if action:
            # 1. Check standard CRUD action map
            mapped = self.ACTION_MAP.get(action)
            if mapped:
                return mapped
            # 2. Check policy-specific custom action map
            custom_map = getattr(self, 'CUSTOM_ACTION_MAP', None)
            if custom_map and action in custom_map:
                return custom_map[action]
            # 3. Fallback: map by HTTP method
            if request.method in permissions.SAFE_METHODS:
                return 'view'
            if request.method == 'DELETE':
                return 'delete'
            return 'change'
        return self.METHOD_MAP.get(request.method, request.method.lower())

    def _get_permission_codes(self, action):
        codes = []
        if self.resource_name:
            codes.extend(build_permission_codes(self.resource_name, action))
        if self.extra_permission_codes:
            codes.extend(self.extra_permission_codes)
        return codes

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        if not super().has_permission(request, view):
            return False

        action = self._get_action(request, view)
        codes = self._get_permission_codes(action)

        if not codes:
            return True

        contexto = {
            'request': request,
            'view': view,
            'action': action,
            'method': request.method,
            'user': request.user,
        }

        return check_permission(request.user, codes, contexto=contexto)

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False

        action = self._get_action(request, view)
        codes = self._get_permission_codes(action)
        if not codes:
            return True

        contexto = {
            'request': request,
            'view': view,
            'action': action,
            'method': request.method,
            'user': request.user,
            'obj': obj,
        }

        return check_permission(request.user, codes, contexto=contexto)

    def scope_queryset(self, request, queryset):
        return queryset
