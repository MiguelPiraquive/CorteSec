"""
Signals para la app roles
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Rol, AsignacionRol, HistorialAsignacion, EstadoAsignacion
from .utils import invalidar_cache_roles
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=Rol)
def rol_post_save(sender, instance, created, **kwargs):
    """
    Signal que se ejecuta después de guardar un Rol
    """
    if created:
        logger.info(f"Rol creado: {instance.nombre}")
        
        # Invalidar caché relacionado
        invalidar_cache_roles()
        
        # Si es un rol hijo, actualizar las estadísticas del padre
        if instance.rol_padre:
            instance.rol_padre.invalidar_cache()


@receiver(post_delete, sender=Rol)
def rol_post_delete(sender, instance, **kwargs):
    """
    Signal que se ejecuta después de eliminar un Rol
    """
    logger.info(f"Rol eliminado: {instance.nombre}")
    
    # Invalidar caché relacionado
    invalidar_cache_roles()


@receiver(pre_save, sender=AsignacionRol)
def asignacion_pre_save(sender, instance, **kwargs):
    """
    Signal que se ejecuta antes de guardar una AsignacionRol
    """
    # Guardar estado anterior para el historial
    if instance.pk:
        try:
            instance._estado_anterior = AsignacionRol.objects.get(pk=instance.pk).estado
        except AsignacionRol.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


@receiver(post_save, sender=AsignacionRol)
def asignacion_post_save(sender, instance, created, **kwargs):
    """
    Signal que se ejecuta después de guardar una AsignacionRol
    """
    if created:
        logger.info(f"Asignación creada: {instance.usuario} - {instance.rol}")
        
        # Crear entrada en el historial
        HistorialAsignacion.objects.create(
            asignacion=instance,
            accion='CREADA',
            estado_nuevo=instance.estado.nombre if instance.estado else None,
            detalles={
                'usuario': instance.usuario.username,
                'rol': instance.rol.nombre,
                'asignado_por': instance.asignado_por.username,
                'fecha_inicio': instance.fecha_inicio.isoformat() if instance.fecha_inicio else None,
                'fecha_fin': instance.fecha_fin.isoformat() if instance.fecha_fin else None,
            },
            usuario=instance.asignado_por
        )
        
        # Actualizar estadísticas del rol
        instance.rol.actualizar_estadisticas()
        
    else:
        # Verificar si cambió el estado
        if hasattr(instance, '_estado_anterior') and instance._estado_anterior != instance.estado:
            logger.info(f"Asignación actualizada: {instance.usuario} - {instance.rol}")
            
            # Crear entrada en el historial
            HistorialAsignacion.objects.create(
                asignacion=instance,
                accion='ACTUALIZADA',
                estado_anterior=instance._estado_anterior.nombre if instance._estado_anterior else None,
                estado_nuevo=instance.estado.nombre if instance.estado else None,
                detalles={
                    'cambio_estado': True,
                    'estado_anterior': instance._estado_anterior.nombre if instance._estado_anterior else None,
                    'estado_nuevo': instance.estado.nombre if instance.estado else None,
                },
                usuario=instance.asignado_por  # Idealmente debería ser el usuario que hace el cambio
            )
    
    # Invalidar caché relacionado
    invalidar_cache_roles()
    instance.rol.invalidar_cache()


@receiver(post_delete, sender=AsignacionRol)
def asignacion_post_delete(sender, instance, **kwargs):
    """
    Signal que se ejecuta después de eliminar una AsignacionRol
    """
    logger.info(f"Asignación eliminada: {instance.usuario} - {instance.rol}")
    
    # Crear entrada en el historial
    try:
        HistorialAsignacion.objects.create(
            asignacion=instance,
            accion='ELIMINADA',
            estado_anterior=instance.estado.nombre if instance.estado else None,
            detalles={
                'usuario': instance.usuario.username,
                'rol': instance.rol.nombre,
                'eliminada_el': timezone.now().isoformat(),
            },
            usuario=instance.asignado_por  # Idealmente debería ser el usuario que elimina
        )
    except Exception as e:
        logger.error(f"Error al crear historial de eliminación: {e}")
    
    # Actualizar estadísticas del rol
    try:
        instance.rol.actualizar_estadisticas()
    except Exception as e:
        logger.error(f"Error al actualizar estadísticas del rol: {e}")
    
    # Invalidar caché relacionado
    invalidar_cache_roles()


# Signal personalizado para revocación de asignaciones
def crear_historial_revocacion(asignacion, usuario_revocador, razon):
    """
    Crea una entrada en el historial cuando se revoca una asignación
    """
    try:
        HistorialAsignacion.objects.create(
            asignacion=asignacion,
            accion='REVOCADA',
            estado_anterior='ACTIVA',
            estado_nuevo='REVOCADA',
            detalles={
                'razon': razon,
                'revocado_por': usuario_revocador.username,
                'fecha_revocacion': timezone.now().isoformat(),
            },
            usuario=usuario_revocador
        )
        logger.info(f"Historial de revocación creado para {asignacion}")
    except Exception as e:
        logger.error(f"Error al crear historial de revocación: {e}")


# Signal personalizado para aprobación de asignaciones
def crear_historial_aprobacion(asignacion, usuario_aprobador):
    """
    Crea una entrada en el historial cuando se aprueba una asignación
    """
    try:
        HistorialAsignacion.objects.create(
            asignacion=asignacion,
            accion='APROBADA',
            estado_anterior='PENDIENTE',
            estado_nuevo='APROBADA',
            detalles={
                'aprobado_por': usuario_aprobador.username,
                'fecha_aprobacion': timezone.now().isoformat(),
            },
            usuario=usuario_aprobador
        )
        logger.info(f"Historial de aprobación creado para {asignacion}")
    except Exception as e:
        logger.error(f"Error al crear historial de aprobación: {e}")


# Signal personalizado para rechazo de asignaciones
def crear_historial_rechazo(asignacion, usuario_rechazador, razon):
    """
    Crea una entrada en el historial cuando se rechaza una asignación
    """
    try:
        HistorialAsignacion.objects.create(
            asignacion=asignacion,
            accion='RECHAZADA',
            estado_anterior='PENDIENTE',
            estado_nuevo='RECHAZADA',
            detalles={
                'razon': razon,
                'rechazado_por': usuario_rechazador.username,
                'fecha_rechazo': timezone.now().isoformat(),
            },
            usuario=usuario_rechazador
        )
        logger.info(f"Historial de rechazo creado para {asignacion}")
    except Exception as e:
        logger.error(f"Error al crear historial de rechazo: {e}")


@receiver(post_save, sender=User)
def usuario_post_save(sender, instance, created, **kwargs):
    """
    Signal que se ejecuta después de guardar un Usuario
    """
    if created:
        logger.info(f"Usuario creado: {instance.username}")
        
        # Aquí podrías asignar roles por defecto si es necesario
        # Por ejemplo, asignar un rol "Usuario Básico" a todos los usuarios nuevos
        pass


# Funciones auxiliares para validaciones
def validar_asignacion_antes_guardar(asignacion):
    """
    Valida una asignación antes de guardarla
    """
    errores = []
    
    # Validar que el rol esté activo
    if not asignacion.rol.activo:
        errores.append("No se puede asignar un rol inactivo")
    
    # Validar vigencia del rol
    if not asignacion.rol.esta_vigente():
        errores.append("No se puede asignar un rol no vigente")
    
    # Validar fechas de la asignación
    if asignacion.fecha_inicio and asignacion.fecha_fin:
        if asignacion.fecha_inicio >= asignacion.fecha_fin:
            errores.append("La fecha de inicio debe ser anterior a la fecha de fin")
    
    return errores


def notificar_asignacion_expirando(asignacion, dias_restantes):
    """
    Notifica cuando una asignación está por expirar
    """
    # Aquí podrías integrar con un sistema de notificaciones
    logger.warning(f"Asignación {asignacion} expira en {dias_restantes} días")


def notificar_asignacion_expirada(asignacion):
    """
    Notifica cuando una asignación ha expirado
    """
    # Aquí podrías integrar con un sistema de notificaciones
    logger.warning(f"Asignación {asignacion} ha expirado")
    
    # Cambiar estado a expirado
    try:
        estado_expirado = EstadoAsignacion.objects.get(nombre='EXPIRADA')
        asignacion.estado = estado_expirado
        asignacion.activa = False
        asignacion.save()
    except EstadoAsignacion.DoesNotExist:
        logger.error("Estado 'EXPIRADA' no encontrado")


# Task para verificar asignaciones expiradas (se ejecutaría con Celery)
def verificar_asignaciones_expiradas():
    """
    Verifica y procesa asignaciones expiradas
    """
    ahora = timezone.now()
    
    # Obtener asignaciones expiradas
    asignaciones_expiradas = AsignacionRol.objects.filter(
        activa=True,
        fecha_fin__lt=ahora
    )
    
    for asignacion in asignaciones_expiradas:
        notificar_asignacion_expirada(asignacion)
    
    # Obtener asignaciones que expiran pronto (próximos 7 días)
    fecha_limite = ahora + timezone.timedelta(days=7)
    asignaciones_expirando = AsignacionRol.objects.filter(
        activa=True,
        fecha_fin__gte=ahora,
        fecha_fin__lte=fecha_limite
    )
    
    for asignacion in asignaciones_expirando:
        dias_restantes = (asignacion.fecha_fin - ahora).days
        notificar_asignacion_expirando(asignacion, dias_restantes)


# Task para limpiar historial antiguo
def limpiar_historial_antiguo(dias=365):
    """
    Limpia el historial de asignaciones más antiguo que X días
    """
    fecha_limite = timezone.now() - timezone.timedelta(days=dias)
    
    historiales_antiguos = HistorialAsignacion.objects.filter(
        fecha__lt=fecha_limite
    )
    
    count = historiales_antiguos.count()
    historiales_antiguos.delete()
    
    logger.info(f"Eliminados {count} registros de historial antiguos")


# Task para actualizar estadísticas de roles
def actualizar_estadisticas_roles():
    """
    Actualiza las estadísticas de todos los roles
    """
    roles = Rol.objects.all()
    
    for rol in roles:
        try:
            rol.actualizar_estadisticas()
        except Exception as e:
            logger.error(f"Error al actualizar estadísticas del rol {rol}: {e}")
    
    logger.info(f"Estadísticas actualizadas para {roles.count()} roles")
