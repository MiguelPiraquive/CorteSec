"""
Serializers de Billing — CorteSec
"""

from rest_framework import serializers

from .models import (
    Subscription, PaymentMethod, Invoice, Payment,
    PlanFeature, UsageRecord, WebhookEvent,
)


class SubscriptionSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source='organization.nombre', read_only=True
    )
    plan_name = serializers.CharField(
        source='plan.name', read_only=True
    )
    plan_code = serializers.CharField(
        source='plan.code', read_only=True
    )
    days_remaining = serializers.IntegerField(read_only=True)
    is_trialing = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    allows_writes = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'organization', 'organization_name',
            'plan', 'plan_name', 'plan_code',
            'status', 'billing_cycle',
            'trial_start', 'trial_end',
            'current_period_start', 'current_period_end',
            'canceled_at', 'gateway',
            'cancel_reason',
            'days_remaining', 'is_trialing', 'is_active',
            'is_expired', 'allows_writes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organization', 'status',
            'trial_start', 'trial_end',
            'current_period_start', 'current_period_end',
            'canceled_at', 'gateway',
            'created_at', 'updated_at',
        ]


class SubscriptionPublicSerializer(serializers.ModelSerializer):
    """Versión reducida para usuarios no-admin."""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_code = serializers.CharField(source='plan.code', read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    is_trialing = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    allows_writes = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'plan_name', 'plan_code', 'status',
            'billing_cycle', 'trial_end',
            'current_period_end',
            'days_remaining', 'is_trialing', 'is_active',
            'allows_writes',
        ]


class PaymentMethodSerializer(serializers.ModelSerializer):
    is_expired_card = serializers.BooleanField(read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year',
            'is_default', 'is_active', 'is_expired_card',
            'display_name', 'created_at',
        ]
        read_only_fields = [
            'id', 'card_brand', 'card_last4',
            'card_exp_month', 'card_exp_year',
            'created_at',
        ]

    def get_display_name(self, obj):
        return str(obj)


class PaymentMethodCreateSerializer(serializers.Serializer):
    """Para crear un nuevo método de pago (recibe token de Stripe)."""
    payment_method_token = serializers.CharField(
        help_text='Token del método de pago de Stripe.js (pm_xxx)'
    )
    set_as_default = serializers.BooleanField(default=True)


class InvoiceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source='organization.nombre', read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'organization', 'organization_name',
            'status', 'subtotal', 'tax_rate', 'tax_amount',
            'total', 'currency',
            'billing_period_start', 'billing_period_end',
            'due_date', 'paid_at',
            'pdf_url',
            'billing_name', 'billing_nit',
            'billing_address', 'billing_email',
            'created_at',
        ]
        read_only_fields = fields


class InvoiceListSerializer(serializers.ModelSerializer):
    """Versión resumida para listado."""

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'status', 'total', 'currency',
            'due_date', 'paid_at', 'pdf_url', 'created_at',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'currency',
            'status', 'gateway', 'failure_reason',
            'idempotency_key', 'created_at',
        ]
        read_only_fields = fields


class PlanFeatureSerializer(serializers.ModelSerializer):
    plan_code = serializers.CharField(source='plan.code', read_only=True)

    class Meta:
        model = PlanFeature
        fields = [
            'id', 'plan', 'plan_code',
            'feature_code', 'feature_name',
            'enabled', 'limit_value',
        ]


class UsageRecordSerializer(serializers.ModelSerializer):
    usage_percentage = serializers.FloatField(read_only=True)
    is_at_limit = serializers.BooleanField(read_only=True)

    class Meta:
        model = UsageRecord
        fields = [
            'id', 'metric', 'current_value', 'limit_value',
            'usage_percentage', 'is_at_limit', 'recorded_at',
        ]
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    """Datos para iniciar checkout."""
    plan_code = serializers.CharField()
    billing_cycle = serializers.ChoiceField(
        choices=Subscription.BillingCycle.choices,
        default='monthly',
    )
    payment_method_token = serializers.CharField(
        required=False, allow_blank=True,
        help_text='Token de Stripe.js. Requerido si no hay método guardado.',
    )
    # Datos de facturación
    billing_name = serializers.CharField(max_length=200)
    billing_nit = serializers.CharField(max_length=20)
    billing_address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    billing_email = serializers.EmailField()

    def validate_plan_code(self, value):
        from core.models import Plan
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError('Plan no encontrado o inactivo.')
        if value == 'FREE':
            raise serializers.ValidationError('No se requiere checkout para el plan FREE.')
        return value
