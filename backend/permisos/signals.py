"""
Signals para la app permisos
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .models import Permiso, PermisoDirecto
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=Permiso)
def permiso_post_save(sender, instance, created, **kwargs):
    """Signal que se ejecuta después de guardar un Permiso"""
    if created:
        logger.info(f"Permiso creado: {instance.codigo}")
    
    # Invalidar cache relacionado (usar tipo_permiso cuando corresponda)
    tipo_key = None
    if hasattr(instance, 'tipo') and instance.tipo:
        tipo_key = instance.tipo
    elif hasattr(instance, 'tipo_permiso') and instance.tipo_permiso:
        # preferir el código si está disponible, sino el id
        try:
            tipo_key = instance.tipo_permiso.codigo
        except Exception:
            tipo_key = getattr(instance, 'tipo_permiso_id', None)
    else:
        tipo_key = getattr(instance, 'tipo_permiso_id', 'unknown')

    cache.delete_many([
        f'permiso_{instance.codigo}',
        f'permisos_tipo_{tipo_key}',
        'permisos_activos',
        'permisos_jerarquia'
    ])


@receiver(post_delete, sender=Permiso)
def permiso_post_delete(sender, instance, **kwargs):
    """Signal que se ejecuta después de eliminar un Permiso"""
    logger.info(f"Permiso eliminado: {instance.codigo}")
    
    # Invalidar cache relacionado (usar tipo_permiso cuando corresponda)
    tipo_key = None
    if hasattr(instance, 'tipo') and instance.tipo:
        tipo_key = instance.tipo
    elif hasattr(instance, 'tipo_permiso') and instance.tipo_permiso:
        try:
            tipo_key = instance.tipo_permiso.codigo
        except Exception:
            tipo_key = getattr(instance, 'tipo_permiso_id', None)
    else:
        tipo_key = getattr(instance, 'tipo_permiso_id', 'unknown')

    cache.delete_many([
        f'permiso_{instance.codigo}',
        f'permisos_tipo_{tipo_key}',
        'permisos_activos',
        'permisos_jerarquia'
    ])

# Signals comentados porque las clases AsignacionPermiso y PermisoDirectoUsuario no existen
# Se mantienen solo los signals para las clases que existen realmente

# @receiver(post_save, sender=AsignacionPermiso)
# def asignacion_permiso_post_save(sender, instance, created, **kwargs):
#     """Signal que se ejecuta después de guardar una AsignacionPermiso"""
#     if created:
#         logger.info(f"Asignación de permiso creada: {instance.rol} -> {instance.permiso}")
    
#     # Invalidar cache del rol
#     cache.delete_many([
#         f'rol_{instance.rol.id}_permisos',
#         f'permisos_rol_{instance.rol.id}',
#         'roles_permisos_map'
#     ])


# @receiver(post_delete, sender=AsignacionPermiso)
# def asignacion_permiso_post_delete(sender, instance, **kwargs):
#     """Signal que se ejecuta después de eliminar una AsignacionPermiso"""
#     logger.info(f"Asignación de permiso eliminada: {instance.rol} -> {instance.permiso}")
    
#     # Invalidar cache del rol
#     cache.delete_many([
#         f'rol_{instance.rol.id}_permisos',
#         f'permisos_rol_{instance.rol.id}',
#         'roles_permisos_map'
#     ])


@receiver(post_save, sender=PermisoDirecto)
def permiso_directo_post_save(sender, instance, created, **kwargs):
    """Signal que se ejecuta después de guardar un PermisoDirecto"""
    if created:
        logger.info(f"Permiso directo creado: {instance.usuario} -> {instance.permiso}")
    
    # Invalidar cache del usuario
    cache.delete_many([
        f'usuario_{instance.usuario.id}_permisos_directos',
        f'usuario_{instance.usuario.id}_permisos_efectivos'
    ])


@receiver(post_delete, sender=PermisoDirecto)
def permiso_directo_post_delete(sender, instance, **kwargs):
    """Signal que se ejecuta después de eliminar un PermisoDirecto"""
    logger.info(f"Permiso directo eliminado: {instance.usuario} -> {instance.permiso}")
    
    # Invalidar cache del usuario
    cache.delete_many([
        f'usuario_{instance.usuario.id}_permisos_directos',
        f'usuario_{instance.usuario.id}_permisos_efectivos'
    ])
