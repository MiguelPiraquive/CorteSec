from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import LogAuditoria

User = get_user_model()


@receiver(post_save, sender=User)
def log_user_creation(sender, instance, created, **kwargs):
    """Log cuando se crea un nuevo usuario"""
    if created:
        LogAuditoria.objects.create(
            usuario=instance,
            accion='user_created',
            modelo='User',
            objeto_id=str(instance.pk),
            ip_address=None,
            user_agent='',
            datos_antes=None,
            datos_despues={'username': instance.username, 'email': instance.email},
            metadata={'source': 'signal'}
        )


@receiver(post_save, sender=User)
def log_user_update(sender, instance, created, **kwargs):
    """Log cuando se actualiza un usuario"""
    if not created:
        LogAuditoria.objects.create(
            usuario=instance,
            accion='user_updated',
            modelo='User',
            objeto_id=str(instance.pk),
            ip_address=None,
            user_agent='',
            datos_antes=None,
            datos_despues={'username': instance.username, 'email': instance.email},
            metadata={'source': 'signal'}
        )


@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    """Log cuando se elimina un usuario"""
    LogAuditoria.objects.create(
        usuario=None,
        accion='user_deleted',
        modelo='User',
        objeto_id=str(instance.pk),
        ip_address=None,
        user_agent='',
        datos_antes={'username': instance.username, 'email': instance.email},
        datos_despues=None,
        metadata={'source': 'signal'}
    )
