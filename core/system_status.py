from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from django.conf import settings
import os
from pathlib import Path

@staff_member_required
def system_status(request):
    """
    Vista para verificar el estado del sistema en producción
    """
    status = {
        'debug': settings.DEBUG,
        'static_root': settings.STATIC_ROOT,
        'static_url': settings.STATIC_URL,
        'staticfiles_storage': settings.STATICFILES_STORAGE,
        'middleware': [m for m in settings.MIDDLEWARE if 'whitenoise' in m.lower()],
        'static_files_check': {},
        'directories': {}
    }
    
    # Verificar directorios importantes
    base_dir = Path(settings.BASE_DIR)
    static_dir = base_dir / 'static'
    staticfiles_dir = Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else None
    
    status['directories']['base_dir'] = {
        'path': str(base_dir),
        'exists': base_dir.exists()
    }
    
    status['directories']['static_dir'] = {
        'path': str(static_dir),
        'exists': static_dir.exists(),
        'files': list(static_dir.rglob('*')) if static_dir.exists() else []
    }
    
    if staticfiles_dir:
        status['directories']['staticfiles_dir'] = {
            'path': str(staticfiles_dir),
            'exists': staticfiles_dir.exists(),
            'files': list(staticfiles_dir.rglob('*')) if staticfiles_dir.exists() else []
        }
    
    # Verificar archivos críticos
    critical_files = [
        'css/tailwind.css',
        'css/base-improvements.css', 
        'css/custom.css',
        'js/dashboard-globals.js',
        'js/header-advanced.js',
        'js/notification-system.js'
    ]
    
    for file_path in critical_files:
        # Verificar en static/
        static_file = static_dir / file_path
        staticfiles_file = staticfiles_dir / file_path if staticfiles_dir else None
        
        status['static_files_check'][file_path] = {
            'in_static': static_file.exists() if static_dir.exists() else False,
            'in_staticfiles': staticfiles_file.exists() if staticfiles_file else False,
            'static_size': static_file.stat().st_size if static_file.exists() else 0,
            'staticfiles_size': staticfiles_file.stat().st_size if staticfiles_file and staticfiles_file.exists() else 0
        }
    
    return JsonResponse(status, indent=2)
