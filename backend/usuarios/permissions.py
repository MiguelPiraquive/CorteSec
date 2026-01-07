"""
ASOGAN - Permisos de Usuarios  
Permisos granulares para gestión de usuarios usando PERMISOS EXISTENTES
"""

from rest_framework import permissions
import logging

logger = logging.getLogger(__name__)

# MAPEO DE PERMISOS: código que buscamos -> código que existe en BD
PERMISOS_MAP = {
    'ver_usuarios': 'USER_MANAGEMENT_VIEW',  # Ver Gestión de Usuarios
    'crear_usuarios': 'USER_ADMIN',          # Administrar Usuarios (incluye crear)
    'editar_usuarios': 'USER_ADMIN',         # Administrar Usuarios (incluye editar)
    'eliminar_usuarios': 'USER_ADMIN',       # Administrar Usuarios (incluye eliminar)
    'activar_usuarios': 'USER_ADMIN',        # Administrar Usuarios (incluye activar)
    'cambiar_roles_usuarios': 'USER_ADMIN',  # Administrar Usuarios (incluye cambiar roles)
    'ver_estadisticas_usuarios': 'USER_MANAGEMENT_VIEW',  # Ver Gestión de Usuarios
    'exportar_usuarios': 'USER_EXPORT',      # Exportar Usuarios
}


def tiene_permiso(usuario, codigo_permiso):
    """
    Verifica si un usuario tiene un permiso específico
    Usa PERMISOS_MAP para convertir códigos a los que existen en BD
    """
    codigo_real = PERMISOS_MAP.get(codigo_permiso, codigo_permiso)
    logger.info(f"🔍 Verificando permiso '{codigo_permiso}' -> '{codigo_real}' para usuario: {usuario.email}")
    
    if not usuario or not usuario.is_authenticated:
        logger.warning(f"❌ Usuario no autenticado")
        return False
    
    # Superusuarios siempre tienen todos los permisos
    if usuario.is_superuser:
        logger.info(f"✅ Usuario {usuario.email} es SUPERUSUARIO - ACCESO TOTAL")
        return True
    
    # Staff tienen acceso a gestión de usuarios
    if usuario.is_staff:
        logger.info(f"✅ Usuario {usuario.email} es STAFF - ACCESO GARANTIZADO")
        return True
    
    # Para usuarios normales, verificar permisos en BD
    from apps.permisos.models import PermisoDirecto, Permiso
    
    try:
        # Buscar el permiso por código REAL (el que existe en BD)
        permiso = Permiso.objects.get(codigo=codigo_real)
        logger.info(f"📋 Permiso encontrado en BD: {permiso.nombre} ({codigo_real})")
        
        # Verificar si el usuario tiene este permiso asignado directamente
        tiene = PermisoDirecto.objects.filter(
            usuario=usuario,
            permiso=permiso,
            activo=True
        ).exists()
        
        if tiene:
            logger.info(f"✅ Usuario tiene permiso directo asignado")
        else:
            logger.warning(f"❌ Usuario NO tiene permiso directo asignado")
        
        return tiene
    except Permiso.DoesNotExist:
        logger.error(f"⚠️  Permiso '{codigo_real}' NO EXISTE en la base de datos")
        return False
    except Exception as e:
        logger.error(f"❌ Error verificando permiso: {str(e)}")
        return False


class CanViewUsers(permissions.BasePermission):
    """Permiso para ver listado de usuarios"""
    
    def has_permission(self, request, view):
        logger.info(f"🔐 CanViewUsers - Verificando permiso para {request.user.email}")
        
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"❌ Usuario no autenticado")
            return False
        
        # Superusuarios siempre pueden
        if request.user.is_superuser:
            logger.info(f"✅ SUPERUSUARIO - Acceso concedido")
            return True
        
        # Staff pueden ver usuarios
        if request.user.is_staff:
            logger.info(f"✅ STAFF - Acceso concedido")
            return True
        
        # Verificar permiso específico usando sistema ASOGAN
        resultado = tiene_permiso(request.user, 'ver_usuarios')
        logger.info(f"📊 Resultado final: {resultado}")
        return resultado


class CanCreateUsers(permissions.BasePermission):
    """Permiso para crear usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        return tiene_permiso(request.user, 'crear_usuarios')


class CanEditUsers(permissions.BasePermission):
    """Permiso para editar usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        return tiene_permiso(request.user, 'editar_usuarios')
    
    def has_object_permission(self, request, view, obj):
        """No permitir que un usuario se desactive a sí mismo"""
        if request.user.is_superuser:
            return True
        
        # No puede editarse a sí mismo si no es superuser
        if obj.id == request.user.id:
            return request.user.is_superuser
        
        return tiene_permiso(request.user, 'editar_usuarios')


class CanDeleteUsers(permissions.BasePermission):
    """Permiso para eliminar usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        return tiene_permiso(request.user, 'eliminar_usuarios')
    
    def has_object_permission(self, request, view, obj):
        """No permitir que un usuario se elimine a sí mismo"""
        if obj.id == request.user.id:
            return False
        
        return tiene_permiso(request.user, 'eliminar_usuarios')


class CanActivateUsers(permissions.BasePermission):
    """Permiso para activar/desactivar usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        return tiene_permiso(request.user, 'activar_usuarios')
    
    def has_object_permission(self, request, view, obj):
        """No permitir que un usuario se desactive a sí mismo"""
        if obj.id == request.user.id:
            return False
        
        return True


class CanChangeRoles(permissions.BasePermission):
    """Permiso para cambiar roles de usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Solo staff puede cambiar roles
        if not request.user.is_staff:
            return False
        
        return tiene_permiso(request.user, 'cambiar_roles_usuarios')


class CanViewStats(permissions.BasePermission):
    """Permiso para ver estadísticas de usuarios"""
    
    def has_permission(self, request, view):
        logger.info(f"🔐 CanViewStats - Verificando permiso para {request.user.email}")
        
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"❌ Usuario no autenticado")
            return False
        
        if request.user.is_superuser or request.user.is_staff:
            logger.info(f"✅ SUPERUSUARIO/STAFF - Acceso concedido a estadísticas")
            return True
        
        resultado = tiene_permiso(request.user, 'ver_estadisticas_usuarios')
        logger.info(f"📊 Resultado verificación estadísticas: {resultado}")
        return resultado


class CanExportUsers(permissions.BasePermission):
    """Permiso para exportar datos de usuarios"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        return tiene_permiso(request.user, 'exportar_usuarios')


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permiso para que un usuario solo pueda ver/editar su propio perfil o ser admin"""
    
    def has_object_permission(self, request, view, obj):
        # Admin puede todo
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Usuario solo puede ver/editar su propio perfil
        return obj.id == request.user.id
