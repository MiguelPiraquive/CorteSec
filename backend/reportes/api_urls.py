"""
URLs de la API REST para Reportes
================================

URLs específicas para la API REST del sistema de reportes.

Autor: Sistema CorteSec
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import api_views

app_name = 'reportes_api'

# Router para ViewSets
router = DefaultRouter()
router.register(r'modulos', api_views.ModuloReporteViewSet, basename='modulos')
router.register(r'reportes', api_views.ReporteGeneradoViewSet, basename='reportes')
router.register(r'configuraciones', api_views.ConfiguracionReporteViewSet, basename='configuraciones')
router.register(r'logs', api_views.LogReporteViewSet, basename='logs')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Endpoints adicionales
    path('estadisticas/', api_views.EstadisticasReporteAPIView.as_view(), name='estadisticas'),
    path('generar/', api_views.GenerarReporteAPIView.as_view(), name='generar_reporte'),
    path('modulos/<uuid:pk>/campos/', api_views.CamposModeloAPIView.as_view(), name='campos_modelo'),
    path('modulos/<uuid:pk>/valores-campo/', api_views.ValoresCampoAPIView.as_view(), name='valores_campo'),
    path('reportes/<uuid:pk>/descargar/', api_views.DescargarReporteAPIView.as_view(), name='descargar_reporte'),
    # path('reportes/<uuid:pk>/regenerar/', api_views.RegenerarReporteAPIView.as_view(), name='regenerar_reporte'),  # Clase no existe
    path('reportes/<uuid:pk>/progreso/', api_views.ProgresoReporteAPIView.as_view(), name='progreso_reporte'),
]
