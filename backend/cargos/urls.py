from django.urls import path, include
from . import views

app_name = 'cargos'

urlpatterns = [
    # ==================== VISTAS PRINCIPALES ====================
    
    # Lista de cargos
    path('', views.cargos_list, name='list'),  # Ruta por defecto
    
    # Detalle de cargo
    path('<int:pk>/', views.cargo_detail, name='detail'),
    
    # Crear cargo
    path('crear/', views.cargo_create, name='create'),
    
    # Editar cargo
    path('<int:pk>/editar/', views.cargo_update, name='update'),
    
    # Eliminar cargo
    path('<int:pk>/eliminar/', views.cargo_delete, name='delete'),
    
    # Activar/desactivar cargo
    path('<int:pk>/toggle/', views.cargo_toggle_activo, name='toggle'),
    
    # Acciones masivas
    path('bulk-action/', views.bulk_action, name='bulk_action'),
    
    # ==================== HISTORIAL CARGOS ====================
    
    # Lista del historial
    path('historial/', views.historial_cargo_list, name='historial_list'),
    
    # Detalle del historial
    path('historial/<int:pk>/', views.historial_cargo_detail, name='historial_detail'),
    
    # ==================== EJEMPLOS Y DEMOS ====================
    
    # Ejemplos de toast notifications
    path('toast-examples/', views.toast_examples, name='toast_examples'),
]
