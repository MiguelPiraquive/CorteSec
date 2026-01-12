"""
Sistema de notificaciones para nómina electrónica
Soporta: Email, Push Notifications, Webhooks
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class NotificacionManager:
    """Manager para envío de notificaciones"""
    
    @staticmethod
    def notificar_nomina_generada(nomina_electronica):
        """
        Notifica que una nómina fue generada exitosamente
        
        Args:
            nomina_electronica: Instancia de NominaElectronica
        """
        try:
            empleado = nomina_electronica.nomina.empleado
            
            # Email al empleado
            EmailNotifier.enviar_nomina_disponible(
                destinatario=empleado.email,
                empleado_nombre=empleado.nombre_completo,
                numero_documento=nomina_electronica.numero_documento,
                neto_pagar=nomina_electronica.nomina.neto_pagar,
                periodo_inicio=nomina_electronica.nomina.periodo_inicio,
                periodo_fin=nomina_electronica.nomina.periodo_fin
            )
            
            # Webhook si está configurado
            WebhookNotifier.disparar_evento(
                evento='nomina.generada',
                datos={
                    'nomina_id': nomina_electronica.id,
                    'numero_documento': nomina_electronica.numero_documento,
                    'empleado_id': empleado.id,
                    'estado': nomina_electronica.estado
                },
                organization=nomina_electronica.organization
            )
            
            logger.info(f'Notificación enviada: nómina {nomina_electronica.numero_documento} generada')
            
        except Exception as e:
            logger.error(f'Error enviando notificación de nómina generada: {str(e)}')
    
    @staticmethod
    def notificar_nomina_aceptada(nomina_electronica):
        """
        Notifica que una nómina fue aceptada por DIAN
        
        Args:
            nomina_electronica: Instancia de NominaElectronica
        """
        try:
            empleado = nomina_electronica.nomina.empleado
            config = nomina_electronica.organization.configuracion_nomina_electronica.filter(
                activa=True
            ).first()
            
            if config and config.notificar_empleado:
                # Email al empleado
                EmailNotifier.enviar_nomina_aceptada(
                    destinatario=empleado.email,
                    empleado_nombre=empleado.nombre_completo,
                    numero_documento=nomina_electronica.numero_documento,
                    cune=nomina_electronica.cune,
                    fecha_validacion=nomina_electronica.fecha_validacion_dian
                )
                
                # Push notification si está disponible
                PushNotifier.enviar_push(
                    user_id=empleado.id,
                    titulo='Nómina Validada',
                    mensaje=f'Tu nómina {nomina_electronica.numero_documento} fue validada por DIAN',
                    datos={'nomina_id': nomina_electronica.id}
                )
            
            # Webhook
            WebhookNotifier.disparar_evento(
                evento='nomina.aceptada',
                datos={
                    'nomina_id': nomina_electronica.id,
                    'numero_documento': nomina_electronica.numero_documento,
                    'cune': nomina_electronica.cune,
                    'track_id': nomina_electronica.track_id
                },
                organization=nomina_electronica.organization
            )
            
            logger.info(f'Notificación enviada: nómina {nomina_electronica.numero_documento} aceptada')
            
        except Exception as e:
            logger.error(f'Error enviando notificación de nómina aceptada: {str(e)}')
    
    @staticmethod
    def notificar_nomina_rechazada(nomina_electronica):
        """
        Notifica que una nómina fue rechazada por DIAN
        
        Args:
            nomina_electronica: Instancia de NominaElectronica
        """
        try:
            # Email a administradores
            admins = nomina_electronica.organization.usuarios.filter(
                is_staff=True,
                is_active=True
            )
            
            for admin in admins:
                EmailNotifier.enviar_nomina_rechazada(
                    destinatario=admin.email,
                    admin_nombre=admin.nombre_completo,
                    numero_documento=nomina_electronica.numero_documento,
                    codigo_respuesta=nomina_electronica.codigo_respuesta,
                    mensaje_respuesta=nomina_electronica.mensaje_respuesta,
                    errores=nomina_electronica.errores
                )
            
            # Webhook
            WebhookNotifier.disparar_evento(
                evento='nomina.rechazada',
                datos={
                    'nomina_id': nomina_electronica.id,
                    'numero_documento': nomina_electronica.numero_documento,
                    'codigo': nomina_electronica.codigo_respuesta,
                    'mensaje': nomina_electronica.mensaje_respuesta,
                    'errores': nomina_electronica.errores
                },
                organization=nomina_electronica.organization
            )
            
            logger.warning(f'Notificación enviada: nómina {nomina_electronica.numero_documento} rechazada')
            
        except Exception as e:
            logger.error(f'Error enviando notificación de nómina rechazada: {str(e)}')


class EmailNotifier:
    """Notificaciones por email"""
    
    @staticmethod
    def enviar_nomina_disponible(destinatario, empleado_nombre, numero_documento,
                                   neto_pagar, periodo_inicio, periodo_fin):
        """Envía email cuando la nómina está disponible"""
        
        asunto = f'Tu Nómina {numero_documento} está disponible'
        
        # Contexto para el template
        contexto = {
            'empleado_nombre': empleado_nombre,
            'numero_documento': numero_documento,
            'neto_pagar': neto_pagar,
            'periodo_inicio': periodo_inicio,
            'periodo_fin': periodo_fin,
        }
        
        # Renderizar HTML
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2196f3; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f5f5f5; }}
                .info {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .amount {{ font-size: 24px; color: #4caf50; font-weight: bold; }}
                .footer {{ padding: 20px; text-align: center; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Nómina Disponible</h1>
                </div>
                <div class="content">
                    <p>Hola {empleado_nombre},</p>
                    <p>Tu documento de nómina electrónica está disponible para consulta.</p>
                    
                    <div class="info">
                        <p><strong>Documento:</strong> {numero_documento}</p>
                        <p><strong>Periodo:</strong> {periodo_inicio.strftime('%d/%m/%Y')} - {periodo_fin.strftime('%d/%m/%Y')}</p>
                        <p><strong>Neto a Pagar:</strong></p>
                        <p class="amount">${neto_pagar:,.2f}</p>
                    </div>
                    
                    <p>Puedes consultar el detalle completo ingresando al portal del empleado.</p>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático, por favor no responder.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Texto plano
        text_content = strip_tags(html_content)
        
        # Enviar
        try:
            msg = EmailMultiAlternatives(asunto, text_content, settings.DEFAULT_FROM_EMAIL, [destinatario])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            logger.info(f'Email enviado a {destinatario}')
        except Exception as e:
            logger.error(f'Error enviando email: {str(e)}')
    
    @staticmethod
    def enviar_nomina_aceptada(destinatario, empleado_nombre, numero_documento,
                                 cune, fecha_validacion):
        """Envía email cuando la nómina es aceptada por DIAN"""
        
        asunto = f'Nómina {numero_documento} validada por DIAN'
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4caf50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f5f5f5; }}
                .info {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .success {{ color: #4caf50; font-weight: bold; }}
                .cune {{ font-family: monospace; font-size: 11px; word-break: break-all; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✓ Nómina Validada</h1>
                </div>
                <div class="content">
                    <p>Hola {empleado_nombre},</p>
                    <p class="success">Tu nómina ha sido validada exitosamente por la DIAN.</p>
                    
                    <div class="info">
                        <p><strong>Documento:</strong> {numero_documento}</p>
                        <p><strong>Fecha de Validación:</strong> {fecha_validacion.strftime('%d/%m/%Y %H:%M')}</p>
                        <p><strong>CUNE:</strong></p>
                        <p class="cune">{cune}</p>
                    </div>
                    
                    <p>Este documento tiene plena validez legal.</p>
                    <p>Puedes descargar el PDF desde el portal del empleado.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = strip_tags(html_content)
        
        try:
            msg = EmailMultiAlternatives(asunto, text_content, settings.DEFAULT_FROM_EMAIL, [destinatario])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            logger.info(f'Email de aceptación enviado a {destinatario}')
        except Exception as e:
            logger.error(f'Error enviando email: {str(e)}')
    
    @staticmethod
    def enviar_nomina_rechazada(destinatario, admin_nombre, numero_documento,
                                  codigo_respuesta, mensaje_respuesta, errores):
        """Envía email cuando la nómina es rechazada por DIAN"""
        
        asunto = f'⚠ Nómina {numero_documento} rechazada por DIAN'
        
        errores_html = '<ul>'
        if errores:
            for key, value in errores.items():
                errores_html += f'<li><strong>{key}:</strong> {value}</li>'
        errores_html += '</ul>'
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f44336; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f5f5f5; }}
                .info {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .error {{ color: #f44336; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✗ Nómina Rechazada</h1>
                </div>
                <div class="content">
                    <p>Hola {admin_nombre},</p>
                    <p class="error">La nómina {numero_documento} fue rechazada por la DIAN.</p>
                    
                    <div class="info">
                        <p><strong>Documento:</strong> {numero_documento}</p>
                        <p><strong>Código:</strong> {codigo_respuesta}</p>
                        <p><strong>Mensaje:</strong> {mensaje_respuesta}</p>
                        {f"<p><strong>Errores:</strong></p>{errores_html}" if errores else ""}
                    </div>
                    
                    <p>Por favor revisa y corrige los errores para reenviar.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = strip_tags(html_content)
        
        try:
            msg = EmailMultiAlternatives(asunto, text_content, settings.DEFAULT_FROM_EMAIL, [destinatario])
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            logger.info(f'Email de rechazo enviado a {destinatario}')
        except Exception as e:
            logger.error(f'Error enviando email: {str(e)}')


class PushNotifier:
    """Notificaciones push (Firebase, OneSignal, etc.)"""
    
    @staticmethod
    def enviar_push(user_id, titulo, mensaje, datos=None):
        """
        Envía notificación push a un usuario
        
        Args:
            user_id: ID del usuario
            titulo: Título de la notificación
            mensaje: Mensaje de la notificación
            datos: Datos adicionales (dict)
        """
        try:
            # TODO: Implementar integración con Firebase Cloud Messaging o OneSignal
            
            # Ejemplo con Firebase:
            # from firebase_admin import messaging
            # message = messaging.Message(
            #     notification=messaging.Notification(
            #         title=titulo,
            #         body=mensaje,
            #     ),
            #     data=datos or {},
            #     token=user_device_token,
            # )
            # response = messaging.send(message)
            
            logger.info(f'Push notification enviada a user {user_id}: {titulo}')
            
        except Exception as e:
            logger.error(f'Error enviando push notification: {str(e)}')


class WebhookNotifier:
    """Sistema de webhooks para integraciones externas"""
    
    @staticmethod
    def disparar_evento(evento: str, datos: Dict[str, Any], organization):
        """
        Dispara un webhook para un evento específico
        
        Args:
            evento: Nombre del evento (ej: 'nomina.generada')
            datos: Datos del evento
            organization: Organización asociada
        """
        try:
            # Buscar webhooks configurados para este evento
            from payroll.models import WebhookConfig
            
            webhooks = WebhookConfig.objects.filter(
                organization=organization,
                activo=True,
                eventos__contains=[evento]
            )
            
            for webhook in webhooks:
                WebhookNotifier._enviar_webhook(
                    url=webhook.url,
                    evento=evento,
                    datos=datos,
                    secret=webhook.secret
                )
            
        except Exception as e:
            logger.error(f'Error disparando webhook: {str(e)}')
    
    @staticmethod
    def _enviar_webhook(url: str, evento: str, datos: Dict[str, Any], secret: str = None):
        """
        Envía petición HTTP al webhook
        
        Args:
            url: URL del webhook
            evento: Nombre del evento
            datos: Payload de datos
            secret: Secret para firma HMAC
        """
        try:
            import hmac
            import hashlib
            import json
            from datetime import datetime
            
            # Preparar payload
            payload = {
                'evento': evento,
                'timestamp': datetime.now().isoformat(),
                'datos': datos
            }
            
            payload_json = json.dumps(payload)
            
            # Calcular firma HMAC si hay secret
            headers = {'Content-Type': 'application/json'}
            if secret:
                signature = hmac.new(
                    secret.encode(),
                    payload_json.encode(),
                    hashlib.sha256
                ).hexdigest()
                headers['X-Webhook-Signature'] = signature
            
            # Enviar con timeout
            response = requests.post(
                url,
                data=payload_json,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f'Webhook enviado exitosamente a {url} para evento {evento}')
            else:
                logger.warning(
                    f'Webhook a {url} respondió con código {response.status_code}'
                )
            
        except requests.RequestException as e:
            logger.error(f'Error enviando webhook a {url}: {str(e)}')


class NotificacionBatch:
    """Envío de notificaciones en lote"""
    
    @staticmethod
    def notificar_nominas_generadas(nominas_ids: List[int]):
        """Notifica múltiples nóminas generadas"""
        from payroll.models import NominaElectronica
        
        nominas = NominaElectronica.objects.filter(id__in=nominas_ids)
        
        for nomina in nominas:
            NotificacionManager.notificar_nomina_generada(nomina)
    
    @staticmethod
    def enviar_resumen_mensual(organization, periodo):
        """Envía resumen mensual de nóminas a administradores"""
        from payroll.models import NominaElectronica
        from django.db.models import Sum, Count
        
        # Estadísticas del periodo
        stats = NominaElectronica.objects.filter(
            organization=organization,
            fecha_generacion__month=periodo.month,
            fecha_generacion__year=periodo.year
        ).aggregate(
            total=Count('id'),
            total_pagar=Sum('nomina__neto_pagar'),
            aceptadas=Count('id', filter=models.Q(estado='aceptado'))
        )
        
        # Email a administradores
        admins = organization.usuarios.filter(is_staff=True, is_active=True)
        
        for admin in admins:
            EmailNotifier.enviar_resumen_mensual(
                destinatario=admin.email,
                admin_nombre=admin.nombre_completo,
                periodo=periodo,
                stats=stats
            )
