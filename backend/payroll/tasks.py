"""
Tareas asíncronas de Celery para el módulo de nómina electrónica
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Q, Count
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def generar_xml_nomina_async(self, nomina_electronica_id):
    """
    Genera XML de nómina electrónica de forma asíncrona
    
    Args:
        nomina_electronica_id: ID de la nómina electrónica
        
    Returns:
        dict: Resultado de la operación
    """
    from payroll.models import NominaElectronica
    from payroll.xml_generator import NominaElectronicaXMLGenerator
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
        
        if nomina.estado not in ['borrador', 'error']:
            return {
                'success': False,
                'error': f'Estado inválido: {nomina.estado}'
            }
        
        # Generar XML
        generator = NominaElectronicaXMLGenerator(nomina)
        xml = generator.generar()
        
        # Guardar
        nomina.xml_contenido = xml
        nomina.estado = 'generado'
        nomina.save()
        
        logger.info(f'XML generado exitosamente para nómina {nomina.numero_documento}')
        
        return {
            'success': True,
            'nomina_id': nomina.id,
            'numero_documento': nomina.numero_documento,
            'xml_size': len(xml)
        }
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina electrónica {nomina_electronica_id} no encontrada')
        return {'success': False, 'error': 'Nómina no encontrada'}
        
    except Exception as e:
        logger.error(f'Error generando XML: {str(e)}')
        
        # Actualizar estado de error
        try:
            nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
            nomina.estado = 'error'
            nomina.errores = {'error': str(e)}
            nomina.save()
        except:
            pass
        
        # Reintentar
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=600)
def firmar_nomina_async(self, nomina_electronica_id):
    """
    Firma digitalmente una nómina de forma asíncrona
    
    Args:
        nomina_electronica_id: ID de la nómina electrónica
        
    Returns:
        dict: Resultado de la operación
    """
    from payroll.models import NominaElectronica
    from payroll.firma_digital import FirmaDigitalNomina
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
        
        if nomina.estado != 'generado':
            return {
                'success': False,
                'error': f'Estado inválido: {nomina.estado}'
            }
        
        if not nomina.xml_contenido:
            return {
                'success': False,
                'error': 'No hay XML para firmar'
            }
        
        # Firmar
        firmador = FirmaDigitalNomina()
        xml_firmado = firmador.firmar(nomina.xml_contenido, nomina.organization)
        
        # Guardar
        nomina.xml_firmado = xml_firmado
        nomina.generar_cune()
        nomina.estado = 'firmado'
        nomina.save()
        
        logger.info(f'Nómina {nomina.numero_documento} firmada exitosamente')
        
        return {
            'success': True,
            'nomina_id': nomina.id,
            'numero_documento': nomina.numero_documento,
            'cune': nomina.cune
        }
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina electrónica {nomina_electronica_id} no encontrada')
        return {'success': False, 'error': 'Nómina no encontrada'}
        
    except Exception as e:
        logger.error(f'Error firmando nómina: {str(e)}')
        
        try:
            nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
            nomina.estado = 'error'
            nomina.errores = {'error_firma': str(e)}
            nomina.save()
        except:
            pass
        
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=5, default_retry_delay=1800)
def enviar_nomina_dian_async(self, nomina_electronica_id):
    """
    Envía nómina a DIAN de forma asíncrona con reintentos
    
    Args:
        nomina_electronica_id: ID de la nómina electrónica
        
    Returns:
        dict: Resultado del envío
    """
    from payroll.models import NominaElectronica
    from payroll.dian_client import DIANClient
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
        
        if nomina.estado != 'firmado':
            return {
                'success': False,
                'error': f'Estado inválido: {nomina.estado}'
            }
        
        # Enviar a DIAN
        client = DIANClient(nomina.organization)
        respuesta = client.enviar_nomina(nomina)
        
        # Actualizar nómina
        nomina.track_id = respuesta.get('track_id', '')
        nomina.codigo_respuesta = respuesta.get('codigo', '')
        nomina.mensaje_respuesta = respuesta.get('mensaje', '')
        nomina.fecha_envio = timezone.now()
        nomina.intentos_envio += 1
        nomina.ultimo_intento = timezone.now()
        
        if respuesta.get('exitoso'):
            nomina.estado = 'aceptado'
            nomina.fecha_validacion_dian = timezone.now()
            logger.info(f'Nómina {nomina.numero_documento} aceptada por DIAN')
        else:
            nomina.estado = 'rechazado'
            nomina.errores = respuesta.get('errores', {})
            logger.warning(f'Nómina {nomina.numero_documento} rechazada por DIAN')
        
        nomina.save()
        
        # Disparar notificación
        enviar_notificacion_resultado_dian.delay(nomina.id, respuesta.get('exitoso'))
        
        return {
            'success': respuesta.get('exitoso'),
            'nomina_id': nomina.id,
            'track_id': nomina.track_id,
            'codigo': nomina.codigo_respuesta,
            'mensaje': nomina.mensaje_respuesta
        }
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina electrónica {nomina_electronica_id} no encontrada')
        return {'success': False, 'error': 'Nómina no encontrada'}
        
    except Exception as e:
        logger.error(f'Error enviando a DIAN: {str(e)}')
        
        try:
            nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
            nomina.estado = 'error'
            nomina.errores = {'error_envio': str(e)}
            nomina.intentos_envio += 1
            nomina.ultimo_intento = timezone.now()
            nomina.save()
        except:
            pass
        
        # Reintentar con backoff exponencial
        raise self.retry(exc=e, countdown=300 * (2 ** self.request.retries))


@shared_task
def procesar_nomina_completa(nomina_electronica_id):
    """
    Procesa nómina completa: genera XML → firma → envía a DIAN
    
    Esta es una tarea orquestadora que encadena las demás
    """
    from celery import chain
    
    # Crear cadena de tareas
    workflow = chain(
        generar_xml_nomina_async.s(nomina_electronica_id),
        firmar_nomina_async.s(nomina_electronica_id),
        enviar_nomina_dian_async.s(nomina_electronica_id)
    )
    
    # Ejecutar
    result = workflow.apply_async()
    
    return {
        'workflow_id': result.id,
        'nomina_id': nomina_electronica_id
    }


@shared_task
def verificar_estado_nominas_dian():
    """
    Tarea programada: Verifica estado de nóminas enviadas a DIAN
    """
    from payroll.models import NominaElectronica
    from payroll.dian_client import DIANClient
    
    # Buscar nóminas enviadas hace más de 1 hora sin respuesta
    hace_una_hora = timezone.now() - timedelta(hours=1)
    
    nominas_pendientes = NominaElectronica.objects.filter(
        estado='enviado',
        fecha_envio__lte=hace_una_hora,
        track_id__isnull=False
    )
    
    verificadas = 0
    aceptadas = 0
    rechazadas = 0
    
    for nomina in nominas_pendientes:
        try:
            client = DIANClient(nomina.organization)
            estado = client.consultar_estado(nomina.track_id)
            
            if estado.get('exitoso'):
                if estado.get('estado') == 'aceptado':
                    nomina.estado = 'aceptado'
                    nomina.fecha_validacion_dian = timezone.now()
                    aceptadas += 1
                elif estado.get('estado') == 'rechazado':
                    nomina.estado = 'rechazado'
                    nomina.errores = {'mensaje': estado.get('mensaje')}
                    rechazadas += 1
                
                nomina.save()
                verificadas += 1
                
        except Exception as e:
            logger.error(f'Error verificando estado de {nomina.numero_documento}: {str(e)}')
    
    logger.info(
        f'Verificación DIAN completada: {verificadas} verificadas, '
        f'{aceptadas} aceptadas, {rechazadas} rechazadas'
    )
    
    return {
        'verificadas': verificadas,
        'aceptadas': aceptadas,
        'rechazadas': rechazadas
    }


@shared_task
def procesar_nominas_pendientes():
    """
    Tarea programada: Procesa nóminas pendientes de envío automático
    """
    from payroll.models import NominaElectronica, ConfiguracionNominaElectronica
    
    # Buscar configuraciones con envío automático
    configs = ConfiguracionNominaElectronica.objects.filter(
        activa=True,
        envio_automatico=True
    )
    
    procesadas = 0
    
    for config in configs:
        # Buscar nóminas firmadas sin enviar de esta organización
        nominas = NominaElectronica.objects.filter(
            organization=config.organization,
            estado='firmado'
        )[:10]  # Procesar máximo 10 por vez
        
        for nomina in nominas:
            enviar_nomina_dian_async.delay(nomina.id)
            procesadas += 1
    
    logger.info(f'Nóminas encoladas para envío automático: {procesadas}')
    
    return {'procesadas': procesadas}


@shared_task
def recordatorio_nominas_sin_firmar():
    """
    Tarea programada: Envía recordatorio de nóminas generadas sin firmar
    """
    from payroll.models import NominaElectronica
    
    # Buscar nóminas generadas hace más de 24 horas sin firmar
    hace_24h = timezone.now() - timedelta(hours=24)
    
    nominas = NominaElectronica.objects.filter(
        estado='generado',
        fecha_generacion__lte=hace_24h
    ).select_related('organization', 'generado_por')
    
    enviados = 0
    
    for nomina in nominas:
        # Enviar notificación
        enviar_notificacion_recordatorio.delay(
            nomina.id,
            'sin_firmar'
        )
        enviados += 1
    
    logger.info(f'Recordatorios enviados: {enviados}')
    
    return {'recordatorios_enviados': enviados}


@shared_task
def limpiar_xmls_antiguos():
    """
    Tarea programada: Limpia XMLs de nóminas antiguas (> 5 años)
    """
    from payroll.models import NominaElectronica
    
    # Buscar nóminas de más de 5 años
    hace_5_anios = timezone.now() - timedelta(days=365*5)
    
    nominas_antiguas = NominaElectronica.objects.filter(
        fecha_generacion__lte=hace_5_anios,
        estado='aceptado'
    )
    
    count = nominas_antiguas.count()
    
    # Limpiar XMLs pero mantener metadata
    for nomina in nominas_antiguas:
        nomina.xml_contenido = None
        nomina.xml_firmado = None
        nomina.save(update_fields=['xml_contenido', 'xml_firmado'])
    
    logger.info(f'XMLs limpiados: {count}')
    
    return {'xmls_limpiados': count}


@shared_task
def generar_reporte_semanal():
    """
    Tarea programada: Genera reporte semanal de estadísticas
    """
    from payroll.models import NominaElectronica
    from django.core.mail import send_mail
    
    # Estadísticas de la última semana
    hace_7_dias = timezone.now() - timedelta(days=7)
    
    stats = NominaElectronica.objects.filter(
        fecha_generacion__gte=hace_7_dias
    ).aggregate(
        total=Count('id'),
        aceptadas=Count('id', filter=Q(estado='aceptado')),
        rechazadas=Count('id', filter=Q(estado='rechazado')),
        pendientes=Count('id', filter=Q(estado__in=['generado', 'firmado', 'enviado']))
    )
    
    tasa_exito = (stats['aceptadas'] / stats['total'] * 100) if stats['total'] > 0 else 0
    
    mensaje = f"""
    Reporte Semanal de Nómina Electrónica
    =====================================
    
    Período: {hace_7_dias.date()} - {timezone.now().date()}
    
    Total documentos: {stats['total']}
    Aceptados: {stats['aceptadas']} ({tasa_exito:.2f}%)
    Rechazados: {stats['rechazadas']}
    Pendientes: {stats['pendientes']}
    
    Tasa de éxito: {tasa_exito:.2f}%
    """
    
    logger.info(mensaje)
    
    # TODO: Enviar email a administradores
    # send_mail(
    #     'Reporte Semanal - Nómina Electrónica',
    #     mensaje,
    #     'noreply@empresa.com',
    #     ['admin@empresa.com'],
    # )
    
    return stats


@shared_task
def enviar_notificacion_resultado_dian(nomina_id, exitoso):
    """
    Envía notificación sobre resultado de envío a DIAN
    """
    from payroll.models import NominaElectronica
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_id)
        
        # TODO: Implementar sistema de notificaciones
        # - Email al empleado
        # - Notificación push
        # - Webhook
        
        logger.info(
            f'Notificación enviada para nómina {nomina.numero_documento}: '
            f'{"Aceptado" if exitoso else "Rechazado"}'
        )
        
        return {'notificado': True}
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina {nomina_id} no encontrada para notificación')
        return {'notificado': False}


@shared_task
def enviar_notificacion_recordatorio(nomina_id, tipo):
    """
    Envía notificación de recordatorio
    """
    from payroll.models import NominaElectronica
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_id)
        
        # TODO: Implementar notificaciones
        
        logger.info(
            f'Recordatorio enviado para nómina {nomina.numero_documento}: {tipo}'
        )
        
        return {'recordatorio_enviado': True}
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina {nomina_id} no encontrada para recordatorio')
        return {'recordatorio_enviado': False}


@shared_task
def generar_pdf_nomina_async(nomina_electronica_id):
    """
    Genera PDF de nómina electrónica de forma asíncrona
    
    Args:
        nomina_electronica_id: ID de la nómina electrónica
        
    Returns:
        dict: Resultado de la generación
    """
    from payroll.models import NominaElectronica
    from payroll.pdf_generator import NominaElectronicaPDFGenerator
    
    try:
        nomina = NominaElectronica.objects.get(id=nomina_electronica_id)
        
        # Generar PDF
        generator = NominaElectronicaPDFGenerator(nomina)
        pdf_path = generator.generar()
        
        # Guardar referencia
        nomina.pdf_generado = pdf_path
        nomina.save(update_fields=['pdf_generado'])
        
        logger.info(f'PDF generado para nómina {nomina.numero_documento}')
        
        return {
            'success': True,
            'nomina_id': nomina.id,
            'pdf_path': pdf_path
        }
        
    except NominaElectronica.DoesNotExist:
        logger.error(f'Nómina {nomina_electronica_id} no encontrada')
        return {'success': False, 'error': 'Nómina no encontrada'}
        
    except Exception as e:
        logger.error(f'Error generando PDF: {str(e)}')
        return {'success': False, 'error': str(e)}
