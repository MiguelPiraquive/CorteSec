"""
🏢 Multi-Tenant Middleware - CorteSec SaaS
==========================================

Middleware para detectar y configurar el tenant actual basado en:
- Subdominio (empresa.cortesec.com)
- Parámetro de URL (?tenant=empresa)
- Header HTTP (X-Tenant-Slug: empresa)
- Usuario autenticado

Establece el contexto del tenant para toda la aplicación usando thread-local storage.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-08-17
"""

import threading
from django.http import HttpResponseForbidden, HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.contrib.auth import get_user_model
from core.models import Organizacion

# Thread-local storage para el tenant actual
_thread_locals = threading.local()


def get_current_tenant():
    """
    🏢 Obtiene el tenant actual desde el contexto del thread.
    
    Returns:
        Organization or None: La organización actual o None si no hay tenant establecido
    """
    return getattr(_thread_locals, 'tenant', None)


def set_current_tenant(tenant):
    """
    🏢 Establece el tenant actual en el contexto del thread.
    
    Args:
        tenant (Organization or None): La organización a establecer como tenant actual
    """
    _thread_locals.tenant = tenant


def clear_current_tenant():
    """
    🧹 Limpia el tenant actual del contexto del thread.
    """
    if hasattr(_thread_locals, 'tenant'):
        del _thread_locals.tenant


class TenantMiddleware(MiddlewareMixin):
    """
    🏢 Middleware principal para Multi-Tenancy.
    
    Detecta el tenant actual y lo establece en el contexto para toda la aplicación.
    
    Orden de prioridad para detección de tenant:
    1. Usuario autenticado con organización
    2. Subdominio (ej: empresa.cortesec.com)
    3. Parámetro de URL (?tenant=slug)
    4. Header HTTP (X-Tenant-Slug)
    """
    
    def process_request(self, request):
        """
        🔍 Detecta y establece el tenant actual al inicio de cada request.
        """
        tenant = None
        
        # 1. Si el usuario está autenticado y tiene organización, usar esa
        if request.user.is_authenticated and hasattr(request.user, 'organization'):
            tenant = request.user.organization
        
        # 2. Detección por subdominio
        if not tenant:
            tenant = self._detect_tenant_by_subdomain(request)
        
        # 3. Detección por parámetro de URL
        if not tenant:
            tenant = self._detect_tenant_by_url_param(request)
        
        # 4. Detección por header HTTP
        if not tenant:
            tenant = self._detect_tenant_by_header(request)
        
        # Establecer tenant en el contexto
        set_current_tenant(tenant)
        
        # Añadir tenant al request para fácil acceso
        request.tenant = tenant
        
        return None
    
    def process_response(self, request, response):
        """
        🧹 Limpia el contexto del tenant al final del request.
        """
        clear_current_tenant()
        return response
    
    def process_exception(self, request, exception):
        """
        🧹 Limpia el contexto del tenant si hay una excepción.
        """
        clear_current_tenant()
        return None
    
    def _detect_tenant_by_subdomain(self, request):
        """
        🌐 Detecta tenant por subdominio.
        
        Ejemplo: empresa.cortesec.com -> slug = 'empresa'
        """
        host = request.get_host()
        
        # Lista de dominios principales (configurables)
        main_domains = getattr(settings, 'TENANT_MAIN_DOMAINS', [
            'cortesec.com',
            'localhost:8000',
            '127.0.0.1:8000',
        ])
        
        for main_domain in main_domains:
            if host.endswith(main_domain) and host != main_domain:
                # Extraer subdomain
                subdomain = host.replace(f'.{main_domain}', '')
                
                try:
                    return Organizacion.objects.get(codigo=subdomain, activa=True)
                except Organizacion.DoesNotExist:
                    continue
        
        return None
    
    def _detect_tenant_by_url_param(self, request):
        """
        🔗 Detecta tenant por parámetro de URL.
        
        Ejemplo: /dashboard/?tenant=empresa
        """
        tenant_codigo = request.GET.get('tenant')
        
        if tenant_codigo:
            try:
                return Organizacion.objects.get(codigo=tenant_codigo, activa=True)
            except Organizacion.DoesNotExist:
                pass
        
        return None
    
    def _detect_tenant_by_header(self, request):
        """
        📡 Detecta tenant por header HTTP.
        
        Header: X-Tenant-Codigo: empresa
        """
        tenant_codigo = request.META.get('HTTP_X_TENANT_CODIGO')
        
        if tenant_codigo:
            try:
                return Organizacion.objects.get(codigo=tenant_codigo, activa=True)
            except Organizacion.DoesNotExist:
                pass
        
        return None


class TenantRequiredMiddleware(MiddlewareMixin):
    """
    🔒 Middleware que requiere tenant para ciertas rutas.
    
    Rutas que requieren tenant obligatorio (configurables):
    - /api/ (APIs) - pero permite autenticación primero
    - /dashboard/ (Dashboard)
    - Cualquier ruta configurada en TENANT_REQUIRED_PATHS
    
    NOTA: Para APIs, solo verificamos tenant después de que DRF procese la autenticación
    """
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        🔍 Verifica tenant después de que Django resuelva la vista.
        Esto permite que DRF procese la autenticación primero.
        """
        # LOG DETALLADO PARA AUDITORÍA
        if request.path.startswith('/api/auditoria/'):
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"🏢 TENANT_REQUIRED: Procesando request a auditoría")
            logger.info(f"   Path: {request.path}")
            logger.info(f"   User: {request.user}")
            logger.info(f"   Tenant: {get_current_tenant()}")
            logger.info(f"   User Organization: {getattr(request.user, 'organization', 'NO ORG')}")
        
        # Rutas que requieren tenant obligatorio
        required_paths = getattr(settings, 'TENANT_REQUIRED_PATHS', [
            '/api/',
            '/dashboard/',
        ])
        
        # Rutas que están exentas
        exempt_paths = getattr(settings, 'TENANT_EXEMPT_PATHS', [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/verify-email/',
            '/api/organizations/',  # Permitir a organizaciones sin tenant (se valida en el ViewSet)
            '/api/auditoria/',  # DRF maneja autenticación y tenant
            '/api/roles/',  # DRF maneja autenticación y tenant
            '/api/permisos/',  # DRF maneja autenticación y tenant
            '/admin/',
            '/static/',
            '/media/',
        ])
        
        # Verificar si la ruta actual requiere tenant
        path = request.path
        requires_tenant = any(path.startswith(required_path) for required_path in required_paths)
        is_exempt = any(path.startswith(exempt_path) for exempt_path in exempt_paths)
        
        if requires_tenant and not is_exempt:
            tenant = get_current_tenant()
            
            if not tenant:
                # LOG de error
                if path.startswith('/api/auditoria/'):
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"❌ TENANT_REQUIRED: No tenant found para auditoría!")
                
                # Si es una API, devolver JSON
                if path.startswith('/api/'):
                    import json
                    response = HttpResponse(
                        json.dumps({
                            'error': 'Tenant requerido',
                            'message': 'Esta operación requiere una organización válida',
                            'code': 'TENANT_REQUIRED'
                        }),
                        content_type='application/json',
                        status=400
                    )
                    return response
                
                # Para otras rutas, devolver error HTML
                return HttpResponseForbidden(
                    "Acceso denegado: Se requiere una organización válida para acceder a esta página."
                )
        
        return None
    
    def process_request(self, request):
        """
        🔍 Método obsoleto - ahora usamos process_view
        """
        return None


class TenantSecurityMiddleware(MiddlewareMixin):
    """
    🔐 Middleware de seguridad adicional para Multi-Tenancy.
    
    Verifica que:
    - El usuario pertenece al tenant actual
    - No hay intentos de acceso cross-tenant
    - Los headers de seguridad están correctos
    """
    
    def process_request(self, request):
        """
        🔒 Verificaciones de seguridad Multi-Tenant.
        """
        # Solo verificar usuarios autenticados
        if not request.user.is_authenticated:
            return None
        
        tenant = get_current_tenant()
        user_organization = getattr(request.user, 'organization', None)
        
        # Verificar que el usuario pertenece al tenant actual
        if tenant and user_organization and tenant != user_organization:
            # Permitir a los superusuarios acceder a cualquier tenant
            if not request.user.is_superuser:
                import json
                if request.path.startswith('/api/'):
                    response = HttpResponse(
                        json.dumps({
                            'error': 'Acceso denegado',
                            'message': 'No tiene permisos para acceder a esta organización',
                            'code': 'CROSS_TENANT_ACCESS_DENIED'
                        }),
                        content_type='application/json',
                        status=403
                    )
                    return response
                
                return HttpResponseForbidden(
                    "Acceso denegado: No tiene permisos para acceder a esta organización."
                )
        
        return None


# Context manager para operaciones con tenant específico
class tenant_context:
    """
    🔧 Context manager para ejecutar código con un tenant específico.
    
    Ejemplo:
    ```python
    with tenant_context(organization):
        # Todo el código aquí se ejecuta con el tenant especificado
        items = Item.objects.all()  # Solo items de la organización
    ```
    """
    
    def __init__(self, organization):
        self.organization = organization
        self.previous_tenant = None
    
    def __enter__(self):
        self.previous_tenant = get_current_tenant()
        set_current_tenant(self.organization)
        return self.organization
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        set_current_tenant(self.previous_tenant)


# Decorador para views que requieren tenant específico
def require_tenant_access(allowed_roles=None):
    """
    🔒 Decorador que requiere acceso a un tenant específico con roles opcionales.
    
    Args:
        allowed_roles (list): Lista de roles permitidos para acceder
        
    Ejemplo:
    ```python
    @require_tenant_access(['OWNER', 'ADMIN'])
    def my_view(request):
        # Solo propietarios y administradores pueden acceder
        pass
    ```
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            tenant = get_current_tenant()
            
            if not tenant:
                from django.http import HttpResponseForbidden
                return HttpResponseForbidden("Se requiere una organización válida")
            
            if not request.user.is_authenticated:
                from django.contrib.auth import redirect_to_login
                return redirect_to_login(request.get_full_path())
            
            user_org = getattr(request.user, 'organization', None)
            if user_org != tenant and not request.user.is_superuser:
                from django.http import HttpResponseForbidden
                return HttpResponseForbidden("No tiene permisos para esta organización")
            
            if allowed_roles:
                user_role = getattr(request.user, 'organization_role', None)
                if user_role not in allowed_roles and not request.user.is_superuser:
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden("Rol insuficiente para esta operación")
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator
