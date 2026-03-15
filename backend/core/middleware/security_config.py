"""
Middleware de Configuración de Seguridad Dinámica
=================================================

Aplica la configuración de ConfiguracionSeguridad en runtime:
- Timeout de sesión dinámico (tiempo_sesion)
- Expiración de contraseña (dias_expiracion_password) 

Registrado en MIDDLEWARE de settings.py.
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache

logger = logging.getLogger('security')

_SESSION_CONFIG_CACHE_KEY = 'security_session_config'
_SESSION_CONFIG_CACHE_TTL = 60  # 1 minuto


def _get_session_timeout():
    """
    Obtiene el timeout de sesión en segundos desde ConfiguracionSeguridad.
    Retorna None si no se puede leer (usa el default de Django).
    """
    cached = cache.get(_SESSION_CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        from configuracion.models import ConfiguracionSeguridad
        config = ConfiguracionSeguridad.get_config()
        timeout_seconds = (config.tiempo_sesion or 30) * 60  # minutos → segundos
        cache.set(_SESSION_CONFIG_CACHE_KEY, timeout_seconds, _SESSION_CONFIG_CACHE_TTL)
        return timeout_seconds
    except Exception:
        return 3600  # fallback 1 hora


class DynamicSessionTimeoutMiddleware(MiddlewareMixin):
    """
    Establece el timeout de sesión dinámicamente según ConfiguracionSeguridad.tiempo_sesion.
    Cada request actualiza el expiry de la sesión con el valor actual de la DB.
    """

    def process_request(self, request):
        if hasattr(request, 'session'):
            timeout = _get_session_timeout()
            request.session.set_expiry(timeout)
        return None
