from core.policies import BaseAccessPolicy


class ConfiguracionAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Configuración General y dashboard.
    Permisos: configuracion.view, configuracion.change
    """
    id = 'configuracion-policy'
    resource_name = 'configuracion'

    CUSTOM_ACTION_MAP = {
        'list': 'view',
        'retrieve': 'view',
        'update': 'change',
        'partial_update': 'change',
        'test_email': 'manage_email',  # legacy test_email en ConfiguracionGeneralViewSet
    }

    def _get_action(self, request, view):
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        return super()._get_action(request, view)


class ParametrosAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Parámetros del Sistema.
    Permiso: configuracion.manage_parametros
    """
    id = 'parametros-policy'
    resource_name = 'configuracion'

    def _get_action(self, request, view):
        return 'manage_parametros'


class ModulosAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Configuración de Módulos.
    Permiso: configuracion.manage_modulos
    """
    id = 'modulos-policy'
    resource_name = 'configuracion'

    def _get_action(self, request, view):
        return 'manage_modulos'


class SeguridadConfigAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Configuración de Seguridad.
    Permiso: configuracion.manage_seguridad
    """
    id = 'seguridad-config-policy'
    resource_name = 'configuracion'

    def _get_action(self, request, view):
        return 'manage_seguridad'


class EmailConfigAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Configuración de Email.
    Permiso: configuracion.manage_email
    """
    id = 'email-config-policy'
    resource_name = 'configuracion'

    def _get_action(self, request, view):
        return 'manage_email'


class LogsConfigAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso para Logs del sistema de configuración.
    Permiso: configuracion.view_logs
    """
    id = 'logs-config-policy'
    resource_name = 'configuracion'

    def _get_action(self, request, view):
        return 'view_logs'
