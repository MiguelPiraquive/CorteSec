from core.policies import BaseAccessPolicy


class PerfilAccessPolicy(BaseAccessPolicy):
    id = 'perfil-policy'
    resource_name = 'perfil'

    CUSTOM_ACTION_MAP = {
        'mi_perfil':             'view',
        'actualizar_mi_perfil':  'change',
        'publico':               'view',
        'estadisticas':          'admin',
        'export_excel':          'admin',
        'buscar':                'admin',
    }
