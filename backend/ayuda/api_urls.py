"""
URLs de la API de Ayuda
=======================

URLs para las APIs REST del centro de ayuda.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-07-29
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'tipos', api_views.TipoAyudaViewSet, basename='tipos-ayuda')
router.register(r'categorias', api_views.CategoriaAyudaViewSet, basename='categorias-ayuda')
router.register(r'articulos', api_views.ArticuloAyudaViewSet, basename='articulos-ayuda')
router.register(r'faqs', api_views.FAQViewSet, basename='faqs')
router.register(r'solicitudes', api_views.SolicitudSoporteViewSet, basename='solicitudes-soporte')
router.register(r'tutoriales', api_views.TutorialViewSet, basename='tutoriales')
router.register(r'recursos', api_views.RecursoAyudaViewSet, basename='recursos-ayuda')

app_name = "ayuda_api"

urlpatterns = [
    # ==================== ENDPOINTS DE VIEWSETS ====================
    path('', include(router.urls)),
    
    # ==================== ENDPOINTS ADICIONALES ====================
    path('estadisticas/', api_views.estadisticas_ayuda, name='estadisticas'),
    path('buscar/', api_views.busqueda_global, name='busqueda-global'),
]
