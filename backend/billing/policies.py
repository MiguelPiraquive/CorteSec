"""
BillingAccessPolicy - Permisos granulares del módulo Billing
=============================================================

Combina el sistema RBAC con la lógica de roles de organización (OWNER/ADMIN).
Billing requiere AMBOS: tener el permiso RBAC Y tener el rol org adecuado.

Mapeo de acciones → permisos:
  - view                     → billing.view
  - view_invoices / pdf      → billing.view_invoices
  - manage_subscription      → billing.manage_subscription (cancel, reactivate)
  - manage_payment_methods   → billing.manage_payment_methods
  - checkout                 → billing.checkout
"""

from core.policies import BaseAccessPolicy


class BillingAccessPolicy(BaseAccessPolicy):
    id = 'billing-policy'
    resource_name = 'billing'

    # Mapa de acciones personalizadas → verbo de permiso
    CUSTOM_ACTION_MAP = {
        # ─── Lectura general ───
        'list': 'view',
        'retrieve': 'view',
        'get': 'view',             # APIView GET genérico

        # ─── Facturas ───
        'invoices_list': 'view_invoices',
        'invoices_retrieve': 'view_invoices',
        'invoice_pdf': 'view_invoices',

        # ─── Suscripción ───
        'subscription_detail': 'view',
        'subscription_cancel': 'manage_subscription',
        'subscription_reactivate': 'manage_subscription',

        # ─── Métodos de pago ───
        'payment_methods_list': 'view',
        'payment_methods_create': 'manage_payment_methods',
        'payment_methods_destroy': 'manage_payment_methods',
        'set_default': 'manage_payment_methods',

        # ─── Checkout ───
        'checkout': 'checkout',
        'checkout_confirm': 'checkout',
        'checkout_status': 'checkout',

        # ─── Features y uso ───
        'plan_features': 'view',
        'usage': 'view',
    }

    def _get_action(self, request, view):
        """Resolver acción usando CUSTOM_ACTION_MAP antes del fallback."""
        action = getattr(view, 'action', None)
        if action and action in self.CUSTOM_ACTION_MAP:
            return self.CUSTOM_ACTION_MAP[action]
        return super()._get_action(request, view)
