"""
Stripe Payment Gateway — CorteSec
====================================

Implementación completa de Stripe para:
- Customers
- Payment Methods (tarjetas tokenizadas)
- Payment Intents (pagos únicos)
- Subscriptions (suscripciones recurrentes)
- Webhooks (verificación HMAC)
- Refunds

SEGURIDAD:
- API keys solo desde settings/env
- Verificación de firma en webhooks
- Idempotency keys en cada cobro
- Datos de tarjeta NUNCA tocan el servidor
"""

import logging
from typing import Optional

from django.conf import settings

from .base import (
    AbstractPaymentGateway,
    CustomerResult,
    PaymentMethodResult,
    PaymentIntentResult,
    SubscriptionResult,
    RefundResult,
)

logger = logging.getLogger('billing')


def _get_stripe():
    """Lazy import de stripe para no fallar si no está instalado."""
    try:
        import stripe
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        stripe.api_version = '2024-12-18.acacia'
        return stripe
    except ImportError:
        raise ImportError(
            "stripe package no instalado. Ejecuta: pip install stripe"
        )


class StripeGateway(AbstractPaymentGateway):
    """Implementación de Stripe como pasarela de pago."""

    def get_gateway_name(self) -> str:
        return 'stripe'

    def create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        stripe = _get_stripe()
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                'organization_id': str(organization_id),
                'source': 'cortesec',
            },
        )
        logger.info(f"Stripe customer created: {customer.id} for org {organization_id}")
        return CustomerResult(
            customer_id=customer.id,
            email=email,
            metadata={'stripe_customer_id': customer.id},
        )

    def get_or_create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        stripe = _get_stripe()
        # Buscar customer existente por metadata
        customers = stripe.Customer.search(
            query=f'metadata["organization_id"]:"{organization_id}"',
        )
        if customers.data:
            c = customers.data[0]
            return CustomerResult(
                customer_id=c.id,
                email=c.email,
            )
        return self.create_customer(organization_id, email, name)

    def attach_payment_method(self, customer_id: str, payment_method_token: str) -> PaymentMethodResult:
        stripe = _get_stripe()
        # Adjuntar método de pago al customer
        pm = stripe.PaymentMethod.attach(
            payment_method_token,
            customer=customer_id,
        )
        # Establecer como default
        stripe.Customer.modify(
            customer_id,
            invoice_settings={'default_payment_method': pm.id},
        )
        logger.info(f"Payment method {pm.id} attached to customer {customer_id}")
        return PaymentMethodResult(
            payment_method_id=pm.id,
            card_brand=pm.card.brand if pm.card else 'other',
            card_last4=pm.card.last4 if pm.card else '0000',
            card_exp_month=pm.card.exp_month if pm.card else 1,
            card_exp_year=pm.card.exp_year if pm.card else 2030,
        )

    def detach_payment_method(self, payment_method_id: str) -> bool:
        stripe = _get_stripe()
        try:
            stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Payment method {payment_method_id} detached")
            return True
        except Exception as e:
            logger.error(f"Error detaching payment method: {e}")
            return False

    def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict = None,
    ) -> SubscriptionResult:
        stripe = _get_stripe()

        # Crear un Price ad-hoc (o usar uno existente con lookup_key)
        price = stripe.Price.create(
            unit_amount=price_amount,
            currency=currency.lower(),
            recurring={'interval': interval},
            product_data={'name': f'CorteSec — Suscripción {interval}'},
        )

        sub = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price.id}],
            payment_behavior='default_incomplete',
            payment_settings={
                'save_default_payment_method': 'on_subscription',
            },
            expand=['latest_invoice.payment_intent'],
            metadata=metadata or {},
        )

        client_secret = None
        if sub.latest_invoice and sub.latest_invoice.payment_intent:
            client_secret = sub.latest_invoice.payment_intent.client_secret

        logger.info(f"Stripe subscription created: {sub.id} for customer {customer_id}")
        return SubscriptionResult(
            subscription_id=sub.id,
            status=sub.status,
            client_secret=client_secret,
        )

    def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> bool:
        stripe = _get_stripe()
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )
            else:
                stripe.Subscription.cancel(subscription_id)
            logger.info(f"Stripe subscription {subscription_id} canceled (at_period_end={at_period_end})")
            return True
        except Exception as e:
            logger.error(f"Error canceling subscription: {e}")
            return False

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        customer_id: str,
        payment_method_id: str = None,
        idempotency_key: str = None,
        metadata: dict = None,
    ) -> PaymentIntentResult:
        stripe = _get_stripe()

        params = {
            'amount': amount,
            'currency': currency.lower(),
            'customer': customer_id,
            'metadata': metadata or {},
            'automatic_payment_methods': {'enabled': True},
        }
        if payment_method_id:
            params['payment_method'] = payment_method_id

        kwargs = {}
        if idempotency_key:
            kwargs['idempotency_key'] = str(idempotency_key)

        pi = stripe.PaymentIntent.create(**params, **kwargs)
        logger.info(f"Stripe payment intent created: {pi.id}, amount={amount} {currency}")

        return PaymentIntentResult(
            payment_intent_id=pi.id,
            client_secret=pi.client_secret,
            status=pi.status,
            amount=pi.amount,
            currency=pi.currency,
        )

    def confirm_payment_intent(self, payment_intent_id: str) -> PaymentIntentResult:
        stripe = _get_stripe()
        pi = stripe.PaymentIntent.confirm(payment_intent_id)
        return PaymentIntentResult(
            payment_intent_id=pi.id,
            client_secret=pi.client_secret,
            status=pi.status,
            amount=pi.amount,
            currency=pi.currency,
        )

    def refund_payment(self, payment_id: str, amount: int = None) -> RefundResult:
        stripe = _get_stripe()
        params = {'payment_intent': payment_id}
        if amount:
            params['amount'] = amount

        refund = stripe.Refund.create(**params)
        logger.info(f"Stripe refund created: {refund.id}, amount={refund.amount}")
        return RefundResult(
            refund_id=refund.id,
            amount=refund.amount,
            status=refund.status,
        )

    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> dict:
        stripe = _get_stripe()
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, secret,
            )
            return event
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            raise ValueError("Invalid webhook signature")
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            raise


def get_stripe_gateway() -> StripeGateway:
    """Factory function para obtener la instancia del gateway."""
    return StripeGateway()
