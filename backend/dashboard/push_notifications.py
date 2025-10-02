# dashboard/push_notifications.py
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import requests
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.db import models
from core.models import AuditedModel as BaseModel
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class NotificationTemplate(BaseModel):
    """Plantillas de notificaciones"""
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50, choices=[
        ('email', 'Email'),
        ('push', 'Push Notification'),
        ('sms', 'SMS'),
        ('in_app', 'In-App'),
        ('webhook', 'Webhook')
    ])
    asunto = models.CharField(max_length=200)
    contenido = models.TextField()
    contenido_html = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'notification_templates'
        verbose_name = 'Plantilla de Notificación'
        verbose_name_plural = 'Plantillas de Notificaciones'

class NotificationSubscription(BaseModel):
    """Suscripciones a notificaciones push"""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    endpoint = models.URLField()
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'notification_subscriptions'
        unique_together = ['usuario', 'endpoint']

class NotificationLog(BaseModel):
    """Log de notificaciones enviadas"""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    enviado = models.BooleanField(default=False)
    leido = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'notification_logs'
        ordering = ['-fecha_envio']

class PushNotificationService:
    """Servicio de notificaciones push"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
        self.vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
        self.vapid_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        self.vapid_subject = getattr(settings, 'VAPID_SUBJECT', 'mailto:admin@contractor.com')
    
    def send_push_notification(self, user_id, title, message, data=None, url=None):
        """Envía notificación push a un usuario específico"""
        try:
            user = User.objects.get(id=user_id)
            subscriptions = NotificationSubscription.objects.filter(
                usuario=user, 
                activo=True
            )
            
            notification_data = {
                'title': title,
                'message': message,
                'data': data or {},
                'url': url,
                'timestamp': timezone.now().isoformat()
            }
            
            sent_count = 0
            for subscription in subscriptions:
                success = self._send_web_push(subscription, notification_data)
                if success:
                    sent_count += 1
                else:
                    # Marcar suscripción como inactiva si falla
                    subscription.activo = False
                    subscription.save()
            
            # Registrar en log
            NotificationLog.objects.create(
                usuario=user,
                tipo='push',
                titulo=title,
                mensaje=message,
                enviado=sent_count > 0,
                metadata={
                    'subscriptions_sent': sent_count,
                    'data': data,
                    'url': url
                }
            )
            
            # Enviar también por WebSocket
            self._send_websocket_notification(user, notification_data)
            
            return {
                'success': True,
                'sent_to': sent_count,
                'total_subscriptions': subscriptions.count()
            }
            
        except User.DoesNotExist:
            return {'success': False, 'error': 'Usuario no encontrado'}
        except Exception as e:
            logger.error(f"Error enviando push notification: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def send_bulk_notification(self, user_ids, title, message, data=None):
        """Envía notificaciones en lote"""
        results = []
        
        for user_id in user_ids:
            result = self.send_push_notification(user_id, title, message, data)
            results.append({
                'user_id': user_id,
                'success': result['success'],
                'sent_to': result.get('sent_to', 0)
            })
        
        return {
            'total_users': len(user_ids),
            'successful': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success']),
            'results': results
        }
    
    def send_role_notification(self, role, title, message, organizacion=None, data=None):
        """Envía notificación a usuarios con un rol específico"""
        users_query = User.objects.filter(is_active=True)
        
        if organization:
            users_query = users_query.filter(organizacion=organization)
        
        if role == 'admin':
            users_query = users_query.filter(is_staff=True)
        elif role == 'contractor':
            users_query = users_query.filter(is_staff=False)
        
        user_ids = list(users_query.values_list('id', flat=True))
        
        return self.send_bulk_notification(user_ids, title, message, data)
    
    def schedule_notification(self, user_id, title, message, send_at, data=None):
        """Programa una notificación para envío futuro"""
        from django_q.tasks import schedule
        
        schedule(
            'dashboard.push_notifications.send_scheduled_notification',
            user_id, title, message, data,
            schedule_type='O',  # Once
            next_run=send_at
        )
        
        return {'success': True, 'scheduled_for': send_at}
    
    def _send_web_push(self, subscription, data):
        """Envía notificación web push usando pywebpush"""
        try:
            from pywebpush import webpush, WebPushException
            
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth
                    }
                },
                data=json.dumps(data),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": self.vapid_subject
                }
            )
            return True
            
        except WebPushException as e:
            logger.error(f"Web push error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"General push error: {str(e)}")
            return False
    
    def _send_websocket_notification(self, user, data):
        """Envía notificación por WebSocket"""
        if self.channel_layer:
            async_to_sync(self.channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "notification_message",
                    "data": data
                }
            )

class EmailNotificationService:
    """Servicio de notificaciones por email"""
    
    def send_email_notification(self, user_id, template_name, context=None, attachments=None):
        """Envía notificación por email usando plantilla"""
        try:
            user = User.objects.get(id=user_id)
            template = NotificationTemplate.objects.get(
                nombre=template_name,
                tipo='email',
                activo=True
            )
            
            context = context or {}
            context.update({
                'user': user,
                'organization': user.organizacion,
                'base_url': settings.FRONTEND_URL
            })
            
            # Renderizar contenido
            subject = self._render_template_content(template.asunto, context)
            
            if template.contenido_html:
                html_message = self._render_template_content(template.contenido_html, context)
                plain_message = self._render_template_content(template.contenido, context)
            else:
                html_message = None
                plain_message = self._render_template_content(template.contenido, context)
            
            # Enviar email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False
            )
            
            # Registrar en log
            NotificationLog.objects.create(
                usuario=user,
                tipo='email',
                titulo=subject,
                mensaje=plain_message,
                enviado=True,
                metadata={
                    'template': template_name,
                    'context': context
                }
            )
            
            return {'success': True}
            
        except User.DoesNotExist:
            return {'success': False, 'error': 'Usuario no encontrado'}
        except NotificationTemplate.DoesNotExist:
            return {'success': False, 'error': 'Plantilla no encontrada'}
        except Exception as e:
            logger.error(f"Error enviando email: {str(e)}")
            
            # Registrar error en log
            if 'user' in locals():
                NotificationLog.objects.create(
                    usuario=user,
                    tipo='email',
                    titulo=template.asunto if 'template' in locals() else 'Error',
                    mensaje='Error al enviar email',
                    enviado=False,
                    error=str(e)
                )
            
            return {'success': False, 'error': str(e)}
    
    def _render_template_content(self, content, context):
        """Renderiza contenido de plantilla con contexto"""
        from django.template import Template, Context
        
        template = Template(content)
        return template.render(Context(context))

class SMSNotificationService:
    """Servicio de notificaciones SMS"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'SMS_API_KEY', '')
        self.api_url = getattr(settings, 'SMS_API_URL', '')
    
    def send_sms_notification(self, user_id, message):
        """Envía notificación SMS"""
        try:
            user = User.objects.get(id=user_id)
            
            if not hasattr(user, 'telefono') or not user.telefono:
                return {'success': False, 'error': 'Usuario sin número de teléfono'}
            
            # Configurar según proveedor SMS
            response = self._send_sms_api(user.telefono, message)
            
            # Registrar en log
            NotificationLog.objects.create(
                usuario=user,
                tipo='sms',
                titulo='SMS Notification',
                mensaje=message,
                enviado=response['success'],
                error=response.get('error'),
                metadata=response.get('metadata', {})
            )
            
            return response
            
        except User.DoesNotExist:
            return {'success': False, 'error': 'Usuario no encontrado'}
        except Exception as e:
            logger.error(f"Error enviando SMS: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _send_sms_api(self, phone, message):
        """Integración con API SMS (implementar según proveedor)"""
        # Ejemplo genérico - adaptar según proveedor (Twilio, etc.)
        try:
            if not self.api_key or not self.api_url:
                return {'success': False, 'error': 'SMS no configurado'}
            
            payload = {
                'to': phone,
                'message': message,
                'api_key': self.api_key
            }
            
            response = requests.post(self.api_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'metadata': {
                        'provider_response': response.json(),
                        'message_id': response.json().get('id')
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'API Error: {response.status_code}',
                    'metadata': {'response': response.text}
                }
                
        except requests.RequestException as e:
            return {'success': False, 'error': f'Request error: {str(e)}'}

class NotificationManager:
    """Gestor principal de notificaciones"""
    
    def __init__(self):
        self.push_service = PushNotificationService()
        self.email_service = EmailNotificationService()
        self.sms_service = SMSNotificationService()
    
    def send_notification(self, user_id, notification_type, **kwargs):
        """Envía notificación según tipo especificado"""
        
        if notification_type == 'push':
            return self.push_service.send_push_notification(
                user_id,
                kwargs.get('title', ''),
                kwargs.get('message', ''),
                kwargs.get('data'),
                kwargs.get('url')
            )
        
        elif notification_type == 'email':
            return self.email_service.send_email_notification(
                user_id,
                kwargs.get('template_name', ''),
                kwargs.get('context'),
                kwargs.get('attachments')
            )
        
        elif notification_type == 'sms':
            return self.sms_service.send_sms_notification(
                user_id,
                kwargs.get('message', '')
            )
        
        else:
            return {'success': False, 'error': 'Tipo de notificación no válido'}
    
    def send_multi_channel_notification(self, user_id, channels, **kwargs):
        """Envía notificación por múltiples canales"""
        results = {}
        
        for channel in channels:
            results[channel] = self.send_notification(user_id, channel, **kwargs)
        
        return results
    
    def get_user_notifications(self, user_id, limit=50, unread_only=False):
        """Obtiene notificaciones de un usuario"""
        query = NotificationLog.objects.filter(usuario_id=user_id)
        
        if unread_only:
            query = query.filter(leido=False)
        
        notifications = query.order_by('-fecha_envio')[:limit]
        
        return [
            {
                'id': notif.id,
                'tipo': notif.tipo,
                'titulo': notif.titulo,
                'mensaje': notif.mensaje,
                'fecha_envio': notif.fecha_envio,
                'leido': notif.leido,
                'metadata': notif.metadata
            }
            for notif in notifications
        ]
    
    def mark_as_read(self, notification_id, user_id):
        """Marca notificación como leída"""
        try:
            notification = NotificationLog.objects.get(
                id=notification_id,
                usuario_id=user_id
            )
            notification.leido = True
            notification.fecha_lectura = timezone.now()
            notification.save()
            
            return {'success': True}
            
        except NotificationLog.DoesNotExist:
            return {'success': False, 'error': 'Notificación no encontrada'}

# Funciones de conveniencia
def send_project_notification(project, event_type, user_ids=None):
    """Envía notificación relacionada con proyecto"""
    manager = NotificationManager()
    
    notifications_map = {
        'created': {
            'title': 'Nuevo Proyecto Creado',
            'message': f'El proyecto "{project.nombre}" ha sido creado',
            'template': 'project_created'
        },
        'updated': {
            'title': 'Proyecto Actualizado',
            'message': f'El proyecto "{project.nombre}" ha sido actualizado',
            'template': 'project_updated'
        },
        'completed': {
            'title': 'Proyecto Completado',
            'message': f'El proyecto "{project.nombre}" ha sido completado',
            'template': 'project_completed'
        },
        'deadline_approaching': {
            'title': 'Fecha Límite Próxima',
            'message': f'El proyecto "{project.nombre}" vence pronto',
            'template': 'project_deadline'
        }
    }
    
    if event_type not in notifications_map:
        return {'success': False, 'error': 'Tipo de evento no válido'}
    
    notification_config = notifications_map[event_type]
    
    if user_ids is None:
        # Notificar a todos los contratistas del proyecto
        user_ids = list(project.contratistas.values_list('id', flat=True))
    
    results = []
    for user_id in user_ids:
        result = manager.send_multi_channel_notification(
            user_id,
            ['push', 'email'],
            title=notification_config['title'],
            message=notification_config['message'],
            template_name=notification_config['template'],
            context={'project': project},
            data={'project_id': project.id, 'event': event_type}
        )
        results.append(result)
    
    return results

def send_payment_notification(payment, event_type):
    """Envía notificación relacionada con pago"""
    manager = NotificationManager()
    
    notifications_map = {
        'pending': {
            'title': 'Pago Pendiente',
            'message': f'Tienes un pago pendiente de ${payment.monto}',
            'template': 'payment_pending'
        },
        'completed': {
            'title': 'Pago Completado',
            'message': f'Tu pago de ${payment.monto} ha sido procesado',
            'template': 'payment_completed'
        },
        'failed': {
            'title': 'Error en Pago',
            'message': f'Hubo un error procesando tu pago de ${payment.monto}',
            'template': 'payment_failed'
        }
    }
    
    if event_type not in notifications_map:
        return {'success': False, 'error': 'Tipo de evento no válido'}
    
    notification_config = notifications_map[event_type]
    
    return manager.send_multi_channel_notification(
        payment.contratista.id,
        ['push', 'email'],
        title=notification_config['title'],
        message=notification_config['message'],
        template_name=notification_config['template'],
        context={'payment': payment},
        data={'payment_id': payment.id, 'event': event_type}
    )

def send_scheduled_notification(user_id, title, message, data=None):
    """Función para notificaciones programadas (Django-Q)"""
    manager = NotificationManager()
    return manager.send_notification(
        user_id,
        'push',
        title=title,
        message=message,
        data=data
    )

def get_notification_stats(organization_id, days=30):
    """Obtiene estadísticas de notificaciones"""
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    stats = NotificationLog.objects.filter(
        usuario__organizacion_id=organization_id,
        fecha_envio__gte=start_date
    ).aggregate(
        total_sent=models.Count('id'),
        total_read=models.Count('id', filter=models.Q(leido=True)),
        push_sent=models.Count('id', filter=models.Q(tipo='push')),
        email_sent=models.Count('id', filter=models.Q(tipo='email')),
        sms_sent=models.Count('id', filter=models.Q(tipo='sms'))
    )
    
    stats['read_rate'] = (
        (stats['total_read'] / stats['total_sent']) * 100
        if stats['total_sent'] > 0 else 0
    )
    
    return stats
