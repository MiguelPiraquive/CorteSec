"""
URLs de la API de Empleados y Nómina (Payroll)
===============================================

URLs para las APIs REST de gestión de:
- Catálogos (Tipos de Documento, Trabajador, Contrato)
- Empleados
- Contratos
- Periodos de Nómina
- Nóminas (simple y electrónica)
- Detalles de Nómina

Autor: Sistema CorteSec
Versión: 3.0.0 - Sistema Dual de Nómina
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Configurar el router de DRF
router = DefaultRouter()

# Catálogos
router.register(r'tipos-documento', api_views.TipoDocumentoViewSet, basename='tipo-documento')
router.register(r'tipos-trabajador', api_views.TipoTrabajadorViewSet, basename='tipo-trabajador')
router.register(r'tipos-contrato', api_views.TipoContratoViewSet, basename='tipo-contrato')
router.register(r'conceptos-laborales', api_views.ConceptoLaboralViewSet, basename='concepto-laboral')

# Gestión principal
router.register(r'empleados', api_views.EmpleadoViewSet, basename='empleado')
router.register(r'contratos', api_views.ContratoViewSet, basename='contrato')
router.register(r'periodos-nomina', api_views.PeriodoNominaViewSet, basename='periodo-nomina')
router.register(r'nominas', api_views.NominaViewSet, basename='nomina')
router.register(r'detalle-nominas', api_views.DetalleNominaViewSet, basename='detalle-nomina')

# Fase 2A - Integraciones (COMENTADO - modelos eliminados en refactorización)
# router.register(r'tipos-deduccion', api_views.TipoDeduccionViewSet, basename='tipo-deduccion')
# router.register(r'deducciones', api_views.DetalleDeduccionViewSet, basename='deduccion')
# router.register(r'comprobantes-nomina', api_views.ComprobanteContableNominaViewSet, basename='comprobante-nomina')
# router.register(r'historial-nomina', api_views.HistorialNominaViewSet, basename='historial-nomina')

# Fase 2B - Nómina Electrónica
router.register(r'nominas-electronicas', api_views.NominaElectronicaViewSet, basename='nomina-electronica')
router.register(r'configuracion-electronica', api_views.ConfiguracionNominaElectronicaViewSet, basename='config-electronica')

# Fase 3 - Portal Empleado
router.register(r'portal-empleado', api_views.PortalEmpleadoViewSet, basename='portal-empleado')

# Analytics
router.register(r'analytics', api_views.AnalyticsViewSet, basename='analytics')

# Reportes
router.register(r'reportes', api_views.ReportesViewSet, basename='reportes')

# Webhooks
router.register(r'webhooks', api_views.WebhookConfigViewSet, basename='webhook')

app_name = "payroll_api"

urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
]
