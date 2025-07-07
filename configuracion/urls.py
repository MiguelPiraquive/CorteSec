from django.urls import path, include
from . import views

app_name = 'configuracion'

urlpatterns = [
    # Dashboard principal
    path('', views.dashboard_view, name='dashboard'),
    
    # Configuración General
    path('general/', views.ConfiguracionGeneralView.as_view(), name='general'),
    
    # Parámetros del Sistema
    path('parametros/', views.ParametrosSistemaListView.as_view(), name='parametros_list'),
    path('parametros/crear/', views.ParametroSistemaCreateView.as_view(), name='parametro_create'),
    path('parametros/<int:pk>/', views.ParametroSistemaDetailView.as_view(), name='parametro_detail'),
    path('parametros/<int:pk>/editar/', views.ParametroSistemaUpdateView.as_view(), name='parametro_edit'),
    path('parametros/<int:pk>/eliminar/', views.ParametroSistemaDeleteView.as_view(), name='parametro_delete'),
    
    # Configuración de Módulos
    path('modulos/', views.modulos_list_view, name='modulos_list'),
    path('modulos/<int:modulo_id>/toggle/', views.modulo_toggle_view, name='modulo_toggle'),
    path('modulos/<int:modulo_id>/', views.modulo_update_view, name='modulo_update'),
    
    # Logs y Auditoría
    path('logs/', views.logs_list_view, name='logs_list'),
    path('logs/api/', views.logs_api_view, name='logs_api'),
    path('logs/clear/', views.logs_clear_view, name='logs_clear'),
    path('logs/export/', views.logs_export_view, name='logs_export'),
    
    # Utilidades y Pruebas
    path('test-email/', views.test_email_view, name='test_email'),
    
    # Gestión Avanzada
    path('avanzada/', views.configuracion_avanzada, name='avanzada'),
    path('backup/', views.configuracion_backup, name='backup'),
]
