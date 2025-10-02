from django.urls import path
from . import views

app_name = 'permisos'

urlpatterns = [
    # ==================== DASHBOARD ====================
    
    # Dashboard principal
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # ==================== MÓDULOS ====================
    
    # Lista de módulos
    path('modulos/', views.modulos_list, name='modulos_list'),
    
    # Detalle de módulo
    path('modulos/<uuid:pk>/', views.modulo_detail, name='modulo_detail'),
    
    # Crear módulo
    path('modulos/crear/', views.modulo_create, name='modulo_create'),
    
    # Editar módulo
    path('modulos/<uuid:pk>/editar/', views.modulo_edit, name='modulo_edit'),
    
    # Confirmación de eliminación de módulo
    path('modulos/<uuid:pk>/eliminar/', views.modulo_delete_confirm, name='modulo_delete_confirm'),
    
    # Eliminar módulo (acción real)
    path('modulos/<uuid:pk>/eliminar/confirmar/', views.modulo_delete, name='modulo_delete'),
    
    # ==================== TIPOS DE PERMISO ====================
    
    # Lista de tipos de permiso
    path('tipos-permiso/', views.tipos_permiso_list, name='tipos_permiso_list'),
    
    # Crear tipo de permiso
    path('tipos-permiso/crear/', views.tipo_permiso_create, name='tipo_permiso_add'),  # Usar el nombre que esperan los templates
    
    # Editar tipo de permiso
    path('tipos-permiso/<uuid:pk>/editar/', views.tipo_permiso_edit, name='tipo_permiso_edit'),
    
    # ==================== CONDICIONES ====================
    
    # Lista de condiciones
    path('condiciones/', views.condiciones_list, name='condiciones_list'),
    
    # Crear condición
    path('condiciones/crear/', views.condicion_create, name='condicion_create'),
    
    # Editar condición
    path('condiciones/<uuid:pk>/editar/', views.condicion_edit, name='condicion_edit'),
    
    # ==================== PERMISOS ====================
    
    # Lista de permisos
    path('permisos/', views.permisos_list, name='permisos_list'),
    path('', views.permisos_list, name='list'),  # Ruta por defecto
    
    # Detalle de permiso
    path('permisos/<uuid:pk>/', views.permiso_detail, name='permiso_detail'),
    
    # Crear permiso
    path('permisos/crear/', views.permiso_create, name='permiso_add'),  # Usar el nombre que esperan los templates
    
    # Editar permiso
    path('permisos/<uuid:pk>/editar/', views.permiso_edit, name='permiso_edit'),
    
    # ==================== PERMISOS DIRECTOS ====================
    
    # Lista de permisos directos
    path('permisos-directos/', views.permisos_directos_list, name='permisos_directos_list'),
    
    # Crear permiso directo
    path('permisos-directos/crear/', views.permiso_directo_create, name='permiso_directo_create'),
    
    # Editar permiso directo
    path('permisos-directos/<uuid:pk>/editar/', views.permiso_directo_edit, name='permiso_directo_edit'),
    
    # ==================== ASIGNACIONES (ALIAS DE PERMISOS DIRECTOS) ====================
    
    # Lista de asignaciones directas
    path('asignaciones/', views.asignaciones_list, name='asignaciones_list'),
    
    # Detalle de asignación directa
    path('asignaciones/<uuid:pk>/', views.asignacion_detail, name='asignacion_detail'),
    
    # Crear asignación directa
    path('asignaciones/crear/', views.asignacion_create, name='asignacion_create'),
    
    # Editar asignación directa
    path('asignaciones/<uuid:pk>/editar/', views.asignacion_edit, name='asignacion_edit'),
    
    # ==================== APIs ====================
    
    # API para datos de dashboard
    #path('api/dashboard-data/', views.dashboard_data_api, name='dashboard_data_api'),
    
    # API para búsqueda de permisos
    #path('api/search-permisos/', views.search_permisos_api, name='search_permisos_api'),
]
