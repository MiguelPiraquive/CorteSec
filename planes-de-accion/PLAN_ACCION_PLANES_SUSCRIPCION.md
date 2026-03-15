# Plan de Acción: Sistema de Planes, Suscripciones y Pagos

**Fecha:** 2026-02-26  
**Estado:** 📋 Pendiente de implementación  
**Prioridad:** 🔴 CRÍTICA — Módulo de revenue/monetización  
**Estimación total:** 5-7 días de desarrollo

---

## 📊 DIAGNÓSTICO DEL ESTADO ACTUAL

### ¿Qué EXISTE hoy?

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ESTADO ACTUAL — "Plan Catalog"                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅ Modelo Plan (code, name, precio COP, max_users, features)      │
│  ✅ 4 planes seedeados (FREE, BASIC, PRO, ENTERPRISE)              │
│  ✅ API pública GET /api/public/plans/ (landing page)              │
│  ✅ CRUD admin de planes (/api/plans/)                             │
│  ✅ PlanChangeLog (historial de cambios)                           │
│  ✅ set_plan() action en OrganizationViewSet                       │
│  ✅ RegisterSerializer acepta plan_code                            │
│  ✅ Trial de 14 días en registro (is_trial, trial_ends_at)         │
│  ✅ PlanesPage.jsx admin (855 líneas, CRUD completo)              │
│  ✅ Landing page muestra planes y precios                          │
│  ✅ RegisterPage selecciona plan                                   │
│  ✅ Propiedades: can_add_users, is_trial_expired, is_free_plan     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ❌ NO HAY pasarela de pago (Stripe, PayPal, MercadoPago — nada)   │
│  ❌ NO HAY validación de tarjeta                                   │
│  ❌ NO HAY modelo Subscription (ciclo de vida temporal)            │
│  ❌ NO HAY modelo Invoice / Factura                                │
│  ❌ NO HAY modelo PaymentMethod (tarjetas guardadas)               │
│  ❌ NO HAY enforcement de límites (can_add_users NUNCA se valida)  │
│  ❌ NO HAY bloqueo por trial expirado (propiedad existe, no se usa)│
│  ❌ NO HAY upgrade self-service (solo admin manual)                │
│  ❌ NO HAY proration ni cálculo de ajuste                          │
│  ❌ NO HAY notificaciones de expiración                            │
│  ❌ NO HAY feature-gating (FREE accede a todo igual que PRO)       │
│  ❌ NO HAY facturación electrónica                                 │
│  ❌ NO HAY webhook de pago                                         │
│  ❌ NO HAY storage_used_mb real (retorna 0 hardcoded)              │
│  ❌ models_tenant.py tiene límites HARDCODED distintos al seed     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo actual del usuario

```
Usuario ve landing → Escoge plan → Click "Empezar"
       ↓
Registro con plan_code → Se crea org con plan + trial 14d
       ↓
Entra al dashboard → USA TODO SIN RESTRICCIÓN
       ↓
Trial expira → NADA PASA (nadie valida is_trial_expired)
       ↓
¿Pagar? → NO HAY FORMA. Admin debe cambiar plan manualmente.
```

### Problemas de seguridad CRÍTICOS

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Sin gateway de pago** | No hay forma de cobrar. El negocio no genera ingresos |
| 2 | **Trial sin enforcement** | Usuario puede usar plan PRO gratis infinitamente |
| 3 | **Límites decorativos** | `can_add_users` existe pero NADIE lo valida antes de crear usuarios |
| 4 | **Sin feature-gating** | FREE tiene exactamente las mismas features que ENTERPRISE |
| 5 | **Datos duplicados** | `models_tenant.py` tiene limits hardcoded distintos al `Plan` model |
| 6 | **Sin verificación de pago** | Usuario selecciona plan caro pero nunca paga |
| 7 | **Sin webhook seguro** | Sin firma HMAC para validar eventos de pago |
| 8 | **Sin idempotencia** | Pagos duplicados posibles sin idempotency keys |

---

## 🏗️ ARQUITECTURA PROPUESTA

### Diseño del sistema completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     ARQUITECTURA DE BILLING                              │
│                                                                          │
│  ┌──────────┐    ┌───────────────┐    ┌─────────────────┐               │
│  │ Frontend  │───▶│    Backend    │───▶│  Payment Gateway │              │
│  │           │    │               │    │  (Stripe/MP)     │              │
│  │ • Checkout│    │ • Subscription│    │                   │              │
│  │ • Portal  │    │ • Invoice     │    │ • Cobrar tarjeta  │              │
│  │ • Upgrade │    │ • Webhook     │    │ • Tokenización    │              │
│  │ • History │    │ • Limits      │    │ • Webhooks        │              │
│  └──────────┘    │ • FeatureGate │    └─────────────────┘               │
│                  │ • TrialEnforce│                                        │
│                  └───────────────┘                                        │
│                         │                                                │
│                  ┌──────┴──────┐                                          │
│                  │   Database  │                                          │
│                  │             │                                          │
│                  │ Subscription│                                          │
│                  │ Invoice     │                                          │
│                  │ Payment     │                                          │
│                  │ PaymentMethod│                                         │
│                  │ UsageRecord │                                          │
│                  │ PlanFeature │                                          │
│                  └─────────────┘                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Flujo propuesto completo

```
                    ┌─────────────────────────────────────────────┐
                    │              FLUJO DE USUARIO                │
                    └─────────────────────────────────────────────┘

  ┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌─────────────┐
  │ Landing  │────▶│ Registro  │────▶│ Trial 14 días│────▶│ Dashboard   │
  │ ve plans │     │ escoge    │     │ plan completo│     │ con banner  │
  │          │     │ plan      │     │ sin tarjeta  │     │ "X días     │
  └──────────┘     └───────────┘     │ requerida    │     │  restantes" │
                                     └──────────────┘     └──────┬──────┘
                                                                  │
                    ┌─────────────────────────────────────────────┤
                    │                                             │
              ┌─────▼─────┐                              ┌───────▼───────┐
              │ 7 días    │                              │ Trial expira  │
              │ restantes │                              │ → Modo lectura│
              │ Banner +  │                              │ (no crear,    │
              │ Email     │                              │  no editar)   │
              └─────┬─────┘                              └───────┬───────┘
                    │                                             │
              ┌─────▼──────────────┐                    ┌────────▼────────┐
              │ Click "Activar    │                    │ Click "Activar  │
              │ plan" / "Upgrade" │                    │ cuenta"         │
              └─────┬──────────────┘                    └────────┬────────┘
                    │                                             │
              ┌─────▼─────────────────────────────────────────────▼────┐
              │                  CHECKOUT PAGE                         │
              │                                                        │
              │   ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │
              │   │ Plan       │  │ Billing      │  │ Pago         │  │
              │   │ selección  │  │ datos        │  │ Stripe/MP    │  │
              │   │ + resumen  │  │ empresa      │  │ Elements     │  │
              │   └────────────┘  └──────────────┘  └──────┬───────┘  │
              │                                             │          │
              └─────────────────────────────────────────────┤──────────┘
                                                            │
              ┌─────────────────────────────────────────────▼──────────┐
              │                   BACKEND FLOW                         │
              │                                                        │
              │  1. Crear Subscription (status=pending)                │
              │  2. Crear PaymentIntent en Stripe                      │
              │  3. Tokenizar tarjeta (Stripe.js / MP.js)             │
              │  4. Confirmar pago → Webhook callback                  │
              │  5. Webhook: payment_intent.succeeded                  │
              │      → Subscription.status = 'active'                  │
              │      → org.plan = plan_pagado                          │
              │      → org.is_trial = False                            │
              │      → Crear Invoice                                   │
              │      → Enviar email confirmación                       │
              │  6. Renovación automática cada 30 días                 │
              │      → Cobrar tarjeta guardada                         │
              │      → Crear nueva Invoice                             │
              │      → Si falla → retry 3x → suspender                │
              └────────────────────────────────────────────────────────┘
```

---

## 📋 FASES DE IMPLEMENTACIÓN

---

### FASE 1 — Modelos de Suscripción y Billing (Backend)
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 6-8 horas

#### 1.1 Nuevos modelos a crear

```python
# billing/models.py (nueva Django app)

class Subscription(TimestampedModel):
    """Suscripción activa de una organización a un plan."""
    
    class Status(models.TextChoices):
        TRIALING = 'trialing', 'En periodo de prueba'
        ACTIVE = 'active', 'Activa'
        PAST_DUE = 'past_due', 'Pago pendiente'
        CANCELED = 'canceled', 'Cancelada'
        SUSPENDED = 'suspended', 'Suspendida'
        EXPIRED = 'expired', 'Expirada'
    
    class BillingCycle(models.TextChoices):
        MONTHLY = 'monthly', 'Mensual'
        YEARLY = 'yearly', 'Anual'
    
    organization       FK → Organizacion (OneToOne)
    plan               FK → Plan
    status             CharField choices=Status (default: trialing)
    billing_cycle      CharField choices=BillingCycle
    
    # Fechas del ciclo
    trial_start        DateTimeField
    trial_end          DateTimeField
    current_period_start DateTimeField
    current_period_end   DateTimeField
    canceled_at        DateTimeField (null)
    
    # Gateway
    gateway            CharField (stripe/mercadopago/manual)
    gateway_subscription_id  CharField (ID en Stripe/MP)
    gateway_customer_id      CharField (customer ID)
    
    # Metadata
    cancel_reason      TextField (blank)
    metadata           JSONField (default=dict)


class PaymentMethod(TimestampedModel):
    """Método de pago guardado (tarjeta tokenizada)."""
    
    organization       FK → Organizacion
    gateway            CharField (stripe/mercadopago)
    gateway_payment_method_id  CharField (pm_xxx en Stripe)
    
    # Info de display (NO datos sensibles)
    card_brand         CharField (visa/mastercard/amex)
    card_last4         CharField(4)
    card_exp_month     PositiveSmallIntegerField
    card_exp_year      PositiveSmallIntegerField
    
    is_default         BooleanField (default=False)
    is_active          BooleanField (default=True)
    
    # NUNCA almacenar: número completo, CVV, nombre completo


class Invoice(TimestampedModel):
    """Factura generada por cobro de suscripción."""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Borrador'
        PENDING = 'pending', 'Pendiente'
        PAID = 'paid', 'Pagada'
        FAILED = 'failed', 'Fallida'
        VOIDED = 'voided', 'Anulada'
        REFUNDED = 'refunded', 'Reembolsada'
    
    organization       FK → Organizacion
    subscription       FK → Subscription
    
    number             CharField unique (INV-2026-000001)
    status             CharField choices=Status
    
    subtotal           DecimalField (2 decimales)
    tax_amount         DecimalField (IVA 19%)
    total              DecimalField
    currency           CharField (default='COP')
    
    billing_period_start  DateTimeField
    billing_period_end    DateTimeField
    
    due_date           DateField
    paid_at            DateTimeField (null)
    
    # Gateway
    gateway_invoice_id    CharField (null)
    gateway_payment_id    CharField (null)
    
    # PDF
    pdf_url            URLField (blank)
    
    # Datos fiscales snapshot
    billing_name       CharField
    billing_nit        CharField
    billing_address    TextField
    billing_email      EmailField


class Payment(TimestampedModel):
    """Registro de intento/resultado de pago."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        PROCESSING = 'processing', 'Procesando'
        SUCCEEDED = 'succeeded', 'Exitoso'
        FAILED = 'failed', 'Fallido'
        REFUNDED = 'refunded', 'Reembolsado'
    
    invoice            FK → Invoice
    payment_method     FK → PaymentMethod (null)
    
    amount             DecimalField
    currency           CharField (COP)
    status             CharField choices=Status
    
    gateway            CharField
    gateway_payment_id CharField
    
    failure_reason     TextField (blank)
    
    idempotency_key    UUIDField (unique, auto)
    
    metadata           JSONField (default=dict)


class PlanFeature(TimestampedModel):
    """Feature flags granulares por plan (reemplaza el JSONField features)."""
    
    plan               FK → Plan
    feature_code       CharField (ej: 'nomina_electronica', 'api_access')
    feature_name       CharField (ej: 'Nómina electrónica')
    enabled            BooleanField (default=True)
    limit_value        IntegerField (null, ej: max_empleados=100)
    
    class Meta:
        unique_together = ['plan', 'feature_code']


class UsageRecord(TimestampedModel):
    """Registro de uso para enforcement de límites."""
    
    organization       FK → Organizacion
    metric             CharField (users/storage/empleados/nominas/prestamos)
    current_value      IntegerField
    limit_value        IntegerField
    recorded_at        DateTimeField
```

#### 1.2 Feature codes estándar

```python
FEATURE_CODES = {
    # Módulos
    'nomina_basica':           'Gestión básica de nómina',
    'nomina_completa':         'Nómina completa con deducciones',
    'nomina_electronica':      'Nómina electrónica DIAN',
    'prestamos':               'Módulo de préstamos',
    'contabilidad':            'Módulo de contabilidad',
    'reportes_basicos':        'Reportes básicos',
    'reportes_avanzados':      'Reportes avanzados y exportación',
    'api_access':              'Acceso API RESTful',
    'multi_sucursal':          'Soporte multi-sucursal',
    'custom_branding':         'Branding personalizado',
    
    # Integraciones
    'email_notifications':     'Notificaciones por email',
    'sso':                     'Single Sign-On',
    'audit_logs':              'Logs de auditoría avanzados',
    'integrations':            'Integraciones personalizadas',
    
    # Soporte
    'support_email':           'Soporte por email',
    'support_priority':        'Soporte prioritario',
    'support_dedicated':       'Soporte dedicado 24/7',
    'account_manager':         'Gerente de cuenta dedicado',
    'sla_guaranteed':          'SLA garantizado',
}
```

#### 1.3 Tareas

| # | Tarea | Detalle |
|---|-------|---------|
| 1.1 | Crear app `billing` | `python manage.py startapp billing` |
| 1.2 | Crear modelos | Subscription, PaymentMethod, Invoice, Payment, PlanFeature, UsageRecord |
| 1.3 | Migrar PlanFeature | Seed features por plan desde los `features` JSON actuales |
| 1.4 | Crear serializers | SubscriptionSerializer, InvoiceSerializer, PaymentSerializer, etc. |
| 1.5 | Limpiar models_tenant.py | Eliminar `get_plan_limits()` y `upgrade_plan()` hardcoded |
| 1.6 | Migración + seed | Crear migraciones, seedear features |

---

### FASE 2 — Enforcement de Límites (Middleware + Mixins)
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 4-5 horas

#### 2.1 Middleware de suscripción

```python
# billing/middleware.py

class SubscriptionEnforcementMiddleware:
    """
    Middleware que bloquea escrituras si la suscripción está
    expirada/suspendida/cancelada. Solo permite lectura.
    """
    
    EXEMPT_PATHS = [
        '/api/auth/',
        '/api/public/',
        '/api/billing/',      # Dejar que paguen
        '/admin/',
    ]
    
    READ_METHODS = ['GET', 'HEAD', 'OPTIONS']
    
    def __call__(self, request):
        # 1. Skip rutas exentas
        # 2. Skip métodos de lectura
        # 3. Obtener org del usuario
        # 4. Verificar subscription status
        # 5. Si trial expirado → bloquear escribir
        # 6. Si suspended/canceled → bloquear escribir
        # 7. Retornar 402 Payment Required con mensaje claro
```

#### 2.2 Feature gate decorator

```python
# billing/decorators.py

def require_feature(feature_code):
    """
    Decorator para views que requieren un feature específico del plan.
    
    @require_feature('nomina_electronica')
    def generar_nomina_electronica(request):
        ...
    """
    
def require_plan_limit(metric, increment=1):
    """
    Decorator que valida límites antes de crear recursos.
    
    @require_plan_limit('users')
    def create_user(request):
        ...
    """
```

#### 2.3 Mixin para ViewSets

```python
# billing/mixins.py

class PlanLimitMixin:
    """
    Mixin para ViewSets que valida límites del plan
    antes de permitir crear recursos.
    
    plan_limit_metric = 'empleados'  # ¿qué se está contando?
    plan_limit_queryset = None       # QuerySet para contar
    """
```

#### 2.4 Puntos de enforcement

| Recurso | Dónde validar | Límite |
|---------|---------------|--------|
| **Usuarios** | `RegisterSerializer`, `InvitationViewSet` | `plan.max_users` |
| **Empleados** | `EmpleadoViewSet.create()` | `PlanFeature.limit_value` donde `feature_code='max_empleados'` |
| **Nóminas** | `NominaViewSet.create()` | `PlanFeature.limit_value` donde `feature_code='max_nominas_mes'` |
| **Préstamos** | `PrestamoViewSet.create()` | Feature flag `prestamos` |
| **Contabilidad** | `ContabilidadViewSet` | Feature flag `contabilidad` |
| **Nómina electrónica** | `NominaElectronicaView` | Feature flag `nomina_electronica` |
| **API externa** | API gateway rate limit | Feature flag `api_access` |
| **Almacenamiento** | Upload views | `plan.max_storage_mb` |

---

### FASE 3 — Integración con Pasarela de Pago
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 8-10 horas

#### 3.1 Decisión del gateway

```
┌──────────────────────────────────────────────────────────────────┐
│                   COMPARACIÓN DE GATEWAYS                        │
├────────────────┬─────────────────┬──────────────┬───────────────┤
│                │    Stripe       │ MercadoPago  │    Ambos      │
├────────────────┼─────────────────┼──────────────┼───────────────┤
│ COP soportado  │ ✅ Sí           │ ✅ Nativo    │               │
│ Suscripciones  │ ✅ Nativo       │ ⚠️ Limitado  │               │
│ Tarjetas       │ ✅ Visa/MC/Amex │ ✅ + PSE/Nequi│               │
│ Recurrencia    │ ✅ Automática   │ ⚠️ Manual    │               │
│ Webhooks       │ ✅ Robustos     │ ✅ IPN       │               │
│ SDK Python     │ ✅ stripe-python│ ✅ sdk-python │               │
│ PCI Compliance │ ✅ Elements     │ ✅ Checkout   │               │
│ Colombia       │ ✅ Registrado   │ ✅ Nativo    │               │
│ Comisión       │ ~3.5% + $900   │ ~3.49% + IVA │               │
│ Setup          │ 4-6 horas      │ 4-6 horas    │ Recomendado   │
├────────────────┴─────────────────┴──────────────┴───────────────┤
│ RECOMENDACIÓN: Stripe como primary (suscripciones nativas) +    │
│ MercadoPago como fallback (métodos locales colombianos: PSE,    │
│ Nequi, Efecty). Implementar Stripe primero, MP después.        │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2 Servicio de pago (AbstractPaymentGateway)

```python
# billing/gateways/base.py

class AbstractPaymentGateway(ABC):
    """Interfaz base para gateways de pago."""
    
    @abstractmethod
    def create_customer(self, organization) → str (customer_id)
    
    @abstractmethod
    def create_payment_method(self, customer_id, token) → PaymentMethod
    
    @abstractmethod
    def create_subscription(self, customer_id, plan, cycle) → dict
    
    @abstractmethod
    def cancel_subscription(self, subscription_id) → bool
    
    @abstractmethod
    def create_payment_intent(self, amount, currency, customer_id) → dict
    
    @abstractmethod
    def verify_webhook_signature(self, payload, signature, secret) → bool
    
    @abstractmethod
    def refund_payment(self, payment_id, amount) → dict


# billing/gateways/stripe_gateway.py
class StripeGateway(AbstractPaymentGateway):
    """Implementación para Stripe."""
    ...

# billing/gateways/mercadopago_gateway.py
class MercadoPagoGateway(AbstractPaymentGateway):
    """Implementación para MercadoPago."""
    ...
```

#### 3.3 Webhook handler

```python
# billing/webhook_views.py

class StripeWebhookView(APIView):
    """
    Endpoint: POST /api/billing/webhooks/stripe/
    
    Seguridad:
    - Verificación de firma HMAC (stripe_webhook_secret)
    - Idempotencia (no procesar evento duplicado)
    - Logging completo
    - Sin autenticación de usuario (viene de Stripe)
    
    Eventos manejados:
    - payment_intent.succeeded    → Pago exitoso
    - payment_intent.failed       → Pago fallido  
    - invoice.paid                → Factura pagada
    - invoice.payment_failed      → Factura fallida
    - customer.subscription.updated → Suscripción actualizada
    - customer.subscription.deleted → Suscripción cancelada
    - charge.refunded             → Reembolso
    """
```

#### 3.4 Seguridad del flujo de pago

```
┌──────────────────────────────────────────────────────────────────┐
│              MEDIDAS DE SEGURIDAD — PAGOS                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PCI DSS Compliance                                           │
│     • NUNCA almacenar número de tarjeta completo                │
│     • NUNCA almacenar CVV                                        │
│     • Solo guardar: last4, brand, exp_month, exp_year           │
│     • Tokenización vía Stripe.js (card never touches server)    │
│                                                                  │
│  2. Webhook Security                                             │
│     • Verificar firma HMAC-SHA256 en CADA webhook               │
│     • Rechazar eventos sin firma válida                          │
│     • Timeout de 5 minutos para firma                           │
│     • Idempotency key por evento (no reprocesar)                │
│                                                                  │
│  3. API Security                                                 │
│     • Endpoints de billing solo accesibles por OWNER/admin      │
│     • Rate limiting: 10 req/min en checkout                     │
│     • HTTPS obligatorio (redirect HTTP → HTTPS)                 │
│     • CSRF protection en formularios de pago                     │
│     • Input sanitization en datos fiscales                      │
│                                                                  │
│  4. Data Security                                                │
│     • Stripe API keys solo en .env (nunca en código)            │
│     • Webhook secret solo en .env                                │
│     • Logs de pago sin datos sensibles                           │
│     • Encriptar gateway_customer_id en DB (opcional)            │
│                                                                  │
│  5. Fraud Prevention                                             │
│     • Stripe Radar (automático)                                  │
│     • Validar que el email del org coincida con billing          │
│     • Limitar intentos de pago fallidos (5/día)                 │
│     • Alertar admin en pagos sospechosos                        │
│                                                                  │
│  6. Refund Policy                                                │
│     • Reembolso automático dentro de 48h                         │
│     • Reembolso manual por admin después de 48h                 │
│     • Proration en upgrade (pagar diferencia)                   │
│     • Crédito en downgrade (no reembolso, se aplica a futuro)  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### FASE 4 — APIs de Billing (Backend)
**Prioridad:** 🟡 Alta  
**Tiempo estimado:** 5-6 horas

#### 4.1 Endpoints a crear

```
billing/
├── urls.py
│
├── GET  /api/billing/subscription/          → Mi suscripción actual
├── POST /api/billing/subscription/create/   → Crear suscripción (upgrade)
├── POST /api/billing/subscription/cancel/   → Cancelar suscripción
├── POST /api/billing/subscription/reactivate/ → Reactivar
│
├── GET  /api/billing/payment-methods/       → Mis métodos de pago
├── POST /api/billing/payment-methods/       → Agregar tarjeta
├── DELETE /api/billing/payment-methods/{id}/ → Eliminar tarjeta
├── POST /api/billing/payment-methods/{id}/set-default/ → Marcar como default
│
├── GET  /api/billing/invoices/              → Mis facturas
├── GET  /api/billing/invoices/{id}/         → Detalle factura
├── GET  /api/billing/invoices/{id}/pdf/     → Descargar PDF
│
├── POST /api/billing/checkout/              → Iniciar checkout
├── POST /api/billing/checkout/confirm/      → Confirmar pago
│
├── GET  /api/billing/usage/                 → Mi uso actual vs límites
│
├── POST /api/billing/webhooks/stripe/       → Webhook Stripe (público)
└── POST /api/billing/webhooks/mercadopago/  → Webhook MercadoPago (público)
```

#### 4.2 ViewSets principales

```python
class SubscriptionViewSet(viewsets.ViewSet):
    """Solo OWNER/admin de la organización puede gestionar suscripción."""
    permission_classes = [IsAuthenticated, IsOrganizationOwner]
    
    def retrieve(request):        # GET → suscripción actual
    def create(request):          # POST → crear/upgrade
    def cancel(request):          # POST → cancelar
    def reactivate(request):      # POST → reactivar

class PaymentMethodViewSet(viewsets.ModelViewSet):
    """CRUD de métodos de pago (tarjetas tokenizadas)."""
    permission_classes = [IsAuthenticated, IsOrganizationOwner]
    
    # Nunca devolver datos sensibles en responses

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Solo lectura de facturas."""
    permission_classes = [IsAuthenticated, IsOrganizationAdmin]

class CheckoutView(APIView):
    """Flujo de checkout seguro."""
    permission_classes = [IsAuthenticated, IsOrganizationOwner]
    throttle_classes = [CheckoutRateThrottle]  # 10/min

class UsageView(APIView):
    """Uso actual vs límites del plan."""
    permission_classes = [IsAuthenticated]
```

---

### FASE 5 — Trial Enforcement & Notificaciones
**Prioridad:** 🟡 Alta  
**Tiempo estimado:** 3-4 horas

#### 5.1 Sistema de trial completo

```
┌────────────────────────────────────────────────────────────────┐
│                   CICLO DE VIDA DEL TRIAL                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Día 0: Registro                                               │
│  • Subscription.status = 'trialing'                            │
│  • trial_end = now + 14 días                                   │
│  • Acceso completo al plan seleccionado                        │
│  • Email de bienvenida con tips                                │
│                                                                │
│  Día 7: 7 días restantes                                       │
│  • Notificación in-app: "Tu trial vence en 7 días"            │
│  • Email recordatorio con CTA "Activar plan"                   │
│  • Banner warning en dashboard                                 │
│                                                                │
│  Día 11: 3 días restantes                                      │
│  • Notificación urgente + email                                │
│  • Banner rojo en dashboard                                    │
│  • Modal sugerencia de upgrade                                 │
│                                                                │
│  Día 13: Último día                                            │
│  • Notificación + email urgente                                │
│  • Banner parpadea                                             │
│                                                                │
│  Día 14: Trial expira                                          │
│  • Subscription.status = 'expired'                             │
│  • Middleware bloquea escrituras (402 Payment Required)         │
│  • Dashboard en modo lectura                                   │
│  • Modal obligatorio: "Tu trial terminó. Activa tu plan"       │
│  • Los datos NO se borran (se preservan por 90 días)           │
│                                                                │
│  Día 14-104: Período de gracia (90 días)                       │
│  • Datos preservados en modo lectura                            │
│  • Puede reactivar en cualquier momento                        │
│  • Email mensual: "Tus datos siguen disponibles"               │
│                                                                │
│  Día 104: Eliminación                                          │
│  • Notificación final                                          │
│  • Datos anonimizados/eliminados                               │
│  • Org desactivada                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 5.2 Management command de trial

```python
# billing/management/commands/check_subscriptions.py

class Command(BaseCommand):
    """
    Cron diario que verifica suscripciones:
    - Marca trials expirados como 'expired'
    - Envía notificaciones de 7/3/1 días restantes
    - Suspende suscripciones con pagos fallidos >7 días
    - Limpia datos de trials expirados >90 días
    """
```

#### 5.3 Integración con NotificationEngine existente

```python
# Usar el motor de notificaciones ya implementado:

NotificationEngine.notify(
    usuario=owner,
    titulo='Tu periodo de prueba vence en 7 días',
    mensaje='Activa tu plan para seguir usando todas las funcionalidades.',
    tipo='warning',
    categoria='sistema',
    prioridad='alta',
    url_accion='/billing/checkout',
    texto_accion='Activar plan',
    origen_tipo='subscription',
    origen_id=str(subscription.id),
    enviar_email=True,
)
```

---

### FASE 6 — Frontend: Billing Portal
**Prioridad:** 🟡 Alta  
**Tiempo estimado:** 8-10 horas

#### 6.1 Nuevas páginas y componentes

```
frontend/src/
├── pages/billing/
│   ├── CheckoutPage.jsx           # Flujo de compra completo  
│   ├── BillingDashboardPage.jsx   # Mi suscripción + uso
│   ├── InvoicesPage.jsx           # Historial de facturas
│   ├── PaymentMethodsPage.jsx     # Gestión de tarjetas
│   └── UpgradePage.jsx            # Comparación de planes + upgrade
│
├── components/billing/
│   ├── PlanComparisonTable.jsx    # Tabla comparativa de features
│   ├── PricingCard.jsx            # Card de plan con CTA
│   ├── CheckoutForm.jsx           # Formulario de pago (Stripe Elements)
│   ├── SubscriptionStatus.jsx     # Badge de estado de suscripción
│   ├── UsageBar.jsx               # Barra de progreso de uso
│   ├── InvoiceRow.jsx             # Fila de factura con descarga PDF
│   ├── PaymentMethodCard.jsx      # Tarjeta guardada con acciones
│   ├── TrialBanner.jsx            # Banner de expiración de trial
│   └── UpgradeModal.jsx           # Modal de upgrade sugerido
│
├── services/
│   └── billingService.js          # API client para billing
│
├── context/
│   └── BillingContext.jsx         # Estado global de suscripción
│
└── hooks/
    ├── useSubscription.js         # Hook para datos de suscripción
    └── useFeatureGate.js          # Hook para verificar features
```

#### 6.2 Feature gate en frontend

```jsx
// hooks/useFeatureGate.js

export function useFeatureGate(featureCode) {
  const { subscription, features } = useBilling()
  
  return {
    hasFeature: features[featureCode]?.enabled ?? false,
    limit: features[featureCode]?.limit_value ?? null,
    currentUsage: features[featureCode]?.current_usage ?? 0,
    isPlanSufficient: true/false,
    requiredPlan: 'PRO',  // plan mínimo que tiene este feature
  }
}

// Uso en componentes:
function NominaElectronicaPage() {
  const { hasFeature, requiredPlan } = useFeatureGate('nomina_electronica')
  
  if (!hasFeature) {
    return <UpgradePrompt feature="Nómina Electrónica" plan={requiredPlan} />
  }
  
  return <NominaElectronicaContent />
}
```

#### 6.3 Trial banner en DashboardLayout

```jsx
// Siempre visible en el dashboard si está en trial

function TrialBanner() {
  const { subscription } = useBilling()
  
  if (!subscription?.is_trialing) return null
  
  const daysLeft = calcDaysLeft(subscription.trial_end)
  
  // Verde: >7 días | Amarillo: 3-7 días | Rojo: <3 días
  const urgency = daysLeft > 7 ? 'info' : daysLeft > 3 ? 'warning' : 'critical'
  
  return (
    <Banner urgency={urgency}>
      Te quedan {daysLeft} días de prueba.
      <Link to="/billing/checkout">Activar plan →</Link>
    </Banner>
  )
}
```

#### 6.4 Checkout page (flujo completo)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHECKOUT PAGE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: Selección de plan                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   BASIC    │  │    PRO     │  │ ENTERPRISE │                │
│  │  $99,000   │  │  $199,000  │  │ Cotización │                │
│  │  /mes      │  │  /mes      │  │            │                │
│  │            │  │ ★ Popular  │  │            │                │
│  │ [Elegir]   │  │ [Elegir]   │  │ [Contactar]│                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                  │
│  Toggle: [Mensual] / [Anual (-17% descuento)]                  │
│                                                                  │
│  STEP 2: Datos de facturación                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Razón social: [_______________________________] │           │
│  │ NIT:          [_______________________________] │           │
│  │ Dirección:    [_______________________________] │           │
│  │ Ciudad:       [_______________________________] │           │
│  │ Email:        [_______________________________] │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  STEP 3: Método de pago                                         │
│  ┌──────────────────────────────────────────────────┐           │
│  │  ┌─────────────────────────────────────────────┐ │           │
│  │  │          Stripe Card Element                │ │           │
│  │  │  Card number: 4242 4242 4242 4242           │ │           │
│  │  │  MM/YY: 12/28    CVC: ***                   │ │           │
│  │  └─────────────────────────────────────────────┘ │           │
│  │                                                    │           │
│  │  🔒 Pago seguro con encriptación de 256-bit       │           │
│  │  Powered by Stripe                                 │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  STEP 4: Resumen + Confirmación                                │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Plan PRO - Mensual                    $199,000   │           │
│  │ IVA (19%)                              $37,810   │           │
│  │ ─────────────────────────────────────────────    │           │
│  │ Total                                 $236,810   │           │
│  │                                                    │           │
│  │           [ 🔒 Confirmar y pagar ]                │           │
│  │                                                    │           │
│  │ Al confirmar aceptas los términos de servicio.    │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### FASE 7 — Limpieza y Consistencia
**Prioridad:** 🟢 Media  
**Tiempo estimado:** 2-3 horas

| # | Tarea | Detalle |
|---|-------|---------|
| 7.1 | Eliminar `get_plan_limits()` hardcoded | `core/models_tenant.py` L305-340 — reemplazar por consulta a `PlanFeature` |
| 7.2 | Eliminar `upgrade_plan()` hardcoded | `core/models_tenant.py` L342-355 — usar `billing.services.upgrade_subscription()` |
| 7.3 | Sincronizar `Organizacion` con `Subscription` | El campo `org.plan` debe reflejar `subscription.plan` (single source of truth) |
| 7.4 | Migrar `features` JSON a `PlanFeature` | Los features actuales en `Plan.features` (JSON list) → registros en `PlanFeature` |
| 7.5 | Actualizar `RegisterSerializer` | Crear `Subscription(status='trialing')` al registrar |
| 7.6 | Actualizar landing page | Mostrar features desde `PlanFeature`, no desde JSON |
| 7.7 | Agregar rutas billing al sidebar | Nuevo grupo "Billing" en DashboardLayout |

---

### FASE 8 — Testing y Seguridad
**Prioridad:** 🟡 Alta  
**Tiempo estimado:** 4-5 horas

#### 8.1 Tests backend

```python
# billing/tests/

test_subscription_lifecycle.py
    - test_create_trial_on_registration
    - test_trial_expires_after_14_days
    - test_upgrade_from_trial_to_paid
    - test_downgrade_validates_limits
    - test_cancel_subscription
    - test_reactivate_subscription

test_payment_flow.py
    - test_checkout_creates_payment_intent
    - test_payment_succeeded_activates_subscription
    - test_payment_failed_keeps_pending
    - test_duplicate_payment_idempotent
    - test_refund_creates_credit

test_webhook_security.py
    - test_valid_signature_accepted
    - test_invalid_signature_rejected
    - test_duplicate_event_idempotent
    - test_missing_signature_rejected
    - test_expired_signature_rejected

test_enforcement.py
    - test_expired_trial_blocks_writes
    - test_expired_trial_allows_reads
    - test_active_subscription_allows_all
    - test_feature_gate_blocks_unauthorized
    - test_user_limit_enforced
    - test_storage_limit_enforced

test_invoices.py
    - test_invoice_generated_on_payment
    - test_invoice_pdf_generation
    - test_invoice_includes_tax
    - test_invoice_number_sequential
```

#### 8.2 Security checklist

```
ANTES DE PRODUCCIÓN — CHECKLIST DE SEGURIDAD

□ Stripe API key no está en repositorio (solo .env)
□ Webhook secret no está en repositorio (solo .env)
□ Endpoint de webhook verifica firma HMAC
□ Datos de tarjeta NUNCA tocan el servidor (solo Stripe.js)
□ Solo almacenamos last4, brand, exp_month, exp_year
□ Rate limiting en checkout (10/min)
□ Idempotency keys en pagos
□ Logs de pago completos pero sin datos sensibles
□ Middleware bloquea escritura en trial expirado
□ Solo OWNER puede gestionar billing
□ HTTPS obligatorio en producción
□ CSP headers configurados para Stripe.js
□ CORS configurado para Stripe iframes
□ Retry automático en webhooks con backoff exponencial
□ Alertas en pagos fallidos consecutivos
□ Monitoreo de tasa de fraude
```

---

## 📊 RESUMEN EJECUTIVO

### Cronograma propuesto

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRONOGRAMA — BILLING                          │
├──────────┬──────────────────────────────────┬───────────────────┤
│   Día    │           Fase                   │    Horas          │
├──────────┼──────────────────────────────────┼───────────────────┤
│  Día 1   │ F1: Modelos + Migraciones       │     6-8h          │
│  Día 2   │ F2: Enforcement + Middleware     │     4-5h          │
│  Día 2-3 │ F3: Integración Stripe          │     8-10h         │
│  Día 3-4 │ F4: APIs REST billing           │     5-6h          │
│  Día 4   │ F5: Trial + Notificaciones      │     3-4h          │
│  Día 5-6 │ F6: Frontend billing portal     │     8-10h         │
│  Día 6   │ F7: Limpieza + Consistencia     │     2-3h          │
│  Día 7   │ F8: Testing + Security audit    │     4-5h          │
├──────────┼──────────────────────────────────┼───────────────────┤
│  TOTAL   │ 8 fases                         │   40-51 horas     │
│          │                                  │   5-7 días        │
└──────────┴──────────────────────────────────┴───────────────────┘
```

### Archivos a crear

| App | Archivo | Contenido |
|-----|---------|-----------|
| `billing/` | `models.py` | Subscription, PaymentMethod, Invoice, Payment, PlanFeature, UsageRecord |
| `billing/` | `serializers.py` | Serializers para todos los modelos |
| `billing/` | `views.py` | SubscriptionViewSet, CheckoutView, InvoiceViewSet, PaymentMethodViewSet |
| `billing/` | `urls.py` | Routing |
| `billing/` | `middleware.py` | SubscriptionEnforcementMiddleware |
| `billing/` | `decorators.py` | @require_feature, @require_plan_limit |
| `billing/` | `mixins.py` | PlanLimitMixin |
| `billing/` | `services.py` | BillingService (orquestación) |
| `billing/` | `signals.py` | Signals de creación/cambio de suscripción |
| `billing/gateways/` | `base.py` | AbstractPaymentGateway |
| `billing/gateways/` | `stripe_gateway.py` | StripeGateway |
| `billing/gateways/` | `mercadopago_gateway.py` | MercadoPagoGateway |
| `billing/` | `webhook_views.py` | StripeWebhookView, MercadoPagoWebhookView |
| `billing/` | `admin.py` | Admin para Subscription, Invoice, Payment |
| `billing/management/commands/` | `check_subscriptions.py` | Cron de verificación |
| `billing/` | `tests/` | 5 archivos de tests |
| `frontend/` | `pages/billing/` | 5 páginas |
| `frontend/` | `components/billing/` | 9 componentes |
| `frontend/` | `services/billingService.js` | API client |
| `frontend/` | `context/BillingContext.jsx` | Contexto global |
| `frontend/` | `hooks/useSubscription.js` | Hook suscripción |
| `frontend/` | `hooks/useFeatureGate.js` | Hook feature gate |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `backend/settings.py` | Agregar `billing` a INSTALLED_APPS, Stripe keys |
| `backend/core/models_tenant.py` | Eliminar hardcoded limits |
| `backend/login/serializers.py` | Crear Subscription al registrar |
| `backend/contractor_management/urls.py` | Incluir `billing.urls` |
| `frontend/src/App.jsx` | BillingProvider + rutas billing |
| `frontend/src/components/layout/DashboardLayout.jsx` | TrialBanner + sidebar billing |
| Todos los ViewSets de CRUD | PlanLimitMixin en create() |

### Prioridad de implementación

```
 MÁS URGENTE                                         MENOS URGENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  F1: Modelos     F2: Enforce    F3: Stripe    F4: APIs
  F5: Trial       F6: Frontend   F7: Limpieza  F8: Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SIN ESTO NO     SIN ESTO       SIN ESTO      ESTO ES EL
  HAY BILLING     REGALAN        NO COBRAN     PRODUCTO
                  EL PRODUCTO    DINERO         COMPLETO
```
