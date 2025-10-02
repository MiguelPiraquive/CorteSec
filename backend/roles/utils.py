"""
Utilidades avanzadas para el sistema de roles
============================================

Funciones de utilidad, validadores y helpers para la gestión 
avanzada de roles, jerarquías y asignaciones.

Autor: Sistema CorteSec - Roles
Versión: 2.0.0
"""

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q, Count, Max
from django.utils import timezone
import datetime
import json
import logging

User = get_user_model()
logger = logging.getLogger('roles.utils')


class RoleValidator:
    """
    Validador avanzado para roles y asignaciones
    """
    
    @staticmethod
    def validar_jerarquia_rol(rol, nuevo_padre):
        """
        Valida que no se cree una jerarquía circular
        """
        errores = []
        
        if nuevo_padre == rol:
            errores.append(_("Un rol no puede ser padre de sí mismo"))
            return errores
        
        # Verificar jerarquía circular
        def _check_circular(parent, target):
            if parent == target:
                return True
            if parent.rol_padre:
                return _check_circular(parent.rol_padre, target)
            return False
        
        if _check_circular(nuevo_padre, rol):
            errores.append(_("Esta asignación crearía una jerarquía circular"))
        
        return errores
    
    @staticmethod
    def validar_asignacion(usuario, rol, fecha_inicio=None, fecha_fin=None):
        """
        Valida si un usuario puede recibir una asignación de rol
        """
        from .models import AsignacionRol
        
        errores = []
        
        # Verificar si el rol está activo
        if not rol.activo:
            errores.append(_("El rol no está activo"))
        
        # Verificar vigencia del rol
        if not rol.esta_vigente():
            errores.append(_("El rol no está vigente"))
        
        # Verificar si ya tiene el rol asignado y activo
        asignacion_existente = AsignacionRol.objects.filter(
            usuario=usuario,
            rol=rol,
            activo=True
        ).exists()
        
        if asignacion_existente:
            errores.append(_("El usuario ya tiene este rol asignado"))
        
        # Verificar fechas
        if fecha_inicio and fecha_fin:
            if fecha_inicio >= fecha_fin:
                errores.append(_("La fecha de inicio debe ser anterior a la fecha de fin"))
        
        return errores


def invalidar_cache_roles(usuario_id=None, rol_id=None):
    """
    Invalida el cache relacionado con roles
    """
    patterns = [
        'roles_activos',
        'roles_publicos',
        'jerarquia_roles'
    ]
    
    if usuario_id:
        patterns.extend([
            f'usuario_{usuario_id}_roles',
            f'usuario_{usuario_id}_roles_jerarquia',
            f'usuario_{usuario_id}_permisos_efectivos'
        ])
    
    if rol_id:
        patterns.extend([
            f'rol_{rol_id}_permisos',
            f'rol_{rol_id}_jerarquia'
        ])
    
    cache.delete_many(patterns)
    logger.debug(f"Cache invalidado para patrones: {patterns}")


def validar_asignacion_rol(usuario, rol, fecha_inicio=None, fecha_fin=None):
    """
    Valida si un usuario puede recibir una asignación de rol
    """
    return RoleValidator.validar_asignacion(usuario, rol, fecha_inicio, fecha_fin)


def inicializar_estados_asignacion():
    """
    Inicializa los estados por defecto para las asignaciones de roles
    """
    from .models import EstadoAsignacion
    
    estados_default = [
        {'nombre': 'ACTIVA', 'descripcion': 'Asignación activa', 'activo': True},
        {'nombre': 'INACTIVA', 'descripcion': 'Asignación inactiva', 'activo': True},
        {'nombre': 'PENDIENTE', 'descripcion': 'Pendiente de aprobación', 'activo': True},
        {'nombre': 'APROBADA', 'descripcion': 'Asignación aprobada', 'activo': True},
        {'nombre': 'RECHAZADA', 'descripcion': 'Asignación rechazada', 'activo': True},
        {'nombre': 'EXPIRADA', 'descripcion': 'Asignación expirada', 'activo': True},
        {'nombre': 'SUSPENDIDA', 'descripcion': 'Asignación suspendida', 'activo': True},
    ]
    
    for estado_data in estados_default:
        EstadoAsignacion.objects.get_or_create(
            nombre=estado_data['nombre'],
            defaults=estado_data
        )
    
    logger.info("Estados de asignación inicializados")


def crear_tipos_rol_default():
    """
    Crea los tipos de rol por defecto
    """
    from .models import TipoRol
    
    tipos_default = [
        {'nombre': 'Administrativo', 'descripcion': 'Roles administrativos del sistema', 'orden': 1},
        {'nombre': 'Operativo', 'descripcion': 'Roles operativos y de gestión diaria', 'orden': 2},
        {'nombre': 'Supervisión', 'descripcion': 'Roles de supervisión y control', 'orden': 3},
        {'nombre': 'Técnico', 'descripcion': 'Roles técnicos especializados', 'orden': 4},
        {'nombre': 'Consulta', 'descripcion': 'Roles de solo lectura y consulta', 'orden': 5},
        {'nombre': 'Temporal', 'descripcion': 'Roles temporales y de proyectos', 'orden': 6},
        {'nombre': 'Sistema', 'descripcion': 'Roles del sistema no editables', 'orden': 0},
    ]
    
    for tipo_data in tipos_default:
        TipoRol.objects.get_or_create(
            nombre=tipo_data['nombre'],
            defaults=tipo_data
        )
    
    logger.info("Tipos de rol por defecto creados")


class RoleHierarchyManager:
    """Manager para operaciones de jerarquía de roles"""
    
    @staticmethod
    def obtener_jerarquia_completa(rol):
        """
        Obtiene la jerarquía completa de un rol (ancestros y descendientes)
        """
        jerarquia = {
            'ancestros': [],
            'descendientes': [],
            'nivel': rol.nivel_jerarquico,
            'ruta': []
        }
        
        # Obtener ancestros
        rol_actual = rol.rol_padre
        while rol_actual:
            jerarquia['ancestros'].append(rol_actual)
            jerarquia['ruta'].insert(0, rol_actual.nombre)
            rol_actual = rol_actual.rol_padre
        
        # Obtener descendientes
        def _obtener_descendientes(rol_padre):
            descendientes = []
            for hijo in rol_padre.roles_hijo.filter(activo=True):
                descendientes.append(hijo)
                descendientes.extend(_obtener_descendientes(hijo))
            return descendientes
        
        jerarquia['descendientes'] = _obtener_descendientes(rol)
        jerarquia['ruta'].append(rol.nombre)
        
        return jerarquia
    
    @staticmethod
    def mover_rol_en_jerarquia(rol, nuevo_padre, usuario_ejecutor):
        """
        Mueve un rol en la jerarquía verificando validaciones
        """
        from django.db import transaction
        
        try:
            with transaction.atomic():
                # Validar movimiento
                errores = RoleValidator.validar_jerarquia_rol(rol, nuevo_padre)
                if errores:
                    return False
                
                # Guardar estado anterior
                nivel_anterior = rol.nivel_jerarquico
                padre_anterior = rol.rol_padre
                
                # Actualizar rol
                rol.rol_padre = nuevo_padre
                
                # Recalcular nivel
                if nuevo_padre:
                    rol.nivel_jerarquico = nuevo_padre.nivel_jerarquico + 1
                else:
                    rol.nivel_jerarquico = 0
                
                rol.save()
                
                # Recalcular niveles de descendientes
                RoleHierarchyManager._recalcular_niveles_descendientes(rol)
                
                # Crear auditoría
                crear_auditoria_rol(
                    rol=rol,
                    accion='mover_jerarquia',
                    usuario_ejecutor=usuario_ejecutor,
                    detalles_anterior={
                        'padre': padre_anterior.nombre if padre_anterior else None,
                        'nivel': nivel_anterior
                    },
                    detalles_nuevo={
                        'padre': nuevo_padre.nombre if nuevo_padre else None,
                        'nivel': rol.nivel_jerarquico
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error moviendo rol en jerarquía: {e}")
            return False
    
    @staticmethod
    def _recalcular_niveles_descendientes(rol):
        """
        Recalcula los niveles de todos los descendientes de un rol
        """
        for hijo in rol.roles_hijo.all():
            hijo.nivel_jerarquico = rol.nivel_jerarquico + 1
            hijo.save(update_fields=['nivel_jerarquico'])
            RoleHierarchyManager._recalcular_niveles_descendientes(hijo)


def obtener_roles_usuario_con_jerarquia(usuario, incluir_heredados=True):
    """
    Obtiene todos los roles de un usuario incluyendo jerarquía completa
    """
    from .models import AsignacionRol
    
    roles_directos = []
    asignaciones = AsignacionRol.objects.filter(
        usuario=usuario, 
        activo=True
    ).select_related('rol')
    
    for asignacion in asignaciones:
        if asignacion.esta_vigente():
            roles_directos.append(asignacion.rol)
    
    if not incluir_heredados:
        return roles_directos
    
    # Incluir roles heredados por jerarquía
    roles_con_herencia = set(roles_directos)
    
    for rol in roles_directos:
        if rol.hereda_permisos and rol.rol_padre:
            # Agregar roles padre en la jerarquía
            rol_padre = rol.rol_padre
            while rol_padre:
                roles_con_herencia.add(rol_padre)
                rol_padre = rol_padre.rol_padre if rol_padre.hereda_permisos else None
    
    return list(roles_con_herencia)


def crear_auditoria_rol(rol, accion, usuario_ejecutor, usuario_afectado=None, 
                       detalles_anterior=None, detalles_nuevo=None, contexto=None):
    """
    Crea una entrada de auditoría para un rol
    """
    from .models import AuditoriaRol
    
    try:
        auditoria = AuditoriaRol.objects.create(
            rol=rol,
            accion=accion,
            usuario_ejecutor=usuario_ejecutor,
            usuario_afectado=usuario_afectado,
            detalles_anterior=detalles_anterior or {},
            detalles_nuevo=detalles_nuevo or {},
            contexto_adicional=contexto or {}
        )
        
        logger.info(f"Auditoría creada: {auditoria}")
        return auditoria
        
    except Exception as e:
        logger.error(f"Error creando auditoría de rol: {e}")
        return None


# Logging
logger.info("Utilidades de roles cargadas correctamente")
