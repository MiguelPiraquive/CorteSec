"""
URLs del Sistema de Préstamos
=============================

Configuración de rutas para las vistas web del sistema de préstamos.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.urls import path, include
from . import views

app_name = 'prestamos'

urlpatterns = [
    # Dashboard de préstamos
    path('', views.dashboard, name='dashboard'),
    
    # Gestión de tipos de préstamo
    path('tipos/', views.tipos_list, name='tipos_list'),
    path('tipos/crear/', views.tipo_create, name='tipo_create'),
    path('tipos/<uuid:pk>/', views.tipo_detail, name='tipo_detail'),
    path('tipos/<uuid:pk>/editar/', views.tipo_edit, name='tipo_edit'),
    path('tipos/<uuid:pk>/eliminar/', views.tipo_delete, name='tipo_delete'),
    
    # Gestión de préstamos
    path('prestamos/', views.prestamos_list, name='prestamos_list'),
    path('prestamos/crear/', views.prestamo_create, name='prestamo_create'),
    path('prestamos/<uuid:pk>/', views.prestamo_detail, name='prestamo_detail'),
    path('prestamos/<uuid:pk>/editar/', views.prestamo_edit, name='prestamo_edit'),
    path('prestamos/<uuid:pk>/eliminar/', views.prestamo_delete, name='prestamo_delete'),
    
    # Acciones especiales de préstamos
    path('prestamos/<uuid:pk>/aprobar/', views.prestamo_aprobar, name='prestamo_aprobar'),
    # path('prestamos/<uuid:pk>/rechazar/', views.prestamo_rechazar, name='prestamo_rechazar'),  # Función no existe
    path('prestamos/<uuid:pk>/desembolsar/', views.prestamo_desembolsar, name='prestamo_desembolsar'),
    path('prestamos/<uuid:pk>/cronograma/', views.prestamo_cronograma, name='prestamo_cronograma'),
    
    # Gestión de pagos
    path('pagos/', views.pagos_list, name='pagos_list'),
    path('pagos/crear/', views.pago_create, name='pago_create'),
    path('pagos/<uuid:pk>/', views.pago_detail, name='pago_detail'),
    path('pagos/<uuid:pk>/editar/', views.pago_edit, name='pago_edit'),
    path('prestamos/<uuid:prestamo_pk>/pagar/', views.pago_create_for_prestamo, name='pago_create_for_prestamo'),
    
    # Reportes y utilidades
    path('calculadora/', views.calculadora, name='calculadora'),
    path('reportes/', views.reportes, name='reportes'),
    path('reportes/prestamos/', views.reporte_prestamos, name='reporte_prestamos'),
    path('reportes/pagos/', views.reporte_pagos, name='reporte_pagos'),
    
    # API endpoints
    path('api/', include('prestamos.api_urls')),
    
    # AJAX endpoints
    path('ajax/tipo-prestamo/<uuid:pk>/datos/', views.ajax_tipo_prestamo_datos, name='ajax_tipo_prestamo_datos'),
    path('ajax/calcular-cuota/', views.ajax_calcular_cuota, name='ajax_calcular_cuota'),
    path('ajax/empleado-prestamos/<uuid:empleado_pk>/', views.ajax_empleado_prestamos, name='ajax_empleado_prestamos'),
]
