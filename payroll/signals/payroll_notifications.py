"""
Signals de Notificaciones para Eventos de Nómina (FASE 6)

Conecta eventos clave del sistema con notificaciones automáticas:
- Aprobación de nómina → Email contabilidad
- Dispersión bancaria → WhatsApp empleados
- Ajustes DIAN → Email responsables
- Cambio estado nómina → Notificación supervisor

Integración con payroll.interfaces.notifications
"""

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
import logging

from payroll.models import (
    NominaBase,
    NominaAjuste,
    AsientoNomina,
    EmbargoJudicial,
)
from payroll.interfaces.notifications import (
    NotificationRecipient,
    NotificationPriority,
    send_email_notification,
    send_sms_notification,
    send_whatsapp_notification,
)

logger = logging.getLogger(__name__)


# ============================================================================
# SIGNALS APROBACIÓN NÓMINA
# ============================================================================

@receiver(post_save, sender=NominaBase)
def notificar_nomina_aprobada(sender, instance, created, **kwargs):
    """
    Notifica cuando una nómina es aprobada.
    
    Notificaciones:
    - Email a contabilidad con detalles
    - WhatsApp a empleado confirmando dispersión
    """
    # Solo si cambió a aprobado (no en creación)
    if created:
        return
    
    if instance.estado == 'aprobado' and instance.tracker.has_changed('estado'):
        try:
            # 1. Notificar a contabilidad por email
            _notificar_contabilidad_aprobacion(instance)
            
            # 2. Notificar a empleado (opcional, según configuración)
            if hasattr(instance, 'empleado') and instance.empleado.whatsapp:
                _notificar_empleado_aprobacion(instance)
        
        except Exception as e:
            logger.error(f"Error notificando aprobación nómina {instance.id}: {str(e)}")


def _notificar_contabilidad_aprobacion(nomina: NominaBase):
    """Envía email a contabilidad sobre aprobación."""
    # Obtener email del responsable contable de la organización
    # (puede venir de configuración o perfil)
    responsable_email = getattr(
        nomina.organization,
        'email_contabilidad',
        'contabilidad@empresa.com'  # Fallback
    )
    
    recipient = NotificationRecipient(
        name="Contabilidad",
        email=responsable_email
    )
    
    context = {
        'nomina': nomina,
        'empleado': nomina.empleado,
        'periodo': nomina.periodo,
        'monto': f"${nomina.neto_pagar:,.2f}",
        'fecha_aprobacion': timezone.now(),
    }
    
    send_email_notification(
        recipients=[recipient],
        subject=f"✅ Nómina #{nomina.id} Aprobada - {nomina.empleado.nombre_completo}",
        body=f"Se aprobó la nómina de {nomina.empleado.nombre_completo} por ${nomina.neto_pagar:,.2f}. "
             f"Período: {nomina.periodo.nombre}",
        template='payroll/emails/nomina_approved.html',
        context=context,
        priority=NotificationPriority.NORMAL
    )
    
    logger.info(f"📧 Email aprobación enviado a contabilidad para nómina {nomina.id}")


def _notificar_empleado_aprobacion(nomina: NominaBase):
    """Envía WhatsApp a empleado confirmando nómina aprobada."""
    recipient = NotificationRecipient(
        name=nomina.empleado.nombre_completo,
        whatsapp=nomina.empleado.whatsapp
    )
    
    mensaje = (
        f"¡Hola {nomina.empleado.nombres}! 👋\n\n"
        f"Tu nómina del período {nomina.periodo.nombre} ha sido aprobada.\n"
        f"💰 Monto a pagar: ${nomina.neto_pagar:,.2f}\n"
        f"📅 Fecha de pago: {nomina.periodo.fecha_pago.strftime('%d/%m/%Y')}\n\n"
        f"El pago se realizará en tu cuenta {nomina.cuenta_bancaria or 'registrada'}."
    )
    
    send_whatsapp_notification(
        recipients=[recipient],
        body=mensaje,
        priority=NotificationPriority.NORMAL
    )
    
    logger.info(f"📱 WhatsApp enviado a empleado {nomina.empleado.id} para nómina {nomina.id}")


# ============================================================================
# SIGNALS AJUSTES DIAN
# ============================================================================

@receiver(post_save, sender=NominaAjuste)
def notificar_ajuste_dian_generado(sender, instance, created, **kwargs):
    """
    Notifica cuando se genera un ajuste de nómina electrónica.
    
    Envía email al responsable de nómina electrónica con detalles del ajuste.
    """
    if created or instance.tracker.has_changed('estado'):
        # Solo notificar en estados importantes
        if instance.estado in ['generado', 'enviado', 'aceptado', 'rechazado']:
            try:
                _notificar_ajuste_dian(instance)
            except Exception as e:
                logger.error(f"Error notificando ajuste DIAN {instance.id}: {str(e)}")


def _notificar_ajuste_dian(ajuste: NominaAjuste):
    """Envía email sobre estado de ajuste DIAN."""
    responsable_email = getattr(
        ajuste.organization,
        'email_nomina_electronica',
        'nomina@empresa.com'
    )
    
    recipient = NotificationRecipient(
        name="Responsable Nómina Electrónica",
        email=responsable_email
    )
    
    # Emoji según estado
    emojis = {
        'generado': '📝',
        'enviado': '📤',
        'aceptado': '✅',
        'rechazado': '❌',
        'error': '⚠️'
    }
    emoji = emojis.get(ajuste.estado, '📄')
    
    # Asunto según tipo
    tipo_texto = {
        'REEMPLAZAR': 'Reemplazo',
        'ELIMINAR': 'Eliminación',
        'ADICIONAR': 'Adición',
        'CORREGIR': 'Corrección'
    }
    
    context = {
        'ajuste': ajuste,
        'nomina_original': ajuste.nomina_original,
        'tipo': tipo_texto.get(ajuste.tipo_ajuste, ajuste.tipo_ajuste),
        'diferencia': ajuste.diferencia_neto,
        'estado': ajuste.estado,
        'emoji': emoji
    }
    
    send_email_notification(
        recipients=[recipient],
        subject=f"{emoji} Ajuste DIAN #{ajuste.numero_ajuste} - {ajuste.get_estado_display()}",
        body=f"Ajuste de tipo {tipo_texto.get(ajuste.tipo_ajuste)} "
             f"para nómina {ajuste.nomina_original.numero_documento} "
             f"cambió a estado: {ajuste.get_estado_display()}",
        template='payroll/emails/ajuste_dian.html',
        context=context,
        priority=NotificationPriority.HIGH if ajuste.estado == 'rechazado' else NotificationPriority.NORMAL
    )
    
    logger.info(f"📧 Email ajuste DIAN enviado para {ajuste.numero_ajuste}")


# ============================================================================
# SIGNALS ASIENTOS CONTABLES
# ============================================================================

@receiver(post_save, sender=AsientoNomina)
def notificar_asiento_contable_generado(sender, instance, created, **kwargs):
    """
    Notifica cuando se genera un asiento contable de nómina.
    
    Envía notificación a contabilidad con resumen del asiento.
    """
    if created and instance.estado == 'aprobado':
        try:
            _notificar_asiento_contable(instance)
        except Exception as e:
            logger.error(f"Error notificando asiento contable {instance.id}: {str(e)}")


def _notificar_asiento_contable(asiento: AsientoNomina):
    """Envía email sobre asiento contable generado."""
    responsable_email = getattr(
        asiento.organization,
        'email_contabilidad',
        'contabilidad@empresa.com'
    )
    
    recipient = NotificationRecipient(
        name="Contabilidad",
        email=responsable_email
    )
    
    context = {
        'asiento': asiento,
        'nomina': asiento.nomina,
        'numero': asiento.numero_comprobante,
        'total_debito': asiento.total_debito,
        'total_credito': asiento.total_credito,
        'fecha': asiento.fecha_asiento,
    }
    
    send_email_notification(
        recipients=[recipient],
        subject=f"📊 Asiento Contable #{asiento.numero_comprobante} - Nómina #{asiento.nomina.id}",
        body=f"Se generó asiento contable {asiento.numero_comprobante} "
             f"para nómina {asiento.nomina.id}. "
             f"Débito: ${asiento.total_debito:,.2f}, Crédito: ${asiento.total_credito:,.2f}",
        template='payroll/emails/asiento_contable.html',
        context=context,
        priority=NotificationPriority.NORMAL
    )
    
    logger.info(f"📧 Email asiento contable enviado: {asiento.numero_comprobante}")


# ============================================================================
# SIGNALS EMBARGOS
# ============================================================================

@receiver(post_save, sender=EmbargoJudicial)
def notificar_embargo_aplicado(sender, instance, created, **kwargs):
    """
    Notifica cuando se aplica un embargo judicial.
    
    Envía email al empleado y al responsable de nómina.
    """
    if created:
        try:
            _notificar_nuevo_embargo(instance)
        except Exception as e:
            logger.error(f"Error notificando embargo {instance.id}: {str(e)}")


def _notificar_nuevo_embargo(embargo: EmbargoJudicial):
    """Notifica sobre nuevo embargo judicial."""
    # 1. Notificar al empleado
    if embargo.empleado.email:
        recipient_empleado = NotificationRecipient(
            name=embargo.empleado.nombre_completo,
            email=embargo.empleado.email
        )
        
        context_empleado = {
            'embargo': embargo,
            'empleado': embargo.empleado,
            'porcentaje': embargo.porcentaje_embargo,
            'juzgado': embargo.juzgado,
        }
        
        send_email_notification(
            recipients=[recipient_empleado],
            subject=f"⚖️ Notificación: Embargo Judicial Aplicado",
            body=f"Se ha aplicado un embargo judicial del {embargo.porcentaje_embargo}% "
                 f"sobre su salario según orden del {embargo.juzgado}.",
            template='payroll/emails/embargo_empleado.html',
            context=context_empleado,
            priority=NotificationPriority.HIGH
        )
    
    # 2. Notificar a nómina
    responsable_email = getattr(
        embargo.organization,
        'email_nomina',
        'nomina@empresa.com'
    )
    
    recipient_nomina = NotificationRecipient(
        name="Responsable Nómina",
        email=responsable_email
    )
    
    context_nomina = {
        'embargo': embargo,
        'empleado': embargo.empleado,
        'porcentaje': embargo.porcentaje_embargo,
        'juzgado': embargo.juzgado,
        'numero_proceso': embargo.numero_proceso,
    }
    
    send_email_notification(
        recipients=[recipient_nomina],
        subject=f"⚖️ Nuevo Embargo Judicial - {embargo.empleado.nombre_completo}",
        body=f"Se registró nuevo embargo del {embargo.porcentaje_embargo}% "
             f"para {embargo.empleado.nombre_completo}. "
             f"Proceso: {embargo.numero_proceso}",
        template='payroll/emails/embargo_nomina.html',
        context=context_nomina,
        priority=NotificationPriority.HIGH
    )
    
    logger.info(f"📧 Notificaciones de embargo {embargo.id} enviadas")


# ============================================================================
# SIGNALS NÓMINA RECHAZADA
# ============================================================================

@receiver(post_save, sender=NominaBase)
def notificar_nomina_rechazada(sender, instance, created, **kwargs):
    """
    Notifica cuando una nómina es rechazada.
    
    Envía notificación al responsable de nómina para corrección.
    """
    if not created and instance.estado == 'rechazado':
        if instance.tracker.has_changed('estado'):
            try:
                _notificar_rechazo_nomina(instance)
            except Exception as e:
                logger.error(f"Error notificando rechazo nómina {instance.id}: {str(e)}")


def _notificar_rechazo_nomina(nomina: NominaBase):
    """Envía notificación de nómina rechazada."""
    responsable_email = getattr(
        nomina.organization,
        'email_nomina',
        'nomina@empresa.com'
    )
    
    recipient = NotificationRecipient(
        name="Responsable Nómina",
        email=responsable_email
    )
    
    context = {
        'nomina': nomina,
        'empleado': nomina.empleado,
        'periodo': nomina.periodo,
        'motivo_rechazo': getattr(nomina, 'observaciones', 'No especificado'),
    }
    
    send_email_notification(
        recipients=[recipient],
        subject=f"❌ Nómina #{nomina.id} Rechazada - Requiere Corrección",
        body=f"La nómina de {nomina.empleado.nombre_completo} "
             f"del período {nomina.periodo.nombre} fue rechazada y requiere corrección.",
        template='payroll/emails/nomina_rechazada.html',
        context=context,
        priority=NotificationPriority.HIGH
    )
    
    logger.info(f"📧 Notificación de rechazo enviada para nómina {nomina.id}")


# ============================================================================
# HELPERS DE CONFIGURACIÓN
# ============================================================================

def configurar_emails_organizacion(organization, **emails):
    """
    Helper para configurar emails de notificación de una organización.
    
    Uso:
    ```python
    configurar_emails_organizacion(
        org,
        email_contabilidad='conta@empresa.com',
        email_nomina='nomina@empresa.com',
        email_nomina_electronica='ne@empresa.com'
    )
    ```
    """
    for key, value in emails.items():
        setattr(organization, key, value)
    organization.save()
    
    logger.info(f"Configurados emails de notificación para {organization.name}")
