from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, api_views

app_name = 'roles'

# Router para las APIs REST
router = DefaultRouter()
router.register(r'roles', api_views.RolViewSet, basename='rol')
router.register(r'asignaciones', api_views.AsignacionRolViewSet, basename='asignacion-rol')
router.register(r'tipos', api_views.TipoRolViewSet, basename='tipo-rol')
router.register(r'estados-asignacion', api_views.EstadoAsignacionViewSet, basename='estado-asignacion')

urlpatterns = [
    # API REST endpoints
    path('', include(router.urls)),
    path('dashboard/stats/', api_views.DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    path('jerarquia/', api_views.JerarquiaAPIView.as_view(), name='jerarquia'),
    path('plantillas/', api_views.PlantillasAPIView.as_view(), name='plantillas'),
    
    # Vistas principales de roles (para templates HTML si las necesitas)
    path('lista/', views.lista_roles, name='lista'),
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
    
    # APIs (legacy, mantener compatibilidad)
    path('api/', views.api_roles, name='api'),
    path('api/<int:pk>/usuarios/', views.api_usuarios_rol, name='api_usuarios_rol'),
]
