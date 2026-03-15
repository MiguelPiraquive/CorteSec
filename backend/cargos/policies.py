from core.policies import BaseAccessPolicy


class CargoAccessPolicy(BaseAccessPolicy):
    id = 'cargo-policy'
    resource_name = 'cargos'

    CUSTOM_ACTION_MAP = {
        'toggle_activo': 'change',
        'bulk_action':   'change',  # sub-action check in ViewSet: activate/deactivate→change, delete→delete
        'jerarquia':     'view',
        'estadisticas':  'view',
        'buscar':        'view',
        'subordinados':  'view',
        'historial':     'view',
    }
