"""
System Status & Health Check API
=================================
Endpoints seguros para monitoreo del sistema.

- /api/system-status/ → Estado completo (JWT + staff)
- /api/health-check/  → Probe rápido (JWT + staff)
"""

from django.http import JsonResponse
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from django.core.mail import get_connection as get_mail_connection
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from core.policies import SystemStatusAccessPolicy
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
import sys
from pathlib import Path
from datetime import datetime

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


# ─── Versión centralizada ───────────────────────────────────────────
APP_VERSION = getattr(settings, 'APP_VERSION', '2.0.0')


def _require_staff(request):
    """Retorna Response si el usuario no es staff."""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=403)
    return None


def _safe_error(e):
    """Retorna mensaje genérico en producción, detallado solo en DEBUG."""
    if settings.DEBUG:
        return str(e)
    return 'Service unavailable'


# ─── Health sub-checks ──────────────────────────────────────────────

def _get_django_status():
    """Estado de Django — SIN datos sensibles."""
    return {
        'debug': settings.DEBUG,
        'python_version': '.'.join(str(v) for v in sys.version_info[:3]),
        'time_zone': settings.TIME_ZONE,
        'language_code': settings.LANGUAGE_CODE,
        'app_version': APP_VERSION,
        'status': True,
    }


def _get_database_status():
    """Conectividad de la base de datos."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        engine = settings.DATABASES['default']['ENGINE']
        engine_short = engine.rsplit('.', 1)[-1]

        return {
            'connected': True,
            'engine': engine_short,
            'status': True,
        }
    except Exception as e:
        return {
            'connected': False,
            'error': _safe_error(e),
            'status': False,
        }


def _get_cache_status():
    """Verificación del cache."""
    try:
        test_key = '_sys_status_probe'
        test_value = 'ok'
        cache.set(test_key, test_value, 30)
        retrieved = cache.get(test_key)
        cache.delete(test_key)

        backend = settings.CACHES.get('default', {}).get('BACKEND', 'Unknown')
        backend_short = backend.rsplit('.', 1)[-1]

        return {
            'available': True,
            'working': retrieved == test_value,
            'backend': backend_short,
            'status': retrieved == test_value,
        }
    except Exception as e:
        return {
            'available': False,
            'error': _safe_error(e),
            'status': False,
        }


def _get_redis_status():
    """Verificación directa de Redis."""
    try:
        backend = settings.CACHES.get('default', {}).get('BACKEND', '')
        if 'Redis' not in backend:
            return {'available': False, 'reason': 'No Redis configured', 'status': True}

        cache.set('_redis_ping', '1', 5)
        ok = cache.get('_redis_ping') == '1'
        cache.delete('_redis_ping')

        return {
            'available': True,
            'ping': ok,
            'status': ok,
        }
    except Exception as e:
        return {
            'available': False,
            'error': _safe_error(e),
            'status': False,
        }


def _get_email_status():
    """Verificación del backend de email/SMTP."""
    try:
        email_backend = getattr(settings, 'EMAIL_BACKEND', 'Unknown')
        backend_short = email_backend.rsplit('.', 1)[-1]

        result = {
            'backend': backend_short,
            'host_configured': bool(getattr(settings, 'EMAIL_HOST', '')),
            'port': getattr(settings, 'EMAIL_PORT', None),
            'use_tls': getattr(settings, 'EMAIL_USE_TLS', False),
            'status': True,
        }

        try:
            conn = get_mail_connection()
            conn.open()
            conn.close()
            result['smtp_connection'] = True
        except Exception:
            result['smtp_connection'] = False

        return result
    except Exception as e:
        return {
            'error': _safe_error(e),
            'status': False,
        }


def _get_celery_status():
    """Verificar si Celery está configurado y workers activos."""
    try:
        broker = getattr(settings, 'CELERY_BROKER_URL', None) or getattr(settings, 'BROKER_URL', None)

        if not broker:
            return {'configured': False, 'reason': 'No Celery broker configured', 'status': True}

        try:
            from celery import current_app
            inspector = current_app.control.inspect(timeout=2.0)
            active = inspector.active()
            workers = list(active.keys()) if active else []
            return {
                'configured': True,
                'workers': len(workers),
                'worker_names': workers[:5],
                'status': len(workers) > 0,
            }
        except Exception:
            return {
                'configured': True,
                'workers': 0,
                'error': 'Cannot reach workers',
                'status': False,
            }
    except Exception as e:
        return {
            'error': _safe_error(e),
            'status': False,
        }


def _get_system_status():
    """Estado del sistema operativo (CPU, RAM, Disco)."""
    if not HAS_PSUTIL:
        return {
            'error': 'psutil not installed',
            'status': False,
        }

    try:
        cpu = psutil.cpu_percent(interval=0)
        mem = psutil.virtual_memory()

        disk_path = 'C:\\' if sys.platform == 'win32' else '/'
        try:
            disk = psutil.disk_usage(disk_path)
            disk_data = {
                'total_gb': round(disk.total / (1024 ** 3), 2),
                'free_gb': round(disk.free / (1024 ** 3), 2),
                'used_gb': round(disk.used / (1024 ** 3), 2),
                'percent': disk.percent,
            }
        except Exception:
            disk_data = {'error': 'Cannot read disk', 'percent': 0}

        return {
            'cpu_percent': cpu,
            'cpu_count': psutil.cpu_count(),
            'memory': {
                'total_gb': round(mem.total / (1024 ** 3), 2),
                'available_gb': round(mem.available / (1024 ** 3), 2),
                'used_gb': round(mem.used / (1024 ** 3), 2),
                'percent': mem.percent,
            },
            'disk': disk_data,
            'platform': sys.platform,
            'python_version': sys.version.split()[0],
            'status': True,
        }
    except Exception as e:
        return {
            'error': _safe_error(e),
            'status': False,
        }


def _get_static_files_status():
    """Estado de archivos estáticos."""
    try:
        static_root = Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else None

        result = {
            'static_root_exists': static_root.exists() if static_root else False,
            'static_url': settings.STATIC_URL,
            'status': True,
        }

        if static_root and static_root.exists():
            count = sum(1 for f in static_root.rglob('*') if f.is_file())
            result['file_count'] = count

        return result
    except Exception as e:
        return {
            'error': _safe_error(e),
            'status': False,
        }


def _get_app_stats():
    """Estadísticas básicas de la aplicación."""
    try:
        from django.contrib.auth import get_user_model
        from core.models import Organizacion

        User = get_user_model()

        return {
            'users_active': User.objects.filter(is_active=True).count(),
            'users_total': User.objects.count(),
            'organizations_active': Organizacion.objects.filter(activa=True).count(),
            'organizations_total': Organizacion.objects.count(),
            'status': True,
        }
    except Exception as e:
        return {
            'error': _safe_error(e),
            'status': False,
        }


# ─── API Views ──────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([SystemStatusAccessPolicy])
def system_status(request):
    """
    Estado completo del sistema — requiere core.view_system_status.
    GET /api/system-status/
    """
    data = {
        'timestamp': datetime.now().isoformat(),
        'version': APP_VERSION,
        'django': _get_django_status(),
        'database': _get_database_status(),
        'cache': _get_cache_status(),
        'redis': _get_redis_status(),
        'email': _get_email_status(),
        'celery': _get_celery_status(),
        'system': _get_system_status(),
        'static_files': _get_static_files_status(),
        'app_stats': _get_app_stats(),
    }

    # Salud general
    checks = [v for v in data.values() if isinstance(v, dict)]
    all_ok = all(c.get('status', True) for c in checks)

    if all_ok:
        data['health'] = 'OK'
    else:
        data['health'] = 'WARNING'

    return JsonResponse(data, json_dumps_params={'indent': 2})


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([SystemStatusAccessPolicy])
def system_health_check(request):
    """
    Health check rápido — requiere core.view_system_status.
    GET /api/health-check/
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        cache.set('_hc', 'ok', 10)
        cache_ok = cache.get('_hc') == 'ok'
        cache.delete('_hc')

        status_val = 'healthy' if cache_ok else 'degraded'
        return JsonResponse({
            'status': status_val,
            'version': APP_VERSION,
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'database': True,
                'cache': cache_ok,
            }
        }, status=200 if cache_ok else 503)

    except Exception:
        return JsonResponse({
            'status': 'unhealthy',
            'version': APP_VERSION,
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'database': False,
                'cache': False,
            }
        }, status=503)
