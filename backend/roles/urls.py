from django.urls import path
from . import views

app_name = 'roles'

urlpatterns = [
    # Vistas principales de roles
    path('', views.lista_roles, name='lista'),
    path('crear/', views.crear_rol, name='crear'),
    path('<int:pk>/', views.detalle_rol, name='detalle'),
    path('<int:pk>/editar/', views.editar_rol, name='editar'),
    path('<int:pk>/eliminar/', views.eliminar_rol, name='eliminar'),
    path('<int:pk>/toggle-activo/', views.toggle_activo_rol, name='toggle_activo'),
    
    # Asignaciones
    path('asignaciones/', views.lista_asignaciones, name='lista_asignaciones'),
    path('asignaciones/crear/', views.crear_asignacion, name='crear_asignacion'),
    path('asignaciones/masiva/', views.asignacion_masiva, name='asignacion_masiva'),
    
    # Jerarquía
    path('jerarquia/', views.jerarquia_roles, name='jerarquia'),
    path('<int:pk>/mover/', views.mover_rol_jerarquia, name='mover_jerarquia'),
    
    # Auditoría
    path('auditoria/', views.auditoria_roles, name='auditoria'),
    
    # Dashboard y utilidades
    path('dashboard/', views.dashboard_roles, name='dashboard'),
    path('exportar/', views.exportar_roles, name='exportar'),
    path('validar-codigo/', views.validar_codigo_rol, name='validar_codigo'),
    
    # APIs
    path('api/', views.api_roles, name='api'),
    path('api/<int:pk>/usuarios/', views.api_usuarios_rol, name='api_usuarios_rol'),
]
