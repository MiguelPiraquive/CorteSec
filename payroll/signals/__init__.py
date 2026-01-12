"""
Signals del módulo Payroll

Importa todos los signals para que Django los registre automáticamente.
"""

# Signals de contabilización automática (FASE 5)
from .accounting_signals import (
    contabilizar_nomina_aprobada,
    anular_asiento_al_eliminar_nomina,
    notificar_asiento_generado,
)

# Signals de notificaciones (FASE 6)
from .payroll_notifications import (
    notificar_nomina_aprobada,
    notificar_ajuste_dian_generado,
    notificar_asiento_contable_generado,
    notificar_embargo_aplicado,
    notificar_nomina_rechazada,
)

# Signals HSE (FASE 4)
from .hse_alerts import (
    verificar_certificados_vencidos,
    verificar_dotacion_vencida,
)

__all__ = [
    # Contabilización
    'contabilizar_nomina_aprobada',
    'anular_asiento_al_eliminar_nomina',
    'notificar_asiento_generado',
    
    # Notificaciones
    'notificar_nomina_aprobada',
    'notificar_ajuste_dian_generado',
    'notificar_asiento_contable_generado',
    'notificar_embargo_aplicado',
    'notificar_nomina_rechazada',
    
    # HSE
    'verificar_certificados_vencidos',
    'verificar_dotacion_vencida',
]
