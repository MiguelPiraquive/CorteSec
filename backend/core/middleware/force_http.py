"""
Middleware para forzar HTTP en desarrollo y evitar redirects automáticos a HTTPS
"""

from django.http import HttpResponse
from django.conf import settings

class ForceHTTPMiddleware:
    """
    Middleware que intercepta requests HTTPS y los redirige a HTTP en desarrollo
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Solo aplicar en modo desarrollo
        if settings.DEBUG:
            # Si la request viene por HTTPS, redirigir a HTTP
            if request.is_secure() or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https':
                # Crear URL HTTP
                http_url = f"http://{request.get_host()}{request.get_full_path()}"
                
                # Respuesta con redirect a HTTP
                response = HttpResponse(
                    f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Redirigiendo a HTTP</title>
                        <meta http-equiv="refresh" content="0; url={http_url}">
                    </head>
                    <body>
                        <p>Redirigiendo a <a href="{http_url}">{http_url}</a></p>
                        <script>window.location.href = '{http_url}';</script>
                    </body>
                    </html>
                    """,
                    status=302
                )
                response['Location'] = http_url
                return response
        
        # Procesar request normalmente
        response = self.get_response(request)
        return response


class SecurityHeadersMiddleware:
    """
    Middleware para agregar headers de seguridad
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Headers de seguridad
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Solo en producción
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
