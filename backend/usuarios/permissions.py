"""
ASOGAN - Permisos de Usuarios
Permisos granulares para gestión de usuarios usando codigos reales de la BD
"""

from rest_framework import permissions
import logging

from core.policies.utils import check_permission

logger = logging.getLogger(__name__)


def tiene_permiso(usuario, codigo_permiso):
    """
    Verifica si un usuario tiene un permiso específico.
    Usa los codigos reales de la BD (usuarios.view, usuarios.add, etc.)
    """
    if not usuario or not usuario.is_authenticated:
        return False

    if usuario.is_superuser:
        return True

    try:
        return check_permission(usuario, [codigo_permiso], contexto={})
    except Exception as e:
        logger.error(f"Error verificando permiso {codigo_permiso}: {e}")
        return False


class CanViewUsers(permissions.BasePermission):
    """Permiso para ver listado de usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.view')


class CanCreateUsers(permissions.BasePermission):
    """Permiso para crear usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.add')


class CanEditUsers(permissions.BasePermission):
    """Permiso para editar usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.change')

    def has_object_permission(self, request, view, obj):
        if obj.id == request.user.id:
            return False
        return tiene_permiso(request.user, 'usuarios.change')


class CanDeleteUsers(permissions.BasePermission):
    """Permiso para eliminar usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.delete')

    def has_object_permission(self, request, view, obj):
        if obj.id == request.user.id:
            return False
        return tiene_permiso(request.user, 'usuarios.delete')


class CanActivateUsers(permissions.BasePermission):
    """Permiso para activar/desactivar usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.change')

    def has_object_permission(self, request, view, obj):
        if obj.id == request.user.id:
            return False
        return tiene_permiso(request.user, 'usuarios.change')


class CanChangeRoles(permissions.BasePermission):
    """Permiso para cambiar roles de usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.change')


class CanViewStats(permissions.BasePermission):
    """Permiso para ver estadísticas de usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.view')


class CanExportUsers(permissions.BasePermission):
    """Permiso para exportar datos de usuarios"""

    def has_permission(self, request, view):
        return tiene_permiso(request.user, 'usuarios.admin')


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permiso para que un usuario solo pueda ver/editar su propio perfil o ser admin"""

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        return obj.id == request.user.id
