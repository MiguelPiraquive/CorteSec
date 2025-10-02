from django.urls import path
from . import views

app_name = 'contabilidad'

urlpatterns = [
    # Plan de cuentas
    path('plan-cuentas/', views.plan_cuentas_list, name='plan_cuentas_list'),
    path('plan-cuentas/crear/', views.plan_cuentas_create, name='plan_cuentas_create'),
    path('plan-cuentas/<int:pk>/', views.plan_cuentas_detail, name='plan_cuentas_detail'),
    path('plan-cuentas/<int:pk>/editar/', views.plan_cuentas_edit, name='plan_cuentas_edit'),
    path('plan-cuentas/<int:pk>/eliminar/', views.plan_cuentas_delete, name='plan_cuentas_delete'),
    
    # Comprobantes contables
    path('comprobantes/', views.comprobantes_list, name='comprobantes_list'),
    path('comprobantes/crear/', views.comprobante_create, name='comprobante_create'),
    path('comprobantes/<int:pk>/', views.comprobante_detail, name='comprobante_detail'),
    path('comprobantes/<int:pk>/editar/', views.comprobante_edit, name='comprobante_edit'),
    path('comprobantes/<int:pk>/eliminar/', views.comprobante_delete, name='comprobante_delete'),
    path('comprobantes/<int:pk>/confirmar/', views.comprobante_confirm, name='comprobante_confirm'),
    
    # Movimientos contables
    path('movimientos/', views.movimientos_list, name='movimientos_list'),
    
    # Flujo de caja
    path('flujo-caja/', views.flujo_caja_list, name='flujo_caja_list'),
    path('flujo-caja/crear/', views.flujo_caja_create, name='flujo_caja_create'),
    path('flujo-caja/<int:pk>/', views.flujo_caja_detail, name='flujo_caja_detail'),
    path('flujo-caja/<int:pk>/editar/', views.flujo_caja_edit, name='flujo_caja_edit'),
    path('flujo-caja/<int:pk>/eliminar/', views.flujo_caja_delete, name='flujo_caja_delete'),
    
    # Reportes contables
    path('reportes/', views.reportes_list, name='reportes_list'),
    path('reportes/generar/', views.generate_report, name='generate_report'),
    path('reportes/<int:pk>/descargar/', views.download_report, name='download_report'),
    path('reportes/<int:pk>/ver/', views.view_report, name='view_report'),
    path('reportes/personalizado/', views.custom_report_form, name='custom_report_form'),
    path('reportes/programar/', views.schedule_report_form, name='schedule_report_form'),
    path('reportes/recientes/', views.recent_reports, name='recent_reports'),
    
    # APIs
    path('api/cuentas/', views.cuentas_api, name='cuentas_api'),
    path('api/comprobantes/', views.comprobantes_api, name='comprobantes_api'),
    path('api/movimientos/', views.movimientos_api, name='movimientos_api'),
    path('api/flujo-caja/', views.flujo_caja_api, name='flujo_caja_api'),
    
    # Estadísticas
    path('api/stats/comprobantes/', views.comprobantes_stats, name='comprobantes_stats'),
    path('api/stats/movimientos/', views.movimientos_stats, name='movimientos_stats'),
    path('api/stats/flujo-caja/', views.flujo_caja_stats, name='flujo_caja_stats'),
    path('api/stats/reportes/', views.reportes_stats, name='reportes_stats'),
    path('api/saldo-actual/', views.saldo_actual, name='saldo_actual'),
    
    # Exportaciones
    path('exportar/comprobantes/', views.export_comprobantes, name='comprobantes_export'),
    path('exportar/movimientos/', views.export_movimientos, name='movimientos_export'),
    path('exportar/flujo-caja/', views.export_flujo_caja, name='flujo_caja_export'),
    
    # Utilidades
    path('flujo-caja/vista-previa/', views.flujo_caja_preview, name='flujo_caja_preview'),
    path('comprobantes/<int:pk>/pdf/', views.comprobante_pdf, name='comprobante_pdf'),
]
