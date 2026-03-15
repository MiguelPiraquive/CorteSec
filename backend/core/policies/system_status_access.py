"""
Política de acceso para Estado del Sistema.
Reemplaza _require_staff() con RBAC granular via core.view_system_status.
"""
from .base import BaseAccessPolicy


class SystemStatusAccessPolicy(BaseAccessPolicy):
    id = 'system-status-policy'
    resource_name = 'core'

    def _get_action(self):
        """Todas las acciones de system status requieren view_system_status."""
        return 'view_system_status'
