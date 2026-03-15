"""
Celery Tasks de Billing — CorteSec
====================================

Tareas periódicas para:
- Verificar suscripciones y trials
- Limpiar datos expirados
- Reintentar pagos fallidos
"""

import logging

from celery import shared_task

logger = logging.getLogger('billing')


@shared_task(name='billing.tasks.check_subscriptions_daily')
def check_subscriptions_daily():
    """
    Tarea diaria: verificar trials, suscripciones expiradas, enviar notificaciones.
    Se ejecuta como un management command para reutilizar toda la lógica.
    """
    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    call_command('check_subscriptions', stdout=out)
    output = out.getvalue()
    logger.info(f"check_subscriptions_daily completed:\n{output}")
    return output


@shared_task(name='billing.tasks.cleanup_expired_data')
def cleanup_expired_data():
    """
    Tarea semanal: limpiar datos de organizaciones con trials expirados >90 días.
    Solo desactiva la organización, NO borra datos (por cumplimiento legal).
    """
    from datetime import timedelta
    from django.utils import timezone
    from billing.models import Subscription
    from core.models import Organizacion

    now = timezone.now()
    grace_period = now - timedelta(days=90)

    expired_subs = Subscription.objects.filter(
        status=Subscription.Status.EXPIRED,
        updated_at__lte=grace_period,
        organization__activa=True,
    ).select_related('organization')

    count = 0
    for sub in expired_subs:
        org = sub.organization
        org.activa = False
        org.save(update_fields=['activa'])
        logger.warning(f"Organization {org.codigo} deactivated after 90-day grace period")
        count += 1

    logger.info(f"cleanup_expired_data: {count} organizations deactivated")
    return f"Deactivated {count} organizations"


@shared_task(
    name='billing.tasks.retry_failed_payment',
    bind=True,
    max_retries=3,
    default_retry_delay=3600,  # 1 hora entre reintentos
)
def retry_failed_payment(self, payment_id):
    """
    Reintentar un pago fallido vía Stripe.
    Se llama cuando un pago falla y hay reintentos disponibles.
    """
    from billing.models import Payment
    from django.conf import settings

    try:
        payment = Payment.objects.select_related(
            'invoice__subscription__organization'
        ).get(id=payment_id)
    except Payment.DoesNotExist:
        logger.error(f"Payment {payment_id} not found for retry")
        return

    if payment.status != Payment.Status.FAILED:
        logger.info(f"Payment {payment_id} is {payment.status}, skip retry")
        return

    if not payment.gateway_payment_id or not payment.gateway_payment_id.startswith('pi_'):
        logger.info(f"Payment {payment_id} has no Stripe PI, skip retry")
        return

    use_stripe = bool(getattr(settings, 'STRIPE_SECRET_KEY', ''))
    if not use_stripe:
        return

    try:
        from billing.services import get_billing_service
        service = get_billing_service()
        result = service.gateway.confirm_payment_intent(payment.gateway_payment_id)

        if result.status == 'succeeded':
            service.handle_payment_succeeded(payment.gateway_payment_id)
            logger.info(f"Retry succeeded for payment {payment_id}")
        else:
            logger.warning(f"Retry status {result.status} for payment {payment_id}")
            # Reintentar si quedan intentos
            raise self.retry(countdown=3600)

    except Exception as exc:
        logger.error(f"Retry failed for payment {payment_id}: {exc}")
        raise self.retry(exc=exc, countdown=3600)
