"""
Autenticación JWT via httpOnly cookies.

Extiende JWTAuthentication de simplejwt para leer el access token
desde una cookie httpOnly en lugar del header Authorization.
Mantiene compatibilidad con el header Authorization como fallback.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


# Nombres de cookies
ACCESS_COOKIE = 'access_token'
REFRESH_COOKIE = 'refresh_token'

# Restrict refresh cookie to the refresh endpoint only
REFRESH_COOKIE_PATH = '/api/auth/token/refresh/'


def get_cookie_settings():
    """Retorna configuración de cookies basada en DEBUG."""
    is_production = not settings.DEBUG
    return {
        'httponly': True,
        'secure': is_production,
        'samesite': 'Lax',
        'path': '/',
        'domain': None,  # Allow default
    }


def set_auth_cookies(response, access_token, refresh_token=None):
    """Establece cookies httpOnly con los tokens JWT."""
    cookie_settings = get_cookie_settings()
    access_lifetime = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME')
    refresh_lifetime = settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME')

    response.set_cookie(
        ACCESS_COOKIE,
        str(access_token),
        max_age=int(access_lifetime.total_seconds()) if access_lifetime else 1800,
        **cookie_settings,
    )

    if refresh_token:
        # Refresh cookie uses a restricted path so it is only sent to the
        # refresh endpoint, reducing exposure if other endpoints are compromised.
        refresh_settings = {**cookie_settings, 'path': REFRESH_COOKIE_PATH}
        response.set_cookie(
            REFRESH_COOKIE,
            str(refresh_token),
            max_age=int(refresh_lifetime.total_seconds()) if refresh_lifetime else 86400,
            **refresh_settings,
        )


def clear_auth_cookies(response):
    """Elimina las cookies de autenticación."""
    cookie_settings = get_cookie_settings()
    # Clear access cookie on the general path
    response.delete_cookie(
        ACCESS_COOKIE,
        path=cookie_settings['path'],
        domain=cookie_settings['domain'],
        samesite=cookie_settings['samesite'],
    )
    # Clear refresh cookie on its restricted path
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_COOKIE_PATH,
        domain=cookie_settings['domain'],
        samesite=cookie_settings['samesite'],
    )


class CookieJWTAuthentication(JWTAuthentication):
    """
    Extensión de JWTAuthentication que busca el token en:
    1. Cookie httpOnly 'access_token' (preferido)
    2. Header Authorization (fallback para compatibilidad)
    """

    def authenticate(self, request):
        # Primero intentar leer desde cookie
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if raw_token:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)

        # Fallback al header Authorization (compatibilidad)
        return super().authenticate(request)
