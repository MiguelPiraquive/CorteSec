"""
URLs de la aplicación Core
==========================

URLs para funcionalidades centrales del sistema.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.urls import path
from . import views
from . import search_apis
from . import api_views
from .system_status import system_status, system_health_check

app_name = 'core'

urlpatterns = [
    # ==================== REACT SPA ====================
    path('app/', views.react_app, name='react_app'),
    path('', views.react_spa_dev, name='react_spa_dev'),  # Ruta raíz para desarrollo
    
    # ==================== DASHBOARD CORE ====================
    path('dashboard/', views.dashboard_core, name='dashboard'),
    
    # ==================== ORGANIZACIONES ====================
    
    # Lista de organizaciones
    path('organizaciones/', views.organizaciones_list, name='organizaciones_list'),
    
    # Detalle de organización
    path('organizaciones/<uuid:pk>/', views.organizacion_detail, name='organizacion_detail'),
    
    # Crear organización
    path('organizaciones/crear/', views.organizacion_create, name='organizacion_create'),
    
    # Editar organización
    path('organizaciones/<uuid:pk>/editar/', views.organizacion_edit, name='organizacion_edit'),
    
    # Eliminar organización
    path('organizaciones/<uuid:pk>/eliminar/', views.organizacion_delete, name='organizacion_delete'),
    
    # ==================== NOTIFICACIONES ====================
    
    # Lista de notificaciones del usuario
    path('notificaciones/', views.notificaciones, name='notificaciones'),
    
    # Marcar notificación como leída
    path('notificaciones/<int:pk>/leida/', views.notificacion_marcar_leida, name='notificacion_marcar_leida'),
    
    # Marcar todas como leídas
    path('notificaciones/marcar-todas-leidas/', views.notificacion_marcar_todas_leidas, name='notificacion_marcar_todas_leidas'),
    
    # Toggle estado de notificación (AJAX)
    path('api/notificaciones/toggle/', views.notificacion_toggle, name='notificacion_toggle'),
    
    # Marcar todas como leídas (AJAX)
    path('api/notificaciones/marcar-todas/', views.notificaciones_marcar_todas, name='notificaciones_marcar_todas'),
    
    # Eliminar notificación (AJAX)
    path('api/notificaciones/delete/', views.notificacion_delete, name='notificacion_delete'),
    
    # ==================== BÚSQUEDA ====================
    
    # Búsqueda básica (legacy)
    path('buscar/', views.buscar, name='buscar'),
    
    # APIs de búsqueda ultra profesional
    path('api/search/', search_apis.search_global, name='search_global'),
    path('api/search/counts/', search_apis.search_counts, name='search_counts'),
    path('api/search/suggestions/', search_apis.search_suggestions, name='search_suggestions'),
    path('api/search/autocomplete/', search_apis.search_autocomplete, name='search_autocomplete'),
    path('api/search/smart-suggestions/', search_apis.search_smart_suggestions, name='search_smart_suggestions'),
    path('api/search/recent-history/', search_apis.search_recent_history, name='search_recent_history'),
    path('api/search/track-click/', search_apis.search_track_click, name='search_track_click'),
    path('api/search/history/', search_apis.search_history, name='search_history'),
    path('api/search/stats/', search_apis.search_stats, name='search_stats'),
    
    # ==================== SYSTEM STATUS Y HEALTH ====================
    
    # Verificación del sistema (solo para staff)
    path('api/system-status/', system_status, name='system_status'),
    path('api/health-check/', system_health_check, name='system_health_check'),
    path('system-check/', views.system_check, name='system_check'),
    
    # Health checks
    path('api/health/', views.health_check, name='health_check'),
    path('health/', views.health_check, name='health_simple'),  # URL alternativa más simple
    
    # Página de prueba para header sticky
    path('test-sticky/', views.test_sticky, name='test_sticky'),
    
    # ==================== APIs DE UTILIDAD ====================
    
    # API de notificaciones
    path('api/notificaciones/', views.api_notificaciones, name='api_notificaciones'),
    
    # API de organizaciones
    path('api/organizaciones/', views.api_organizaciones, name='api_organizaciones'),
    
    # API de configuración
    path('api/configuracion/<str:clave>/', views.api_configuracion, name='api_configuracion'),
    
    # ==================== APIs DEL DASHBOARD ====================
    
    # APIs para dashboard con datos reales
    path('api/dashboard/metrics/', api_views.dashboard_metrics_api, name='dashboard_metrics_api'),
    path('api/dashboard/activity/', api_views.dashboard_activity_heatmap, name='dashboard_activity_heatmap'),
    path('api/dashboard/historical/', api_views.dashboard_historical_data, name='dashboard_historical_data'),
    path('api/dashboard/kpi-trends/', api_views.dashboard_kpi_trends, name='dashboard_kpi_trends'),
    path('api/dashboard/departments/', api_views.dashboard_department_activity, name='dashboard_department_activity'),
    path('api/dashboard/hourly-patterns/', api_views.dashboard_hourly_patterns, name='dashboard_hourly_patterns'),
    path('api/dashboard/productivity-heatmap/', api_views.dashboard_productivity_heatmap, name='dashboard_productivity_heatmap'),
    path('api/dashboard/search-suggestions/', api_views.dashboard_search_suggestions, name='dashboard_search_suggestions'),
]
