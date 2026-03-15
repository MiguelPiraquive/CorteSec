"""
URLs de Billing API — CorteSec
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
router.register(r'payment-methods', views.PaymentMethodViewSet, basename='paymentmethod')
router.register(r'plan-features', views.PlanFeatureViewSet, basename='planfeature')

urlpatterns = [
    # Planes (público)
    path('plans/', views.PlansListView.as_view(), name='plans-list'),

    # Suscripción
    path('subscription/', views.SubscriptionDetailView.as_view(), name='subscription-detail'),
    path('subscription/cancel/', views.SubscriptionCancelView.as_view(), name='subscription-cancel'),
    path('subscription/reactivate/', views.SubscriptionReactivateView.as_view(), name='subscription-reactivate'),

    # Checkout
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('checkout/confirm/', views.CheckoutConfirmView.as_view(), name='checkout-confirm'),
    path('checkout/status/', views.CheckoutStatusView.as_view(), name='checkout-status'),

    # Payment Methods extras
    path('payment-methods/<int:pk>/set-default/', views.PaymentMethodSetDefaultView.as_view(), name='paymentmethod-set-default'),

    # Facturas extras
    path('invoices/<int:pk>/pdf/', views.InvoicePDFView.as_view(), name='invoice-pdf'),

    # Uso
    path('usage/', views.UsageView.as_view(), name='usage'),

    # Webhooks (sin autenticación de usuario)
    path('webhooks/stripe/', views.StripeWebhookView.as_view(), name='webhook-stripe'),
    path('webhooks/wompi/', views.WompiWebhookView.as_view(), name='webhook-wompi'),

    # Router
    path('', include(router.urls)),
]
