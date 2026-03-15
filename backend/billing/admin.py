from django.contrib import admin
from .models import (
    Subscription, PaymentMethod, Invoice, Payment,
    PlanFeature, UsageRecord, WebhookEvent,
)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['organization', 'plan', 'status', 'billing_cycle', 'trial_end', 'current_period_end']
    list_filter = ['status', 'billing_cycle', 'gateway']
    search_fields = ['organization__nombre', 'organization__codigo']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['organization', 'plan']


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['organization', 'card_brand', 'card_last4', 'is_default', 'is_active']
    list_filter = ['card_brand', 'is_default', 'is_active', 'gateway']
    search_fields = ['organization__nombre', 'card_last4']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['number', 'organization', 'status', 'total', 'currency', 'due_date', 'paid_at']
    list_filter = ['status', 'currency']
    search_fields = ['number', 'organization__nombre', 'billing_nit']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['idempotency_key', 'invoice', 'amount', 'status', 'gateway', 'created_at']
    list_filter = ['status', 'gateway']
    search_fields = ['idempotency_key', 'gateway_payment_id']
    readonly_fields = ['idempotency_key', 'created_at', 'updated_at']


@admin.register(PlanFeature)
class PlanFeatureAdmin(admin.ModelAdmin):
    list_display = ['plan', 'feature_code', 'feature_name', 'enabled', 'limit_value']
    list_filter = ['plan', 'enabled']
    search_fields = ['feature_code', 'feature_name']


@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    list_display = ['organization', 'metric', 'current_value', 'limit_value', 'recorded_at']
    list_filter = ['metric']
    search_fields = ['organization__nombre']


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ['event_id', 'event_type', 'gateway', 'processed', 'created_at']
    list_filter = ['gateway', 'processed', 'event_type']
    search_fields = ['event_id', 'event_type']
    readonly_fields = ['created_at', 'updated_at']
