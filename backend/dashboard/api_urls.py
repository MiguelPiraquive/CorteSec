"""
Dashboard API URLs
==================

URLs para las APIs del dashboard que consume el frontend React.
"""

from django.urls import path
from . import api_views_new

urlpatterns = [
    # Métricas básicas del dashboard
    path('metrics/', api_views_new.dashboard_metrics, name='dashboard_metrics'),
    
    # Actividad reciente del sistema
    path('activity/', api_views_new.dashboard_recent_activity, name='dashboard_activity'),
    
    # Estadísticas y gráficas avanzadas
    path('charts/', api_views_new.dashboard_charts, name='dashboard_charts'),
    
    # Estadísticas generales
    path('stats/', api_views_new.dashboard_stats, name='dashboard_stats'),
]
