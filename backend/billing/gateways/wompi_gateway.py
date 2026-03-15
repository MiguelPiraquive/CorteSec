"""
Wompi Payment Gateway — CorteSec
==================================

Integración con Wompi (Bancolombia) para pagos en Colombia.
Soporta: Tarjeta de crédito/débito, PSE, Nequi, Bancolombia Transfer.

Docs: https://docs.wompi.co/
"""

import hashlib
import hmac
import json
import logging
import requests
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

logger = logging.getLogger('billing.wompi')

WOMPI_SANDBOX_URL = 'https://api-sandbox.co.uat.wompi.dev/v1'
WOMPI_PRODUCTION_URL = 'https://production.wompi.co/v1'


class WompiGateway(AbstractPaymentGateway):
    """
    Gateway de Wompi para pagos en Colombia.

    Flujo principal:
    1. Backend crea una referencia de transacción única
    2. Frontend abre el Widget de Wompi con esa referencia
    3. Usuario paga (tarjeta, PSE, Nequi, etc.)
    4. Wompi envía webhook al backend
    5. Backend verifica y activa suscripción
    """

    def __init__(self):
        self.public_key = getattr(settings, 'WOMPI_PUBLIC_KEY', '')
        self.private_key = getattr(settings, 'WOMPI_PRIVATE_KEY', '')
        self.events_secret = getattr(settings, 'WOMPI_EVENTS_SECRET', '')
        self.is_sandbox = getattr(settings, 'WOMPI_SANDBOX', True)
        self.base_url = WOMPI_SANDBOX_URL if self.is_sandbox else WOMPI_PRODUCTION_URL

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.private_key}',
            'Content-Type': 'application/json',
        }

    # ─── Wompi-specific methods ───

    def create_transaction_reference(self, invoice_number: str, org_id: str) -> str:
        """Genera referencia única para la transacción Wompi."""
        return f"CORTESEC-{invoice_number}-{org_id[:8]}"

    def create_integrity_signature(self, reference: str, amount_in_cents: int, currency: str = 'COP') -> str:
        """
        Genera firma de integridad para el widget de Wompi.
        SHA256(referencia + monto_en_centavos + moneda + integrity_secret)
        """
        integrity_secret = getattr(settings, 'WOMPI_INTEGRITY_SECRET', '')
        data = f"{reference}{amount_in_cents}{currency}{integrity_secret}"
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    def get_transaction(self, transaction_id: str) -> dict:
        """Consulta el estado de una transacción en Wompi."""
        url = f"{self.base_url}/transactions/{transaction_id}"
        response = requests.get(url, headers=self._headers(), timeout=30)
        response.raise_for_status()
        return response.json().get('data', {})

    def get_transaction_by_reference(self, reference: str) -> Optional[dict]:
        """Busca una transacción por referencia."""
        url = f"{self.base_url}/transactions"
        params = {'reference': reference}
        try:
            response = requests.get(url, headers=self._headers(), params=params, timeout=30)
            response.raise_for_status()
            data = response.json().get('data', [])
            if data:
                return data[0] if isinstance(data, list) else data
        except Exception as e:
            logger.error(f"Error buscando transacción por referencia {reference}: {e}")
        return None

    def void_transaction(self, transaction_id: str) -> dict:
        """Anula una transacción."""
        url = f"{self.base_url}/transactions/{transaction_id}/void"
        response = requests.post(url, headers=self._headers(), timeout=30)
        response.raise_for_status()
        return response.json().get('data', {})

    # ─── AbstractPaymentGateway implementation ───

    def get_gateway_name(self) -> str:
        return 'wompi'

    def create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        """Wompi no requiere crear customers, retorna un ID local."""
        return CustomerResult(
            customer_id=f"wompi_customer_{organization_id}",
            email=email,
            metadata={'name': name},
        )

    def get_or_create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        return self.create_customer(organization_id, email, name)

    def attach_payment_method(self, customer_id: str, payment_method_token: str) -> PaymentMethodResult:
        """
        Wompi maneja métodos de pago mediante tokenización.
        El token se obtiene en el frontend vía el widget.
        """
        # Consultar token para obtener info de la tarjeta
        url = f"{self.base_url}/tokens/{payment_method_token}"
        try:
            response = requests.get(url, headers=self._headers(), timeout=30)
            response.raise_for_status()
            data = response.json().get('data', {})
            return PaymentMethodResult(
                payment_method_id=payment_method_token,
                card_brand=data.get('brand', 'unknown'),
                card_last4=data.get('last_four', '****'),
                card_exp_month=int(data.get('exp_month', 0)),
                card_exp_year=int(data.get('exp_year', 0)),
            )
        except Exception:
            return PaymentMethodResult(
                payment_method_id=payment_method_token,
                card_brand='unknown',
                card_last4='****',
                card_exp_month=0,
                card_exp_year=0,
            )

    def detach_payment_method(self, payment_method_id: str) -> bool:
        """Wompi no soporta detach de métodos de pago directamente."""
        return True

    def create_subscription(self, customer_id, price_amount, currency, interval, metadata=None):
        """Wompi no tiene suscripciones nativas, se manejan localmente."""
        raise NotImplementedError(
            "Wompi no soporta suscripciones recurrentes. "
            "Las renovaciones se manejan con cobros individuales."
        )

    def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> bool:
        """Las suscripciones se manejan localmente."""
        return True

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        customer_id: str,
        payment_method_id: str = None,
        idempotency_key: str = None,
        metadata: dict = None,
    ) -> PaymentIntentResult:
        """
        En Wompi, no se crea un PaymentIntent como en Stripe.
        Se retorna la info necesaria para abrir el Widget de checkout.
        """
        reference = metadata.get('reference', idempotency_key or '')
        signature = self.create_integrity_signature(reference, amount, currency)

        return PaymentIntentResult(
            payment_intent_id=reference,
            client_secret=signature,  # Firma de integridad
            status='requires_payment_method',
            amount=amount,
            currency=currency,
        )

    def confirm_payment_intent(self, payment_intent_id: str) -> PaymentIntentResult:
        """Confirmar pago consultando el estado de la transacción."""
        transaction = self.get_transaction(payment_intent_id)
        status = transaction.get('status', 'PENDING')

        return PaymentIntentResult(
            payment_intent_id=payment_intent_id,
            client_secret='',
            status=self._map_status(status),
            amount=transaction.get('amount_in_cents', 0),
            currency=transaction.get('currency', 'COP'),
        )

    def refund_payment(self, payment_id: str, amount: int = None) -> RefundResult:
        """Solicitar reembolso de una transacción."""
        url = f"{self.base_url}/transactions/{payment_id}/refund"
        payload = {}
        if amount:
            payload['amount_in_cents'] = amount

        response = requests.post(
            url,
            headers=self._headers(),
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json().get('data', {})

        return RefundResult(
            refund_id=str(data.get('id', '')),
            amount=data.get('amount_in_cents', amount or 0),
            status=data.get('status', 'PENDING'),
        )

    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> dict:
        """
        Verificar evento de Wompi.

        Wompi firma los eventos así:
        SHA256(timestamp + '.' + json_properties de la transacción + events_secret)

        Docs: https://docs.wompi.co/docs/colombia/eventos/
        """
        event = json.loads(payload)

        # Obtener datos del evento
        event_data = event.get('data', {}).get('transaction', {})
        timestamp = event.get('timestamp', 0)

        # Construir string de verificación
        # Wompi concatena: transaction_id + status + amount_in_cents + timestamp + secret
        properties = event.get('signature', {}).get('properties', [])
        checksum = event.get('signature', {}).get('checksum', '')

        # Construir cadena de propiedades en orden
        values = []
        for prop in properties:
            # Navegar el path (e.g., "transaction.id")
            value = event.get('data', {})
            for part in prop.split('.'):
                if isinstance(value, dict):
                    value = value.get(part, '')
                else:
                    value = ''
            values.append(str(value))

        # Concatenar valores + timestamp + secret
        concat_string = ''.join(values) + str(timestamp) + secret
        computed_checksum = hashlib.sha256(concat_string.encode('utf-8')).hexdigest()

        if computed_checksum != checksum:
            raise ValueError('Firma de webhook Wompi inválida')

        logger.info(f"Webhook Wompi verificado: {event.get('event', 'unknown')}")
        return event

    # ─── Helpers ───

    @staticmethod
    def _map_status(wompi_status: str) -> str:
        """Mapea estados de Wompi a estados internos."""
        mapping = {
            'APPROVED': 'succeeded',
            'DECLINED': 'failed',
            'VOIDED': 'voided',
            'ERROR': 'failed',
            'PENDING': 'pending',
        }
        return mapping.get(wompi_status, 'pending')

    @staticmethod
    def is_configured() -> bool:
        """Verifica si Wompi está configurado."""
        pub_key = getattr(settings, 'WOMPI_PUBLIC_KEY', '')
        priv_key = getattr(settings, 'WOMPI_PRIVATE_KEY', '')
        return bool(pub_key and priv_key)
