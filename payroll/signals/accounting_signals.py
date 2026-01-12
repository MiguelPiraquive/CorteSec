"""
Signals de Contabilización Automática

Este módulo gestiona la contabilización automática de nóminas mediante signals Django.

Triggers:
- Al aprobar una nómina → Generar asiento contable automáticamente
- Al anular una nómina → Reversar asiento contable
- Al procesar nómina masiva → Contabilizar lote
"""

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.conf import settings
import logging

from payroll.models import NominaBase, AsientoNomina
from payroll.services.accounting_integrator import AccountingIntegrator

logger = logging.getLogger(__name__)


# ============================================================================
# SIGNALS DE CONTABILIZACIÓN
# ============================================================================

@receiver(post_save, sender=NominaBase)
def contabilizar_nomina_aprobada(sender, instance, created, **kwargs):
    """
    Contabiliza automáticamente cuando una nómina es aprobada.
    
    Trigger: post_save de NominaBase
    Condición: estado cambia a 'aprobado'
    """
    # Solo contabilizar si está configurado en settings
    auto_contabilizar = getattr(settings, 'PAYROLL_AUTO_CONTABILIZAR', True)
    
    if not auto_contabilizar:
        return
    
    # Solo contabilizar si está aprobada y no tiene asiento previo
    if instance.estado != 'aprobado':
        return
    
    # Verificar si ya tiene asiento
    try:
        if hasattr(instance, 'asiento_contable') and instance.asiento_contable:
            logger.debug(f"Nómina {instance.id} ya tiene asiento contable")
            return
    except AsientoNomina.DoesNotExist:
        pass
    
    # Generar asiento contable
    try:
        integrator = AccountingIntegrator(instance.organization)
        asiento = integrator.contabilizar_nomina(instance)
        
        logger.info(
            f"Asiento contable generado automáticamente: {asiento.numero_comprobante} - "
            f"Nómina {instance.id}"
        )
    
    except Exception as e:
        logger.error(
            f"Error en contabilización automática de nómina {instance.id}: {str(e)}",
            exc_info=True
        )
        
        # No propagar excepción para no bloquear el guardado de la nómina
        # El asiento puede generarse manualmente después


@receiver(pre_delete, sender=NominaBase)
def anular_asiento_al_eliminar_nomina(sender, instance, **kwargs):
    """
    Anula o elimina el asiento contable cuando se elimina una nómina.
    
    Trigger: pre_delete de NominaBase
    """
    try:
        if hasattr(instance, 'asiento_contable') and instance.asiento_contable:
            asiento = instance.asiento_contable
            
            # Opción 1: Marcar como anulado
            asiento.estado = 'anulado'
            asiento.observaciones += f"\n[ANULADO] Nómina {instance.id} eliminada"
            asiento.save()
            
            logger.warning(
                f"Asiento {asiento.numero_comprobante} marcado como anulado - "
                f"Nómina {instance.id} eliminada"
            )
            
            # Opción 2: Eliminar el asiento (comentado por auditoría)
            # asiento.delete()
    
    except AsientoNomina.DoesNotExist:
        pass
    except Exception as e:
        logger.error(
            f"Error anulando asiento de nómina {instance.id}: {str(e)}",
            exc_info=True
        )


@receiver(post_save, sender=AsientoNomina)
def notificar_asiento_generado(sender, instance, created, **kwargs):
    """
    Notifica cuando se genera un asiento contable.
    
    Opcional: Enviar notificación al área contable
    """
    if created and instance.estado == 'aprobado':
        # TODO: Implementar notificación push/email a contabilidad
        logger.info(
            f"Nuevo asiento contable: {instance.numero_comprobante} - "
            f"Total: ${instance.total_debito:,.2f}"
        )


# ============================================================================
# HELPERS
# ============================================================================

def contabilizar_lote_pendientes(organization):
    """
    Contabiliza todas las nóminas aprobadas sin asiento contable.
    
    Args:
        organization: Organización a procesar
    
    Returns:
        dict: Resultado de la contabilización
    """
    # Obtener nóminas aprobadas sin asiento
    nominas_pendientes = NominaBase.objects.filter(
        organization=organization,
        estado='aprobado',
        asiento_contable__isnull=True
    )
    
    if not nominas_pendientes.exists():
        logger.info(f"No hay nóminas pendientes de contabilizar en {organization.name}")
        return {
            'total_nominas': 0,
            'exitosas': 0,
            'fallidas': 0
        }
    
    logger.info(
        f"Contabilizando {nominas_pendientes.count()} nóminas pendientes - "
        f"Org: {organization.name}"
    )
    
    integrator = AccountingIntegrator(organization)
    resultado = integrator.contabilizar_lote(list(nominas_pendientes))
    
    return resultado
