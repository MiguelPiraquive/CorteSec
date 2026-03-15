"""
Billing Service — CorteSec
============================

Servicio de orquestación que conecta:
- Gateway (Stripe/MP) 
- Modelos internos (Subscription, Invoice, Payment)
- NotificationEngine

Este es el punto central de toda la lógica de billing.
"""

import logging
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.models import Organizacion, Plan, PlanChangeLog

from .models import (
    Subscription, PaymentMethod, Invoice, Payment, WebhookEvent,
)

logger = logging.getLogger('billing')

# IVA Colombia
TAX_RATE = Decimal('19.00')


def get_gateway():
    """Obtener la instancia del gateway configurado."""
    gateway_name = getattr(settings, 'BILLING_GATEWAY', 'stripe')
    if gateway_name == 'stripe':
        from .gateways.stripe_gateway import get_stripe_gateway
        return get_stripe_gateway()
    elif gateway_name == 'wompi':
        from .gateways.wompi_gateway import WompiGateway
        return WompiGateway()
    elif gateway_name == 'manual':
        # Manual no tiene gateway real, usar Wompi como fallback
        from .gateways.wompi_gateway import WompiGateway
        return WompiGateway()
    raise ValueError(f"Gateway '{gateway_name}' no soportado")


class BillingService:
    """Servicio principal de billing."""

    def __init__(self):
        self._gateway = None

    @property
    def gateway(self):
        if self._gateway is None:
            self._gateway = get_gateway()
        return self._gateway

    # ==================== CHECKOUT ====================

    @transaction.atomic
    def process_checkout(
        self,
        organization: Organizacion,
        plan: Plan,
        billing_cycle: str,
        payment_method_token: str,
        billing_data: dict,
        user=None,
    ) -> dict:
        """
        Flujo completo de checkout:
        1. Crear/obtener customer en gateway
        2. Adjuntar método de pago
        3. Crear PaymentIntent
        4. Crear modelos internos
        5. Retornar client_secret para confirmación en frontend
        """
        # 1. Customer en gateway
        owner_email = billing_data.get('billing_email', '')
        customer = self.gateway.get_or_create_customer(
            organization_id=organization.id,
            email=owner_email,
            name=billing_data.get('billing_name', organization.nombre),
        )

        # 2. Adjuntar tarjeta
        pm_result = self.gateway.attach_payment_method(
            customer_id=customer.customer_id,
            payment_method_token=payment_method_token,
        )

        # Guardar método de pago en DB
        pm, _ = PaymentMethod.objects.update_or_create(
            organization=organization,
            gateway_payment_method_id=pm_result.payment_method_id,
            defaults={
                'gateway': self.gateway.get_gateway_name(),
                'card_brand': pm_result.card_brand,
                'card_last4': pm_result.card_last4,
                'card_exp_month': pm_result.card_exp_month,
                'card_exp_year': pm_result.card_exp_year,
                'is_default': True,
                'is_active': True,
            }
        )
        pm.set_as_default()

        # 3. Calcular monto
        if billing_cycle == 'yearly':
            price = plan.price_yearly_cop
        else:
            price = plan.price_monthly_cop

        if price is None:
            raise ValueError("Plan requiere cotización personalizada")

        subtotal = Decimal(str(price))
        tax_amount = (subtotal * TAX_RATE / Decimal('100')).quantize(Decimal('0.01'))
        total = subtotal + tax_amount
        # Stripe usa centavos — COP no tiene decimales, así que amount = total en pesos
        amount_gateway = int(total)

        # 4. Crear PaymentIntent
        sub, _ = Subscription.objects.get_or_create(
            organization=organization,
            defaults={
                'plan': plan,
                'status': Subscription.Status.TRIALING,
            }
        )

        now = timezone.now()
        if billing_cycle == 'yearly':
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)

        # Crear Invoice
        invoice = Invoice.objects.create(
            organization=organization,
            subscription=sub,
            status=Invoice.Status.PENDING,
            subtotal=subtotal,
            tax_rate=TAX_RATE,
            tax_amount=tax_amount,
            total=total,
            currency='COP',
            billing_period_start=now,
            billing_period_end=period_end,
            due_date=now.date(),
            billing_name=billing_data.get('billing_name', ''),
            billing_nit=billing_data.get('billing_nit', ''),
            billing_address=billing_data.get('billing_address', ''),
            billing_email=billing_data.get('billing_email', ''),
        )

        # Crear PaymentIntent en gateway
        pi_result = self.gateway.create_payment_intent(
            amount=amount_gateway,
            currency='cop',
            customer_id=customer.customer_id,
            payment_method_id=pm_result.payment_method_id,
            idempotency_key=str(invoice.id),
            metadata={
                'organization_id': str(organization.id),
                'invoice_number': invoice.number,
                'plan_code': plan.code,
            },
        )

        # Crear Payment record
        payment = Payment.objects.create(
            invoice=invoice,
            payment_method=pm,
            amount=total,
            currency='COP',
            status=Payment.Status.PROCESSING,
            gateway=self.gateway.get_gateway_name(),
            gateway_payment_id=pi_result.payment_intent_id,
        )

        # Actualizar suscripción con datos del gateway
        sub.gateway = self.gateway.get_gateway_name()
        sub.gateway_customer_id = customer.customer_id
        sub.plan = plan
        sub.billing_cycle = billing_cycle
        sub.save(update_fields=[
            'gateway', 'gateway_customer_id', 'plan', 'billing_cycle', 'updated_at'
        ])

        logger.info(
            f"Checkout initiated: org={organization.codigo}, plan={plan.code}, "
            f"invoice={invoice.number}, pi={pi_result.payment_intent_id}"
        )

        return {
            'client_secret': pi_result.client_secret,
            'payment_intent_id': pi_result.payment_intent_id,
            'invoice_number': invoice.number,
            'total': str(total),
            'currency': 'COP',
        }

    # ==================== WEBHOOK HANDLERS ====================

    def handle_payment_succeeded(self, payment_intent_id: str, metadata: dict = None):
        """Manejar pago exitoso (desde webhook)."""
        metadata = metadata or {}

        try:
            payment = Payment.objects.select_related(
                'invoice__organization', 'invoice__subscription'
            ).get(
                gateway_payment_id=payment_intent_id,
            )
        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for PI {payment_intent_id}")
            return

        if payment.status == Payment.Status.SUCCEEDED:
            logger.info(f"Payment {payment_intent_id} already processed (idempotent)")
            return

        with transaction.atomic():
            # Marcar pago exitoso
            payment.mark_succeeded(gateway_payment_id=payment_intent_id)

            # Marcar factura pagada
            invoice = payment.invoice
            invoice.mark_paid(gateway_payment_id=payment_intent_id)

            # Activar suscripción
            sub = invoice.subscription
            if sub:
                org = invoice.organization
                plan = sub.plan

                sub.activate(
                    gateway=self.gateway.get_gateway_name(),
                    gateway_subscription_id=sub.gateway_subscription_id,
                    gateway_customer_id=sub.gateway_customer_id,
                )

                # Actualizar org
                org.plan = plan
                org.max_users = plan.max_users
                org.max_storage_mb = plan.max_storage_mb
                org.is_trial = False
                org.save(update_fields=['plan', 'max_users', 'max_storage_mb', 'is_trial'])

                # Log cambio de plan
                PlanChangeLog.objects.create(
                    organization=org,
                    previous_plan=metadata.get('previous_plan', 'FREE'),
                    new_plan=plan.code,
                    new_limits={
                        'max_users': plan.max_users,
                        'max_storage_mb': plan.max_storage_mb,
                    },
                    note=f'Pago exitoso — {invoice.number}',
                )

                # Enviar notificación
                self._notify_payment_success(org, invoice)

        logger.info(f"Payment succeeded: PI={payment_intent_id}, invoice={invoice.number}")

    def handle_payment_failed(self, payment_intent_id: str, failure_reason: str = ''):
        """Manejar pago fallido (desde webhook)."""
        try:
            payment = Payment.objects.select_related(
                'invoice__organization', 'invoice__subscription'
            ).get(
                gateway_payment_id=payment_intent_id,
            )
        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for failed PI {payment_intent_id}")
            return

        with transaction.atomic():
            payment.mark_failed(reason=failure_reason)
            payment.invoice.status = Invoice.Status.FAILED
            payment.invoice.save(update_fields=['status', 'updated_at'])

            # Si hay 3+ intentos fallidos, suspender suscripción
            sub = payment.invoice.subscription
            if sub:
                failed_count = Payment.objects.filter(
                    invoice__subscription=sub,
                    status=Payment.Status.FAILED,
                ).count()
                if failed_count >= 3:
                    sub.suspend()
                    self._notify_subscription_suspended(sub.organization)
                elif sub.status != Subscription.Status.PAST_DUE:
                    sub.status = Subscription.Status.PAST_DUE
                    sub.save(update_fields=['status', 'updated_at'])

        logger.warning(f"Payment failed: PI={payment_intent_id}, reason={failure_reason}")

    # ==================== NOTIFICACIONES ====================

    def _notify_payment_success(self, org, invoice):
        """Notificar pago exitoso al owner."""
        try:
            from core.notification_engine import NotificationEngine
            from login.models import CustomUser

            owner = CustomUser.objects.filter(
                organization=org, organization_role='OWNER'
            ).first()
            if owner:
                NotificationEngine.notify(
                    usuario=owner,
                    titulo='Pago procesado exitosamente',
                    mensaje=(
                        f'Tu pago de ${invoice.total:,.0f} COP fue procesado. '
                        f'Factura: {invoice.number}.'
                    ),
                    tipo='success',
                    categoria='sistema',
                    prioridad='media',
                    url_accion='/billing',
                    texto_accion='Ver factura',
                    origen_tipo='invoice',
                    origen_id=str(invoice.id),
                    enviar_email=True,
                )
        except Exception as e:
            logger.error(f"Error sending payment notification: {e}")

    def _notify_subscription_suspended(self, org):
        """Notificar suscripción suspendida."""
        try:
            from core.notification_engine import NotificationEngine
            from login.models import CustomUser

            owner = CustomUser.objects.filter(
                organization=org, organization_role='OWNER'
            ).first()
            if owner:
                NotificationEngine.notify(
                    usuario=owner,
                    titulo='Suscripción suspendida',
                    mensaje=(
                        'Tu suscripción ha sido suspendida por múltiples pagos fallidos. '
                        'Actualiza tu método de pago para reactivarla.'
                    ),
                    tipo='error',
                    categoria='sistema',
                    prioridad='urgente',
                    url_accion='/billing/payment-methods',
                    texto_accion='Actualizar pago',
                    origen_tipo='subscription',
                    origen_id=str(org.id),
                    enviar_email=True,
                )
        except Exception as e:
            logger.error(f"Error sending suspension notification: {e}")


# Singleton
_billing_service = None


def get_billing_service() -> BillingService:
    global _billing_service
    if _billing_service is None:
        _billing_service = BillingService()
    return _billing_service
