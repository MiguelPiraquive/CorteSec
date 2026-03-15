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
        # Verificar permisos antes de procesar la request
        permission_check = self._should_check_permissions(request)
        
        # Si retorna una JsonResponse, es un error que debemos devolver inmediatamente
        if isinstance(permission_check, JsonResponse):
            return permission_check

        # Si retorna False, no necesita verificación adicional
        if not permission_check:
            return self.get_response(request)

        if not request.user.is_authenticated:
            # Para APIs REST, retornar 401 en lugar de redirect
            if request.path.startswith('/api/'):
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return redirect('/api/auth/login/')

        # Verificar permisos específicos
        if not self._has_permission(request):
            return self._handle_permission_denied(request)

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
            '/api/public/',         # APIs públicas (landing/planes)
            '/api/public',          # APIs públicas (sin barra)
            '/api/organizations/',  # Organizaciones (ya tiene control en las vistas)
            '/api/organizations',   # Organizaciones (sin barra)
            '/api/notificaciones/', # Notificaciones (DRF maneja autenticación)
            '/api/notificaciones',  # Notificaciones (sin barra)
            '/api/system-status/',  # Estado del sistema (DRF/Django maneja auth)
            '/api/system-status',   # Estado del sistema (sin barra)
            '/api/health-check/',   # Health check (DRF/Django maneja auth)
            '/api/health-check',    # Health check (sin barra)
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
            '/api/search/',        # Búsqueda global (DRF maneja autenticación)
            '/api/search',         # Búsqueda global (sin barra)
            '/api/plans/',         # Planes SaaS (DRF maneja autenticación)
            '/api/plans',          # Planes SaaS (sin barra)
            '/api/plan-changes/',  # Historial de planes (DRF maneja autenticación)
            '/api/plan-changes',   # Historial de planes (sin barra)
            '/api/roles/',         # Roles (DRF maneja autenticación)
            '/api/roles',          # Roles (sin barra)
            '/api/permisos/',      # Permisos (DRF maneja autenticación)
            '/api/permisos',       # Permisos (sin barra)
            '/api/permisos/check/',  # Verificacion de permisos del usuario
            '/api/permisos/check',   # Verificacion de permisos (sin barra)
            '/api/billing/',       # Billing/Suscripciones (DRF maneja autenticación)
            '/api/billing',        # Billing (sin barra)
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
            '/api/payroll/',        # Nómina electrónica - CRÍTICO: requiere org
            '/api/nomina/',         # Nómina simple - CRÍTICO: requiere org
            '/api/reportes/',       # Reportes - CRÍTICO: requiere org
            '/api/items/',          # Gestión de items
            '/api/perfil/',         # Gestión de perfil
            '/api/configuracion/',  # Configuración de org
            '/api/ayuda/',          # Sistema de ayuda
            '/api/documentacion/',  # Documentación
            '/api/core/usuarios/',  # Compatibilidad usuarios (core)
            '/api/usuarios/',       # Usuarios (API principal)
        ]
        
        # 1. Verificar APIs que requieren validación organizacional PRIMERO
        for org_path in api_organization_required:
            if path.startswith(org_path):
                validation_result = self._validate_organization_access(request, path)
                if validation_result is not None:
                    # Si retorna una respuesta, significa que hay un error
                    return validation_result
                else:
                    # Organización validada. DRF AccessPolicies manejan RBAC.
                    # No se requiere verificación adicional en el middleware.
                    return False
        
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
        Autentica al usuario usando métodos de Django y DRF (JWT via cookie o header)
        """
        # Si ya está autenticado por Django, usar eso
        if request.user.is_authenticated:
            return True

        # Intentar autenticación con CookieJWTAuthentication (cookie httpOnly + header fallback)
        try:
            from login.cookie_auth import CookieJWTAuthentication
            from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
            jwt_auth = CookieJWTAuthentication()
            result = jwt_auth.authenticate(request)
            if result is not None:
                user, token = result
                if user.is_active:
                    request.user = user
                    return True
        except (InvalidToken, TokenError, Exception):
            pass

        return False
    
    def _has_permission(self, request):
        """
        Verifica si el usuario tiene permisos para acceder a la URL.

        Para rutas /api/, DRF AccessPolicies maneja la autorización granular.
        Este middleware actúa como red de seguridad para rutas no-API
        y para verificar permisos basados en el sistema RBAC.
        """
        try:
            # Si es superusuario, permitir todo
            if request.user.is_superuser:
                return True

            # Verificar si la URL solo requiere autenticación
            path = request.path_info
            for auth_path in self.AUTH_ONLY_PATHS:
                if re.match(auth_path, path):
                    return True

            # Para rutas API, DRF maneja permisos via AccessPolicies
            # El middleware solo verifica que el usuario esté autenticado
            if path.startswith('/api/'):
                return request.user.is_authenticated

            # Para rutas no-API protegidas, verificar permisos RBAC
            if request.user.is_authenticated:
                # Verificar rol del usuario en la organización
                from roles.models import AsignacionRol
                tiene_rol_activo = AsignacionRol.objects.filter(
                    usuario=request.user,
                    activa=True
                ).exists()

                # Usuarios con al menos un rol activo pueden acceder a rutas protegidas
                # El control granular se maneja a nivel de vista/policy
                if tiene_rol_activo or request.user.is_staff:
                    return True

                # Usuarios autenticados sin roles: solo acceso a perfil y dashboard básico
                if any(re.match(p, path) for p in [r'^/dashboard/$', r'^/perfil/']):
                    return True

                logger.warning(
                    f"Usuario {request.user.username} sin roles intentó acceder a {path}"
                )
                return False

            return False

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
    Middleware para auditoría de acciones CRUD del usuario.
    Loguea POST/PUT/PATCH/DELETE a LogAuditoria.
    Excluye paths ruidosos (health checks, frontend logs, media, static).
    """
    
    # Paths a ignorar (no loguear)
    _SKIP_PATHS = (
        '/api/health', '/health', '/static/', '/media/', '/favicon',
        '/api/auditoria/log-frontend',  # Evitar loop infinito
        '/api/search/', '/api/notificaciones/',
    )
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def __call__(self, request):
        response = self.get_response(request)
        
        # Solo auditar para usuarios autenticados + métodos mutantes
        if (request.user.is_authenticated 
            and request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
            and not any(request.path_info.startswith(p) for p in self._SKIP_PATHS)
            and response.status_code < 500):
            self._log_user_action(request, response)
        
        return response
    
    def _log_user_action(self, request, response):
        """Registra la acción del usuario en LogAuditoria"""
        try:
            from core.models import LogAuditoria
            
            # Determinar acción legible
            method_map = {'POST': 'crear', 'PUT': 'modificar', 'PATCH': 'modificar', 'DELETE': 'eliminar'}
            accion = method_map.get(request.method, request.method.lower())
            
            # Extraer modelo del path (e.g. /api/empleados/ -> Empleados)
            parts = [p for p in request.path_info.strip('/').split('/') if p and p != 'api']
            modelo = parts[0].capitalize() if parts else 'Request'
            
            # Extraer objeto_id si está en el path
            objeto_id = parts[1] if len(parts) > 1 and not parts[1].endswith('/') else None
            
            LogAuditoria.objects.create(
                usuario=request.user,
                accion=accion,
                modelo=modelo,
                objeto_id=objeto_id,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                datos_antes=None,
                datos_despues=None,
                metadata={
                    'path': request.path_info,
                    'method': request.method,
                    'status_code': response.status_code
                }
            )
        except Exception as e:
            logger.error(f"Error logging user action: {e}")
    
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente.
        Cuando estamos detrás de un proxy confiable (Render),
        usamos el último IP antes de REMOTE_ADDR para evitar IP spoofing."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Tomar la IP más a la derecha (agregada por el proxy más confiable)
            # El primer elemento puede ser falsificado por el cliente
            ips = [ip.strip() for ip in x_forwarded_for.split(',')]
            # Si hay múltiples proxies, el último antes del edge proxy es el cliente real
            ip = ips[-1] if len(ips) == 1 else ips[-2] if len(ips) >= 2 else ips[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware para auditoría de seguridad del sistema.
    Registra intentos de acceso, errores de autenticación y actividad sospechosa.
    Respeta la configuración habilitar_auditoria de ConfiguracionSeguridad.
    """
    
    # Cache para la configuración de auditoría
    _AUDIT_CONFIG_CACHE_KEY = 'audit_config_enabled'
    _AUDIT_CONFIG_CACHE_TTL = 60  # 1 minuto
    
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
    
    def _is_audit_enabled(self):
        """Verifica si la auditoría está habilitada en ConfiguracionSeguridad"""
        from django.core.cache import cache
        cached = cache.get(self._AUDIT_CONFIG_CACHE_KEY)
        if cached is not None:
            return cached
        
        try:
            from configuracion.models import ConfiguracionSeguridad
            config = ConfiguracionSeguridad.get_config()
            enabled = config.habilitar_auditoria
            cache.set(self._AUDIT_CONFIG_CACHE_KEY, enabled, self._AUDIT_CONFIG_CACHE_TTL)
            return enabled
        except Exception:
            return True  # Default: auditoría habilitada
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Solo auditar si está habilitado
        if self._is_audit_enabled():
            self._audit_response(request, response)
        
        return response
    
    def process_request(self, request):
        """Audita las solicitudes entrantes"""
        if not self._is_audit_enabled():
            return None
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
        
        # Detectar patrones sospechosos y bloquear solicitudes maliciosas
        is_malicious = self._detect_suspicious_activity(request)
        if is_malicious:
            return JsonResponse(
                {'error': 'Request blocked by security policy.'},
                status=403
            )

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
        """Detecta patrones de actividad sospechosa y bloquea solicitudes maliciosas.
        Returns True si la solicitud es maliciosa y debe ser bloqueada."""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = self._get_client_ip(request)
        is_malicious = False

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
            is_malicious = True

        # Detectar patrones de URL sospechosos (SQLi, XSS, path traversal)
        suspicious_patterns = [
            r'\.\./', r'<script', r'union\s+select', r'drop\s+table',
            r'<iframe', r'javascript:', r'alert\(', r'eval\(',
            r'exec\s*\(', r'sleep\s*\(', r'benchmark\s*\(',
            r'0x[0-9a-f]+', r'char\s*\(', r'concat\s*\(',
            r'--\s*$', r'/etc/passwd', r'/proc/self',
        ]

        path_and_query = f"{request.path}?{request.META.get('QUERY_STRING', '')}"
        for pattern in suspicious_patterns:
            if re.search(pattern, path_and_query, re.IGNORECASE):
                self._log_security_event(
                    'SUSPICIOUS_REQUEST_PATTERN',
                    request,
                    f"Patrón sospechoso en URL: {pattern}"
                )
                is_malicious = True
                break

        # Detectar payloads maliciosos en el body (POST/PUT/PATCH)
        if request.method in ('POST', 'PUT', 'PATCH') and hasattr(request, 'body'):
            try:
                body_str = request.body.decode('utf-8', errors='ignore')[:2000]
                body_patterns = [r'<script', r'javascript:', r'union\s+select', r'drop\s+table']
                for pattern in body_patterns:
                    if re.search(pattern, body_str, re.IGNORECASE):
                        self._log_security_event(
                            'SUSPICIOUS_BODY_PAYLOAD',
                            request,
                            f"Patrón malicioso en body: {pattern}"
                        )
                        is_malicious = True
                        break
            except Exception:
                pass

        return is_malicious
    
    def _log_security_event(self, event_type, request, description):
        """Registra eventos de seguridad al log de archivo Y a la base de datos"""
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
            
            # También escribir a LogAuditoria para que sea visible en la UI
            try:
                from core.models import LogAuditoria
                LogAuditoria.objects.create(
                    usuario=user if user and user.is_authenticated else None,
                    accion=f'security_{event_type.lower()}',
                    modelo='Security',
                    objeto_id=None,
                    ip_address=ip_address,
                    user_agent=user_agent[:255],
                    datos_antes=None,
                    datos_despues=None,
                    metadata={
                        'event_type': event_type,
                        'description': description,
                        'path': request.path,
                        'method': request.method,
                    }
                )
            except Exception:
                pass  # No fallar si la BD no está disponible
            
        except Exception as e:
            self.logger.error(f"Error logging security event: {e}")
    
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente de forma segura."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ips = [ip.strip() for ip in x_forwarded_for.split(',')]
            ip = ips[-1] if len(ips) == 1 else ips[-2] if len(ips) >= 2 else ips[0]
        else:
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
        return ip
