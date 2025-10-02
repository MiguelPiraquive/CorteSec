"""
URLs de la API del Sistema de Préstamos
======================================

Configuración de rutas para la API REST del sistema de préstamos.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.urlpatterns import format_suffix_patterns

from .api_views import (
    TipoPrestamoViewSet,
    PrestamoViewSet,
    PagoPrestamoViewSet
)

app_name = 'prestamos_api'

# Router para ViewSets
router = DefaultRouter()
router.register(r'tipos-prestamo', TipoPrestamoViewSet, basename='tipoprestamo')
router.register(r'prestamos', PrestamoViewSet, basename='prestamo')
router.register(r'pagos', PagoPrestamoViewSet, basename='pagoprestamo')

# URLs personalizadas adicionales
urlpatterns = [
    # Incluir las rutas del router
    path('', include(router.urls)),
    
    # URLs adicionales específicas pueden ir aquí si es necesario
    # path('reporte-mensual/', views.reporte_mensual, name='reporte-mensual'),
]

