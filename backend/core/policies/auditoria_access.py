"""
AuditoriaAccessPolicy — Permisos granulares para Auditoría
==========================================================

Cada acción del ViewSet se mapea a un permiso específico:
  - list/retrieve          → auditoria.view
  - estadisticas           → auditoria.view  (lectura básica)
  - actividad_usuarios     → auditoria.view
  - actividad_modulos      → auditoria.view
  - linea_tiempo           → auditoria.view
  - filtros_disponibles    → auditoria.view
  - exportar_csv           → auditoria.export
  - exportar_excel         → auditoria.export
  - anomalias              → auditoria.security
  - accesos_fallidos       → auditoria.security
  - busqueda_avanzada      → auditoria.view
  - log_frontend           → auditoria.add  (crear logs)
"""

from .base import BaseAccessPolicy


class AuditoriaAccessPolicy(BaseAccessPolicy):
    id = 'auditoria-policy'
    resource_name = 'auditoria'

    # Mapeo de acciones personalizadas a permisos granulares
    CUSTOM_ACTION_MAP = {
        # Lectura básica
        'list': 'view',
        'retrieve': 'view',
        'estadisticas': 'view',
        'actividad_usuarios': 'view',
        'actividad_modulos': 'view',
        'linea_tiempo': 'view',
        'filtros_disponibles': 'view',
        'busqueda_avanzada': 'view',
        # Exportación
        'exportar_csv': 'export',
        'exportar_excel': 'export',
        # Seguridad
        'anomalias': 'security',
        'accesos_fallidos': 'security',
        # Crear logs desde frontend
        'log_frontend': 'add',
    }

    def _get_action(self, request, view):
        """Override para mapear acciones custom a permisos granulares."""
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        # Fallback al comportamiento base
        return super()._get_action(request, view)
