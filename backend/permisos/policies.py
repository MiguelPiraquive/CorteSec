from core.policies import BaseAccessPolicy


class PermisosAdminAccessPolicy(BaseAccessPolicy):
    """
    Policy para administración del sistema de permisos.
    Solo superusers y admins con permisos.view/change pueden gestionar permisos.

    Permisos:
      permisos.view   → Listar/ver permisos, tipos, dashboard, estadísticas
      permisos.add    → Crear permisos
      permisos.change → Editar permisos, toggle, evaluar, verificar
      permisos.delete → Eliminar permisos
    """
    id = 'permisos-admin-policy'
    resource_name = 'permisos'

    CUSTOM_ACTION_MAP = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'change',
        'partial_update': 'change',
        'destroy': 'delete',
        # Acciones custom lectura
        'tree': 'view',
        'by_module': 'view',
        'by_user': 'view',
        'stats': 'view',
        'general': 'view',
        'categorias': 'view',
        'estadisticas': 'view',
        # Acciones custom escritura
        'toggle_active': 'change',
        'evaluate': 'change',
        'verify': 'view',
        'clear_cache': 'change',
        'revoke': 'delete',
    }

    def _get_action(self, request, view):
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        return super()._get_action(request, view)


class PermisosDirectosPolicy(BaseAccessPolicy):
    """
    Política para gestión de permisos directos.
    Permiso: permisos.manage_directos
    """
    id = 'permisos-directos-policy'
    resource_name = 'permisos'

    def _get_action(self, request, view):
        return 'manage_directos'


class ModulosSistemaPolicy(BaseAccessPolicy):
    """
    Política para gestión de módulos del sistema.
    Permiso: permisos.manage_modulos
    """
    id = 'modulos-sistema-policy'
    resource_name = 'permisos'

    def _get_action(self, request, view):
        return 'manage_modulos'


class CondicionesPermisoPolicy(BaseAccessPolicy):
    """
    Política para gestión de condiciones de permisos.
    Permiso: permisos.manage_condiciones
    """
    id = 'condiciones-permiso-policy'
    resource_name = 'permisos'

    def _get_action(self, request, view):
        return 'manage_condiciones'


class AuditoriaPermisosPolicy(BaseAccessPolicy):
    """
    Política para auditoría de permisos (solo lectura).
    Permiso: permisos.view_auditoria
    """
    id = 'auditoria-permisos-policy'
    resource_name = 'permisos'

    def _get_action(self, request, view):
        return 'view_auditoria'
