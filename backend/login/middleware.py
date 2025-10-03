"""
Middleware personalizado para autenticación con tokens seguros.
"""

import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework.authtoken.models import Token
from .auth_security import AuthSecurityManager, SecurityAuditLogger

logger = logging.getLogger('security')


class TokenValidationMiddleware(MiddlewareMixin):
    """
    Middleware para validar automáticamente tokens en todas las requests.
    """
    
    def process_request(self, request):
        # Solo procesar requests a la API
        if not request.path.startswith('/api/'):
            return None
        
        # Excluir endpoints que no requieren token
        excluded_paths = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/password-reset/',
            '/api/auth/password-reset/confirm/',
            '/api/auth/',  # Información de la API
            '/api/public/',
        ]
        
        for path in excluded_paths:
            if request.path.startswith(path):
                return None
        
        # Verificar si hay header de autorización
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            # Si no hay header de autorización, dejar que DRF maneje el error
            return None
            
        if not auth_header.startswith('Token '):
            # Si no es un token válido, dejar que DRF maneje el error
            return None
        
        # Extraer token
        try:
            token_key = auth_header.split(' ')[1]
            token = Token.objects.select_related('user').get(key=token_key)
            
            # Validar si el token es válido (no expirado)
            if not AuthSecurityManager.is_token_valid(token):
                SecurityAuditLogger.log_token_activity(
                    token.user, 
                    "EXPIRED_ACCESS_ATTEMPT",
                    f"from IP {AuthSecurityManager.get_client_ip(request)}"
                )
                
                return JsonResponse({
                    'error': 'Token ha expirado. Por favor, inicie sesión nuevamente.',
                    'code': 'TOKEN_EXPIRED'
                }, status=401)
            
            # Token válido, continuar con el procesamiento normal
            # DRF se encargará de la autenticación
            
        except Token.DoesNotExist:
            # Token no existe, dejar que DRF maneje el error
            return None
            
        except (IndexError, ValueError):
            # Formato de header inválido, dejar que DRF maneje el error
            return None
            
        except Exception as e:
            logger.error(f"Error validating token: {e}")
            return JsonResponse({
                'error': 'Error interno del servidor.',
                'code': 'INTERNAL_ERROR'
            }, status=500)
        
        return None


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware para agregar headers de seguridad a todas las responses.
    """
    
    def process_response(self, request, response):
        # Headers de seguridad para todas las responses
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                "worker-src 'self' blob:; "
                "child-src 'self' blob:"
            ),
        }
        
        # Aplicar headers solo si no están ya presentes
        for header, value in security_headers.items():
            if header not in response:
                response[header] = value
        
        # Para APIs, agregar headers específicos
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        
        return response


class RateLimitingMiddleware(MiddlewareMixin):
    """
    Middleware básico para rate limiting por IP.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        # Configuración básica de rate limiting
        self.max_requests = 1000  # requests por hora
        self.time_window = 3600   # 1 hora en segundos
    
    def process_request(self, request):
        # Implementación básica - se podría mejorar con Redis para mejor performance
        from django.core.cache import cache
        
        ip_address = AuthSecurityManager.get_client_ip(request)
        cache_key = f"rate_limit_{ip_address.replace('.', '_')}"
        
        # Obtener contador actual
        current_requests = cache.get(cache_key, 0)
        
        # Si excede el límite, bloquear
        if current_requests >= self.max_requests:
            SecurityAuditLogger.log_security_event(
                "RATE_LIMIT_EXCEEDED",
                getattr(request.user, 'email', 'anonymous'),
                ip_address,
                f"Exceeded {self.max_requests} requests per hour"
            )
            
            return JsonResponse({
                'error': 'Demasiadas solicitudes. Intente más tarde.',
                'code': 'RATE_LIMIT_EXCEEDED',
                'retry_after': self.time_window
            }, status=429)
        
        # Incrementar contador
        cache.set(cache_key, current_requests + 1, self.time_window)
        
        return None
