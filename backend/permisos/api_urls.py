"""
URLs para las APIs del sistema de gestión de permisos.
========================================================

URLs específicas para permisos directos con funcionalidades avanzadas.
Incluye ViewSets completos y endpoints especializados.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para las APIs RESTful
router = DefaultRouter()

# Registrar ViewSets de permisos
router.register(r'organizaciones', api_views.OrganizacionViewSet, basename='organizacion')
router.register(r'modulos', api_views.ModuloSistemaViewSet, basename='modulo')
router.register(r'tipos-permiso', api_views.TipoPermisoViewSet, basename='tipo-permiso')
router.register(r'condiciones', api_views.CondicionPermisoViewSet, basename='condicion')
router.register(r'permisos', api_views.PermisoViewSet, basename='permiso')
router.register(r'permisos-directos', api_views.PermisoDirectoViewSet, basename='permiso-directo')
router.register(r'auditoria', api_views.AuditoriaPermisosViewSet, basename='auditoria')
router.register(r'estadisticas', api_views.EstadisticasViewSet, basename='estadisticas')

app_name = 'permisos_api'

urlpatterns = [
    # ==================== RUTAS DEL ROUTER ====================
    path('', include(router.urls)),
    
    # ==================== ENDPOINTS ESPECIALES ====================
    
    # Verificación de permisos
    path('verificar/', api_views.PermisoViewSet.as_view({'post': 'verify'}), name='verificar-permiso'),
    
    # Evaluación de condiciones
    path('condiciones/<uuid:pk>/evaluar/', 
         api_views.CondicionPermisoViewSet.as_view({'post': 'evaluate'}), 
         name='evaluar-condicion'),
    
    # Gestión de cache
    path('cache/limpiar/', 
         api_views.EstadisticasViewSet.as_view({'post': 'clear_cache'}), 
         name='limpiar-cache'),
    
    # Estadísticas especiales
    path('estadisticas/generales/', 
         api_views.EstadisticasViewSet.as_view({'get': 'general'}), 
         name='estadisticas-generales'),
    
    # Permisos por usuario
    path('usuarios/<int:user_id>/permisos/', 
         api_views.PermisoDirectoViewSet.as_view({'get': 'by_user'}), 
         name='permisos-usuario'),
    
    # Estructura jerárquica de módulos
    path('modulos/tree/', 
         api_views.ModuloSistemaViewSet.as_view({'get': 'tree'}), 
         name='modulos-tree'),
    
    # Tipos de permiso por categoría
    path('tipos-permiso/categorias/', 
         api_views.TipoPermisoViewSet.as_view({'get': 'by_category'}), 
         name='tipos-por-categoria'),
    
    # Permisos por módulo
    path('permisos/por-modulo/', 
         api_views.PermisoViewSet.as_view({'get': 'by_module'}), 
         name='permisos-por-modulo'),
    
    # Estadísticas de auditoría
    path('auditoria/estadisticas/', 
         api_views.AuditoriaPermisosViewSet.as_view({'get': 'stats'}), 
         name='auditoria-estadisticas'),
]
