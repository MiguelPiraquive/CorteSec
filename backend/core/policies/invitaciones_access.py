"""
Política de acceso para Invitaciones.
Reemplaza los chequeos manuales de organization_role con RBAC granular.
"""
from .base import BaseAccessPolicy


class InvitacionesAccessPolicy(BaseAccessPolicy):
    id = 'invitaciones-policy'
    resource_name = 'invitaciones'

    CUSTOM_ACTION_MAP = {
        'resend': 'change',
        'cancel': 'delete',
    }
