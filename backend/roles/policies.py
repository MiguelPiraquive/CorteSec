from core.policies import BaseAccessPolicy


class RolesAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso granular para Roles.

    Permisos:
      roles.view        → Listar/ver roles, jerarquía, estadísticas
      roles.add         → Crear roles
      roles.change      → Editar roles, toggle activo, asignar/revocar/sincronizar permisos
      roles.delete      → Eliminar roles
    """
    id = 'roles-policy'
    resource_name = 'roles'

    CUSTOM_ACTION_MAP = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'change',
        'partial_update': 'change',
        'destroy': 'delete',
        # Acciones custom de lectura
        'jerarquia': 'view',
        'descendientes': 'view',
        'usuarios': 'view',
        'estadisticas': 'view',
        'modulos': 'view',
        'permisos': 'view',
        'publicos': 'view',
        'permisos_rol': 'view',
        'permisos_disponibles': 'view',
        'comparar_roles': 'view',
        # Acciones custom de escritura
        'toggle_activo': 'change',
        'asignar_usuario': 'change',
        'asignar_permisos': 'change',
        'revocar_permisos': 'change',
        'sincronizar_permisos': 'change',
        'copiar_permisos': 'change',
        'validar_codigo': 'view',
    }

    def _get_action(self, request, view):
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        return super()._get_action(request, view)


class TipoRolAccessPolicy(BaseAccessPolicy):
    """Política para Tipos de Rol — usa mapeo estándar CRUD → roles.*"""
    id = 'tipo-rol-policy'
    resource_name = 'roles'


class AsignacionRolAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Asignaciones de Roles.
    Permiso: roles.manage_asignaciones
    """
    id = 'asignacion-rol-policy'
    resource_name = 'roles'

    def _get_action(self, request, view):
        return 'manage_asignaciones'


class HistorialAsignacionPolicy(BaseAccessPolicy):
    """
    Política para historial de asignaciones (solo lectura).
    Permiso: roles.view_historial
    """
    id = 'historial-asignacion-policy'
    resource_name = 'roles'

    def _get_action(self, request, view):
        return 'view_historial'


class AuditoriaRolPolicy(BaseAccessPolicy):
    """
    Política para auditoría de roles (solo lectura).
    Permiso: roles.view_auditoria
    """
    id = 'auditoria-rol-policy'
    resource_name = 'roles'

    def _get_action(self, request, view):
        return 'view_auditoria'
