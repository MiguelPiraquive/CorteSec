"""
URLs del Sistema de Reportes Multi-Módulo
========================================

Configuración de URLs para el sistema de reportes que permite
generar reportes de cualquier módulo del sistema.

Autor: Sistema CorteSec
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from . import api_views

app_name = 'reportes'

# URLs para vistas de Django (templates)
urlpatterns = [
    # Vista principal - Lista de módulos
    path('', views.ModulosReporteListView.as_view(), name='modulos_list'),
    
    # Configurador de reportes
    path('configurar/<uuid:pk>/', views.ConfiguradorReporteView.as_view(), name='configurador'),
    
    # Historial de reportes
    path('historial/', views.ReportesHistorialView.as_view(), name='historial'),
    
    # AJAX endpoints
    path('ajax/generar/', views.generar_reporte_ajax, name='generar_ajax'),
    path('ajax/guardar-configuracion/', views.guardar_configuracion_ajax, name='guardar_configuracion_ajax'),
    path('ajax/cargar-configuracion/<uuid:pk>/', views.cargar_configuracion_ajax, name='cargar_configuracion_ajax'),
    path('ajax/valores-campo/', views.obtener_valores_campo_ajax, name='valores_campo_ajax'),
    
    # Descarga de reportes
    path('descargar/<uuid:pk>/', views.descargar_reporte, name='descargar_reporte'),
    
    # API REST
    path('api/', include('reportes.api_urls')),
]
