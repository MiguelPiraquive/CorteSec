"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MODELOS PAYROLL - PUNTO DE ENTRADA                         ║
║                        Sistema de Nómina CorteSec                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

Este archivo expone todos los modelos del módulo payroll de forma centralizada.

⚠️ IMPORTANTE: Los modelos de Nómina Electrónica DIAN fueron movidos a:
   backend/nomina_electronica/models.py
   
   Ver: backend/REORGANIZACION_NOMINA.md para más información

ESTRUCTURA REORGANIZADA:
------------------------
- payroll/models/legacy.py → Modelos nómina simple y compartidos
- payroll/models/structural.py → CentroCosto, DistribucionCostoNomina
- payroll/models/time_attendance.py → TipoNovedad, NovedadCalendario
- payroll/models/accounting.py → EntidadExterna, AsientoNomina
- payroll/models/legal.py → EmbargoJudicial, TablaRetencionFuente
- payroll/models/hse.py → CertificadoEmpleado, EntregaDotacion
- payroll/models/electronic_payroll.py → (VACÍO - movido a nomina_electronica/)

AUTOR: Sistema CorteSec
FECHA: Enero 2026
VERSIÓN: 2.0.0 (Separación Nómina Electrónica)
"""

# ══════════════════════════════════════════════════════════════════════════════
# MODELOS LEGACY (De models.py → models/legacy.py)
# ══════════════════════════════════════════════════════════════════════════════

from .legacy import (
    # Catálogos
    TipoDocumento,
    TipoTrabajador,
    TipoContrato,
    ConceptoLaboral,
    
    # Empleados y Contratos
    Empleado,
    Contrato,
    
    # Nóminas
    PeriodoNomina,
    NominaBase,
    NominaSimple,
    
    # Detalles Nómina Simple
    DetalleItemBase,
    DetalleItemNominaSimple,
    DetalleConceptoBase,
    DetalleConceptoNominaSimple,
)

# ══════════════════════════════════════════════════════════════════════════════
# MODELOS NUEVOS (FASE 1 - FUNDACIONAL)
# ══════════════════════════════════════════════════════════════════════════════

# Centros de Costo y Distribución
from .structural import (
    CentroCosto,
    DistribucionCostoNomina,
)

# Gestión de Tiempo y Ausentismos
from .time_attendance import (
    TipoNovedad,
    NovedadCalendario,
)

# Integración Contable y Terceros
from .accounting import (
    EntidadExterna,
    AsientoNomina,
    DetalleAsientoNomina,
)

# Legal y Fiscal (FASE 3)
from .legal import (
    EmbargoJudicial,
    TablaRetencionFuente,
    LiquidacionFIC,
    aplicar_embargos_prelacion,
)

# ══════════════════════════════════════════════════════════════════════════════
# MODELOS HSE (Health, Safety & Environment) - FASE 4
# ══════════════════════════════════════════════════════════════════════════════

from .hse import (
    CertificadoEmpleado,
    EntregaDotacion,
)


# ══════════════════════════════════════════════════════════════════════════════
# EXPONER TODOS LOS MODELOS
# ══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # === MODELOS LEGACY ===
    # Catálogos
    'TipoDocumento',
    'TipoTrabajador',
    'TipoContrato',
    'ConceptoLaboral',
    
    # Empleados y Contratos
    'Empleado',
    'Contrato',
    
    # Nóminas
    'PeriodoNomina',
    'NominaBase',
    'NominaSimple',
    
    # Detalles Nómina Simple
    'DetalleItemBase',
    'DetalleItemNominaSimple',
    'DetalleConceptoBase',
    'DetalleConceptoNominaSimple',
    
    # === MODELOS NUEVOS (FASE 1) ===
    # Estructurales
    'CentroCosto',
    'DistribucionCostoNomina',
    
    # Time & Attendance
    'TipoNovedad',
    'NovedadCalendario',
    
    # Contabilidad
    'EntidadExterna',
    'AsientoNomina',
    'DetalleAsientoNomina',
    
    # === MODELOS NUEVOS (FASE 3) ===
    # Legal y Fiscal
    'EmbargoJudicial',
    'TablaRetencionFuente',
    'LiquidacionFIC',
    'aplicar_embargos_prelacion',
    
    # === MODELOS NUEVOS (FASE 4) ===
    # HSE (Health, Safety & Environment)
    'CertificadoEmpleado',
    'EntregaDotacion',
]

# ══════════════════════════════════════════════════════════════════════════════
# NOTA: Nómina Electrónica DIAN fue movida a nomina_electronica/
# ══════════════════════════════════════════════════════════════════════════════
# Los siguientes modelos están ahora en: backend/nomina_electronica/models.py
#   - NominaElectronica
#   - DetalleItemNominaElectronica
#   - DetalleConceptoNominaElectronica
#   - ConfiguracionNominaElectronica
#   - WebhookConfig
#   - WebhookLog
#   - NominaAjuste
#   - DetalleAjuste
#
# Ver: backend/nomina_electronica/README.md
# Ver: backend/REORGANIZACION_NOMINA.md
# ══════════════════════════════════════════════════════════════════════════════
