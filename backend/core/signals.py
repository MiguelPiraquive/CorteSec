from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import LogSistema


@receiver(post_save, sender=User)
def log_user_creation(sender, instance, created, **kwargs):
    """Log cuando se crea un nuevo usuario"""
    if created:
        LogSistema.objects.create(
            usuario=None,
            accion='user_created',
            descripcion=f'Nuevo usuario creado: {instance.username}',
            ip_address=None,
            user_agent=None
        )


@receiver(post_save, sender=User)
def log_user_update(sender, instance, created, **kwargs):
    """Log cuando se actualiza un usuario"""
    if not created:
        LogSistema.objects.create(
            usuario=instance,
            accion='user_updated',
            descripcion=f'Usuario actualizado: {instance.username}',
            ip_address=None,
            user_agent=None
        )


@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    """Log cuando se elimina un usuario"""
    LogSistema.objects.create(
        usuario=None,
        accion='user_deleted',
        descripcion=f'Usuario eliminado: {instance.username}',
        ip_address=None,
        user_agent=None
    )
