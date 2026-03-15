"""
Dashboard API URLs
==================

URLs para las APIs del dashboard que consume el frontend React.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views_new
from . import advanced_apis
from . import ai_analytics
from . import realtime_data
from .viewsets import ProjectViewSet, ActiveProjectViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='dashboard-projects')
router.register(r'active-project', ActiveProjectViewSet, basename='active-project')

urlpatterns = [
    # Métricas básicas del dashboard
    path('metrics/', api_views_new.dashboard_metrics, name='dashboard_metrics'),
    
    # Actividad reciente del sistema
    path('activity/', api_views_new.dashboard_recent_activity, name='dashboard_activity'),
    
    # Estadísticas y gráficas avanzadas
    path('charts/', api_views_new.dashboard_charts, name='dashboard_charts'),
    
    # Estadísticas generales
    path('stats/', api_views_new.dashboard_stats, name='dashboard_stats'),

    # Advanced analytics
    path('advanced/metrics/', advanced_apis.advanced_dashboard_metrics, name='advanced_dashboard_metrics'),
    path('advanced/projects/', advanced_apis.project_analytics, name='project_analytics'),
    path('advanced/financial/', advanced_apis.financial_analytics, name='financial_analytics'),
    path('advanced/bulk-operations/', advanced_apis.bulk_operations, name='dashboard_bulk_operations'),
    path('advanced/export/', advanced_apis.export_data, name='dashboard_export_data'),

    # AI analytics (lightweight)
    path('ai/performance/', ai_analytics.contractor_performance_prediction, name='ai_performance_prediction'),
    path('ai/salary-intelligence/', ai_analytics.salary_intelligence, name='ai_salary_intelligence'),
    path('ai/predictive/', ai_analytics.predictive_analytics, name='ai_predictive_analytics'),

    # Realtime snapshot
    path('realtime/snapshot/', realtime_data.realtime_snapshot, name='dashboard_realtime_snapshot'),

    # =========================================================================
    # DASHBOARD DE PERMISOS - Sistema RBAC
    # =========================================================================

    # Estadísticas completas del sistema de permisos
    path('permisos/stats/', api_views_new.permisos_dashboard_stats, name='permisos_dashboard_stats'),

    # Resumen ejecutivo (solo datos principales)
    path('permisos/resumen/', api_views_new.permisos_resumen, name='permisos_resumen'),

    # Alertas del sistema de permisos
    path('permisos/alerts/', api_views_new.permisos_dashboard_alerts, name='permisos_alerts'),

    # Listas de problemas detectados
    path('permisos/roles-sin-permisos/', api_views_new.permisos_roles_sin_permisos, name='permisos_roles_sin_permisos'),
    path('permisos/usuarios-sin-roles/', api_views_new.permisos_usuarios_sin_roles, name='permisos_usuarios_sin_roles'),
    path('permisos/asignaciones-expiradas/', api_views_new.permisos_asignaciones_expiradas, name='permisos_asignaciones_expiradas'),
    path('permisos/permisos-sin-asignar/', api_views_new.permisos_sin_asignar, name='permisos_sin_asignar'),

    # CRUD REST
    path('', include(router.urls)),
]
