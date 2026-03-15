"""
Middleware de Enforcement de Suscripción — CorteSec
====================================================

Bloquea operaciones de escritura (POST/PUT/PATCH/DELETE) cuando:
- El trial ha expirado
- La suscripción está suspendida, cancelada o expirada
- Solo permite lectura (GET/HEAD/OPTIONS)

Rutas exentas: auth, public, billing (para que puedan pagar).
"""

import logging

from django.http import JsonResponse
from django.utils import timezone

logger = logging.getLogger('billing')


class SubscriptionEnforcementMiddleware:
    """
    Middleware que bloquea escrituras si la suscripción no está activa.
    Devuelve 402 Payment Required con mensaje descriptivo.
    """

    # Rutas que SIEMPRE se permiten (sin importar estado de suscripción)
    EXEMPT_PREFIXES = (
        '/api/auth/',
        '/api/public/',
        '/api/billing/',
        '/admin/',
        '/api/schema/',
        '/api/docs/',
        '/api/redoc/',
    )

    # Métodos que solo leen datos (siempre permitidos)
    READ_METHODS = {'GET', 'HEAD', 'OPTIONS'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Skip si no es API
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        # 2. Skip rutas exentas
        if any(request.path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return self.get_response(request)

        # 3. Skip métodos de lectura
        if request.method in self.READ_METHODS:
            return self.get_response(request)

        # 4. Skip usuarios no autenticados (lo maneja auth middleware)
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)

        # 5. Skip superusers y staff
        if request.user.is_superuser or request.user.is_staff:
            return self.get_response(request)

        # 6. Verificar organización
        org = getattr(request.user, 'organization', None)
        if not org:
            return self.get_response(request)

        # 7. Verificar suscripción
        try:
            from billing.models import Subscription
            sub = Subscription.objects.select_related('plan').get(organization=org)
        except Exception:
            # Sin suscripción: verificar campos legacy en Organizacion
            if org.is_trial and org.trial_ends_at and timezone.now() > org.trial_ends_at:
                return self._payment_required_response(
                    'Tu periodo de prueba ha expirado. Activa tu plan para continuar.',
                    'trial_expired',
                )
            return self.get_response(request)

        # 8. Evaluar estado
        if sub.allows_writes:
            return self.get_response(request)

        # Determinar mensaje según estado
        if sub.is_trialing and sub.trial_end and timezone.now() > sub.trial_end:
            msg = 'Tu periodo de prueba ha expirado. Activa tu plan para continuar.'
            code = 'trial_expired'
        elif sub.status == Subscription.Status.SUSPENDED:
            msg = 'Tu suscripción está suspendida por falta de pago. Actualiza tu método de pago.'
            code = 'subscription_suspended'
        elif sub.status == Subscription.Status.CANCELED:
            msg = 'Tu suscripción ha sido cancelada. Reactívala para seguir usando el sistema.'
            code = 'subscription_canceled'
        elif sub.status == Subscription.Status.EXPIRED:
            msg = 'Tu suscripción ha expirado. Renueva tu plan para continuar.'
            code = 'subscription_expired'
        else:
            msg = 'Tu suscripción no está activa. Contacta soporte.'
            code = 'subscription_inactive'

        return self._payment_required_response(msg, code)

    def _payment_required_response(self, message, code):
        """Retorna 402 Payment Required."""
        return JsonResponse(
            {
                'error': message,
                'code': code,
                'action': '/billing/checkout',
                'action_label': 'Activar plan',
            },
            status=402,
        )
