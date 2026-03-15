"""
Signals de Billing — CorteSec
===============================

Auto-crear Subscription cuando se crea una Organizacion.
Sincronizar estado de trial.
"""

import logging
from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger('billing')


@receiver(post_save, sender='core.Organizacion')
def auto_create_subscription(sender, instance, created, **kwargs):
    """
    Cuando se crea una organización, auto-crear su Subscription.
    Respeta el trial de la org si ya tiene trial_ends_at.
    """
    if not created:
        return

    # Import aquí para evitar circular
    from billing.models import Subscription

    # Verificar si ya tiene suscripción
    if Subscription.objects.filter(organization=instance).exists():
        return

    now = timezone.now()
    trial_end = getattr(instance, 'trial_ends_at', None) or (now + timedelta(days=14))

    Subscription.objects.create(
        organization=instance,
        plan=instance.plan,
        status=Subscription.Status.TRIALING,
        trial_start=now,
        trial_end=trial_end,
        current_period_start=now,
        current_period_end=trial_end,
        billing_cycle='monthly',
    )

    logger.info(
        f"Auto-created Subscription for org {instance.codigo}: "
        f"plan={instance.plan.code if instance.plan else 'N/A'}, trial_end={trial_end}"
    )
