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


# ══════════════════════════════════════════════════════════════════════════════
# TAREAS FASE 3: LIQUIDACIONES AUTOMÁTICAS
# ══════════════════════════════════════════════════════════════════════════════

@shared_task(name='payroll.tasks.liquidar_fic_mensual')
def liquidar_fic_mensual():
    """
    Liquida el FIC del mes anterior para todas las organizaciones.
    
    Se ejecuta el día 1 de cada mes a las 00:00.
    Liquida el FIC del mes que acaba de cerrar.
    
    Returns:
        Dict con resultado de liquidaciones
    """
    from datetime import date, timedelta
    from payroll.models import LiquidacionFIC
    from core.models import Organization
    
    logger.info("Iniciando liquidación FIC mensual automática")
    
    # Calcular mes a liquidar (mes anterior)
    hoy = timezone.now().date()
    primer_dia_mes_actual = date(hoy.year, hoy.month, 1)
    ultimo_dia_mes_anterior = primer_dia_mes_actual - timedelta(days=1)
    
    anio = ultimo_dia_mes_anterior.year
    mes = ultimo_dia_mes_anterior.month
    
    logger.info(f"Liquidando FIC para período {anio}-{mes:02d}")
    
    # Procesar todas las organizaciones activas
    organizaciones = Organization.objects.filter(activo=True)
    
    resultados = {
        'total_organizaciones': 0,
        'exitosas': 0,
        'fallidas': 0,
        'detalles': [],
    }
    
    for org in organizaciones:
        resultados['total_organizaciones'] += 1
        
        try:
            # Liquidar FIC del mes
            liquidacion = LiquidacionFIC.liquidar_mes(
                organization=org,
                anio=anio,
                mes=mes,
                usuario=None  # Automático
            )
            
            resultados['exitosas'] += 1
            resultados['detalles'].append({
                'organization': org.nombre,
                'exitoso': True,
                'liquidacion_id': liquidacion.id,
                'total_empleados': liquidacion.numero_empleados,
                'total_fic': str(liquidacion.total_fic),
            })
            
            logger.info(
                f"FIC liquidado para {org.nombre}: "
                f"{liquidacion.numero_empleados} empleados, "
                f"${liquidacion.total_fic}"
            )
            
        except Exception as e:
            resultados['fallidas'] += 1
            resultados['detalles'].append({
                'organization': org.nombre,
                'exitoso': False,
                'error': str(e),
            })
            
            logger.error(
                f"Error liquidando FIC para {org.nombre}: {str(e)}",
                exc_info=True
            )
    
    logger.info(
        f"Liquidación FIC finalizada: "
        f"{resultados['exitosas']} exitosas, {resultados['fallidas']} fallidas"
    )
    
    return resultados


@shared_task(name='payroll.tasks.generar_pila_mensual')
def generar_pila_mensual(ruta_destino: str = '/tmp/pila/'):
    """
    Genera archivos PILA del mes anterior para todas las organizaciones.
    
    Se ejecuta el día 5 de cada mes (después de liquidar FIC).
    
    Args:
        ruta_destino: Ruta donde guardar archivos PILA
        
    Returns:
        Dict con resultado de generaciones
    """
    from datetime import date, timedelta
    from payroll.models import LiquidacionFIC
    from payroll.services.pila_generator import generar_pila
    from core.models import Organization
    
    logger.info("Iniciando generación PILA mensual automática")
    
    # Calcular mes a generar (mes anterior)
    hoy = timezone.now().date()
    primer_dia_mes_actual = date(hoy.year, hoy.month, 1)
    ultimo_dia_mes_anterior = primer_dia_mes_actual - timedelta(days=1)
    
    anio = ultimo_dia_mes_anterior.year
    mes = ultimo_dia_mes_anterior.month
    
    logger.info(f"Generando PILA para período {anio}-{mes:02d}")
    
    # Procesar todas las organizaciones activas
    organizaciones = Organization.objects.filter(activo=True)
    
    resultados = {
        'total_organizaciones': 0,
        'exitosas': 0,
        'fallidas': 0,
        'detalles': [],
    }
    
    for org in organizaciones:
        resultados['total_organizaciones'] += 1
        
        try:
            # Generar PILA
            resultado_pila = generar_pila(
                organization=org,
                anio=anio,
                mes=mes,
                guardar_ruta=ruta_destino
            )
            
            if resultado_pila['validacion']['valido']:
                resultados['exitosas'] += 1
                resultados['detalles'].append({
                    'organization': org.nombre,
                    'exitoso': True,
                    'ruta_archivo': resultado_pila['ruta'],
                    'total_registros': resultado_pila['validacion']['total_registros'],
                })
                
                logger.info(
                    f"PILA generado para {org.nombre}: "
                    f"{resultado_pila['ruta']}"
                )
                
                # Marcar FIC como incluido en PILA
                try:
                    liquidacion_fic = LiquidacionFIC.objects.get(
                        organization=org,
                        anio=anio,
                        mes=mes
                    )
                    liquidacion_fic.incluido_en_pila = True
                    liquidacion_fic.fecha_pila = hoy
                    liquidacion_fic.save()
                except LiquidacionFIC.DoesNotExist:
                    pass
            else:
                resultados['fallidas'] += 1
                resultados['detalles'].append({
                    'organization': org.nombre,
                    'exitoso': False,
                    'errores': resultado_pila['validacion']['errores'],
                })
                
                logger.warning(
                    f"PILA no válido para {org.nombre}: "
                    f"{resultado_pila['validacion']['errores']}"
                )
        
        except Exception as e:
            resultados['fallidas'] += 1
            resultados['detalles'].append({
                'organization': org.nombre,
                'exitoso': False,
                'error': str(e),
            })
            
            logger.error(
                f"Error generando PILA para {org.nombre}: {str(e)}",
                exc_info=True
            )
    
    logger.info(
        f"Generación PILA finalizada: "
        f"{resultados['exitosas']} exitosas, {resultados['fallidas']} fallidas"
    )
    
    return resultados


# ============================================================================
# TASKS HSE (Health, Safety & Environment) - FASE 4
# ============================================================================

@shared_task(name='payroll.tasks.verificar_certificados_vencidos')
def verificar_certificados_vencidos():
    """
    Verifica certificados próximos a vencer o vencidos.
    
    Ejecuta diariamente para:
    - Detectar certificados vencidos
    - Enviar alertas de certificados próximos a vencer
    - Bloquear empleados para nómina si aplica
    
    Schedule: Diario 06:00 AM
    """
    from payroll.models import CertificadoEmpleado, Empleado
    from payroll.signals.hse_alerts import notificar_bloqueo_nomina
    from django.utils import timezone
    
    logger.info("Iniciando verificación diaria de certificados...")
    
    hoy = timezone.now().date()
    
    resultados = {
        'total_certificados': 0,
        'vencidos': 0,
        'por_vencer': 0,
        'alertas_enviadas': 0,
        'empleados_bloqueados': 0,
        'errores': [],
    }
    
    # Obtener certificados no notificados
    certificados = CertificadoEmpleado.objects.filter(
        alerta_enviada=False,
        fecha_vencimiento__lte=hoy + timezone.timedelta(days=30)  # Próximos 30 días
    ).select_related('empleado', 'organization')
    
    resultados['total_certificados'] = certificados.count()
    
    for certificado in certificados:
        try:
            estado = certificado.estado
            
            if estado == CertificadoEmpleado.ESTADO_VENCIDO:
                resultados['vencidos'] += 1
                
                # Si es obligatorio para nómina, bloquear empleado
                if certificado.obligatorio_para_nomina:
                    empleado = certificado.empleado
                    
                    # Obtener todos los certificados vencidos del empleado
                    certs_vencidos = CertificadoEmpleado.objects.filter(
                        empleado=empleado,
                        obligatorio_para_nomina=True
                    ).filter(
                        fecha_vencimiento__lt=hoy
                    )
                    
                    if certs_vencidos.exists():
                        # Notificar bloqueo
                        notificar_bloqueo_nomina(empleado, list(certs_vencidos))
                        resultados['empleados_bloqueados'] += 1
                        
                        logger.warning(
                            f"Empleado bloqueado: {empleado.numero_documento} - "
                            f"{certs_vencidos.count()} certificados vencidos"
                        )
            
            elif estado == CertificadoEmpleado.ESTADO_POR_VENCER:
                resultados['por_vencer'] += 1
            
            # La alerta se envía automáticamente por el signal
            # Solo verificamos que se envió
            if certificado.requiere_alerta:
                resultados['alertas_enviadas'] += 1
        
        except Exception as e:
            resultados['errores'].append({
                'certificado_id': certificado.id,
                'empleado': certificado.empleado.numero_documento,
                'error': str(e),
            })
            logger.error(
                f"Error verificando certificado {certificado.id}: {str(e)}",
                exc_info=True
            )
    
    logger.info(
        f"Verificación certificados completada: "
        f"{resultados['vencidos']} vencidos, "
        f"{resultados['por_vencer']} por vencer, "
        f"{resultados['alertas_enviadas']} alertas enviadas, "
        f"{resultados['empleados_bloqueados']} empleados bloqueados"
    )
    
    return resultados


@shared_task(name='payroll.tasks.verificar_dotaciones_pendientes')
def verificar_dotaciones_pendientes():
    """
    Verifica dotaciones pendientes de entrega.
    
    Ejecuta diariamente para:
    - Detectar dotaciones vencidas (fecha programada pasada)
    - Enviar alertas a responsables
    - Generar reporte de incumplimientos
    
    Schedule: Diario 07:00 AM
    """
    from payroll.models import EntregaDotacion
    from django.utils import timezone
    
    logger.info("Iniciando verificación diaria de dotaciones...")
    
    hoy = timezone.now().date()
    
    resultados = {
        'total_pendientes': 0,
        'vencidas': 0,
        'alertas_enviadas': 0,
        'errores': [],
    }
    
    # Dotaciones pendientes
    dotaciones_pendientes = EntregaDotacion.objects.filter(
        estado=EntregaDotacion.ESTADO_PENDIENTE
    ).select_related('empleado', 'organization')
    
    resultados['total_pendientes'] = dotaciones_pendientes.count()
    
    for dotacion in dotaciones_pendientes:
        try:
            if dotacion.esta_vencida:
                resultados['vencidas'] += 1
                
                # La alerta se envía automáticamente por el signal
                # Solo verificamos que se registró
                if dotacion.observaciones and '[ALERTA_ENVIADA]' in dotacion.observaciones:
                    resultados['alertas_enviadas'] += 1
                
                logger.warning(
                    f"Dotación vencida: Empleado {dotacion.empleado.numero_documento} - "
                    f"{dotacion.get_tipo_dotacion_display()} - "
                    f"{dotacion.dias_retraso} días de retraso"
                )
        
        except Exception as e:
            resultados['errores'].append({
                'dotacion_id': dotacion.id,
                'empleado': dotacion.empleado.numero_documento,
                'error': str(e),
            })
            logger.error(
                f"Error verificando dotación {dotacion.id}: {str(e)}",
                exc_info=True
            )
    
    logger.info(
        f"Verificación dotaciones completada: "
        f"{resultados['total_pendientes']} pendientes, "
        f"{resultados['vencidas']} vencidas, "
        f"{resultados['alertas_enviadas']} alertas enviadas"
    )
    
    return resultados


@shared_task(name='payroll.tasks.generar_reporte_hse_semanal')
def generar_reporte_hse_semanal():
    """
    Genera reporte semanal de estado HSE.
    
    Incluye:
    - Resumen de certificados por estado
    - Dotaciones pendientes por período
    - Empleados bloqueados
    - Estadísticas de cumplimiento
    
    Schedule: Lunes 08:00 AM
    """
    from payroll.models import CertificadoEmpleado, EntregaDotacion, Empleado
    from core.models import Organization
    from django.utils import timezone
    from django.core.mail import send_mail
    from django.conf import settings
    
    logger.info("Generando reporte HSE semanal...")
    
    hoy = timezone.now().date()
    
    reporte = {
        'fecha_generacion': hoy.isoformat(),
        'organizaciones': [],
        'resumen_global': {
            'total_empleados': 0,
            'certificados_vencidos': 0,
            'certificados_por_vencer': 0,
            'dotaciones_vencidas': 0,
            'empleados_bloqueados': 0,
        }
    }
    
    # Iterar por organización
    organizaciones = Organization.objects.filter(activo=True)
    
    for org in organizaciones:
        empleados = Empleado.objects.filter(organization=org, activo=True)
        total_empleados = empleados.count()
        
        if total_empleados == 0:
            continue
        
        # Certificados
        certs_vencidos = CertificadoEmpleado.objects.filter(
            organization=org,
            fecha_vencimiento__lt=hoy
        ).count()
        
        certs_por_vencer = CertificadoEmpleado.objects.filter(
            organization=org,
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=hoy + timezone.timedelta(days=30)
        ).count()
        
        # Dotaciones
        dots_vencidas = EntregaDotacion.objects.filter(
            organization=org,
            estado=EntregaDotacion.ESTADO_PENDIENTE,
            fecha_programada__lt=hoy
        ).count()
        
        # Empleados bloqueados (con certificados obligatorios vencidos)
        empleados_bloqueados = 0
        for emp in empleados:
            certs_obligatorios_vencidos = CertificadoEmpleado.objects.filter(
                empleado=emp,
                obligatorio_para_nomina=True,
                fecha_vencimiento__lt=hoy
            ).exists()
            
            if certs_obligatorios_vencidos:
                empleados_bloqueados += 1
        
        org_data = {
            'nombre': org.name,
            'total_empleados': total_empleados,
            'certificados_vencidos': certs_vencidos,
            'certificados_por_vencer': certs_por_vencer,
            'dotaciones_vencidas': dots_vencidas,
            'empleados_bloqueados': empleados_bloqueados,
            'porcentaje_cumplimiento': round(
                ((total_empleados - empleados_bloqueados) / total_empleados * 100)
                if total_empleados > 0 else 100,
                2
            )
        }
        
        reporte['organizaciones'].append(org_data)
        
        # Sumar a global
        reporte['resumen_global']['total_empleados'] += total_empleados
        reporte['resumen_global']['certificados_vencidos'] += certs_vencidos
        reporte['resumen_global']['certificados_por_vencer'] += certs_por_vencer
        reporte['resumen_global']['dotaciones_vencidas'] += dots_vencidas
        reporte['resumen_global']['empleados_bloqueados'] += empleados_bloqueados
    
    # Enviar reporte por email
    try:
        destinatarios = []
        
        email_hse = getattr(settings, 'EMAIL_HSE_RESPONSABLE', None)
        if email_hse:
            destinatarios.append(email_hse)
        
        email_rrhh = getattr(settings, 'EMAIL_RRHH_RESPONSABLE', None)
        if email_rrhh:
            destinatarios.append(email_rrhh)
        
        if destinatarios:
            asunto = f"📊 Reporte HSE Semanal - {hoy.strftime('%Y-%m-%d')}"
            
            # Construir tabla organizaciones
            tabla_orgs = ""
            for org_data in reporte['organizaciones']:
                tabla_orgs += f"""
{org_data['nombre']}:
  - Empleados: {org_data['total_empleados']}
  - Certificados vencidos: {org_data['certificados_vencidos']}
  - Certificados por vencer: {org_data['certificados_por_vencer']}
  - Dotaciones vencidas: {org_data['dotaciones_vencidas']}
  - Empleados bloqueados: {org_data['empleados_bloqueados']}
  - Cumplimiento: {org_data['porcentaje_cumplimiento']}%
"""
            
            mensaje = f"""
REPORTE HSE SEMANAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN GLOBAL:
- Total Empleados: {reporte['resumen_global']['total_empleados']}
- Certificados Vencidos: {reporte['resumen_global']['certificados_vencidos']}
- Certificados Por Vencer (30 días): {reporte['resumen_global']['certificados_por_vencer']}
- Dotaciones Vencidas: {reporte['resumen_global']['dotaciones_vencidas']}
- Empleados Bloqueados: {reporte['resumen_global']['empleados_bloqueados']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETALLE POR ORGANIZACIÓN:

{tabla_orgs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fecha de Generación: {reporte['fecha_generacion']}

Este reporte es generado automáticamente cada lunes.
            """
            
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=destinatarios,
                fail_silently=False,
            )
            
            logger.info("Reporte HSE semanal enviado por email")
    
    except Exception as e:
        logger.error(f"Error enviando reporte HSE semanal: {str(e)}")
    
    logger.info("Reporte HSE semanal generado exitosamente")
    
    return reporte


# ============================================================================
# NOTIFICACIONES HSE CON SISTEMA DE NOTIFICACIONES (FASE 6)
# ============================================================================

@shared_task
def enviar_alertas_certificados_vencidos():
    """
    Envía notificaciones SMS/WhatsApp a responsables HSE sobre certificados vencidos.
    
    Integración con payroll.interfaces.notifications para alertas urgentes.
    """
    from payroll.models import CertificadoEmpleado
    from payroll.interfaces.notifications import (
        NotificationRecipient,
        NotificationPriority,
        send_sms_notification,
        send_email_notification,
    )
    
    try:
        # Obtener certificados vencidos hace menos de 7 días (aún no notificados)
        hoy = timezone.now().date()
        hace_7_dias = hoy - timedelta(days=7)
        
        certificados_vencidos = CertificadoEmpleado.objects.filter(
            fecha_vencimiento__lt=hoy,
            fecha_vencimiento__gte=hace_7_dias,
            es_bloqueante=True
        ).select_related('empleado', 'organization')
        
        if not certificados_vencidos.exists():
            logger.info("No hay certificados vencidos recientes para notificar")
            return {'success': True, 'notificaciones_enviadas': 0}
        
        # Agrupar por organización
        from collections import defaultdict
        certificados_por_org = defaultdict(list)
        
        for cert in certificados_vencidos:
            certificados_por_org[cert.organization].append(cert)
        
        notificaciones_enviadas = 0
        
        # Enviar notificaciones por organización
        for org, certificados in certificados_por_org.items():
            # Obtener contacto HSE de la organización
            hse_email = getattr(org, 'email_hse', None)
            hse_phone = getattr(org, 'telefono_hse', None)
            
            if not hse_email and not hse_phone:
                logger.warning(f"Sin contacto HSE para organización {org.name}")
                continue
            
            # Preparar resumen
            resumen = f"⚠️ ALERTA HSE - {org.name}\n\n"
            resumen += f"Certificados vencidos bloqueantes: {len(certificados)}\n\n"
            
            for cert in certificados[:5]:  # Máximo 5 en SMS
                dias_vencido = (hoy - cert.fecha_vencimiento).days
                resumen += f"• {cert.empleado.nombre_completo}: {cert.tipo_certificado} (vencido hace {dias_vencido} días)\n"
            
            if len(certificados) > 5:
                resumen += f"\n...y {len(certificados) - 5} más. Ver email para detalle completo."
            
            recipient = NotificationRecipient(
                name=f"HSE {org.name}",
                email=hse_email,
                phone=hse_phone
            )
            
            # Enviar SMS urgente
            if hse_phone:
                send_sms_notification(
                    recipients=[recipient],
                    body=resumen[:160],  # Límite SMS
                    priority=NotificationPriority.HIGH
                )
                notificaciones_enviadas += 1
            
            # Enviar email con detalles completos
            if hse_email:
                context = {
                    'organization': org,
                    'certificados': certificados,
                    'total': len(certificados),
                    'fecha': hoy,
                }
                
                send_email_notification(
                    recipients=[recipient],
                    subject=f"⚠️ ALERTA HSE: {len(certificados)} Certificados Vencidos Bloqueantes",
                    body=resumen,
                    template='payroll/emails/alerta_certificados_vencidos.html',
                    context=context,
                    priority=NotificationPriority.HIGH
                )
                notificaciones_enviadas += 1
        
        logger.info(f"✅ Alertas HSE enviadas: {notificaciones_enviadas} notificaciones")
        
        return {
            'success': True,
            'notificaciones_enviadas': notificaciones_enviadas,
            'certificados_procesados': certificados_vencidos.count()
        }
    
    except Exception as e:
        logger.error(f"Error enviando alertas certificados vencidos: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def enviar_recordatorios_certificados_proximos_vencer():
    """
    Envía recordatorios por email a empleados con certificados próximos a vencer.
    
    Ejecutar semanalmente (lunes).
    """
    from payroll.models import CertificadoEmpleado
    from payroll.interfaces.notifications import (
        NotificationRecipient,
        NotificationPriority,
        send_email_notification,
        send_whatsapp_notification,
    )
    
    try:
        # Certificados que vencen en los próximos 30 días
        hoy = timezone.now().date()
        en_30_dias = hoy + timedelta(days=30)
        
        certificados_por_vencer = CertificadoEmpleado.objects.filter(
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=en_30_dias,
            estado='vigente'
        ).select_related('empleado', 'organization')
        
        if not certificados_por_vencer.exists():
            logger.info("No hay certificados próximos a vencer")
            return {'success': True, 'recordatorios_enviados': 0}
        
        recordatorios_enviados = 0
        
        for cert in certificados_por_vencer:
            dias_restantes = (cert.fecha_vencimiento - hoy).days
            
            # Notificar al empleado
            if cert.empleado.email:
                recipient = NotificationRecipient(
                    name=cert.empleado.nombre_completo,
                    email=cert.empleado.email,
                    whatsapp=cert.empleado.whatsapp if hasattr(cert.empleado, 'whatsapp') else None
                )
                
                context = {
                    'empleado': cert.empleado,
                    'certificado': cert,
                    'dias_restantes': dias_restantes,
                    'urgente': dias_restantes <= 7,
                }
                
                # Email recordatorio
                send_email_notification(
                    recipients=[recipient],
                    subject=f"🔔 Recordatorio: Certificado {cert.tipo_certificado} vence en {dias_restantes} días",
                    body=f"Hola {cert.empleado.nombres},\n\n"
                         f"Tu certificado de {cert.tipo_certificado} vence el {cert.fecha_vencimiento.strftime('%d/%m/%Y')} "
                         f"({dias_restantes} días restantes).\n\n"
                         f"Por favor, renueva tu certificado antes de la fecha de vencimiento.",
                    template='payroll/emails/recordatorio_certificado.html',
                    context=context,
                    priority=NotificationPriority.HIGH if dias_restantes <= 7 else NotificationPriority.NORMAL
                )
                recordatorios_enviados += 1
                
                # WhatsApp si es urgente (≤7 días)
                if dias_restantes <= 7 and recipient.whatsapp:
                    send_whatsapp_notification(
                        recipients=[recipient],
                        body=f"⚠️ URGENTE: Tu certificado {cert.tipo_certificado} vence en {dias_restantes} días ({cert.fecha_vencimiento.strftime('%d/%m/%Y')}). "
                             f"Por favor, renuévalo cuanto antes para evitar bloqueos.",
                        priority=NotificationPriority.HIGH
                    )
        
        logger.info(f"✅ Recordatorios certificados enviados: {recordatorios_enviados}")
        
        return {
            'success': True,
            'recordatorios_enviados': recordatorios_enviados,
            'certificados_procesados': certificados_por_vencer.count()
        }
    
    except Exception as e:
        logger.error(f"Error enviando recordatorios certificados: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def enviar_alertas_contratos_vencimiento():
    """
    Envía alertas sobre contratos próximos a vencer (30, 15, 7 días).
    
    Notifica a RRHH para gestión de renovaciones.
    """
    from payroll.models import Contrato
    from payroll.interfaces.notifications import (
        NotificationRecipient,
        NotificationPriority,
        send_email_notification,
    )
    
    try:
        hoy = timezone.now().date()
        
        # Contratos que vencen en 30, 15 o 7 días
        fechas_alerta = [
            hoy + timedelta(days=30),
            hoy + timedelta(days=15),
            hoy + timedelta(days=7),
        ]
        
        contratos_por_vencer = Contrato.objects.filter(
            fecha_fin__in=fechas_alerta,
            estado='ACTIVO'
        ).select_related('empleado', 'organization')
        
        if not contratos_por_vencer.exists():
            logger.info("No hay contratos próximos a vencer en fechas críticas")
            return {'success': True, 'alertas_enviadas': 0}
        
        # Agrupar por organización
        from collections import defaultdict
        contratos_por_org = defaultdict(list)
        
        for contrato in contratos_por_vencer:
            contratos_por_org[contrato.organization].append(contrato)
        
        alertas_enviadas = 0
        
        for org, contratos in contratos_por_org.items():
            rrhh_email = getattr(org, 'email_rrhh', None)
            
            if not rrhh_email:
                logger.warning(f"Sin email RRHH para organización {org.name}")
                continue
            
            recipient = NotificationRecipient(
                name=f"RRHH {org.name}",
                email=rrhh_email
            )
            
            context = {
                'organization': org,
                'contratos': contratos,
                'total': len(contratos),
                'fecha_actual': hoy,
            }
            
            send_email_notification(
                recipients=[recipient],
                subject=f"📋 Alerta: {len(contratos)} Contratos Próximos a Vencer",
                body=f"Se detectaron {len(contratos)} contratos próximos a vencer que requieren atención. "
                     f"Revisar listado adjunto para gestionar renovaciones.",
                template='payroll/emails/alerta_contratos_vencimiento.html',
                context=context,
                priority=NotificationPriority.NORMAL
            )
            alertas_enviadas += 1
        
        logger.info(f"✅ Alertas contratos enviadas: {alertas_enviadas}")
        
        return {
            'success': True,
            'alertas_enviadas': alertas_enviadas,
            'contratos_procesados': contratos_por_vencer.count()
        }
    
    except Exception as e:
        logger.error(f"Error enviando alertas contratos: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def enviar_notificacion_dispersion_bancaria(nominas_ids: list):
    """
    Envía notificaciones WhatsApp a empleados confirmando dispersión bancaria.
    
    Args:
        nominas_ids: Lista de IDs de nóminas dispersadas
    """
    from payroll.models import NominaBase
    from payroll.interfaces.notifications import (
        NotificationRecipient,
        NotificationPriority,
        send_whatsapp_notification,
    )
    
    try:
        nominas = NominaBase.objects.filter(
            id__in=nominas_ids,
            estado='dispersado'
        ).select_related('empleado', 'periodo')
        
        if not nominas.exists():
            logger.warning("No se encontraron nóminas dispersadas para notificar")
            return {'success': False, 'error': 'No hay nóminas'}
        
        notificaciones_enviadas = 0
        
        for nomina in nominas:
            # Solo si tiene WhatsApp configurado
            if not hasattr(nomina.empleado, 'whatsapp') or not nomina.empleado.whatsapp:
                continue
            
            recipient = NotificationRecipient(
                name=nomina.empleado.nombre_completo,
                whatsapp=nomina.empleado.whatsapp
            )
            
            mensaje = (
                f"💰 ¡Pago Realizado! 💰\n\n"
                f"Hola {nomina.empleado.nombres},\n\n"
                f"Te confirmamos que el pago de tu nómina del período {nomina.periodo.nombre} "
                f"ha sido dispersado exitosamente.\n\n"
                f"💵 Monto: ${nomina.neto_pagar:,.2f}\n"
                f"🏦 Cuenta: {nomina.cuenta_bancaria or 'registrada'}\n"
                f"📅 Fecha: {timezone.now().strftime('%d/%m/%Y %H:%M')}\n\n"
                f"El dinero debería reflejarse en tu cuenta en las próximas horas."
            )
            
            send_whatsapp_notification(
                recipients=[recipient],
                body=mensaje,
                priority=NotificationPriority.NORMAL
            )
            notificaciones_enviadas += 1
        
        logger.info(f"✅ Notificaciones dispersión enviadas: {notificaciones_enviadas}")
        
        return {
            'success': True,
            'notificaciones_enviadas': notificaciones_enviadas,
            'nominas_procesadas': nominas.count()
        }
    
    except Exception as e:
        logger.error(f"Error enviando notificaciones dispersión: {str(e)}")
        return {'success': False, 'error': str(e)}
