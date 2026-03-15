"""
Factories y helpers para tests de billing.
"""

import uuid
from datetime import timedelta
from django.utils import timezone
from django.utils.text import slugify

from core.models import Plan, Organizacion
from login.models import CustomUser
from billing.models import (
    Subscription, PaymentMethod, Invoice, Payment,
    PlanFeature, WebhookEvent,
)


def create_plan(code='PRO', name='Profesional', price_monthly=199000, price_yearly=1990000,
                max_users=100, max_storage_mb=20480, **kwargs):
    """Crea o recupera un Plan de prueba."""
    defaults = {
        'name': name,
        'price_monthly_cop': price_monthly,
        'price_yearly_cop': price_yearly,
        'max_users': max_users,
        'max_storage_mb': max_storage_mb,
        'is_active': True,
        'is_public': True,
        'features': ['test_feature'],
    }
    defaults.update(kwargs)
    plan, _ = Plan.objects.get_or_create(code=code, defaults=defaults)
    return plan


def create_free_plan():
    return create_plan(code='FREE', name='Free', price_monthly=0, price_yearly=0,
                       max_users=5, max_storage_mb=1024)


def create_org(plan=None, name='Test Org', is_trial=True, trial_days=14, **kwargs):
    """Crea una Organizacion de prueba (sin trigger de signal)."""
    if plan is None:
        plan = create_free_plan()

    # Generar código único para evitar colisiones entre tests
    unique_suffix = uuid.uuid4().hex[:8]
    code = kwargs.pop('codigo', None) or f"{slugify(name).upper().replace('-', '_')}_{unique_suffix}"

    now = timezone.now()
    defaults = {
        'nombre': name,
        'codigo': code,
        'slug': f"{slugify(name)}-{unique_suffix}",
        'activa': True,
        'plan': plan,
        'max_users': plan.max_users,
        'max_storage_mb': plan.max_storage_mb,
        'is_trial': is_trial,
        'trial_ends_at': now + timedelta(days=trial_days),
    }
    defaults.update(kwargs)
    return Organizacion.objects.create(**defaults)


def create_user(org, role='OWNER', username=None, **kwargs):
    """Crea un usuario de prueba."""
    if username is None:
        username = f"user_{uuid.uuid4().hex[:8]}"
    defaults = {
        'username': username,
        'email': f"{username}@test.com",
        'organization': org,
        'organization_role': role,
    }
    defaults.update(kwargs)
    user = CustomUser.objects.create_user(password='TestPass123!', **defaults)
    return user


def create_subscription(org, plan=None, status='trialing', trial_days=14, **kwargs):
    """Crea una Subscription de prueba."""
    if plan is None:
        plan = org.plan
    now = timezone.now()
    defaults = {
        'organization': org,
        'plan': plan,
        'status': status,
        'trial_start': now,
        'trial_end': now + timedelta(days=trial_days),
        'current_period_start': now,
        'current_period_end': now + timedelta(days=trial_days),
        'billing_cycle': 'monthly',
    }
    defaults.update(kwargs)
    return Subscription.objects.create(**defaults)


def create_payment_method(org, **kwargs):
    """Crea un PaymentMethod de prueba."""
    defaults = {
        'organization': org,
        'gateway': 'stripe',
        'gateway_payment_method_id': 'pm_test_12345',
        'card_brand': 'visa',
        'card_last4': '4242',
        'card_exp_month': 12,
        'card_exp_year': 2028,
        'is_default': True,
        'is_active': True,
    }
    defaults.update(kwargs)
    return PaymentMethod.objects.create(**defaults)


def create_invoice(org, subscription=None, **kwargs):
    """Crea una Invoice de prueba."""
    now = timezone.now()
    defaults = {
        'organization': org,
        'subscription': subscription,
        'status': 'paid',
        'subtotal': 199000,
        'tax_rate': 19.00,
        'tax_amount': 37810,
        'total': 236810,
        'currency': 'COP',
        'billing_name': 'Test Corp',
        'billing_nit': '900123456-1',
        'billing_email': 'billing@test.com',
        'billing_address': 'Calle 1 #2-3',
        'billing_period_start': now,
        'billing_period_end': now + timedelta(days=30),
        'due_date': (now + timedelta(days=30)).date(),
    }
    defaults.update(kwargs)
    return Invoice.objects.create(**defaults)


def create_payment(invoice, **kwargs):
    """Crea un Payment de prueba."""
    defaults = {
        'invoice': invoice,
        'amount': invoice.total,
        'currency': 'COP',
        'gateway': 'stripe',
        'gateway_payment_id': f'pi_test_{uuid.uuid4().hex[:8]}',
        'status': 'succeeded',
    }
    defaults.update(kwargs)
    return Payment.objects.create(**defaults)
