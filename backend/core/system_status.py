from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib.auth.decorators import user_passes_test
from django.db import connection
from django.core.cache import cache
import os
import psutil
import sys
from pathlib import Path
from datetime import datetime


def is_staff_user(user):
    """Verifica que el usuario sea staff"""
    return user.is_authenticated and user.is_staff


@user_passes_test(is_staff_user)
def system_status(request):
    """
    Vista para verificar el estado completo del sistema
    """
    status = {
        'timestamp': datetime.now().isoformat(),
        'django': _get_django_status(),
        'database': _get_database_status(),
        'cache': _get_cache_status(),
        'system': _get_system_status(),
        'static_files': _get_static_files_status(),
        'directories': _get_directories_status(),
        'health': 'OK'
    }
    
    # Determinar estado general de salud
    if any(not component.get('status', True) for component in status.values() if isinstance(component, dict)):
        status['health'] = 'WARNING'
    
    return JsonResponse(status, json_dumps_params={'indent': 2})


def _get_django_status():
    """Estado de Django"""
    return {
        'debug': settings.DEBUG,
        'version': '.'.join(str(v) for v in sys.version_info[:3]),
        'static_url': settings.STATIC_URL,
        'static_root': settings.STATIC_ROOT,
        'media_url': settings.MEDIA_URL,
        'media_root': settings.MEDIA_ROOT,
        'secret_key_set': bool(settings.SECRET_KEY),
        'allowed_hosts': settings.ALLOWED_HOSTS,
        'time_zone': settings.TIME_ZONE,
        'language_code': settings.LANGUAGE_CODE,
        'status': True
    }


def _get_database_status():
    """Estado de la base de datos"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        db_settings = settings.DATABASES['default']
        
        return {
            'connected': True,
            'engine': db_settings['ENGINE'],
            'name': db_settings['NAME'],
            'host': db_settings.get('HOST', 'localhost'),
            'port': db_settings.get('PORT', ''),
            'status': True
        }
    except Exception as e:
        return {
            'connected': False,
            'error': str(e),
            'status': False
        }


def _get_cache_status():
    """Estado del cache"""
    try:
        test_key = 'system_status_test'
        test_value = 'test_value'
        
        cache.set(test_key, test_value, 30)
        retrieved_value = cache.get(test_key)
        cache.delete(test_key)
        
        return {
            'available': True,
            'working': retrieved_value == test_value,
            'backend': getattr(settings, 'CACHES', {}).get('default', {}).get('BACKEND', 'Unknown'),
            'status': True
        }
    except Exception as e:
        return {
            'available': False,
            'error': str(e),
            'status': False
        }


def _get_system_status():
    """Estado del sistema operativo"""
    try:
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'percent': psutil.virtual_memory().percent,
                'used': psutil.virtual_memory().used
            },
            'disk': {
                'total': psutil.disk_usage('/').total,
                'free': psutil.disk_usage('/').free,
                'percent': psutil.disk_usage('/').percent,
                'used': psutil.disk_usage('/').used
            },
            'platform': sys.platform,
            'python_version': sys.version,
            'status': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'status': False
        }


def _get_static_files_status():
    """Estado de archivos estáticos"""
    try:
        static_root = Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else None
        static_dirs = getattr(settings, 'STATICFILES_DIRS', [])
        
        status = {
            'static_root_exists': static_root.exists() if static_root else False,
            'static_root_path': str(static_root) if static_root else None,
            'staticfiles_dirs': [str(d) for d in static_dirs],
            'storage': getattr(settings, 'STATICFILES_STORAGE', 'django.contrib.staticfiles.storage.StaticFilesStorage'),
            'status': True
        }
        
        # Verificar archivos críticos
        if static_root and static_root.exists():
            critical_files = [
                'css/base.css',
                'css/bootstrap.min.css',
                'js/jquery.min.js',
                'admin/css/base.css'
            ]
            
            status['critical_files'] = {}
            for file_path in critical_files:
                file_full_path = static_root / file_path
                status['critical_files'][file_path] = file_full_path.exists()
        
        return status
        
    except Exception as e:
        return {
            'error': str(e),
            'status': False
        }


def _get_directories_status():
    """Estado de directorios importantes"""
    try:
        base_dir = Path(settings.BASE_DIR)
        directories = {
            'base_dir': base_dir,
            'media_root': Path(settings.MEDIA_ROOT) if settings.MEDIA_ROOT else None,
            'static_root': Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else None,
        }
        
        status = {}
        for name, path in directories.items():
            if path:
                status[name] = {
                    'path': str(path),
                    'exists': path.exists(),
                    'is_dir': path.is_dir() if path.exists() else False,
                    'writable': os.access(path, os.W_OK) if path.exists() else False
                }
                
                if path.exists() and path.is_dir():
                    try:
                        status[name]['file_count'] = len(list(path.rglob('*')))
                    except:
                        status[name]['file_count'] = 'unknown'
        
        return {
            'directories': status,
            'status': True
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'status': False
        }


@user_passes_test(is_staff_user)
def system_health_check(request):
    """
    Health check simple para monitoring
    """
    try:
        # Test básico de DB
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Test básico de cache
        cache.set('health_check', 'ok', 10)
        cache_ok = cache.get('health_check') == 'ok'
        
        if cache_ok:
            return JsonResponse({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'checks': {
                    'database': True,
                    'cache': True
                }
            })
        else:
            return JsonResponse({
                'status': 'degraded',
                'timestamp': datetime.now().isoformat(),
                'checks': {
                    'database': True,
                    'cache': False
                }
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e),
            'checks': {
                'database': False,
                'cache': False
            }
        }, status=500)
