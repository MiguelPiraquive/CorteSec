"""
Modelos de Billing y Suscripciones — CorteSec
===============================================

Gestión completa del ciclo de vida de suscripciones,
pagos, facturas y métodos de pago.

Autor: Sistema CorteSec
Versión: 1.0.0
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import TimestampedModel, Organizacion, Plan


# ==================== SUSCRIPCIONES ====================

class Subscription(TimestampedModel):
    """
    Suscripción activa de una organización a un plan.
    
    Cada organización tiene exactamente UNA suscripción activa.
    La suscripción controla el acceso completo al sistema.
    """

    class Status(models.TextChoices):
        TRIALING = 'trialing', _('En periodo de prueba')
        ACTIVE = 'active', _('Activa')
        PAST_DUE = 'past_due', _('Pago pendiente')
        CANCELED = 'canceled', _('Cancelada')
        SUSPENDED = 'suspended', _('Suspendida')
        EXPIRED = 'expired', _('Expirada')

    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', _('Mensual')
        YEARLY = 'yearly', _('Anual')

    class Gateway(models.TextChoices):
        STRIPE = 'stripe', _('Stripe')
        WOMPI = 'wompi', _('Wompi')
        MERCADOPAGO = 'mercadopago', _('MercadoPago')
        MANUAL = 'manual', _('Manual')

    organization = models.OneToOneField(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('Organización'),
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_('Plan'),
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIALING,
        db_index=True,
        verbose_name=_('Estado'),
    )

    billing_cycle = models.CharField(
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        verbose_name=_('Ciclo de facturación'),
    )

    # ---- Fechas del ciclo ----
    trial_start = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Inicio del trial'),
    )
    trial_end = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Fin del trial'),
    )
    current_period_start = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Inicio del periodo actual'),
    )
    current_period_end = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Fin del periodo actual'),
    )
    canceled_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Cancelada el'),
    )

    # ---- Gateway ----
    gateway = models.CharField(
        max_length=20,
        choices=Gateway.choices,
        default=Gateway.MANUAL,
        verbose_name=_('Pasarela de pago'),
    )
    gateway_subscription_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name=_('ID suscripción en gateway'),
    )
    gateway_customer_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name=_('ID cliente en gateway'),
    )

    # ---- Metadatos ----
    cancel_reason = models.TextField(
        blank=True, default='',
        verbose_name=_('Motivo de cancelación'),
    )
    metadata = models.JSONField(
        default=dict, blank=True,
        verbose_name=_('Metadatos'),
    )

    class Meta:
        verbose_name = _('Suscripción')
        verbose_name_plural = _('Suscripciones')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['trial_end']),
            models.Index(fields=['current_period_end']),
        ]

    def __str__(self):
        return f"{self.organization} — {self.plan.name} ({self.get_status_display()})"

    # ---- Propiedades ----

    @property
    def is_trialing(self):
        return self.status == self.Status.TRIALING

    @property
    def is_active(self):
        return self.status in (self.Status.ACTIVE, self.Status.TRIALING)

    @property
    def is_expired(self):
        if self.status == self.Status.EXPIRED:
            return True
        if self.is_trialing and self.trial_end:
            return timezone.now() > self.trial_end
        return False

    @property
    def is_suspended(self):
        return self.status in (self.Status.SUSPENDED, self.Status.CANCELED)

    @property
    def days_remaining(self):
        """Días restantes del trial o periodo actual."""
        end = self.trial_end if self.is_trialing else self.current_period_end
        if not end:
            return None
        delta = (end - timezone.now()).days
        return max(delta, 0)

    @property
    def allows_writes(self):
        """¿Puede la organización crear/editar recursos?"""
        if self.status in (self.Status.ACTIVE, self.Status.TRIALING):
            # Si está en trial, verificar que no haya expirado
            if self.is_trialing and self.trial_end and timezone.now() > self.trial_end:
                return False
            return True
        return False

    # ---- Acciones ----

    def activate(self, gateway='manual', gateway_subscription_id='', gateway_customer_id=''):
        """Activar suscripción tras pago exitoso."""
        now = timezone.now()
        self.status = self.Status.ACTIVE
        self.gateway = gateway
        self.gateway_subscription_id = gateway_subscription_id
        self.gateway_customer_id = gateway_customer_id
        self.current_period_start = now
        if self.billing_cycle == self.BillingCycle.YEARLY:
            self.current_period_end = now + timedelta(days=365)
        else:
            self.current_period_end = now + timedelta(days=30)
        # Desactivar trial
        self.organization.is_trial = False
        self.organization.save(update_fields=['is_trial'])
        self.save()

    def cancel(self, reason=''):
        """Cancelar al final del periodo actual."""
        self.canceled_at = timezone.now()
        self.cancel_reason = reason
        # No cambiamos status inmediatamente — sigue activa hasta period_end
        self.save(update_fields=['canceled_at', 'cancel_reason', 'updated_at'])

    def suspend(self):
        """Suspender por falta de pago."""
        self.status = self.Status.SUSPENDED
        self.save(update_fields=['status', 'updated_at'])

    def expire(self):
        """Expirar trial o suscripción."""
        self.status = self.Status.EXPIRED
        self.save(update_fields=['status', 'updated_at'])

    def renew_period(self):
        """Renovar periodo tras cobro exitoso."""
        now = timezone.now()
        self.status = self.Status.ACTIVE
        self.current_period_start = now
        if self.billing_cycle == self.BillingCycle.YEARLY:
            self.current_period_end = now + timedelta(days=365)
        else:
            self.current_period_end = now + timedelta(days=30)
        self.canceled_at = None
        self.cancel_reason = ''
        self.save()


# ==================== MÉTODOS DE PAGO ====================

class PaymentMethod(TimestampedModel):
    """
    Método de pago tokenizado (tarjeta de crédito/débito).
    
    SEGURIDAD: Solo almacenamos los últimos 4 dígitos y la marca.
    El número completo y CVV NUNCA tocan nuestros servidores.
    La tokenización se maneja 100% en el frontend vía Stripe.js.
    """

    class CardBrand(models.TextChoices):
        VISA = 'visa', 'Visa'
        MASTERCARD = 'mastercard', 'Mastercard'
        AMEX = 'amex', 'American Express'
        DINERS = 'diners', 'Diners Club'
        OTHER = 'other', _('Otra')

    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='payment_methods',
        verbose_name=_('Organización'),
    )

    gateway = models.CharField(
        max_length=20,
        choices=Subscription.Gateway.choices,
        verbose_name=_('Pasarela'),
    )

    gateway_payment_method_id = models.CharField(
        max_length=255,
        verbose_name=_('ID en pasarela'),
        help_text=_('Token del método de pago en Stripe/MP (pm_xxx)'),
    )

    # Info de display — NO datos sensibles
    card_brand = models.CharField(
        max_length=20,
        choices=CardBrand.choices,
        default=CardBrand.OTHER,
        verbose_name=_('Marca de tarjeta'),
    )
    card_last4 = models.CharField(
        max_length=4,
        verbose_name=_('Últimos 4 dígitos'),
    )
    card_exp_month = models.PositiveSmallIntegerField(
        verbose_name=_('Mes de expiración'),
    )
    card_exp_year = models.PositiveSmallIntegerField(
        verbose_name=_('Año de expiración'),
    )

    is_default = models.BooleanField(
        default=False,
        verbose_name=_('Método por defecto'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Activo'),
    )

    class Meta:
        verbose_name = _('Método de pago')
        verbose_name_plural = _('Métodos de pago')
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.get_card_brand_display()} ****{self.card_last4}"

    def set_as_default(self):
        """Marcar este método como default y desmarcar los demás."""
        PaymentMethod.objects.filter(
            organization=self.organization, is_default=True
        ).update(is_default=False)
        self.is_default = True
        self.save(update_fields=['is_default', 'updated_at'])

    @property
    def is_expired_card(self):
        now = timezone.now()
        if self.card_exp_year < now.year:
            return True
        if self.card_exp_year == now.year and self.card_exp_month < now.month:
            return True
        return False


# ==================== FACTURAS ====================

class Invoice(TimestampedModel):
    """
    Factura generada por cobro de suscripción.
    
    Cada cobro exitoso genera una factura con datos fiscales
    snapshot (inmutables al momento de la factura).
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', _('Borrador')
        PENDING = 'pending', _('Pendiente')
        PAID = 'paid', _('Pagada')
        FAILED = 'failed', _('Fallida')
        VOIDED = 'voided', _('Anulada')
        REFUNDED = 'refunded', _('Reembolsada')

    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='invoices',
        verbose_name=_('Organización'),
    )

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='invoices',
        verbose_name=_('Suscripción'),
    )

    number = models.CharField(
        max_length=30,
        unique=True,
        verbose_name=_('Número de factura'),
        help_text=_('Formato: INV-YYYY-NNNNNN'),
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name=_('Estado'),
    )

    # ---- Montos ----
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name=_('Subtotal'),
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=19.00,
        verbose_name=_('Tasa de impuesto (%)'),
        help_text=_('IVA Colombia: 19%'),
    )
    tax_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name=_('Valor del impuesto'),
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name=_('Total'),
    )
    currency = models.CharField(
        max_length=3, default='COP',
        verbose_name=_('Moneda'),
    )

    # ---- Periodo ----
    billing_period_start = models.DateTimeField(
        verbose_name=_('Inicio del periodo'),
    )
    billing_period_end = models.DateTimeField(
        verbose_name=_('Fin del periodo'),
    )

    due_date = models.DateField(
        verbose_name=_('Fecha de vencimiento'),
    )
    paid_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name=_('Pagada el'),
    )

    # ---- Gateway ----
    gateway_invoice_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name=_('ID factura en gateway'),
    )
    gateway_payment_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name=_('ID pago en gateway'),
    )

    # ---- PDF ----
    pdf_url = models.URLField(
        blank=True, default='',
        verbose_name=_('URL del PDF'),
    )

    # ---- Datos fiscales snapshot ----
    billing_name = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name=_('Razón social'),
    )
    billing_nit = models.CharField(
        max_length=20, blank=True, default='',
        verbose_name=_('NIT'),
    )
    billing_address = models.TextField(
        blank=True, default='',
        verbose_name=_('Dirección de facturación'),
    )
    billing_email = models.EmailField(
        blank=True, default='',
        verbose_name=_('Email de facturación'),
    )

    class Meta:
        verbose_name = _('Factura')
        verbose_name_plural = _('Facturas')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['number']),
        ]

    def __str__(self):
        return f"{self.number} — {self.organization} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_number(cls):
        """Genera número secuencial de factura: INV-YYYY-NNNNNN"""
        year = timezone.now().year
        prefix = f"INV-{year}-"
        last = cls.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last:
            try:
                last_seq = int(last.number.split('-')[-1])
            except (ValueError, IndexError):
                last_seq = 0
            seq = last_seq + 1
        else:
            seq = 1
        return f"{prefix}{seq:06d}"

    def mark_paid(self, gateway_payment_id=''):
        """Marcar factura como pagada."""
        self.status = self.Status.PAID
        self.paid_at = timezone.now()
        self.gateway_payment_id = gateway_payment_id
        self.save(update_fields=['status', 'paid_at', 'gateway_payment_id', 'updated_at'])


# ==================== PAGOS ====================

class Payment(TimestampedModel):
    """
    Registro de intento y resultado de pago.
    
    Cada intento de cobro (exitoso o fallido) genera un registro
    con idempotency_key para evitar cobros duplicados.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', _('Pendiente')
        PROCESSING = 'processing', _('Procesando')
        SUCCEEDED = 'succeeded', _('Exitoso')
        FAILED = 'failed', _('Fallido')
        REFUNDED = 'refunded', _('Reembolsado')

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_('Factura'),
    )

    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments',
        verbose_name=_('Método de pago'),
    )

    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name=_('Monto'),
    )
    currency = models.CharField(
        max_length=3, default='COP',
        verbose_name=_('Moneda'),
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name=_('Estado'),
    )

    gateway = models.CharField(
        max_length=20,
        choices=Subscription.Gateway.choices,
        verbose_name=_('Pasarela'),
    )
    gateway_payment_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name=_('ID pago en gateway'),
    )

    failure_reason = models.TextField(
        blank=True, default='',
        verbose_name=_('Motivo de fallo'),
    )

    idempotency_key = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        verbose_name=_('Clave de idempotencia'),
        help_text=_('Evita cobros duplicados'),
    )

    metadata = models.JSONField(
        default=dict, blank=True,
        verbose_name=_('Metadatos'),
    )

    class Meta:
        verbose_name = _('Pago')
        verbose_name_plural = _('Pagos')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['idempotency_key']),
        ]

    def __str__(self):
        return f"Pago {self.idempotency_key} — ${self.amount:,.0f} ({self.get_status_display()})"

    def mark_succeeded(self, gateway_payment_id=''):
        """Marcar pago como exitoso."""
        self.status = self.Status.SUCCEEDED
        self.gateway_payment_id = gateway_payment_id
        self.save(update_fields=['status', 'gateway_payment_id', 'updated_at'])

    def mark_failed(self, reason=''):
        """Marcar pago como fallido."""
        self.status = self.Status.FAILED
        self.failure_reason = reason
        self.save(update_fields=['status', 'failure_reason', 'updated_at'])


# ==================== FEATURES POR PLAN ====================

class PlanFeature(TimestampedModel):
    """
    Feature flags granulares por plan.
    
    Permite controlar qué funcionalidades están disponibles
    en cada plan, con límites numéricos opcionales.
    """

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='plan_features',
        verbose_name=_('Plan'),
    )

    feature_code = models.CharField(
        max_length=50,
        verbose_name=_('Código de feature'),
        help_text=_('Identificador único del feature (ej: nomina_electronica)'),
    )

    feature_name = models.CharField(
        max_length=100,
        verbose_name=_('Nombre del feature'),
        help_text=_('Nombre legible del feature'),
    )

    enabled = models.BooleanField(
        default=True,
        verbose_name=_('Habilitado'),
    )

    limit_value = models.IntegerField(
        null=True, blank=True,
        verbose_name=_('Límite'),
        help_text=_('Límite numérico (null = ilimitado si enabled)'),
    )

    class Meta:
        verbose_name = _('Feature de plan')
        verbose_name_plural = _('Features de plan')
        unique_together = ['plan', 'feature_code']
        ordering = ['plan', 'feature_code']

    def __str__(self):
        status = '✅' if self.enabled else '❌'
        limit_str = f" (máx: {self.limit_value})" if self.limit_value else ""
        return f"{status} {self.plan.code} — {self.feature_name}{limit_str}"


# ==================== REGISTRO DE USO ====================

class UsageRecord(TimestampedModel):
    """
    Registro periódico de uso para enforcement de límites.
    
    Lo actualiza un cron job o signal cuando se crean recursos.
    """

    class Metric(models.TextChoices):
        USERS = 'users', _('Usuarios')
        STORAGE_MB = 'storage_mb', _('Almacenamiento (MB)')
        EMPLEADOS = 'empleados', _('Empleados')
        NOMINAS_MES = 'nominas_mes', _('Nóminas por mes')
        PRESTAMOS = 'prestamos', _('Préstamos activos')

    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='usage_records',
        verbose_name=_('Organización'),
    )

    metric = models.CharField(
        max_length=30,
        choices=Metric.choices,
        verbose_name=_('Métrica'),
    )

    current_value = models.IntegerField(
        default=0,
        verbose_name=_('Valor actual'),
    )

    limit_value = models.IntegerField(
        default=0,
        verbose_name=_('Límite'),
    )

    recorded_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Registrado el'),
    )

    class Meta:
        verbose_name = _('Registro de uso')
        verbose_name_plural = _('Registros de uso')
        unique_together = ['organization', 'metric']
        ordering = ['organization', 'metric']

    def __str__(self):
        return f"{self.organization} — {self.get_metric_display()}: {self.current_value}/{self.limit_value}"

    @property
    def usage_percentage(self):
        if self.limit_value == 0:
            return 0
        return round((self.current_value / self.limit_value) * 100, 1)

    @property
    def is_at_limit(self):
        if self.limit_value == 0:
            return False
        return self.current_value >= self.limit_value


# ==================== WEBHOOK EVENT LOG ====================

class WebhookEvent(TimestampedModel):
    """
    Log de eventos webhook recibidos para idempotencia y auditoría.
    """

    event_id = models.CharField(
        max_length=255,
        unique=True,
        verbose_name=_('ID del evento'),
        help_text=_('ID único del evento del gateway (evt_xxx)'),
    )

    gateway = models.CharField(
        max_length=20,
        choices=Subscription.Gateway.choices,
        verbose_name=_('Pasarela'),
    )

    event_type = models.CharField(
        max_length=100,
        verbose_name=_('Tipo de evento'),
        help_text=_('Ej: payment_intent.succeeded'),
    )

    payload = models.JSONField(
        default=dict,
        verbose_name=_('Payload'),
    )

    processed = models.BooleanField(
        default=False,
        verbose_name=_('Procesado'),
    )

    error = models.TextField(
        blank=True, default='',
        verbose_name=_('Error'),
    )

    class Meta:
        verbose_name = _('Evento webhook')
        verbose_name_plural = _('Eventos webhook')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_id']),
            models.Index(fields=['event_type']),
            models.Index(fields=['processed']),
        ]

    def __str__(self):
        status = '✅' if self.processed else '⏳'
        return f"{status} {self.event_type} ({self.event_id[:20]}...)"
