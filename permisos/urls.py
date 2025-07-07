from django.urls import path
from . import views

app_name = 'permisos'

urlpatterns = [
    # ==================== MÓDULOS ====================
    
    # Lista de módulos
    path('modulos/', views.modulos_list, name='modulos_list'),
    
    # Detalle de módulo
    path('modulos/<int:pk>/', views.modulo_detail, name='modulo_detail'),
    
    # Crear módulo
    path('modulos/crear/', views.modulo_create, name='modulo_create'),
    
    # Editar módulo
    path('modulos/<int:pk>/editar/', views.modulo_edit, name='modulo_edit'),
    
    # Eliminar módulo
    path('modulos/<int:pk>/eliminar/', views.modulo_delete, name='modulo_delete'),
    
    
    # ==================== TIPOS DE PERMISO ====================
    
    # Lista de tipos de permiso
    path('tipos-permiso/', views.tipos_permiso_list, name='tipos_permiso_list'),
    
    # Crear tipo de permiso
    path('tipos-permiso/crear/', views.tipo_permiso_create, name='tipo_permiso_create'),
    
    # Editar tipo de permiso
    path('tipos-permiso/<int:pk>/editar/', views.tipo_permiso_edit, name='tipo_permiso_edit'),
    
    # Eliminar tipo de permiso
    path('tipos-permiso/<int:pk>/eliminar/', views.tipo_permiso_delete, name='tipo_permiso_delete'),
    
    
    # ==================== PERMISOS ====================
    
    # Lista de permisos
    path('permisos/', views.permisos_list, name='permisos_list'),
    path('', views.permisos_list, name='list'),  # Ruta por defecto
    
    # Crear permiso
    path('permisos/crear/', views.permiso_create, name='permiso_create'),
    
    # Editar permiso
    path('permisos/<int:pk>/editar/', views.permiso_edit, name='permiso_edit'),
    
    # Eliminar permiso
    path('permisos/<int:pk>/eliminar/', views.permiso_delete, name='permiso_delete'),
    
    
    # ==================== API ====================
    
    # API de módulos
    path('api/modulos/', views.api_modulos, name='api_modulos'),
    
    # API de tipos de permiso
    path('api/tipos-permiso/', views.api_tipos_permiso, name='api_tipos_permiso'),
    
    # API de permisos por módulo
    path('api/permisos/modulo/<int:modulo_id>/', views.api_permisos_por_modulo, name='api_permisos_por_modulo'),
]
