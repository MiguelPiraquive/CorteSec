"""
Política de acceso para Organizaciones.
Reemplaza los chequeos manuales _is_admin() con RBAC granular.
"""
from .base import BaseAccessPolicy


class OrganizacionesAccessPolicy(BaseAccessPolicy):
    id = 'organizaciones-policy'
    resource_name = 'organizaciones'

    CUSTOM_ACTION_MAP = {
        'current':        'view',
        'switch':         'change',
        'set_plan':       'admin',
    }
