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
    
    # Estadísticas generales
    path('stats/', api_views_new.dashboard_stats, name='dashboard_stats'),
    
    # TODO: Agregar más endpoints según sea necesario
]
