"""
URLs Principales - CorteSec API-FIRST
====================================

Configuración para React Frontend ÚNICAMENTE.
NO templates Django, SOLO APIs REST.

Autor: Sistema CorteSec  
Versión: 3.0.0 - REACT INTEGRATION
Fecha: 2025-07-28
"""

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ==================== API ENDPOINTS PARA REACT ====================
    # Autenticación
    path('api/auth/', include('login.api_urls')),
    
    # Core APIs (organizaciones, notificaciones, etc.)
    path('api/', include('core.api_urls')),
    
    # Organizations API
    path('api/organizations/', include('core.organization_urls')),
    
    # Dashboard APIs
    path('api/dashboard/', include('dashboard.api_urls')),
    
    # Módulos principales
    path('api/cargos/', include('cargos.api_urls')),
    path('api/contabilidad/', include('contabilidad.api_urls')),
    path('api/configuracion/', include('configuracion.api_urls')),
    path('api/ayuda/', include('ayuda.api_urls')),
    path('api/locations/', include('locations.api_urls')),
    path('api/payroll/', include('payroll.api_urls')),
    path('api/items/', include('items.api_urls')),
    path('api/prestamos/', include('prestamos.api_urls')),
    path('api/roles/', include('roles.api_urls')),
    path('api/permisos/', include('permisos.api_urls')),
    path('api/reportes/', include('reportes.api_urls')),
    path('api/documentacion/', include('documentacion.api_urls')),
    path('api/tipos-cantidad/', include('tipos_cantidad.api_urls')),

    # App-level views (templates / non-API) used by tests
    path('roles/', include('roles.urls')),
    path('tipos-cantidad/', include('tipos_cantidad.urls')),
    
    # ==================== PENDIENTES DE MIGRAR A API ====================
    # TODO: Convertir estos a APIs para React cuando sea necesario
]

# Serve static and media files in development  
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
