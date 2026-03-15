from core.policies import BaseAccessPolicy
from core.policies.utils import build_permission_codes


class DashboardAccessPolicy(BaseAccessPolicy):
    """
    Política de acceso granular para el módulo de Proyectos.
    
    Cada @action del viewset se mapea a un permiso específico
    bajo el módulo 'proyectos' en lugar del genérico 'dashboard.view'.
    """
    id = 'dashboard-policy'
    resource_name = 'proyectos'

    # Mapeo de action name → código de permiso granular
    ACTION_PERMISSION_MAP = {
        # CRUD estándar (DRF)
        'list':           'proyectos.view',
        'retrieve':       'proyectos.view_detail',
        'create':         'proyectos.create',
        'update':         'proyectos.edit',
        'partial_update': 'proyectos.edit',
        'destroy':        'proyectos.delete',

        # @action endpoints
        'stats':              'proyectos.stats',
        'kanban':             'proyectos.kanban',
        'cambiar_estado':     'proyectos.change_estado',
        'kpis':               'proyectos.kpis',
        'asignaciones':       'proyectos.asignaciones_view',   # GET
        'desasignar':         'proyectos.asignaciones_manage',
        'summary':            'proyectos.view',
        'timeline':           'proyectos.timeline',
        'comparativa':        'proyectos.reports',
        'plantillas':         'proyectos.plantillas',
        'crear_desde_plantilla': 'proyectos.plantillas',
        'export_excel':       'proyectos.export_excel',
        'export_pdf':         'proyectos.export_pdf',
        'predicciones':       'proyectos.predicciones',
        'logros':             'proyectos.logros',
        'clear':              'proyectos.active_project',
    }

    # Para 'asignaciones' necesitamos diferenciar GET vs POST
    ACTION_METHOD_MAP = {
        ('asignaciones', 'POST'): 'proyectos.asignaciones_manage',
        ('asignaciones', 'GET'):  'proyectos.asignaciones_view',
        ('cambiar_estado', 'PATCH'): 'proyectos.change_estado',
    }

    def _get_permission_codes(self, action, request=None):
        """Override para retornar el permiso granular específico de cada acción."""
        # Primero checar el mapa método-específico
        if request:
            method_key = (action, request.method)
            if method_key in self.ACTION_METHOD_MAP:
                code = self.ACTION_METHOD_MAP[method_key]
                return [code]

        # Luego el mapa general
        code = self.ACTION_PERMISSION_MAP.get(action)
        if code:
            return [code]

        # Fallback: usar resource_name + action type (comportamiento base)
        return super()._get_permission_codes(action)

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        if not super(BaseAccessPolicy, self).has_permission(request, view):
            return False

        action = getattr(view, 'action', None) or self._get_action(request, view)
        codes = self._get_permission_codes(action, request=request)

        if not codes:
            return True

        from core.policies.utils import check_permission
        contexto = {
            'request': request,
            'view': view,
            'action': action,
            'method': request.method,
            'user': request.user,
        }
        return check_permission(request.user, codes, contexto=contexto)

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False

        action = getattr(view, 'action', None) or self._get_action(request, view)
        codes = self._get_permission_codes(action, request=request)
        if not codes:
            return True

        from core.policies.utils import check_permission
        contexto = {
            'request': request,
            'view': view,
            'action': action,
            'method': request.method,
            'user': request.user,
            'obj': obj,
        }
        return check_permission(request.user, codes, contexto=contexto)


class DashboardViewPolicy(BaseAccessPolicy):
    """
    Política de acceso para las vistas generales del dashboard
    (métricas, actividad, gráficos, stats, AI, realtime).
    Requiere dashboard.view para todas las acciones.
    """
    id = 'dashboard-view-policy'
    resource_name = 'dashboard'

    def _get_action(self, request=None, view=None):
        """Todas las vistas generales del dashboard requieren 'view'."""
        return 'view'