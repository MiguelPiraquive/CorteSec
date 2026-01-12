"""
URLs de la API de Empleados y Nómina (Payroll) - FASE 7
========================================================

URLs para las APIs REST de gestión de:
- Catálogos (Conceptos Laborales)
- Empleados y Contratos
- Periodos de Nómina
- Nóminas (base y electrónica)
- FASE 1: Centros de Costo, Novedades, Asientos
- FASE 3: Embargos, Retención Fuente
- FASE 4: Certificados HSE, Dotaciones
- FASE 5: Ajustes DIAN
- FASE 6: Notificaciones (integradas en ViewSets)

Autor: Sistema CorteSec
Versión: 7.0.0 - Sistema Completo
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payroll.api import views

# Configurar el router de DRF
router = DefaultRouter()

# ============================================================================
# CATÁLOGOS
# ============================================================================
router.register(r'conceptos-laborales', views.ConceptoLaboralViewSet, basename='concepto-laboral')

# ============================================================================
# EMPLEADOS Y CONTRATOS
# ============================================================================
router.register(r'empleados', views.EmpleadoViewSet, basename='empleado')
router.register(r'contratos', views.ContratoViewSet, basename='contrato')

# ============================================================================
# NÓMINAS
# ============================================================================
router.register(r'periodos-nomina', views.PeriodoNominaViewSet, basename='periodo-nomina')
router.register(r'nominas', views.NominaBaseViewSet, basename='nomina')
router.register(r'nominas-electronicas', views.NominaElectronicaViewSet, basename='nomina-electronica')

# ============================================================================
# FASE 1: ESTRUCTURALES
# ============================================================================
router.register(r'centros-costo', views.CentroCostoViewSet, basename='centro-costo')
router.register(r'novedades-calendario', views.NovedadCalendarioViewSet, basename='novedad-calendario')
router.register(r'asientos-nomina', views.AsientoNominaViewSet, basename='asiento-nomina')

# ============================================================================
# FASE 3: LEGAL/FISCAL
# ============================================================================
router.register(r'embargos-judiciales', views.EmbargoJudicialViewSet, basename='embargo-judicial')

# ============================================================================
# FASE 4: HSE
# ============================================================================
router.register(r'certificados-empleado', views.CertificadoEmpleadoViewSet, basename='certificado-empleado')
router.register(r'entregas-dotacion', views.EntregaDotacionViewSet, basename='entrega-dotacion')

# ============================================================================
# FASE 5: INTEGRACIONES
# ============================================================================
router.register(r'nomina-ajustes', views.NominaAjusteViewSet, basename='nomina-ajuste')

# ============================================================================
# URLS PRINCIPALES
# ============================================================================
urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
]

# ============================================================================
# DOCUMENTACIÓN DE ENDPOINTS
# ============================================================================
"""
ENDPOINTS DISPONIBLES:

CATÁLOGOS:
- GET    /api/payroll/conceptos-laborales/          - Listar conceptos
- POST   /api/payroll/conceptos-laborales/          - Crear concepto
- GET    /api/payroll/conceptos-laborales/{id}/     - Detalle concepto
- PUT    /api/payroll/conceptos-laborales/{id}/     - Actualizar concepto
- DELETE /api/payroll/conceptos-laborales/{id}/     - Eliminar concepto

EMPLEADOS:
- GET    /api/payroll/empleados/                    - Listar empleados
- POST   /api/payroll/empleados/                    - Crear empleado
- GET    /api/payroll/empleados/{id}/               - Detalle empleado
- PUT    /api/payroll/empleados/{id}/               - Actualizar empleado
- DELETE /api/payroll/empleados/{id}/               - Eliminar empleado
- GET    /api/payroll/empleados/{id}/certificados_hse/  - Certificados HSE
- GET    /api/payroll/empleados/{id}/dotaciones/    - Dotaciones entregadas
- GET    /api/payroll/empleados/{id}/nominas/       - Nóminas del empleado
- POST   /api/payroll/empleados/{id}/bloquear_por_hse/ - Bloquear por HSE

CONTRATOS:
- GET    /api/payroll/contratos/                    - Listar contratos
- POST   /api/payroll/contratos/                    - Crear contrato
- GET    /api/payroll/contratos/{id}/               - Detalle contrato
- PUT    /api/payroll/contratos/{id}/               - Actualizar contrato
- DELETE /api/payroll/contratos/{id}/               - Eliminar contrato
- GET    /api/payroll/contratos/proximos_vencer/    - Contratos próximos a vencer

PERÍODOS NÓMINA:
- GET    /api/payroll/periodos-nomina/              - Listar períodos
- POST   /api/payroll/periodos-nomina/              - Crear período
- GET    /api/payroll/periodos-nomina/{id}/         - Detalle período
- PUT    /api/payroll/periodos-nomina/{id}/         - Actualizar período
- POST   /api/payroll/periodos-nomina/{id}/cerrar/  - Cerrar período

NÓMINAS:
- GET    /api/payroll/nominas/                      - Listar nóminas
- POST   /api/payroll/nominas/                      - Crear nómina
- GET    /api/payroll/nominas/{id}/                 - Detalle nómina
- PUT    /api/payroll/nominas/{id}/                 - Actualizar nómina
- DELETE /api/payroll/nominas/{id}/                 - Eliminar nómina
- POST   /api/payroll/nominas/{id}/aprobar/         - Aprobar nómina
- POST   /api/payroll/nominas/{id}/rechazar/        - Rechazar nómina (body: motivo)
- POST   /api/payroll/nominas/{id}/contabilizar/    - Generar asiento (body: centro_costo_id)
- POST   /api/payroll/nominas/contabilizar_lote/    - Contabilizar lote (body: nominas_ids, centro_costo_id)
- POST   /api/payroll/nominas/generar_archivo_banco/ - Archivo ACH (body: nominas_ids, banco, numero_cuenta_empresa, nit_empresa)
- POST   /api/payroll/nominas/{id}/enviar_notificacion/ - Enviar notificación (body: canal, mensaje_personalizado)

NÓMINAS ELECTRÓNICAS:
- GET    /api/payroll/nominas-electronicas/         - Listar nóminas electrónicas
- POST   /api/payroll/nominas-electronicas/         - Crear nómina electrónica
- GET    /api/payroll/nominas-electronicas/{id}/    - Detalle nómina electrónica
- POST   /api/payroll/nominas-electronicas/{id}/generar_xml/ - Generar XML UBL 2.1
- POST   /api/payroll/nominas-electronicas/{id}/enviar_dian/ - Enviar a DIAN

CENTROS DE COSTO:
- GET    /api/payroll/centros-costo/                - Listar centros de costo
- POST   /api/payroll/centros-costo/                - Crear centro de costo
- GET    /api/payroll/centros-costo/{id}/           - Detalle centro de costo
- PUT    /api/payroll/centros-costo/{id}/           - Actualizar centro de costo
- DELETE /api/payroll/centros-costo/{id}/           - Eliminar centro de costo

NOVEDADES CALENDARIO:
- GET    /api/payroll/novedades-calendario/         - Listar novedades
- POST   /api/payroll/novedades-calendario/         - Crear novedad
- GET    /api/payroll/novedades-calendario/{id}/    - Detalle novedad
- PUT    /api/payroll/novedades-calendario/{id}/    - Actualizar novedad
- DELETE /api/payroll/novedades-calendario/{id}/    - Eliminar novedad

ASIENTOS CONTABLES:
- GET    /api/payroll/asientos-nomina/              - Listar asientos (solo lectura)
- GET    /api/payroll/asientos-nomina/{id}/         - Detalle asiento

EMBARGOS JUDICIALES:
- GET    /api/payroll/embargos-judiciales/          - Listar embargos
- POST   /api/payroll/embargos-judiciales/          - Crear embargo
- GET    /api/payroll/embargos-judiciales/{id}/     - Detalle embargo
- PUT    /api/payroll/embargos-judiciales/{id}/     - Actualizar embargo
- DELETE /api/payroll/embargos-judiciales/{id}/     - Eliminar embargo

CERTIFICADOS HSE:
- GET    /api/payroll/certificados-empleado/        - Listar certificados
- POST   /api/payroll/certificados-empleado/        - Crear certificado
- GET    /api/payroll/certificados-empleado/{id}/   - Detalle certificado
- PUT    /api/payroll/certificados-empleado/{id}/   - Actualizar certificado
- DELETE /api/payroll/certificados-empleado/{id}/   - Eliminar certificado
- GET    /api/payroll/certificados-empleado/vencidos/ - Certificados vencidos bloqueantes
- GET    /api/payroll/certificados-empleado/proximos_vencer/ - Certificados próximos a vencer (30 días)

ENTREGAS DOTACIÓN:
- GET    /api/payroll/entregas-dotacion/            - Listar entregas
- POST   /api/payroll/entregas-dotacion/            - Crear entrega
- GET    /api/payroll/entregas-dotacion/{id}/       - Detalle entrega
- PUT    /api/payroll/entregas-dotacion/{id}/       - Actualizar entrega
- DELETE /api/payroll/entregas-dotacion/{id}/       - Eliminar entrega

AJUSTES NÓMINA DIAN:
- GET    /api/payroll/nomina-ajustes/               - Listar ajustes
- POST   /api/payroll/nomina-ajustes/               - Crear ajuste
- GET    /api/payroll/nomina-ajustes/{id}/          - Detalle ajuste
- PUT    /api/payroll/nomina-ajustes/{id}/          - Actualizar ajuste
- POST   /api/payroll/nomina-ajustes/{id}/generar_xml/ - Generar XML ajuste
- POST   /api/payroll/nomina-ajustes/{id}/enviar_dian/ - Enviar ajuste a DIAN

FILTROS DISPONIBLES:
- ?search=texto                    - Búsqueda general
- ?ordering=campo                  - Ordenamiento
- ?campo=valor                     - Filtro por campo
- ?page=1&page_size=20            - Paginación

EJEMPLOS DE USO:
GET  /api/payroll/empleados/?estado=ACTIVO&search=juan
GET  /api/payroll/certificados-empleado/vencidos/
POST /api/payroll/nominas/123/aprobar/
POST /api/payroll/nominas/generar_archivo_banco/
     Body: {
       "nominas_ids": [1, 2, 3],
       "banco": "bancolombia",
       "numero_cuenta_empresa": "12345678901",
       "nit_empresa": "900123456"
     }
"""

# app_name = "payroll_api"  # Comentado para simplificar tests - DRF router genera nombres automáticamente

urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
]
