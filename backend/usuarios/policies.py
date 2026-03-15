from core.policies import BaseAccessPolicy


class UsuariosAccessPolicy(BaseAccessPolicy):
    id = 'usuarios-policy'
    resource_name = 'usuarios'

    CUSTOM_ACTION_MAP = {
        'toggle_activo':            'change',
        'cambiar_contrasena':       'change',
        'asignar_roles':            'change',
        'get_permisos':             'view',
        'get_historial_actividad':  'view',
        'get_estadisticas':         'view',
        'exportar':                 'admin',
        'verificar_username':       'add',
        'verificar_email':          'add',
        'resetear_contrasena':      'change',
    }
