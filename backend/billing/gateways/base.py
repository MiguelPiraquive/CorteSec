"""
Abstract Payment Gateway — CorteSec
=====================================

Interfaz base para todas las pasarelas de pago.
Cada gateway (Stripe, MercadoPago, etc.) implementa esta interfaz.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class CustomerResult:
    """Resultado de crear/obtener un customer en el gateway."""
    customer_id: str
    email: str
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class PaymentMethodResult:
    """Resultado de crear un método de pago."""
    payment_method_id: str
    card_brand: str
    card_last4: str
    card_exp_month: int
    card_exp_year: int


@dataclass
class PaymentIntentResult:
    """Resultado de crear un PaymentIntent."""
    payment_intent_id: str
    client_secret: str  # Para confirmar en frontend
    status: str  # requires_payment_method, requires_confirmation, succeeded, etc.
    amount: int
    currency: str


@dataclass
class SubscriptionResult:
    """Resultado de crear/gestionar una suscripción en el gateway."""
    subscription_id: str
    status: str
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    client_secret: Optional[str] = None  # Para SCA/3D Secure


@dataclass
class RefundResult:
    """Resultado de un reembolso."""
    refund_id: str
    amount: int
    status: str


class AbstractPaymentGateway(ABC):
    """
    Interfaz base para pasarelas de pago.
    
    Todas las implementaciones deben:
    - NUNCA almacenar datos de tarjeta
    - Verificar firmas de webhook
    - Usar idempotency keys
    - Logear sin datos sensibles
    """

    @abstractmethod
    def create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        """Crear un customer en el gateway."""
        ...

    @abstractmethod
    def get_or_create_customer(self, organization_id: int, email: str, name: str) -> CustomerResult:
        """Obtener customer existente o crear uno nuevo."""
        ...

    @abstractmethod
    def attach_payment_method(self, customer_id: str, payment_method_token: str) -> PaymentMethodResult:
        """Adjuntar un método de pago tokenizado a un customer."""
        ...

    @abstractmethod
    def detach_payment_method(self, payment_method_id: str) -> bool:
        """Remover un método de pago de un customer."""
        ...

    @abstractmethod
    def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,  # 'month' o 'year'
        metadata: dict = None,
    ) -> SubscriptionResult:
        """Crear una suscripción recurrente."""
        ...

    @abstractmethod
    def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> bool:
        """Cancelar una suscripción."""
        ...

    @abstractmethod
    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        customer_id: str,
        payment_method_id: str = None,
        idempotency_key: str = None,
        metadata: dict = None,
    ) -> PaymentIntentResult:
        """Crear un intento de pago único."""
        ...

    @abstractmethod
    def confirm_payment_intent(self, payment_intent_id: str) -> PaymentIntentResult:
        """Confirmar un payment intent (server-side)."""
        ...

    @abstractmethod
    def refund_payment(self, payment_id: str, amount: int = None) -> RefundResult:
        """Reembolsar un pago (total o parcial)."""
        ...

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> dict:
        """
        Verificar firma HMAC del webhook y devolver el evento parseado.
        Lanza excepción si la firma no es válida.
        """
        ...

    @abstractmethod
    def get_gateway_name(self) -> str:
        """Nombre del gateway para guardar en DB."""
        ...
