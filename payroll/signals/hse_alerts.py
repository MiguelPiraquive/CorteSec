"""
Signals HSE - Alertas Automáticas de Vencimiento

Este módulo gestiona:
- Alertas de certificados próximos a vencer
- Notificaciones de dotaciones pendientes
- Emails automáticos a responsables HSE
- Creación de tareas de seguimiento

Normatividad:
- Sistema de Gestión SST: Resolución 0312/2019
- Obligación seguimiento documentos: Decreto 1072/2015
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import logging

from payroll.models import CertificadoEmpleado, EntregaDotacion

logger = logging.getLogger(__name__)


# ============================================================================
# SIGNALS DE CERTIFICADOS
# ============================================================================

@receiver(post_save, sender=CertificadoEmpleado)
def verificar_vencimiento_certificado(sender, instance, created, **kwargs):
    """
    Verifica el estado de un certificado después de guardar.
    
    Acciones:
    - Si está próximo a vencer (< 30 días): Enviar alerta
    - Si está vencido: Notificar inmediatamente
    - Si es obligatorio para nómina: Alerta a nómina
    """
    # Solo verificar si no se ha enviado alerta aún
    if instance.alerta_enviada:
        return
    
    estado = instance.estado
    
    if estado in [CertificadoEmpleado.ESTADO_POR_VENCER, CertificadoEmpleado.ESTADO_VENCIDO]:
        enviar_alerta_certificado(instance)


def enviar_alerta_certificado(certificado: CertificadoEmpleado):
    """
    Envía alerta por email sobre certificado próximo a vencer o vencido.
    
    Args:
        certificado (CertificadoEmpleado): Certificado a notificar
    """
    try:
        empleado = certificado.empleado
        organization = certificado.organization
        
        # Determinar destinatarios
        destinatarios = []
        
        # Email del empleado (si existe)
        if empleado.email:
            destinatarios.append(empleado.email)
        
        # Email de RRHH o HSE (desde configuración)
        email_hse = getattr(settings, 'EMAIL_HSE_RESPONSABLE', None)
        if email_hse:
            destinatarios.append(email_hse)
        
        if not destinatarios:
            logger.warning(
                f"No hay destinatarios para alerta de certificado {certificado.id}"
            )
            return
        
        # Construir mensaje
        if certificado.esta_vencido:
            asunto = f"⚠️ CERTIFICADO VENCIDO - {empleado.nombres} {empleado.apellidos}"
            urgencia = "URGENTE"
            estado_texto = "VENCIDO"
            dias_texto = f"Venció hace {abs(certificado.dias_para_vencimiento)} días"
        else:
            asunto = f"⏰ Certificado próximo a vencer - {empleado.nombres} {empleado.apellidos}"
            urgencia = "IMPORTANTE"
            estado_texto = "PRÓXIMO A VENCER"
            dias_texto = f"Vence en {certificado.dias_para_vencimiento} días"
        
        mensaje = f"""
{urgencia}: Certificado {estado_texto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INFORMACIÓN DEL EMPLEADO:
- Nombre: {empleado.nombres} {empleado.apellidos}
- Documento: {empleado.numero_documento}
- Cargo: {empleado.cargo or 'N/A'}

CERTIFICADO:
- Tipo: {certificado.get_tipo_certificado_display()}
- Número: {certificado.numero_certificado or 'N/A'}
- Entidad Emisora: {certificado.entidad_emisora}
- Fecha de Emisión: {certificado.fecha_emision}
- Fecha de Vencimiento: {certificado.fecha_vencimiento}
- Estado: {dias_texto}

{'⚠️ OBLIGATORIO PARA NÓMINA: Este certificado es obligatorio para procesar la nómina del empleado.' if certificado.obligatorio_para_nomina else ''}

ACCIÓN REQUERIDA:
Por favor, coordinar la renovación del certificado a la brevedad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organización: {organization.name}
Fecha de Alerta: {timezone.now().strftime('%Y-%m-%d %H:%M')}

Este es un mensaje automático del Sistema de Gestión HSE.
        """
        
        # Enviar email
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=destinatarios,
            fail_silently=False,
        )
        
        # Marcar alerta como enviada
        certificado.marcar_alerta_enviada()
        
        logger.info(
            f"Alerta enviada para certificado {certificado.id} - "
            f"Empleado: {empleado.numero_documento}"
        )
        
    except Exception as e:
        logger.error(
            f"Error enviando alerta certificado {certificado.id}: {str(e)}"
        )


@receiver(pre_save, sender=CertificadoEmpleado)
def resetear_alerta_al_renovar(sender, instance, **kwargs):
    """
    Resetea el flag de alerta si se actualiza la fecha de vencimiento.
    
    Esto permite enviar nueva alerta cuando se renueva un certificado.
    """
    if instance.pk:
        try:
            old_instance = CertificadoEmpleado.objects.get(pk=instance.pk)
            
            # Si cambió la fecha de vencimiento, resetear alerta
            if old_instance.fecha_vencimiento != instance.fecha_vencimiento:
                instance.alerta_enviada = False
                instance.fecha_alerta_enviada = None
                
                logger.info(
                    f"Alerta reseteada para certificado {instance.id} - "
                    f"Nueva fecha vencimiento: {instance.fecha_vencimiento}"
                )
        except CertificadoEmpleado.DoesNotExist:
            pass


# ============================================================================
# SIGNALS DE DOTACIONES
# ============================================================================

@receiver(post_save, sender=EntregaDotacion)
def notificar_dotacion_vencida(sender, instance, created, **kwargs):
    """
    Notifica cuando una dotación está vencida (pendiente y fecha pasada).
    """
    # Solo notificar si está pendiente y vencida
    if instance.estado != EntregaDotacion.ESTADO_PENDIENTE:
        return
    
    if not instance.esta_vencida:
        return
    
    # Verificar si ya notificamos (usando observaciones como flag temporal)
    if instance.observaciones and '[ALERTA_ENVIADA]' in instance.observaciones:
        return
    
    enviar_alerta_dotacion_vencida(instance)


def enviar_alerta_dotacion_vencida(dotacion: EntregaDotacion):
    """
    Envía alerta por dotación vencida.
    
    Args:
        dotacion (EntregaDotacion): Dotación pendiente
    """
    try:
        empleado = dotacion.empleado
        organization = dotacion.organization
        
        # Destinatarios
        destinatarios = []
        
        email_hse = getattr(settings, 'EMAIL_HSE_RESPONSABLE', None)
        if email_hse:
            destinatarios.append(email_hse)
        
        email_rrhh = getattr(settings, 'EMAIL_RRHH_RESPONSABLE', None)
        if email_rrhh:
            destinatarios.append(email_rrhh)
        
        if not destinatarios:
            logger.warning(
                f"No hay destinatarios para alerta de dotación {dotacion.id}"
            )
            return
        
        # Mensaje
        periodo_texto = dotacion.get_periodo_dotacion_display() if dotacion.periodo_dotacion else 'N/A'
        
        asunto = f"⚠️ DOTACIÓN VENCIDA - {empleado.nombres} {empleado.apellidos}"
        
        mensaje = f"""
URGENTE: Dotación Pendiente de Entrega

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INFORMACIÓN DEL EMPLEADO:
- Nombre: {empleado.nombres} {empleado.apellidos}
- Documento: {empleado.numero_documento}
- Cargo: {empleado.cargo or 'N/A'}
- Salario: ${empleado.salario_base:,.0f}

DOTACIÓN PENDIENTE:
- Tipo: {dotacion.get_tipo_dotacion_display()}
- Período: {periodo_texto}
- Año: {dotacion.anio}
- Descripción: {dotacion.descripcion_elementos}
- Cantidad: {dotacion.cantidad}
- Talla: {dotacion.talla or 'N/A'}

FECHAS:
- Fecha Programada: {dotacion.fecha_programada}
- Días de Retraso: {dotacion.dias_retraso}

ACCIÓN REQUERIDA:
Coordinar entrega inmediata de dotación según Art. 230 CST.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organización: {organization.name}
Fecha de Alerta: {timezone.now().strftime('%Y-%m-%d %H:%M')}
        """
        
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=destinatarios,
            fail_silently=False,
        )
        
        # Marcar como notificada
        dotacion.observaciones = f"[ALERTA_ENVIADA] {dotacion.observaciones or ''}"
        dotacion.save(update_fields=['observaciones'])
        
        logger.info(
            f"Alerta enviada para dotación {dotacion.id} - "
            f"Empleado: {empleado.numero_documento}"
        )
        
    except Exception as e:
        logger.error(
            f"Error enviando alerta dotación {dotacion.id}: {str(e)}"
        )


@receiver(post_save, sender=EntregaDotacion)
def notificar_dotacion_entregada(sender, instance, created, **kwargs):
    """
    Notifica cuando una dotación se marca como entregada.
    """
    if not created and instance.estado == EntregaDotacion.ESTADO_ENTREGADO:
        # Verificar si cambió de PENDIENTE a ENTREGADO
        try:
            # Esta es una notificación opcional (informativa)
            logger.info(
                f"Dotación entregada: {instance.id} - "
                f"Empleado: {instance.empleado.numero_documento} - "
                f"Fecha: {instance.fecha_entrega_real}"
            )
        except Exception as e:
            logger.error(f"Error en notificación dotación entregada: {str(e)}")


# ============================================================================
# NOTIFICACIONES PUSH (OPCIONAL)
# ============================================================================

def enviar_notificacion_push_certificado(certificado: CertificadoEmpleado):
    """
    Envía notificación push al empleado sobre certificado.
    
    Requiere integración con sistema de notificaciones push
    (Firebase, OneSignal, etc.)
    """
    # TODO: Implementar cuando esté disponible sistema de notificaciones
    pass


def enviar_notificacion_push_dotacion(dotacion: EntregaDotacion):
    """
    Envía notificación push sobre dotación pendiente.
    """
    # TODO: Implementar cuando esté disponible sistema de notificaciones
    pass


# ============================================================================
# HELPERS
# ============================================================================

def notificar_bloqueo_nomina(empleado, certificados_vencidos: list):
    """
    Notifica cuando un empleado queda bloqueado para nómina.
    
    Args:
        empleado (Empleado): Empleado bloqueado
        certificados_vencidos (list): Lista de certificados vencidos
    """
    try:
        organization = empleado.organization
        
        destinatarios = []
        
        # Email de nómina
        email_nomina = getattr(settings, 'EMAIL_NOMINA_RESPONSABLE', None)
        if email_nomina:
            destinatarios.append(email_nomina)
        
        # Email HSE
        email_hse = getattr(settings, 'EMAIL_HSE_RESPONSABLE', None)
        if email_hse:
            destinatarios.append(email_hse)
        
        if not destinatarios:
            logger.warning(
                f"No hay destinatarios para alerta bloqueo nómina - "
                f"Empleado: {empleado.numero_documento}"
            )
            return
        
        # Construir lista de certificados
        cert_list = '\n'.join([
            f"  - {cert.get_tipo_certificado_display()} (venció: {cert.fecha_vencimiento})"
            for cert in certificados_vencidos
        ])
        
        asunto = f"🚫 BLOQUEO DE NÓMINA - {empleado.nombres} {empleado.apellidos}"
        
        mensaje = f"""
URGENTE: Empleado Bloqueado para Procesamiento de Nómina

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMPLEADO:
- Nombre: {empleado.nombres} {empleado.apellidos}
- Documento: {empleado.numero_documento}
- Cargo: {empleado.cargo or 'N/A'}

MOTIVO DEL BLOQUEO:
Certificados obligatorios vencidos:

{cert_list}

ACCIÓN REQUERIDA:
1. Renovar certificados vencidos
2. Actualizar registros en el sistema
3. Una vez actualizados, el empleado podrá ser incluido en nómina

⚠️ IMPORTANTE:
El empleado NO será incluido en el procesamiento de nómina hasta que
se regularice su situación de certificados obligatorios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organización: {organization.name}
Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M')}
        """
        
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=destinatarios,
            fail_silently=False,
        )
        
        logger.info(
            f"Notificación bloqueo nómina enviada - "
            f"Empleado: {empleado.numero_documento}"
        )
        
    except Exception as e:
        logger.error(
            f"Error enviando notificación bloqueo nómina - "
            f"Empleado: {empleado.numero_documento}: {str(e)}"
        )
