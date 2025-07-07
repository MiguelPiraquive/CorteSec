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

from perfil.models import Perfil
from permisos.models import Permiso, Modulo
from roles.models import Rol

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
    ]
    
    # URLs que solo requieren autenticación
    AUTH_ONLY_PATHS = [
        '/dashboard/$',
        '/perfil/',
        '/ayuda/',
    ]
    
    # Mapeo de URLs a permisos requeridos
    URL_PERMISSION_MAP = {
        # Roles
        r'^/roles/$': 'ver_roles',
        r'^/roles/crear/$': 'crear_roles',
        r'^/roles/\d+/editar/$': 'editar_roles',
        r'^/roles/\d+/eliminar/$': 'eliminar_roles',
        r'^/roles/\d+/$': 'ver_roles',
        
        # Préstamos
        r'^/prestamos/$': 'ver_prestamos',
        r'^/prestamos/crear/$': 'crear_prestamos',
        r'^/prestamos/\d+/editar/$': 'editar_prestamos',
        r'^/prestamos/\d+/eliminar/$': 'eliminar_prestamos',
        r'^/prestamos/\d+/aprobar/$': 'aprobar_prestamos',
        r'^/prestamos/\d+/rechazar/$': 'rechazar_prestamos',
        r'^/prestamos/\d+/$': 'ver_prestamos',
        
        # Nómina
        r'^/payroll/$': 'ver_nomina',
        r'^/payroll/crear/$': 'crear_nomina',
        r'^/payroll/\d+/editar/$': 'editar_nomina',
        r'^/payroll/\d+/eliminar/$': 'eliminar_nomina',
        
        # Empleados
        r'^/empleados/$': 'ver_empleados',
        r'^/empleados/crear/$': 'crear_empleados',
        r'^/empleados/\d+/editar/$': 'editar_empleados',
        r'^/empleados/\d+/eliminar/$': 'eliminar_empleados',
        
        # Contabilidad
        r'^/contabilidad/$': 'ver_contabilidad',
        r'^/contabilidad/asientos/$': 'ver_asientos_contables',
        r'^/contabilidad/asientos/crear/$': 'crear_asientos_contables',
        r'^/contabilidad/reportes/$': 'ver_reportes_contables',
        
        # Configuración
        r'^/configuracion/$': 'ver_configuracion',
        r'^/configuracion/editar/$': 'editar_configuracion',
        
        # Items y Ubicaciones
        r'^/items/$': 'ver_items',
        r'^/items/crear/$': 'crear_items',
        r'^/locations/$': 'ver_ubicaciones',
        r'^/locations/crear/$': 'crear_ubicaciones',
        
        # Tipos de cantidad
        r'^/tipos-cantidad/$': 'ver_tipos_cantidad',
        r'^/tipos-cantidad/crear/$': 'crear_tipos_cantidad',
    }

    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def process_request(self, request):
        """
        Procesa cada request para verificar permisos antes de que llegue a la vista.
        """
        # Skip si no está autenticado
        if not request.user.is_authenticated:
            return None
        
        # Skip para superusuarios
        if request.user.is_superuser:
            return None
        
        # Skip para URLs excluidas
        if self._is_excluded_path(request.path):
            return None
        
        # Solo autenticación para ciertas URLs
        if self._is_auth_only_path(request.path):
            return None
        
        # Verificar permisos
        if not self._has_permission(request):
            return self._handle_permission_denied(request)
        
        return None

    def _is_excluded_path(self, path):
        """Verifica si la URL está excluida de verificación de permisos."""
        for excluded_path in self.EXCLUDED_PATHS:
            if path.startswith(excluded_path):
                return True
        return False

    def _is_auth_only_path(self, path):
        """Verifica si la URL solo requiere autenticación."""
        for auth_path in self.AUTH_ONLY_PATHS:
            if re.match(auth_path, path):
                return True
        return False

    def _has_permission(self, request):
        """
        Verifica si el usuario tiene permisos para acceder a la URL.
        """
        try:
            # Obtener el permiso requerido para la URL
            required_permission = self._get_required_permission(request.path)
            
            if not required_permission:
                # Si no hay permiso específico mapeado, permitir acceso
                return True
            
            # Verificar permiso con cache
            cache_key = f"user_permission_{request.user.id}_{required_permission}"
            has_perm = cache.get(cache_key)
            
            if has_perm is None:
                has_perm = self._check_user_permission(request.user, required_permission)
                # Cache por 5 minutos
                cache.set(cache_key, has_perm, 300)
            
            if not has_perm:
                # Log del intento de acceso denegado
                logger.warning(
                    f"Access denied for user {request.user.username} "
                    f"to {request.path} (required: {required_permission})"
                )
            
            return has_perm
            
        except Exception as e:
            logger.error(f"Error checking permissions: {e}")
            # En caso de error, denegar acceso por seguridad
            return False

    def _get_required_permission(self, path):
        """
        Obtiene el permiso requerido para una URL específica.
        """
        for url_pattern, permission in self.URL_PERMISSION_MAP.items():
            if re.match(url_pattern, path):
                return permission
        return None

    def _check_user_permission(self, user, permission_codename):
        """
        Verifica si un usuario tiene un permiso específico.
        """
        try:
            # Obtener perfil del usuario
            try:
                perfil = user.perfil
            except:
                # Si no tiene perfil, no tiene permisos
                return False
            
            # Verificar si el usuario está activo
            if not perfil.activo:
                return False
            
            # Obtener roles activos del usuario
            roles_usuario = perfil.roles.filter(activo=True)
            
            if not roles_usuario.exists():
                return False
            
            # Verificar si alguno de los roles tiene el permiso
            for rol in roles_usuario:
                if rol.permisos.filter(codename=permission_codename, activo=True).exists():
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking user permission: {e}")
            return False

    def _handle_permission_denied(self, request):
        """
        Maneja el caso cuando se deniega el acceso.
        """
        # Log del intento de acceso
        logger.warning(
            f"Permission denied for user {request.user.username} "
            f"to {request.path} from IP {self._get_client_ip(request)}"
        )
        
        # Para requests AJAX, devolver JSON
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': 'permission_denied',
                'message': 'No tienes permisos para realizar esta acción.'
            }, status=403)
        
        # Para requests normales, mostrar página de error personalizada
        return render(request, 'core/403.html', {
            'message': 'No tienes permisos para acceder a esta página.',
            'return_url': reverse('dashboard:contratista_lista'),
        }, status=403)

    def _get_client_ip(self, request):
        """Obtiene la IP del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware para auditoría de seguridad y logging de accesos.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def process_request(self, request):
        """
        Log de accesos para auditoría.
        """
        if hasattr(settings, 'SECURITY_AUDIT_ENABLED') and settings.SECURITY_AUDIT_ENABLED:
            if request.user.is_authenticated:
                logger.info(
                    f"User {request.user.username} accessed {request.path} "
                    f"from IP {self._get_client_ip(request)}"
                )
        return None

    def _get_client_ip(self, request):
        """Obtiene la IP del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# Decoradores para verificación de permisos en vistas específicas

def require_permission(permission_codename):
    """
    Decorador para requerir un permiso específico en una vista.
    
    Uso:
    @require_permission('crear_empleados')
    def crear_empleado(request):
        ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login:login')
            
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            # Verificar permiso
            middleware = PermissionMiddleware(None)
            if not middleware._check_user_permission(request.user, permission_codename):
                messages.error(request, 'No tienes permisos para realizar esta acción.')
                return redirect('dashboard:contratista_lista')
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def require_role(role_name):
    """
    Decorador para requerir un rol específico.
    
    Uso:
    @require_role('Administrador')
    def vista_admin(request):
        ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login:login')
            
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            try:
                perfil = request.user.perfil
                if not perfil.roles.filter(nombre=role_name, activo=True).exists():
                    messages.error(request, f'Necesitas el rol "{role_name}" para acceder.')
                    return redirect('dashboard:contratista_lista')
            except:
                messages.error(request, 'No tienes un perfil configurado.')
                return redirect('dashboard:contratista_lista')
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def require_level(min_level):
    """
    Decorador para requerir un nivel mínimo de jerarquía.
    
    Uso:
    @require_level(5)  # Solo usuarios con nivel 5 o menor
    def vista_gerencial(request):
        ...
    """
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login:login')
            
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            try:
                perfil = request.user.perfil
                roles_activos = perfil.roles.filter(activo=True)
                
                if not roles_activos.exists():
                    messages.error(request, 'No tienes roles asignados.')
                    return redirect('dashboard:contratista_lista')
                
                # Verificar si algún rol tiene el nivel requerido
                nivel_usuario = min(roles_activos.values_list('nivel', flat=True))
                
                if nivel_usuario > min_level:
                    messages.error(request, 'No tienes el nivel de acceso requerido.')
                    return redirect('dashboard:contratista_lista')
                
            except Exception as e:
                logger.error(f"Error checking user level: {e}")
                messages.error(request, 'Error al verificar permisos.')
                return redirect('dashboard:contratista_lista')
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator
