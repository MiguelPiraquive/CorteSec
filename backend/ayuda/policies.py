"""
AyudaAccessPolicy - Permisos granulares del módulo Ayuda
=========================================================

Mapea cada acción del ViewSet a permisos específicos:
  - view          → ayuda.view     (lectura general)
  - add           → ayuda.add      (crear artículos/FAQs/tutoriales)
  - change        → ayuda.change   (editar contenido)
  - delete        → ayuda.delete   (eliminar contenido)
  - manage_tickets→ ayuda.manage_tickets (responder/cambiar estado tickets)
"""

from core.policies import BaseAccessPolicy


class AyudaAccessPolicy(BaseAccessPolicy):
    id = 'ayuda-policy'
    resource_name = 'ayuda'

    # Mapa de acciones personalizadas → verbo de permiso
    CUSTOM_ACTION_MAP = {
        # ─── Lectura general ───
        'list': 'view',
        'retrieve': 'view',
        'activos': 'view',
        'activas': 'view',
        'articulos': 'view',
        'populares': 'view',
        'recientes': 'view',
        'buscar': 'view',
        'progreso': 'view',
        'acceder': 'view',

        # ─── Creación ───
        'create': 'add',

        # ─── Edición ───
        'update': 'change',
        'partial_update': 'change',

        # ─── Eliminación ───
        'destroy': 'delete',

        # ─── Gestión de tickets ───
        'responder': 'manage_tickets',
        'cambiar_estado': 'manage_tickets',

        # ─── Progreso tutorial (cualquier usuario autenticado) ───
        'marcar_completado': 'view',
    }

    def _get_action(self, request, view):
        """Resolver acción usando CUSTOM_ACTION_MAP antes del fallback."""
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        return super()._get_action(request, view)
