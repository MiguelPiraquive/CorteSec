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
                        <script>
                            // Redirigir inmediatamente
                            window.location.replace('{http_url}');
                        </script>
                    </head>
                    <body>
                        <h1>Redirigiendo a HTTP...</h1>
                        <p>Si no eres redirigido automáticamente, <a href="{http_url}">haz clic aquí</a></p>
                        <script>
                            // Forzar HTTP en el navegador
                            if (location.protocol === 'https:') {{
                                location.replace('{http_url}');
                            }}
                        </script>
                    </body>
                    </html>
                    """,
                    status=301
                )
                response['Location'] = http_url
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                return response

        response = self.get_response(request)
        
        # Agregar headers para prevenir HTTPS upgrade
        if settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=0'
            # No agregar upgrade-insecure-requests
            if 'Content-Security-Policy' in response:
                csp = response['Content-Security-Policy']
                csp = csp.replace('upgrade-insecure-requests;', '')
                response['Content-Security-Policy'] = csp
        
        return response
