"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    URLS DE NÓMINA - CORTESEC                                  ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Rutas REST organizadas para la API de nómina.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmpleadoViewSet,
    TipoContratoViewSet,
    ContratoViewSet,
    ParametroLegalViewSet,
    ConceptoLaboralViewSet,
    NominaSimpleViewSet,
    NominaItemViewSet,
    NominaConceptoViewSet,
)

# Router para ViewSets
router = DefaultRouter()

# ══════════════════════════════════════════════════════════════════════════════
# RUTAS PRINCIPALES
# ══════════════════════════════════════════════════════════════════════════════

# Empleados
router.register(r'empleados', EmpleadoViewSet, basename='empleado')

# Contratos
router.register(r'tipos-contrato', TipoContratoViewSet, basename='tipo-contrato')
router.register(r'contratos', ContratoViewSet, basename='contrato')

# Configuración
router.register(r'parametros-legales', ParametroLegalViewSet, basename='parametro-legal')
router.register(r'conceptos-laborales', ConceptoLaboralViewSet, basename='concepto-laboral')

# Nóminas
router.register(r'nominas', NominaSimpleViewSet, basename='nomina')
router.register(r'nomina-items', NominaItemViewSet, basename='nomina-item')
router.register(r'nomina-conceptos', NominaConceptoViewSet, basename='nomina-concepto')


app_name = 'nomina'

urlpatterns = [
    path('', include(router.urls)),
]


"""
═══════════════════════════════════════════════════════════════════════════════
                        ENDPOINTS DISPONIBLES
═══════════════════════════════════════════════════════════════════════════════

EMPLEADOS:
-----------
GET    /api/nomina/empleados/              - Listar empleados
POST   /api/nomina/empleados/              - Crear empleado
GET    /api/nomina/empleados/{id}/         - Detalle de empleado
PUT    /api/nomina/empleados/{id}/         - Actualizar empleado
DELETE /api/nomina/empleados/{id}/         - Eliminar empleado
GET    /api/nomina/empleados/activos/      - Solo empleados activos

TIPOS DE CONTRATO:
------------------
GET    /api/nomina/tipos-contrato/         - Listar tipos
POST   /api/nomina/tipos-contrato/         - Crear tipo
GET    /api/nomina/tipos-contrato/{id}/    - Detalle
PUT    /api/nomina/tipos-contrato/{id}/    - Actualizar
DELETE /api/nomina/tipos-contrato/{id}/    - Eliminar

CONTRATOS:
----------
GET    /api/nomina/contratos/              - Listar contratos
POST   /api/nomina/contratos/              - Crear contrato
GET    /api/nomina/contratos/{id}/         - Detalle
PUT    /api/nomina/contratos/{id}/         - Actualizar
DELETE /api/nomina/contratos/{id}/         - Eliminar
GET    /api/nomina/contratos/activos/      - Solo contratos activos
GET    /api/nomina/contratos/por_empleado/?empleado_id=xxx - Por empleado

PARÁMETROS LEGALES:
-------------------
GET    /api/nomina/parametros-legales/             - Listar parámetros
POST   /api/nomina/parametros-legales/             - Crear parámetro
GET    /api/nomina/parametros-legales/{id}/        - Detalle
PUT    /api/nomina/parametros-legales/{id}/        - Actualizar
DELETE /api/nomina/parametros-legales/{id}/        - Eliminar
GET    /api/nomina/parametros-legales/vigentes/    - Solo vigentes

CONCEPTOS LABORALES:
--------------------
GET    /api/nomina/conceptos-laborales/            - Listar conceptos
POST   /api/nomina/conceptos-laborales/            - Crear concepto
GET    /api/nomina/conceptos-laborales/{id}/       - Detalle
PUT    /api/nomina/conceptos-laborales/{id}/       - Actualizar
DELETE /api/nomina/conceptos-laborales/{id}/       - Eliminar
GET    /api/nomina/conceptos-laborales/devengados/ - Solo devengados
GET    /api/nomina/conceptos-laborales/deducciones/- Solo deducciones

NÓMINAS:
--------
GET    /api/nomina/nominas/                - Listar nóminas
POST   /api/nomina/nominas/                - Crear nómina
GET    /api/nomina/nominas/{id}/           - Detalle completo
PUT    /api/nomina/nominas/{id}/           - Actualizar
DELETE /api/nomina/nominas/{id}/           - Eliminar
POST   /api/nomina/nominas/{id}/calcular/  - ⭐ CALCULAR NÓMINA
POST   /api/nomina/nominas/{id}/aprobar/   - Aprobar nómina
POST   /api/nomina/nominas/{id}/pagar/     - Marcar como pagada
POST   /api/nomina/nominas/{id}/anular/    - Anular nómina
GET    /api/nomina/nominas/por_periodo/?periodo_inicio=X&periodo_fin=Y

ITEMS DE NÓMINA:
----------------
GET    /api/nomina/nomina-items/           - Listar items
POST   /api/nomina/nomina-items/           - Agregar item a nómina
GET    /api/nomina/nomina-items/{id}/      - Detalle
PUT    /api/nomina/nomina-items/{id}/      - Actualizar
DELETE /api/nomina/nomina-items/{id}/      - Eliminar

CONCEPTOS DE NÓMINA:
--------------------
GET    /api/nomina/nomina-conceptos/       - Listar conceptos aplicados
GET    /api/nomina/nomina-conceptos/{id}/  - Detalle

═══════════════════════════════════════════════════════════════════════════════
"""
