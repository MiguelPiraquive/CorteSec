"""
Middleware de control de permisos granular para el sistema de gestión empresarial.

Este middleware proporciona:
- Control de acceso basado en roles y permisos
- Verificación automática de permisos por URL
- Logging de accesos y denegaciones
- Manejo de excepciones de seguridad
- Cache de permisos para optimización
"""

import logging
import re
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.urls import reverse, resolve
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib import messages

logger = logging.getLogger('security')


class PermissionMiddleware(MiddlewareMixin):
    """
    Middleware para control granular de permisos basado en roles y URLs.
    """
    
    # URLs que no requieren verificación de permisos
    EXCLUDED_PATHS = [
        '/admin/',
        '/login/',
        '/logout/',
        '/password_reset/',
        '/static/',
        '/media/',
        '/i18n/',
        '/api/public/',
        '/api/auth/',  # Todas las rutas de autenticación
        '/api/dashboard/',  # APIs del dashboard
        '/api/locations/',  # APIs de ubicaciones (departamentos y municipios)
        '/api/configuracion/parametros/',  # Endpoint público para parámetros
        '/api/configuracion/dashboard/',   # Endpoint público para dashboard
        '/api/cargos/',  # APIs de cargos (temporalmente excluido para debug)
        '/api/auditoria/',  # APIs de auditoría del sistema - DRF maneja autenticación
        '/api/roles/',  # APIs de roles - DRF maneja autenticación
        '/api/permisos/',  # APIs de permisos - DRF maneja autenticación
        '/api/usuarios/',  # APIs de usuarios - DRF maneja autenticación
        '/api/schema/',  # OpenAPI schema (público)
        '/api/docs/',    # Swagger UI (público)
        '/api/redoc/',   # ReDoc UI (público)
    ]
    
    # URLs que solo requieren autenticación
    AUTH_ONLY_PATHS = [
        '/dashboard/$',
        '/perfil/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def __call__(self, request):
        # LOG DETALLADO PARA AUDITORÍA
        if request.path.startswith('/api/auditoria/'):
            logger.info(f"🔒 PERMISSIONS: Procesando request a auditoría")
            logger.info(f"   Path: {request.path}")
            logger.info(f"   User: {request.user}")
            logger.info(f"   User type: {type(request.user)}")
            logger.info(f"   Authenticated: {request.user.is_authenticated}")
            logger.info(f"   Authorization header: {request.headers.get('Authorization', 'NO AUTH HEADER')}")
            logger.info(f"   META HTTP_AUTHORIZATION: {request.META.get('HTTP_AUTHORIZATION', 'NO META AUTH')}")
            logger.info(f"   All headers: {dict(request.headers)}")
        
        # Verificar permisos antes de procesar la request
        permission_check = self._should_check_permissions(request)
        
        # LOG del resultado de permission_check
        if request.path.startswith('/api/auditoria/'):
            logger.info(f"   Permission check result: {permission_check}")
            logger.info(f"   Permission check type: {type(permission_check)}")
        
        # Si retorna una JsonResponse, es un error que debemos devolver inmediatamente
        if isinstance(permission_check, JsonResponse):
            if request.path.startswith('/api/auditoria/'):
                logger.error(f"❌ PERMISSIONS: Retornando JsonResponse error")
            return permission_check
        
        # Si retorna False, no necesita verificación adicional
        if not permission_check:
            if request.path.startswith('/api/auditoria/'):
                logger.info(f"✅ PERMISSIONS: No requiere verificación, pasando al siguiente middleware")
            return self.get_response(request)
        
        if not request.user.is_authenticated:
            if request.path.startswith('/api/auditoria/'):
                logger.error(f"❌ PERMISSIONS: Usuario no autenticado, retornando 401")
            # Para APIs REST, retornar 401 en lugar de redirect
            if request.path.startswith('/api/'):
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return redirect('/api/auth/login/')
        
        # Verificar permisos específicos
        if not self._has_permission(request):
            if request.path.startswith('/api/auditoria/'):
                logger.error(f"❌ PERMISSIONS: Usuario no tiene permisos")
            return self._handle_permission_denied(request)
        
        if request.path.startswith('/api/auditoria/'):
            logger.info(f"✅ PERMISSIONS: Todos los checks pasados, procesando request")
        
        # Procesar el request
        response = self.get_response(request)
        
        # Post-procesamiento para APIs organizacionales
        if request.path.startswith('/api/'):
            response = self._post_process_api_response(request, response)
        
        return response
    
    def _post_process_api_response(self, request, response):
        """
        Post-procesa respuestas de API para garantizar aislamiento organizacional.
        """
        # Solo procesar respuestas exitosas
        if response.status_code not in [200, 201]:
            return response
        
        path = request.path_info
        
        # APIs que requieren validación post-respuesta
        org_sensitive_apis = [
            '/api/payroll/', '/api/reportes/', '/api/cargos/', 
            '/api/contabilidad/', '/api/prestamos/', '/api/items/',
            '/api/permisos/', '/api/roles/', '/api/perfil/'
        ]
        
        # Verificar si es una API sensible organizacionalmente
        is_org_sensitive = any(path.startswith(api) for api in org_sensitive_apis)
        
        if is_org_sensitive:
            from core.middleware.tenant import get_current_tenant
            current_tenant = get_current_tenant()
            
            # Si no hay tenant pero la respuesta es exitosa, es un problema de seguridad
            if not current_tenant:
                logger.error(f"SECURITY BREACH: API organizacional sin tenant devolvió 200: {path}")
                from django.http import JsonResponse
                return JsonResponse({
                    'error': 'Organización requerida para este recurso',
                    'code': 'ORGANIZATION_REQUIRED'
                }, status=400)
            
            # Validar que el usuario pertenece a la organización
            if (hasattr(request, 'user') and 
                hasattr(request.user, 'organization') and 
                request.user.organization and 
                request.user.organization.id != current_tenant.id):
                
                logger.error(f"SECURITY BREACH: Acceso cruzado exitoso detectado: {request.user} -> {current_tenant} en {path}")
                from django.http import JsonResponse
                return JsonResponse({
                    'error': 'Acceso no autorizado a esta organización',
                    'code': 'ORGANIZATION_MISMATCH'
                }, status=403)
        
        return response
    
    def _should_check_permissions(self, request):
        """
        Determina si se deben verificar permisos para este request.
        Implementa categorización granular de APIs para máxima seguridad.
        """
        path = request.path_info
        
        # APIs que NO requieren verificación adicional (DRF maneja su autenticación)
        api_excluded_paths = [
            '/api/auth/',           # Autenticación
            '/api/auth',            # Autenticación (sin barra)
            '/api/organizations/',  # Organizaciones (ya tiene control en las vistas)
            '/api/organizations',   # Organizaciones (sin barra)
            '/api/dashboard/',      # Dashboard público
            '/api/dashboard',       # Dashboard público (sin barra)
            '/api/locations/',      # Ubicaciones públicas
            '/api/locations',       # Ubicaciones públicas (sin barra)
            '/api/tipos-cantidad/', # Tipos de cantidad
            '/api/tipos-cantidad',  # Tipos de cantidad (sin barra)
            '/api/auditoria/',      # Auditoría del sistema - DRF maneja autenticación
            '/api/auditoria',       # Auditoría del sistema (sin barra)
            '/api/usuarios/',       # Gestión de usuarios - DRF maneja autenticación
            '/api/usuarios',        # Gestión de usuarios (sin barra)
            '/api/schema/',         # OpenAPI schema (público)
            '/api/schema',          # OpenAPI schema (sin barra)
            '/api/docs/',          # Swagger UI (público)
            '/api/docs',           # Swagger UI (sin barra)
            '/api/redoc/',         # ReDoc UI (público)
            '/api/redoc',          # ReDoc UI (sin barra)
        ]
        
        # APIs que SÍ requieren verificación adicional de permisos
        api_protected_paths = [
            '/api/admin/',          # APIs administrativas
            '/api/users/',          # Gestión de usuarios
            '/api/permissions/',    # Gestión de permisos
            '/api/security/',       # Configuraciones de seguridad
            '/api/system/',         # Configuraciones del sistema
            '/api/reports/',        # Reportes sensibles
        ]
        
        # APIs que requieren validación de organización (multitenant)
        api_organization_required = [
            '/api/cargos/',         # Gestión de cargos
            '/api/contabilidad/',   # Contabilidad
            '/api/prestamos/',      # Préstamos
            '/api/payroll/',        # Nómina - CRÍTICO: requiere org
            '/api/reportes/',       # Reportes - CRÍTICO: requiere org
            '/api/items/',          # Gestión de items
            '/api/permisos/',       # Permisos dentro de org
            '/api/roles/',          # Gestión de roles
            '/api/perfil/',         # Gestión de perfil
            '/api/configuracion/',  # Configuración de org
            '/api/ayuda/',          # Sistema de ayuda
            '/api/documentacion/',  # Documentación
        ]
        
        # 1. Verificar APIs que requieren validación organizacional PRIMERO
        for org_path in api_organization_required:
            if path.startswith(org_path):
                validation_result = self._validate_organization_access(request, path)
                if validation_result is not None:
                    # Si retorna una respuesta, significa que hay un error
                    return validation_result
                else:
                    # Si retorna None, significa que pasó la validación
                    return False  # No verificar permisos adicionales
        
        # 2. Si es una API protegida, SÍ verificar permisos
        for protected_path in api_protected_paths:
            if path.startswith(protected_path):
                return True
        
        # 3. Si es una API excluida, NO verificar permisos (DRF maneja)
        for excluded_path in api_excluded_paths:
            if path.startswith(excluded_path):
                return False
        
        # 4. Para APIs no categorizadas, usar comportamiento SEGURO por defecto
        if path.startswith('/api/'):
            # CRÍTICO: APIs no categorizadas requieren validación por seguridad
            logger.warning(f"API no categorizada detectada: {path} - Aplicando validación por seguridad")
            return True
        
        # 5. Excluir paths específicos no-API
        for excluded_path in self.EXCLUDED_PATHS:
            if path.startswith(excluded_path):
                return False
        
        # 6. Por defecto, verificar permisos para todo lo demás
        return True
    
    def _validate_organization_access(self, request, path):
        """
        Valida que el usuario tenga acceso a la organización correcta.
        """
        # Primero verificar autenticación (incluyendo tokens DRF)
        if not self._authenticate_user(request):
            logger.warning(f"Usuario no autenticado intentando acceder a API organizacional: {path}")
            return JsonResponse({'error': 'Autenticación requerida'}, status=401)
        
        # Verificar que hay un tenant establecido
        from core.middleware.tenant import get_current_tenant
        current_tenant = get_current_tenant()
        
        if not current_tenant:
            logger.warning(f"Acceso a API organizacional sin tenant: {path}")
            # Bloquear acceso - requiere organización
            return JsonResponse({'error': 'Se requiere especificar organización'}, status=400)
        
        # Los superusuarios pueden acceder a cualquier organización
        if request.user.is_superuser:
            logger.info(f"Acceso de superusuario a {current_tenant} en {path}")
            return None  # Permitir acceso
        
        # Verificar que el usuario pertenece a la organización
        if (request.user.is_authenticated and
            hasattr(request.user, 'organization') and 
            request.user.organization and 
            request.user.organization.id != current_tenant.id):
            
            logger.warning(f"ACCESO CRUZADO DETECTADO: Usuario {request.user.username} (org ID: {request.user.organization.id}, código: {request.user.organization.codigo}) intentó acceder a org ID: {current_tenant.id}, código: {current_tenant.codigo}")
            # Bloquear acceso - organización incorrecta
            return JsonResponse({'error': 'Acceso denegado: organización incorrecta'}, status=403)
        
        # Verificar que el usuario autenticado tiene una organización asignada
        if (request.user.is_authenticated and 
            (not hasattr(request.user, 'organization') or not request.user.organization)):
            logger.warning(f"Usuario autenticado sin organización intentando acceder a API organizacional: {request.user.username} en {path}")
            return JsonResponse({'error': 'Usuario debe tener una organización asignada'}, status=403)
        
        # Acceso válido a la organización correcta
        logger.info(f"Acceso organizacional válido: {request.user} -> {current_tenant} en {path}")
        return None  # Permitir acceso
    
    def _authenticate_user(self, request):
        """
        Autentica al usuario usando métodos de Django y DRF
        """
        # Si ya está autenticado por Django, usar eso
        if request.user.is_authenticated:
            return True
        
        # Intentar autenticación por token DRF
        from rest_framework.authtoken.models import Token
        from django.contrib.auth import get_user_model
        
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Token '):
            token_key = auth_header.split(' ', 1)[1]
            try:
                token = Token.objects.select_related('user').get(key=token_key)
                if token.user.is_active:
                    request.user = token.user
                    return True
            except Token.DoesNotExist:
                pass
        
        return False
    
    def _has_permission(self, request):
        """Verifica si el usuario tiene permisos para acceder a la URL"""
        try:
            # Si es superusuario, permitir todo
            if request.user.is_superuser:
                return True
            
            # Verificar si la URL solo requiere autenticación
            path = request.path_info
            for auth_path in self.AUTH_ONLY_PATHS:
                if re.match(auth_path, path):
                    return True
            
            # Aquí se implementaría la lógica específica de permisos
            # Por ahora, permitir acceso a usuarios autenticados
            return True
            
        except Exception as e:
            logger.error(f"Error verificando permisos para {request.user}: {e}")
            return False
    
    def _handle_permission_denied(self, request):
        """Maneja cuando se deniega el acceso"""
        logger.warning(
            f"Acceso denegado para {request.user} a {request.path_info}"
        )
        
        if request.headers.get('Content-Type') == 'application/json':
            return JsonResponse({
                'error': 'No tiene permisos para acceder a este recurso',
                'code': 'PERMISSION_DENIED'
            }, status=403)
        
        messages.error(
            request, 
            'No tiene permisos para acceder a esta sección.'
        )
        return redirect('core:dashboard')


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware para auditoría de acciones del usuario
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def __call__(self, request):
        response = self.get_response(request)
        
        # Solo auditar para usuarios autenticados
        if request.user.is_authenticated:
            self._log_user_action(request, response)
        
        return response
    
    def _log_user_action(self, request, response):
        """Registra la acción del usuario"""
        try:
            # Solo log para métodos importantes
            if request.method in ['POST', 'PUT', 'DELETE']:
                from core.models import LogSistema
                
                LogSistema.objects.create(
                    usuario=request.user,
                    accion=f"{request.method}_{request.path_info}",
                    descripcion=f"Usuario {request.user.username} realizó {request.method} en {request.path_info}",
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
                )
        except Exception as e:
            logger.error(f"Error logging user action: {e}")
    
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware para auditoría de seguridad del sistema.
    Registra intentos de acceso, errores de autenticación y actividad sospechosa.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Configurar logger específico para auditoría de seguridad
        self.logger = logging.getLogger('security_audit')
        if not self.logger.handlers:
            handler = logging.FileHandler('security.log')
            formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Auditar respuesta
        self._audit_response(request, response)
        
        return response
    
    def process_request(self, request):
        """Audita las solicitudes entrantes"""
        # Registrar solicitudes a endpoints sensibles
        sensitive_paths = [
            '/admin/', '/api/admin/', '/manage/', '/settings/',
            '/users/', '/permissions/', '/security/'
        ]
        
        path = request.path
        for sensitive_path in sensitive_paths:
            if path.startswith(sensitive_path):
                self._log_security_event(
                    'SENSITIVE_ACCESS_ATTEMPT',
                    request,
                    f"Acceso a endpoint sensible: {path}"
                )
                break
        
        # Detectar patrones sospechosos
        self._detect_suspicious_activity(request)
        
        return None
    
    def _audit_response(self, request, response):
        """Audita las respuestas del servidor"""
        # Registrar errores de autenticación
        if response.status_code == 401:
            self._log_security_event(
                'AUTH_FAILURE',
                request,
                "Fallo de autenticación"
            )
        
        # Registrar accesos denegados
        elif response.status_code == 403:
            self._log_security_event(
                'ACCESS_DENIED',
                request,
                "Acceso denegado"
            )
        
        # Registrar errores del servidor
        elif response.status_code >= 500:
            self._log_security_event(
                'SERVER_ERROR',
                request,
                f"Error del servidor: {response.status_code}"
            )
    
    def _detect_suspicious_activity(self, request):
        """Detecta patrones de actividad sospechosa"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = self._get_client_ip(request)
        
        # Detectar bots maliciosos
        suspicious_user_agents = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'netsparker',
            'burpsuite', 'acunetix', 'scanner'
        ]
        
        if any(bot in user_agent.lower() for bot in suspicious_user_agents):
            self._log_security_event(
                'SUSPICIOUS_USER_AGENT',
                request,
                f"User-Agent sospechoso detectado: {user_agent}"
            )
        
        # Detectar patrones de URL sospechosos
        suspicious_patterns = [
            r'\.\./', r'<script', r'union\s+select', r'drop\s+table',
            r'<iframe', r'javascript:', r'alert\(', r'eval\('
        ]
        
        path_and_query = f"{request.path}?{request.META.get('QUERY_STRING', '')}"
        for pattern in suspicious_patterns:
            if re.search(pattern, path_and_query, re.IGNORECASE):
                self._log_security_event(
                    'SUSPICIOUS_REQUEST_PATTERN',
                    request,
                    f"Patrón sospechoso en URL: {pattern}"
                )
                break
    
    def _log_security_event(self, event_type, request, description):
        """Registra eventos de seguridad"""
        try:
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
            user = getattr(request, 'user', None)
            username = user.username if user and user.is_authenticated else 'Anonymous'
            
            log_message = (
                f"[{event_type}] {description} | "
                f"IP: {ip_address} | User: {username} | "
                f"Path: {request.path} | "
                f"Method: {request.method} | "
                f"User-Agent: {user_agent[:100]}"
            )
            
            self.logger.warning(log_message)
            
        except Exception as e:
            self.logger.error(f"Error logging security event: {e}")
    
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
        return ip
