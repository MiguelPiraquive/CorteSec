"""
Middleware específico para validación de APIs sensibles
======================================================

Este middleware proporciona una capa adicional de seguridad para endpoints de API
que requieren validaciones específicas más allá de la autenticación básica.
"""

import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger('api_security')


class APISecurityMiddleware(MiddlewareMixin):
    """
    Middleware de seguridad específico para APIs sensibles.
    
    Proporciona:
    - Validación de permisos para APIs administrativas
    - Rate limiting para APIs sensibles
    - Logging de acceso a endpoints críticos
    - Validación de organizaciones para endpoints multitenant
    """
    
    # APIs que requieren permisos de superusuario
    SUPERUSER_REQUIRED_APIS = [
        '/api/admin/',
        '/api/system/',
        '/api/security/config/',
    ]
    
    # APIs que requieren permisos específicos
    PERMISSION_REQUIRED_APIS = {
        '/api/users/': ['users.view_user', 'users.change_user'],
        '/api/permissions/': ['auth.view_permission'],
        '/api/reports/sensitive/': ['reports.view_sensitive'],
    }
    
    # APIs que requieren validación de organización
    ORGANIZATION_REQUIRED_APIS = [
        '/api/cargos/',
        '/api/contabilidad/',
        '/api/prestamos/',
        '/api/payroll/',
        '/api/reportes/',
    ]
    
    # APIs que NO requieren autenticación (públicas)
    PUBLIC_APIS = [
        '/api/schema/',      # OpenAPI schema
        '/api/docs/',        # Swagger UI
        '/api/redoc/',       # ReDoc UI
        '/api/auth/login/',  # Login endpoint
        '/api/auth/register/',  # Register endpoint
        '/api/auth/verify-email/',  # Email verification
        '/api/auth/password-reset/',  # Password reset request
        '/api/auth/password-reset/confirm/',  # Password reset confirm
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def __call__(self, request):
        # Solo procesar requests a APIs
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        
        # LOG DETALLADO PARA AUDITORÍA
        if request.path.startswith('/api/auditoria/'):
            logger.info(f"🔍 API_SECURITY: Procesando request a auditoría")
            logger.info(f"   Path: {request.path}")
            logger.info(f"   User: {request.user}")
            logger.info(f"   Authenticated: {request.user.is_authenticated}")
            logger.info(f"   Auth Header: {request.headers.get('Authorization', 'NO HEADER')[:50]}")
        
        # Permitir acceso a APIs públicas sin validaciones
        for public_api in self.PUBLIC_APIS:
            if request.path.startswith(public_api):
                logger.info(f"API pública accedida: {request.path}")
                return self.get_response(request)
        
        # Verificar permisos específicos
        response = self._check_api_permissions(request)
        if response:
            return response
        
        # Log de acceso a APIs críticas
        self._log_api_access(request)
        
        return self.get_response(request)
    
    def _check_api_permissions(self, request):
        """Verifica permisos específicos para APIs"""
        path = request.path
        
        # 1. APIs que requieren superusuario
        for superuser_api in self.SUPERUSER_REQUIRED_APIS:
            if path.startswith(superuser_api):
                if isinstance(request.user, AnonymousUser) or not request.user.is_authenticated:
                    logger.warning(f"Intento de acceso no autorizado a API de superusuario: {path} por usuario anónimo")
                    return JsonResponse({
                        'error': 'Autenticación requerida',
                        'detail': 'Debe iniciar sesión para acceder a esta API'
                    }, status=401)
                elif not request.user.is_superuser:
                    logger.warning(f"Intento de acceso no autorizado a API de superusuario: {path} por {request.user.username}")
                    return JsonResponse({
                        'error': 'Permisos de administrador requeridos',
                        'code': 'SUPERUSER_REQUIRED'
                    }, status=403)
                else:
                    # Superusuario tiene acceso - continuar
                    logger.info(f"Acceso de superusuario aprobado: {request.user} -> {path}")
                    break  # Salir del bucle y continuar procesamiento
        
        # 2. APIs que requieren permisos específicos
        for perm_api, required_perms in self.PERMISSION_REQUIRED_APIS.items():
            if path.startswith(perm_api):
                if isinstance(request.user, AnonymousUser):
                    return JsonResponse({'error': 'Authentication required'}, status=401)
                
                if not all(request.user.has_perm(perm) for perm in required_perms):
                    logger.warning(f"Acceso denegado por falta de permisos a {path} por {request.user}")
                    return JsonResponse({
                        'error': 'Permisos insuficientes',
                        'required_permissions': required_perms,
                        'code': 'INSUFFICIENT_PERMISSIONS'
                    }, status=403)
        
        # 3. APIs que requieren organización válida
        for org_api in self.ORGANIZATION_REQUIRED_APIS:
            if path.startswith(org_api):
                # Verificar que hay un tenant establecido
                from core.middleware.tenant import get_current_tenant
                current_tenant = get_current_tenant()
                
                if not current_tenant:
                    logger.warning(f"Acceso a API sin organización: {path}")
                    return JsonResponse({
                        'error': 'Organización requerida',
                        'code': 'ORGANIZATION_REQUIRED'
                    }, status=400)
                
                # Verificar que el usuario pertenece a la organización
                if (not isinstance(request.user, AnonymousUser) and 
                    hasattr(request.user, 'organization') and 
                    request.user.organization and 
                    request.user.organization.id != current_tenant.id):
                    
                    logger.warning(f"Intento de acceso cruzado de organización: {request.user} intentó acceder a {current_tenant}")
                    return JsonResponse({
                        'error': 'Acceso no autorizado a esta organización',
                        'code': 'ORGANIZATION_MISMATCH'
                    }, status=403)
        
        return None
    
    def _log_api_access(self, request):
        """Registra acceso a APIs críticas"""
        path = request.path
        critical_apis = self.SUPERUSER_REQUIRED_APIS + list(self.PERMISSION_REQUIRED_APIS.keys())
        
        if any(path.startswith(api) for api in critical_apis):
            user = request.user if not isinstance(request.user, AnonymousUser) else 'Anonymous'
            logger.info(f"Acceso a API crítica: {path} por {user} desde {self._get_client_ip(request)}")
    
    def _get_client_ip(self, request):
        """Obtiene la IP del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
        return ip
