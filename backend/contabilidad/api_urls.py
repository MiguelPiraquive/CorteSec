from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import api_views

# Router para ViewSets de DRF
router = DefaultRouter()
router.register(r'cuentas', api_views.PlanCuentasViewSet, basename='plancuentas')
router.register(r'comprobantes', api_views.ComprobanteContableViewSet, basename='comprobante')
router.register(r'movimientos', api_views.MovimientoContableViewSet, basename='movimiento')
router.register(r'flujo-caja', api_views.FlujoCajaViewSet, basename='flujocaja')

# URLs de la API
urlpatterns = [
    # Include router URLs - esto incluye automáticamente las @action definidas
    path('', include(router.urls)),
]
