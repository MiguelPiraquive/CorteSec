"""
URLs de la API de Empleados (Payroll)
=====================================

URLs para las APIs REST de gestión de empleados, nóminas y detalles.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Configurar el router de DRF
router = DefaultRouter()
router.register(r'empleados', api_views.EmpleadoViewSet, basename='empleado')
router.register(r'nominas', api_views.NominaViewSet, basename='nomina')
router.register(r'detalle-nominas', api_views.DetalleNominaViewSet, basename='detalle-nomina')

app_name = "payroll_api"

urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
    
    # Rutas adicionales personalizadas (si es necesario)
    # path('empleados/export/excel/', api_views.EmpleadoViewSet.as_view({'get': 'export_excel'}), name='empleados-export-excel'),
    # path('empleados/export/pdf/', api_views.EmpleadoViewSet.as_view({'get': 'export_pdf'}), name='empleados-export-pdf'),
]
