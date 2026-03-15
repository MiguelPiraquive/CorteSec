"""
Views de Billing — CorteSec
============================

Endpoints para suscripciones, pagos, facturas y checkout.
"""

import hmac as hmac_module
import logging

from django.conf import settings as django_settings

from rest_framework import viewsets, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import (
    Subscription, PaymentMethod, Invoice, Payment,
    PlanFeature, UsageRecord, WebhookEvent,
)
from .serializers import (
    SubscriptionSerializer, SubscriptionPublicSerializer,
    PaymentMethodSerializer, PaymentMethodCreateSerializer,
    InvoiceSerializer, InvoiceListSerializer,
    PlanFeatureSerializer, UsageRecordSerializer,
    CheckoutSerializer,
)
from .policies import BillingAccessPolicy

logger = logging.getLogger('billing')


# ==================== THROTTLING ====================

class CheckoutRateThrottle(UserRateThrottle):
    """Máximo 10 intentos de checkout por minuto."""
    rate = '10/min'


# ==================== PERMISOS ====================

class IsOrganizationOwner(IsAuthenticated):
    """Solo OWNER de la organización puede gestionar billing."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'organization_role', '') == 'OWNER'


class IsOrganizationAdmin(IsAuthenticated):
    """OWNER o ADMIN pueden ver facturas."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'organization_role', '') in ('OWNER', 'ADMIN')


# ==================== SUSCRIPCIÓN ====================

class SubscriptionDetailView(RetrieveAPIView):
    """GET /api/billing/subscription/ — Mi suscripción actual."""
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, BillingAccessPolicy]

    def get_object(self):
        org = self.request.user.organization
        sub, _created = Subscription.objects.get_or_create(
            organization=org,
            defaults={
                'plan': org.plan,
                'status': Subscription.Status.TRIALING if org.is_trial else Subscription.Status.ACTIVE,
                'trial_start': org.created_at if hasattr(org, 'created_at') else None,
                'trial_end': org.trial_ends_at,
            }
        )
        return sub


class SubscriptionCancelView(APIView):
    """POST /api/billing/subscription/cancel/"""
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def post(self, request):
        org = request.user.organization
        try:
            sub = Subscription.objects.get(organization=org)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No hay suscripción activa.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if sub.status in (Subscription.Status.CANCELED, Subscription.Status.EXPIRED):
            return Response(
                {'error': 'La suscripción ya está cancelada o expirada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '')
        sub.cancel(reason=reason)

        return Response(
            {'message': 'Suscripción cancelada. Seguirá activa hasta el final del periodo.'},
            status=status.HTTP_200_OK,
        )


class SubscriptionReactivateView(APIView):
    """POST /api/billing/subscription/reactivate/"""
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def post(self, request):
        org = request.user.organization
        try:
            sub = Subscription.objects.get(organization=org)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No hay suscripción.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if sub.canceled_at:
            sub.canceled_at = None
            sub.cancel_reason = ''
            sub.save(update_fields=['canceled_at', 'cancel_reason', 'updated_at'])
            return Response(
                {'message': 'Cancelación revertida. La suscripción continuará renovándose.'},
                status=status.HTTP_200_OK,
            )

        return Response(
            {'error': 'La suscripción no está pendiente de cancelación.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ==================== CHECKOUT ====================

class CheckoutView(APIView):
    """
    POST /api/billing/checkout/

    Flujo de checkout multi-gateway:
    - Wompi: Crea invoice/payment PENDING → retorna config del widget
    - Stripe: Crea PaymentIntent → retorna client_secret
    - Manual: Solo en dev, marca pagado instantáneamente

    El pago NO se activa aquí. Se activa cuando:
    - Wompi: Webhook confirma el pago (transaction.updated → APPROVED)
    - Stripe: Webhook confirma (payment_intent.succeeded)
    - Manual: Se activa instantáneamente (solo dev)
    """
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]
    throttle_classes = [CheckoutRateThrottle]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from core.models import Plan

        org = request.user.organization
        plan_code = serializer.validated_data['plan_code']
        billing_cycle = serializer.validated_data['billing_cycle']
        plan = Plan.objects.get(code=plan_code)

        gateway = getattr(django_settings, 'BILLING_GATEWAY', 'manual')

        # Determinar gateway a usar
        if gateway == 'wompi':
            from .gateways.wompi_gateway import WompiGateway
            if WompiGateway.is_configured():
                return self._wompi_checkout(request, org, plan, billing_cycle, serializer)
            else:
                logger.warning("Wompi no configurado, usando checkout manual")
                return self._manual_checkout(request, org, plan, billing_cycle, serializer)

        elif gateway == 'stripe':
            payment_method_token = serializer.validated_data.get('payment_method_token', '')
            use_stripe = bool(getattr(django_settings, 'STRIPE_SECRET_KEY', ''))
            if use_stripe and payment_method_token:
                return self._stripe_checkout(request, org, plan, billing_cycle, serializer, payment_method_token)
            else:
                logger.warning("Stripe no configurado, usando checkout manual")
                return self._manual_checkout(request, org, plan, billing_cycle, serializer)

        else:
            # manual
            return self._manual_checkout(request, org, plan, billing_cycle, serializer)

    def _calculate_amounts(self, plan, billing_cycle):
        """Calcular subtotal, IVA y total."""
        from decimal import Decimal

        if billing_cycle == 'yearly':
            price = plan.price_yearly_cop
        else:
            price = plan.price_monthly_cop

        if price is None:
            return None, None, None, None

        subtotal = Decimal(str(price))
        tax_rate = Decimal('19.00')
        tax_amount = (subtotal * tax_rate / Decimal('100')).quantize(Decimal('0.01'))
        total = subtotal + tax_amount
        return subtotal, tax_rate, tax_amount, total

    def _wompi_checkout(self, request, org, plan, billing_cycle, serializer):
        """
        Checkout con Wompi: crea factura PENDIENTE y retorna config del widget.
        El pago real se procesa cuando Wompi envía el webhook.
        """
        from decimal import Decimal
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction
        from .gateways.wompi_gateway import WompiGateway

        subtotal, tax_rate, tax_amount, total = self._calculate_amounts(plan, billing_cycle)
        if total is None:
            return Response(
                {'error': 'Este plan requiere cotización personalizada. Contáctanos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wompi = WompiGateway()

        with transaction.atomic():
            sub, _ = Subscription.objects.get_or_create(
                organization=org,
                defaults={'plan': plan, 'status': Subscription.Status.TRIALING}
            )

            now = timezone.now()
            period_end = now + timedelta(days=365 if billing_cycle == 'yearly' else 30)

            # Crear factura PENDIENTE (NO pagada)
            invoice = Invoice.objects.create(
                organization=org,
                subscription=sub,
                status=Invoice.Status.PENDING,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total=total,
                currency='COP',
                billing_period_start=now,
                billing_period_end=period_end,
                due_date=now.date(),
                billing_name=serializer.validated_data.get('billing_name', ''),
                billing_nit=serializer.validated_data.get('billing_nit', ''),
                billing_address=serializer.validated_data.get('billing_address', ''),
                billing_email=serializer.validated_data.get('billing_email', ''),
            )

            # Referencia única para Wompi
            reference = wompi.create_transaction_reference(invoice.number, str(org.id))

            # Crear payment PENDIENTE
            payment = Payment.objects.create(
                invoice=invoice,
                amount=total,
                currency='COP',
                status=Payment.Status.PENDING,
                gateway='wompi',
                gateway_payment_id=reference,  # Se actualiza con el ID real del webhook
            )

        # Monto en centavos para Wompi
        amount_in_cents = int(total * 100)

        # Firma de integridad
        integrity_signature = wompi.create_integrity_signature(
            reference=reference,
            amount_in_cents=amount_in_cents,
            currency='COP',
        )

        logger.info(
            f"Wompi checkout iniciado: org={org.codigo}, plan={plan.code}, "
            f"total=${total:,.0f} COP, ref={reference}"
        )

        return Response({
            'message': 'Checkout iniciado. Completa el pago con Wompi.',
            'requires_payment': True,
            'gateway': 'wompi',
            'wompi_config': {
                'public_key': getattr(django_settings, 'WOMPI_PUBLIC_KEY', ''),
                'currency': 'COP',
                'amount_in_cents': amount_in_cents,
                'reference': reference,
                'integrity_signature': integrity_signature,
                'redirect_url': request.build_absolute_uri('/dashboard/billing/resultado'),
                'customer_email': serializer.validated_data.get('billing_email', request.user.email),
                'is_sandbox': getattr(django_settings, 'WOMPI_SANDBOX', True),
            },
            'invoice': InvoiceSerializer(invoice).data,
            'payment_id': payment.id,
            'plan_code': plan.code,
            'plan_name': plan.name,
        }, status=status.HTTP_200_OK)

    def _stripe_checkout(self, request, org, plan, billing_cycle, serializer, payment_method_token):
        """Flujo real Stripe."""
        try:
            from .services import get_billing_service
            service = get_billing_service()
            result = service.process_checkout(
                organization=org,
                plan=plan,
                billing_cycle=billing_cycle,
                payment_method_token=payment_method_token,
                billing_data={
                    'billing_name': serializer.validated_data.get('billing_name', ''),
                    'billing_nit': serializer.validated_data.get('billing_nit', ''),
                    'billing_address': serializer.validated_data.get('billing_address', ''),
                    'billing_email': serializer.validated_data.get('billing_email', ''),
                },
                user=request.user,
            )
            return Response({
                'message': 'Pago iniciado. Confirma en el frontend con el client_secret.',
                'requires_payment': True,
                'gateway': 'stripe',
                **result,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Stripe checkout error: {e}")
            return Response(
                {'error': 'Error procesando el pago. Intente nuevamente o contacte soporte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _manual_checkout(self, request, org, plan, billing_cycle, serializer):
        """
        Checkout manual para desarrollo sin pasarela de pago.
        ⚠️ NO USAR EN PRODUCCIÓN — activa el plan sin cobrar.
        """
        from decimal import Decimal
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction

        logger.warning(
            f"⚠️ CHECKOUT MANUAL: No se está cobrando al usuario. "
            f"Configure WOMPI_PUBLIC_KEY/WOMPI_PRIVATE_KEY para pagos reales. "
            f"org={org.codigo}, plan={plan.code}"
        )

        # Capturar plan anterior ANTES de modificar
        old_plan_code = org.plan.code if org.plan else 'FREE'

        if billing_cycle == 'yearly':
            price = plan.price_yearly_cop
        else:
            price = plan.price_monthly_cop

        if price is None:
            return Response(
                {'error': 'Este plan requiere cotización personalizada. Contáctanos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subtotal = Decimal(str(price))
        tax_rate = Decimal('19.00')
        tax_amount = (subtotal * tax_rate / Decimal('100')).quantize(Decimal('0.01'))
        total = subtotal + tax_amount

        with transaction.atomic():
            sub, _ = Subscription.objects.get_or_create(
                organization=org,
                defaults={'plan': plan, 'status': Subscription.Status.TRIALING}
            )

            now = timezone.now()
            period_end = now + timedelta(days=365 if billing_cycle == 'yearly' else 30)

            invoice = Invoice.objects.create(
                organization=org,
                subscription=sub,
                status=Invoice.Status.PENDING,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total=total,
                currency='COP',
                billing_period_start=now,
                billing_period_end=period_end,
                due_date=now.date(),
                billing_name=serializer.validated_data.get('billing_name', ''),
                billing_nit=serializer.validated_data.get('billing_nit', ''),
                billing_address=serializer.validated_data.get('billing_address', ''),
                billing_email=serializer.validated_data.get('billing_email', ''),
            )

            payment = Payment.objects.create(
                invoice=invoice,
                amount=total,
                currency='COP',
                status=Payment.Status.PENDING,
                gateway='manual',
            )

            payment.mark_succeeded(gateway_payment_id=f'manual_{payment.idempotency_key}')
            invoice.mark_paid(gateway_payment_id=f'manual_{payment.idempotency_key}')

            sub.plan = plan
            sub.billing_cycle = billing_cycle
            sub.activate(gateway='manual')

            org.plan = plan
            org.max_users = plan.max_users
            org.max_storage_mb = plan.max_storage_mb
            org.is_trial = False
            org.save(update_fields=['plan', 'max_users', 'max_storage_mb', 'is_trial'])

            from core.models import PlanChangeLog
            PlanChangeLog.objects.create(
                organization=org,
                changed_by=request.user,
                previous_plan=old_plan_code,
                new_plan=plan.code,
                new_limits={
                    'max_users': plan.max_users,
                    'max_storage_mb': plan.max_storage_mb,
                },
                note=f'Checkout manual {billing_cycle} — ${total:,.0f} COP',
            )

        logger.info(
            f"Manual checkout: org={org.codigo}, plan={plan.code}, "
            f"total=${total:,.0f} COP, invoice={invoice.number}"
        )

        return Response({
            'message': 'Pago procesado exitosamente (modo manual).',
            'requires_confirmation': False,
            'requires_payment': False,
            'gateway': 'manual',
            'subscription': SubscriptionSerializer(sub).data,
            'invoice': InvoiceSerializer(invoice).data,
        }, status=status.HTTP_200_OK)


class CheckoutStatusView(APIView):
    """
    GET /api/billing/checkout/status/?reference=CORTESEC-INV-xxx

    Frontend hace polling aquí después de que Wompi procese el pago.
    Retorna el estado actual del pago asociado a la referencia.
    """
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def get(self, request):
        reference = request.query_params.get('reference', '')
        if not reference:
            return Response(
                {'error': 'Se requiere parámetro reference.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = request.user.organization
        try:
            payment = Payment.objects.select_related(
                'invoice__subscription', 'invoice__organization'
            ).get(
                gateway_payment_id=reference,
                invoice__organization=org,
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Pago no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        sub = payment.invoice.subscription

        return Response({
            'status': payment.status,
            'is_paid': payment.status == Payment.Status.SUCCEEDED,
            'invoice_status': payment.invoice.status,
            'subscription': SubscriptionSerializer(sub).data if sub else None,
        })


class WompiWebhookView(APIView):
    """
    POST /api/billing/webhooks/wompi/

    Recibe eventos de Wompi cuando una transacción cambia de estado.
    Sin autenticación de usuario — verifica firma HMAC del evento.

    Eventos manejados:
    - transaction.updated (status=APPROVED) → Activar suscripción
    - transaction.updated (status=DECLINED/VOIDED/ERROR) → Marcar como fallido
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import hashlib
        import json as json_module

        payload = request.body
        events_secret = getattr(django_settings, 'WOMPI_EVENTS_SECRET', '')

        try:
            event = json_module.loads(payload)
        except json_module.JSONDecodeError:
            logger.error("Wompi webhook: payload no es JSON válido")
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # ── Verificar firma ──
        signature_data = event.get('signature', {})
        properties = signature_data.get('properties', [])
        checksum = signature_data.get('checksum', '')
        timestamp = event.get('timestamp', 0)

        if checksum and events_secret:
            values = []
            for prop in properties:
                value = event.get('data', {})
                for part in prop.split('.'):
                    if isinstance(value, dict):
                        value = value.get(part, '')
                    else:
                        value = ''
                values.append(str(value))

            concat_string = ''.join(values) + str(timestamp) + events_secret
            computed = hashlib.sha256(concat_string.encode('utf-8')).hexdigest()

            if not hmac_module.compare_digest(computed, checksum):
                logger.warning("Wompi webhook: firma inválida")
                return Response(
                    {'error': 'Firma inválida'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        elif not events_secret:
            logger.error("Wompi webhook: WOMPI_EVENTS_SECRET no configurado - rechazando evento")
            return Response(
                {'error': 'Webhook no configurado'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # ── Procesar evento ──
        event_type = event.get('event', '')
        logger.info(f"Wompi webhook recibido: {event_type}")

        if event_type == 'transaction.updated':
            return self._handle_transaction_updated(event)

        # Evento no manejado, aceptar silenciosamente
        return Response({'message': 'OK'}, status=status.HTTP_200_OK)

    def _handle_transaction_updated(self, event):
        """Procesa cambio de estado de transacción."""
        from django.db import transaction as db_transaction
        from django.utils import timezone
        from datetime import timedelta

        tx_data = event.get('data', {}).get('transaction', {})
        tx_status = tx_data.get('status', '')
        tx_reference = tx_data.get('reference', '')
        tx_id = tx_data.get('id', '')
        tx_amount = tx_data.get('amount_in_cents', 0)
        tx_payment_method = tx_data.get('payment_method_type', 'UNKNOWN')

        logger.info(
            f"Wompi transaction.updated: ref={tx_reference}, "
            f"status={tx_status}, id={tx_id}, method={tx_payment_method}"
        )

        # Buscar payment por referencia
        try:
            payment = Payment.objects.select_related(
                'invoice__subscription__plan',
                'invoice__organization',
            ).get(
                gateway_payment_id=tx_reference,
                gateway='wompi',
            )
        except Payment.DoesNotExist:
            logger.warning(f"Wompi webhook: payment con referencia {tx_reference} no encontrado")
            return Response({'message': 'Payment not found'}, status=status.HTTP_200_OK)

        invoice = payment.invoice
        org = invoice.organization
        sub = invoice.subscription

        if tx_status == 'APPROVED':
            # ── Pago exitoso ──
            with db_transaction.atomic():
                # Actualizar payment con el ID real de Wompi
                payment.mark_succeeded(gateway_payment_id=tx_reference)
                payment.gateway_payment_id = tx_reference
                payment.save(update_fields=['gateway_payment_id'])

                invoice.mark_paid(gateway_payment_id=tx_id)

                if sub:
                    # Obtener el plan de la factura
                    plan = sub.plan

                    # Capturar plan anterior ANTES de modificar
                    old_plan_code = org.plan.code if org.plan else 'FREE'

                    sub.activate(gateway='wompi')

                    # Actualizar organización
                    org.plan = plan
                    org.max_users = plan.max_users
                    org.max_storage_mb = plan.max_storage_mb
                    org.is_trial = False
                    org.save(update_fields=['plan', 'max_users', 'max_storage_mb', 'is_trial'])

                    # Log del cambio
                    from core.models import PlanChangeLog
                    PlanChangeLog.objects.create(
                        organization=org,
                        changed_by=None,  # Webhook, no hay user
                        previous_plan=old_plan_code,
                        new_plan=plan.code,
                        new_limits={
                            'max_users': plan.max_users,
                            'max_storage_mb': plan.max_storage_mb,
                        },
                        note=f'Pago Wompi confirmado — {tx_payment_method} — TX:{tx_id}',
                    )

                logger.info(
                    f"Wompi pago APROBADO: org={org.codigo}, plan={sub.plan.code if sub else 'N/A'}, "
                    f"tx={tx_id}, método={tx_payment_method}"
                )

        elif tx_status in ('DECLINED', 'VOIDED', 'ERROR'):
            # ── Pago fallido ──
            payment.mark_failed(reason=f"Wompi: {tx_status}")
            invoice.status = Invoice.Status.FAILED
            invoice.save(update_fields=['status', 'updated_at'])

            logger.warning(
                f"Wompi pago FALLIDO: ref={tx_reference}, status={tx_status}, "
                f"org={org.codigo}"
            )

        return Response({'message': 'Procesado'}, status=status.HTTP_200_OK)


# ==================== MÉTODOS DE PAGO ====================

class PaymentMethodViewSet(viewsets.ModelViewSet):
    """CRUD de métodos de pago tokenizados."""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def get_queryset(self):
        return PaymentMethod.objects.filter(
            organization=self.request.user.organization,
            is_active=True,
        )

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    def create(self, request, *args, **kwargs):
        """Crear PaymentMethod — recibir token de Stripe y guardar referencia."""
        token = request.data.get('payment_method_token', '')
        if not token:
            return Response(
                {'error': 'Se requiere payment_method_token de Stripe.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        use_stripe = bool(getattr(django_settings, 'STRIPE_SECRET_KEY', ''))
        if not use_stripe:
            return Response(
                {'error': 'Stripe no configurado. Usa checkout manual.'},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        try:
            from .services import get_billing_service
            service = get_billing_service()
            org = request.user.organization

            # Obtener o crear customer
            customer = service.gateway.get_or_create_customer(
                organization_id=org.id,
                email=request.user.email,
                name=org.nombre,
            )

            # Adjuntar método de pago
            pm_result = service.gateway.attach_payment_method(
                customer_id=customer.customer_id,
                payment_method_token=token,
            )

            pm = PaymentMethod.objects.create(
                organization=org,
                gateway='stripe',
                gateway_payment_method_id=pm_result.payment_method_id,
                card_brand=pm_result.card_brand,
                card_last4=pm_result.card_last4,
                card_exp_month=pm_result.card_exp_month,
                card_exp_year=pm_result.card_exp_year,
                is_default=True,
                is_active=True,
            )
            pm.set_as_default()

            return Response(
                PaymentMethodSerializer(pm).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.exception(f"Error creating payment method: {e}")
            return Response(
                {'error': 'Error al guardar método de pago. Intente nuevamente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ==================== FACTURAS ====================

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Solo lectura de facturas."""
    permission_classes = [IsOrganizationAdmin, BillingAccessPolicy]

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.filter(
            organization=self.request.user.organization,
        )


# ==================== FEATURES ====================

class PlanFeatureViewSet(viewsets.ReadOnlyModelViewSet):
    """Features del plan actual de la organización."""
    serializer_class = PlanFeatureSerializer
    permission_classes = [IsAuthenticated, BillingAccessPolicy]

    def get_queryset(self):
        org = self.request.user.organization
        return PlanFeature.objects.filter(plan=org.plan)


# ==================== USO ====================

class UsageView(APIView):
    """GET /api/billing/usage/ — Uso actual vs límites."""
    permission_classes = [IsAuthenticated, BillingAccessPolicy]

    def get(self, request):
        org = request.user.organization
        records = UsageRecord.objects.filter(organization=org)
        serializer = UsageRecordSerializer(records, many=True)

        # Info del plan
        plan = org.plan
        return Response({
            'plan': {
                'code': plan.code,
                'name': plan.name,
                'max_users': plan.max_users,
                'max_storage_mb': plan.max_storage_mb,
            },
            'current_users': org.usuarios_count,
            'max_users': org.max_users,
            'usage': serializer.data,
        })


# ==================== CHECKOUT CONFIRMAR ====================

class CheckoutConfirmView(APIView):
    """
    POST /api/billing/checkout/confirm/

    Confirma un PaymentIntent después de que el frontend haya
    autenticado con 3D Secure. Verifica el estado del pago.
    """
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id', '')
        if not payment_intent_id:
            return Response(
                {'error': 'Se requiere payment_intent_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment = Payment.objects.select_related(
                'invoice__subscription'
            ).get(
                gateway_payment_id=payment_intent_id,
                invoice__organization=request.user.organization,
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Pago no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.status == Payment.Status.SUCCEEDED:
            sub = payment.invoice.subscription
            return Response({
                'message': 'Pago ya confirmado.',
                'status': 'succeeded',
                'subscription': SubscriptionSerializer(sub).data if sub else None,
                'invoice': InvoiceSerializer(payment.invoice).data,
            })

        # Verificar estado en Stripe
        use_stripe = bool(getattr(django_settings, 'STRIPE_SECRET_KEY', ''))
        if use_stripe:
            try:
                from .services import get_billing_service
                service = get_billing_service()
                pi_result = service.gateway.confirm_payment_intent(payment_intent_id)

                if pi_result.status == 'succeeded':
                    service.handle_payment_succeeded(
                        payment_intent_id=payment_intent_id,
                    )
                    payment.refresh_from_db()
                    return Response({
                        'message': 'Pago confirmado exitosamente.',
                        'status': 'succeeded',
                        'subscription': SubscriptionSerializer(
                            payment.invoice.subscription
                        ).data,
                        'invoice': InvoiceSerializer(payment.invoice).data,
                    })
                else:
                    return Response({
                        'message': f'Estado del pago: {pi_result.status}',
                        'status': pi_result.status,
                    })
            except Exception as e:
                logger.exception(f"Error confirming payment: {e}")
                return Response(
                    {'error': 'Error confirmando el pago. Intente nuevamente o contacte soporte.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {'error': 'Stripe no configurado.'},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


# ==================== SET DEFAULT PAYMENT METHOD ====================

class PaymentMethodSetDefaultView(APIView):
    """POST /api/billing/payment-methods/{id}/set-default/"""
    permission_classes = [IsOrganizationOwner, BillingAccessPolicy]

    def post(self, request, pk):
        try:
            pm = PaymentMethod.objects.get(
                pk=pk,
                organization=request.user.organization,
                is_active=True,
            )
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Método de pago no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        pm.set_as_default()
        return Response({
            'message': f'Tarjeta {pm} establecida como predeterminada.',
            'payment_method': PaymentMethodSerializer(pm).data,
        })


# ==================== PDF FACTURA ====================

class InvoicePDFView(APIView):
    """GET /api/billing/invoices/{id}/pdf/ — Descargar PDF de factura."""
    permission_classes = [IsOrganizationAdmin, BillingAccessPolicy]

    def get(self, request, pk):
        try:
            invoice = Invoice.objects.get(
                pk=pk,
                organization=request.user.organization,
            )
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Factura no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Generar PDF con reportlab
        try:
            from io import BytesIO
            from django.http import HttpResponse
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.units import inch, cm
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib import colors

            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            elements = []

            # Encabezado
            elements.append(Paragraph(f'<b>FACTURA {invoice.number}</b>', styles['Title']))
            elements.append(Spacer(1, 0.3 * inch))

            # Datos empresa
            elements.append(Paragraph('<b>CorteSec - Gestión Empresarial</b>', styles['Normal']))
            elements.append(Spacer(1, 0.2 * inch))

            # Datos cliente
            billing_info = [
                ['Cliente:', invoice.billing_name or '-'],
                ['NIT:', invoice.billing_nit or '-'],
                ['Email:', invoice.billing_email or '-'],
                ['Dirección:', invoice.billing_address or '-'],
            ]
            t = Table(billing_info, colWidths=[2 * inch, 4 * inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 0.3 * inch))

            # Detalle
            detail_data = [
                ['Concepto', 'Periodo', 'Subtotal', 'IVA', 'Total'],
                [
                    f'Suscripción {invoice.subscription.plan.name if invoice.subscription else "N/A"}',
                    f'{invoice.billing_period_start.strftime("%Y-%m-%d") if invoice.billing_period_start else "-"} - '
                    f'{invoice.billing_period_end.strftime("%Y-%m-%d") if invoice.billing_period_end else "-"}',
                    f'${invoice.subtotal:,.0f}',
                    f'${invoice.tax_amount:,.0f} ({invoice.tax_rate}%)',
                    f'${invoice.total:,.0f} {invoice.currency}',
                ],
            ]
            detail_table = Table(detail_data, colWidths=[2 * inch, 2 * inch, 1.2 * inch, 1.3 * inch, 1.2 * inch])
            detail_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(detail_table)
            elements.append(Spacer(1, 0.3 * inch))

            # Estado
            estado = 'PAGADA' if invoice.status == 'paid' else invoice.get_status_display()
            elements.append(Paragraph(
                f'<b>Estado:</b> {estado}', styles['Normal']
            ))
            if invoice.paid_at:
                elements.append(Paragraph(
                    f'<b>Fecha de pago:</b> {invoice.paid_at.strftime("%Y-%m-%d %H:%M")}',
                    styles['Normal'],
                ))

            doc.build(elements)
            buffer.seek(0)

            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="factura_{invoice.number}.pdf"'
            return response

        except ImportError:
            return Response(
                {'error': 'reportlab no disponible para generar PDF.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ==================== PLANES PÚBLICOS ====================

class PlansListView(APIView):
    """GET /api/billing/plans/ — Listar planes disponibles (público)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from core.models import Plan
        plans = Plan.objects.filter(is_active=True).order_by('max_users')

        plans_data = []
        for plan in plans:
            features = PlanFeature.objects.filter(plan=plan, enabled=True)
            plans_data.append({
                'code': plan.code,
                'name': plan.name,
                'description': getattr(plan, 'description', ''),
                'price_monthly_cop': plan.price_monthly_cop,
                'price_yearly_cop': plan.price_yearly_cop,
                'max_users': plan.max_users,
                'max_storage_mb': plan.max_storage_mb,
                'features': [
                    {
                        'code': f.feature_code,
                        'name': f.feature_name,
                        'limit_value': f.limit_value,
                    }
                    for f in features
                ],
            })

        return Response({
            'plans': plans_data,
            'currency': 'COP',
            'tax_rate': 19,
            'stripe_publishable_key': getattr(
                django_settings, 'STRIPE_PUBLISHABLE_KEY', ''
            ),
        })


# ==================== WEBHOOKS ====================

class StripeWebhookView(APIView):
    """
    POST /api/billing/webhooks/stripe/

    Recibe eventos de Stripe. Sin autenticación de usuario.
    Verifica firma HMAC del header Stripe-Signature.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    # Eventos que procesamos
    HANDLED_EVENTS = {
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'invoice.paid',
        'invoice.payment_failed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
    }

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = getattr(django_settings, 'STRIPE_WEBHOOK_SECRET', '')

        if not webhook_secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            return Response(
                {'error': 'Webhook no configurado'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Verificar firma
        try:
            from .services import get_billing_service
            service = get_billing_service()
            event = service.gateway.verify_webhook_signature(
                payload=payload,
                signature=sig_header,
                secret=webhook_secret,
            )
        except ValueError as e:
            logger.warning(f"Stripe webhook signature invalid: {e}")
            return Response(
                {'error': 'Firma inválida'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return Response(
                {'error': 'Error verificando firma'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = event.get('type', '')
        event_id = event.get('id', '')

        # Idempotencia — no procesar dos veces
        if WebhookEvent.objects.filter(event_id=event_id, processed=True).exists():
            logger.info(f"Webhook event {event_id} already processed (idempotent)")
            return Response({'status': 'already_processed'})

        # Registrar evento
        wh_event = WebhookEvent.objects.create(
            gateway='stripe',
            event_id=event_id,
            event_type=event_type,
            payload=event,
            processed=False,
        )

        # Procesar
        try:
            if event_type not in self.HANDLED_EVENTS:
                wh_event.processed = True
                wh_event.save(update_fields=['processed'])
                return Response({'status': 'ignored', 'event_type': event_type})

            data_object = event.get('data', {}).get('object', {})

            if event_type == 'payment_intent.succeeded':
                service.handle_payment_succeeded(
                    payment_intent_id=data_object.get('id', ''),
                    metadata=data_object.get('metadata', {}),
                )

            elif event_type == 'payment_intent.payment_failed':
                failure_msg = ''
                last_error = data_object.get('last_payment_error', {})
                if last_error:
                    failure_msg = last_error.get('message', 'Pago rechazado')
                service.handle_payment_failed(
                    payment_intent_id=data_object.get('id', ''),
                    failure_reason=failure_msg,
                )

            elif event_type in ('invoice.paid', 'invoice.payment_failed'):
                # Stripe invoices (para suscripciones recurrentes)
                pi_id = data_object.get('payment_intent', '')
                if pi_id:
                    if event_type == 'invoice.paid':
                        service.handle_payment_succeeded(
                            payment_intent_id=pi_id,
                            metadata=data_object.get('metadata', {}),
                        )
                    else:
                        service.handle_payment_failed(
                            payment_intent_id=pi_id,
                            failure_reason='Invoice payment failed',
                        )

            elif event_type == 'customer.subscription.deleted':
                # Suscripción cancelada desde Stripe
                stripe_sub_id = data_object.get('id', '')
                try:
                    sub = Subscription.objects.get(
                        gateway_subscription_id=stripe_sub_id,
                    )
                    if sub.status != Subscription.Status.CANCELED:
                        sub.cancel(reason='Cancelado desde dashboard de Stripe')
                except Subscription.DoesNotExist:
                    pass

            # Marcar como procesado
            wh_event.processed = True
            wh_event.save(update_fields=['processed'])

            logger.info(f"Webhook processed: {event_type} ({event_id})")
            return Response({'status': 'processed', 'event_type': event_type})

        except Exception as e:
            logger.error(f"Error processing webhook {event_type}: {e}")
            wh_event.error = str(e)[:500]
            wh_event.save(update_fields=['error'])
            return Response(
                {'error': 'Error interno procesando evento'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
