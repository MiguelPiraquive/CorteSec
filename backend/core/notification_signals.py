"""
Signals de notificación automática — CorteSec
===============================================

Genera notificaciones automáticamente cuando ocurren eventos clave:
- Nómina calculada / aprobada / pagada
- Préstamo aprobado / rechazado / desembolsado
- Empleado creado / desactivado
- Proyecto creado / actualizado

Estos signals se registran en core/apps.py → ready().
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# NÓMINA
# ═══════════════════════════════════════════════════════════════

@receiver(pre_save, sender='nomina.NominaSimple')
def nomina_guardar_estado_anterior(sender, instance, **kwargs):
    """Guardar estado anterior para detectar transiciones."""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._estado_anterior = old.estado
        except sender.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


@receiver(post_save, sender='nomina.NominaSimple')
def nomina_notificacion(sender, instance, created, **kwargs):
    """Notificar cambios de estado en nóminas."""
    from core.notification_engine import NotificationEngine

    estado_anterior = getattr(instance, '_estado_anterior', None)
    estado_actual = instance.estado

    # Solo notificar en transiciones de estado
    if estado_anterior == estado_actual and not created:
        return

    # Obtener empleado de forma segura
    try:
        empleado = instance.contrato.empleado if instance.contrato else None
        nombre_empleado = empleado.nombre_completo if empleado else 'N/A'
    except Exception:
        nombre_empleado = 'N/A'
        empleado = None

    periodo = f"{instance.periodo_inicio.strftime('%d/%m/%Y')} - {instance.periodo_fin.strftime('%d/%m/%Y')}" if instance.periodo_inicio else ''

    # Determinar a quién notificar: al usuario que creó o admins de la org
    org = getattr(instance, 'organization', None)
    if not org:
        return

    notif_map = {
        'calculada': {
            'titulo': f'Nómina calculada: {instance.numero or "S/N"}',
            'mensaje': f'La nómina de {nombre_empleado} ({periodo}) ha sido calculada.',
            'tipo': 'info',
            'prioridad': 'normal',
        },
        'aprobada': {
            'titulo': f'Nómina aprobada: {instance.numero or "S/N"}',
            'mensaje': f'La nómina de {nombre_empleado} ({periodo}) ha sido aprobada y está lista para pago.',
            'tipo': 'success',
            'prioridad': 'normal',
        },
        'pagada': {
            'titulo': f'Nómina pagada: {instance.numero or "S/N"}',
            'mensaje': f'La nómina de {nombre_empleado} ({periodo}) ha sido pagada exitosamente.',
            'tipo': 'success',
            'prioridad': 'normal',
        },
        'anulada': {
            'titulo': f'Nómina anulada: {instance.numero or "S/N"}',
            'mensaje': f'La nómina de {nombre_empleado} ({periodo}) ha sido anulada.',
            'tipo': 'warning',
            'prioridad': 'alta',
        },
    }

    config = notif_map.get(estado_actual)
    if not config:
        return

    try:
        NotificationEngine.notify_admins(
            organization=org,
            titulo=config['titulo'],
            mensaje=config['mensaje'],
            tipo=config['tipo'],
            categoria='nomina',
            prioridad=config['prioridad'],
            url_accion='/dashboard/nomina',
            texto_accion='Ver nómina',
            origen_tipo='nomina',
            origen_id=str(instance.pk),
            enviar_email=(estado_actual in ('pagada', 'anulada')),
        )
    except Exception as exc:
        logger.error('Error creando notificación de nómina: %s', exc)


# ═══════════════════════════════════════════════════════════════
# PRÉSTAMOS
# ═══════════════════════════════════════════════════════════════

@receiver(pre_save, sender='prestamos.Prestamo')
def prestamo_guardar_estado_anterior(sender, instance, **kwargs):
    """Guardar estado anterior para detectar transiciones."""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._estado_anterior = old.estado
        except sender.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


@receiver(post_save, sender='prestamos.Prestamo')
def prestamo_notificacion(sender, instance, created, **kwargs):
    """Notificar cambios de estado en préstamos."""
    from core.notification_engine import NotificationEngine

    estado_anterior = getattr(instance, '_estado_anterior', None)
    estado_actual = instance.estado

    if estado_anterior == estado_actual and not created:
        return

    org = getattr(instance, 'organization', None)
    if not org:
        return

    try:
        nombre_empleado = instance.empleado.nombre_completo if instance.empleado else 'N/A'
    except Exception:
        nombre_empleado = 'N/A'

    numero = instance.numero_prestamo or 'S/N'

    # Notificaciones según transición de estado
    notif_map = {
        'aprobado': {
            'titulo': f'Préstamo #{numero} aprobado',
            'mensaje': f'El préstamo de {nombre_empleado} ha sido aprobado por ${instance.monto_aprobado or instance.monto_solicitado:,.0f}.',
            'tipo': 'success',
            'prioridad': 'normal',
        },
        'rechazado': {
            'titulo': f'Préstamo #{numero} rechazado',
            'mensaje': f'El préstamo de {nombre_empleado} ha sido rechazado. {instance.motivo_rechazo or ""}',
            'tipo': 'error',
            'prioridad': 'alta',
        },
        'desembolsado': {
            'titulo': f'Préstamo #{numero} desembolsado',
            'mensaje': f'El préstamo de {nombre_empleado} por ${instance.monto_aprobado or instance.monto_solicitado:,.0f} ha sido desembolsado.',
            'tipo': 'success',
            'prioridad': 'normal',
        },
        'completado': {
            'titulo': f'Préstamo #{numero} completado',
            'mensaje': f'El préstamo de {nombre_empleado} ha sido pagado en su totalidad.',
            'tipo': 'success',
            'prioridad': 'normal',
        },
        'en_mora': {
            'titulo': f'Préstamo #{numero} en mora',
            'mensaje': f'El préstamo de {nombre_empleado} ha entrado en estado de mora.',
            'tipo': 'error',
            'prioridad': 'urgente',
        },
    }

    config = notif_map.get(estado_actual)
    if not config:
        # Si es nuevo y está en borrador/solicitado, notificar creación
        if created and estado_actual in ('borrador', 'solicitado'):
            config = {
                'titulo': f'Nuevo préstamo solicitado: #{numero}',
                'mensaje': f'{nombre_empleado} ha solicitado un préstamo por ${instance.monto_solicitado:,.0f}.',
                'tipo': 'info',
                'prioridad': 'normal',
            }
        else:
            return

    try:
        # Notificar a admins
        NotificationEngine.notify_admins(
            organization=org,
            titulo=config['titulo'],
            mensaje=config['mensaje'],
            tipo=config['tipo'],
            categoria='prestamos',
            prioridad=config['prioridad'],
            url_accion='/dashboard/prestamos',
            texto_accion='Ver préstamo',
            origen_tipo='prestamo',
            origen_id=str(instance.pk),
            enviar_email=(estado_actual in ('aprobado', 'rechazado', 'en_mora')),
        )

        # También notificar al empleado directamente si tiene usuario
        if instance.empleado and hasattr(instance.empleado, 'usuario') and instance.empleado.usuario:
            if estado_actual in ('aprobado', 'rechazado', 'desembolsado', 'en_mora'):
                NotificationEngine.notify(
                    usuario=instance.empleado.usuario,
                    titulo=config['titulo'],
                    mensaje=config['mensaje'],
                    tipo=config['tipo'],
                    categoria='prestamos',
                    prioridad=config['prioridad'],
                    url_accion='/dashboard/prestamos',
                    texto_accion='Ver mi préstamo',
                    origen_tipo='prestamo',
                    origen_id=str(instance.pk),
                    enviar_email=True,
                )
    except Exception as exc:
        logger.error('Error creando notificación de préstamo: %s', exc)


# ═══════════════════════════════════════════════════════════════
# EMPLEADOS
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender='nomina.Empleado')
def empleado_notificacion(sender, instance, created, **kwargs):
    """Notificar cuando se crea un nuevo empleado."""
    from core.notification_engine import NotificationEngine

    if not created:
        return

    org = getattr(instance, 'organization', None)
    if not org:
        return

    try:
        nombre = getattr(instance, 'nombre_completo', f'{instance.primer_nombre} {instance.primer_apellido}')
        NotificationEngine.notify_admins(
            organization=org,
            titulo=f'Nuevo empleado registrado',
            mensaje=f'{nombre} ha sido registrado en el sistema.',
            tipo='info',
            categoria='empleados',
            prioridad='normal',
            url_accion='/dashboard/empleados',
            texto_accion='Ver empleados',
            origen_tipo='empleado',
            origen_id=str(instance.pk),
        )
    except Exception as exc:
        logger.error('Error creando notificación de empleado: %s', exc)


# ═══════════════════════════════════════════════════════════════
# PROYECTOS
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender='dashboard.Project')
def proyecto_notificacion(sender, instance, created, **kwargs):
    """Notificar cuando se crea un nuevo proyecto."""
    from core.notification_engine import NotificationEngine

    if not created:
        return

    org = getattr(instance, 'organization', None)
    if not org:
        return

    try:
        NotificationEngine.notify_admins(
            organization=org,
            titulo=f'Nuevo proyecto creado',
            mensaje=f'El proyecto "{instance.name}" ha sido creado.',
            tipo='info',
            categoria='proyectos',
            prioridad='normal',
            url_accion='/dashboard/proyectos',
            texto_accion='Ver proyectos',
            origen_tipo='proyecto',
            origen_id=str(instance.pk),
        )
    except Exception as exc:
        logger.error('Error creando notificación de proyecto: %s', exc)
