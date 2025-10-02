# dashboard/websocket_consumer.py
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
from .realtime_data import RealTimeDataManager, realtime_updater, LiveMetricsTracker
from .models import Contractor, Project, Payment
from core.models import LogAuditoria, Organizacion
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class BaseConsumer(AsyncWebsocketConsumer):
    """Consumidor base con funcionalidad común"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.organization_id = None
        self.rate_limit_cache = {}
        self.last_heartbeat = None
    
    async def connect(self):
        """Conectar WebSocket"""
        try:
            # Autenticar usuario
            self.user = await self.get_user_from_scope()
            if not self.user or not self.user.is_authenticated:
                await self.close(code=4001)
                return
            
            # Validar permisos
            if not await self.check_permissions():
                await self.close(code=4003)
                return
            
            # Obtener organization_id de la URL
            self.organization_id = self.scope['url_route']['kwargs'].get('organization_id')
            
            # Verificar que el usuario pertenece a la organización
            if not await self.validate_organization_access():
                await self.close(code=4003)
                return
            
            await self.accept()
            
            # Unirse a grupos específicos
            await self.join_groups()
            
            # Inicializar heartbeat
            self.last_heartbeat = timezone.now()
            
            # Log de conexión
            await self.log_connection('connected')
            
        except Exception as e:
            logger.error(f"Error en conexión WebSocket: {str(e)}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Desconectar WebSocket"""
        try:
            await self.leave_groups()
            await self.log_connection('disconnected', {'close_code': close_code})
        except Exception as e:
            logger.error(f"Error en desconexión WebSocket: {str(e)}")
    
    async def receive(self, text_data):
        """Recibir mensaje"""
        try:
            # Verificar rate limiting
            if not await self.check_rate_limit():
                await self.send_error('Rate limit exceeded')
                return
            
            # Parsear mensaje
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Validar tipo de mensaje
            if not await self.validate_message_type(message_type):
                await self.send_error('Invalid message type')
                return
            
            # Actualizar heartbeat
            self.last_heartbeat = timezone.now()
            
            # Procesar mensaje
            await self.handle_message(message_type, data)
            
        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            logger.error(f"Error procesando mensaje: {str(e)}")
            await self.send_error('Internal error')
    
    # Métodos que deben ser implementados por las subclases
    async def join_groups(self):
        """Unirse a grupos de WebSocket"""
        pass
    
    async def leave_groups(self):
        """Salir de grupos de WebSocket"""
        pass
    
    async def handle_message(self, message_type, data):
        """Manejar mensaje específico"""
        pass
    
    async def check_permissions(self):
        """Verificar permisos del usuario"""
        return True
    
    async def validate_message_type(self, message_type):
        """Validar tipo de mensaje"""
        return True
    
    # Métodos auxiliares
    @database_sync_to_async
    def get_user_from_scope(self):
        """Obtener usuario del scope"""
        return self.scope.get('user')
    
    @database_sync_to_async
    def validate_organization_access(self):
        """Validar acceso a la organización"""
        if not self.organization_id:
            return True
        
        try:
            organization = Organizacion.objects.get(id=self.organization_id)
            return self.user.organizacion == organization
        except Organizacion.DoesNotExist:
            return False
    
    async def check_rate_limit(self):
        """Verificar límite de velocidad"""
        now = timezone.now()
        minute_key = f"{self.user.id}_{now.minute}"
        
        current_count = self.rate_limit_cache.get(minute_key, 0)
        if current_count >= 30:  # 30 mensajes por minuto
            return False
        
        self.rate_limit_cache[minute_key] = current_count + 1
        
        # Limpiar cache viejo
        for key in list(self.rate_limit_cache.keys()):
            if int(key.split('_')[1]) != now.minute:
                del self.rate_limit_cache[key]
        
        return True
    
    async def send_error(self, message):
        """Enviar mensaje de error"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def send_success(self, data=None):
        """Enviar mensaje de éxito"""
        await self.send(text_data=json.dumps({
            'type': 'success',
            'data': data,
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def log_connection(self, action, metadata=None):
        """Registrar conexión en log"""
        try:
            LogAuditoria.objects.create(
                usuario=self.user,
                organizacion=self.user.organizacion,
                accion=f'websocket_{action}',
                modelo='websocket',
                detalles=f'WebSocket {action}',
                metadata=metadata or {}
            )
        except Exception as e:
            logger.error(f"Error logging connection: {str(e)}")

class DashboardConsumer(BaseConsumer):
    """Consumidor para dashboard en tiempo real"""
    
    async def join_groups(self):
        """Unirse a grupo de dashboard"""
        self.group_name = f"dashboard_{self.organization_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Iniciar actualizaciones en tiempo real
        await realtime_updater.start_updates_for_user(
            self.user.id,
            self.organization_id,
            self
        )
    
    async def leave_groups(self):
        """Salir de grupo de dashboard"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        # Detener actualizaciones
        await realtime_updater.stop_updates_for_user(
            self.user.id,
            self.organization_id
        )
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes del dashboard"""
        if message_type == 'get_dashboard_data':
            await self.get_dashboard_data()
        
        elif message_type == 'subscribe_updates':
            await self.subscribe_updates(data.get('components', []))
        
        elif message_type == 'refresh_metrics':
            await self.refresh_metrics()
        
        elif message_type == 'heartbeat':
            await self.handle_heartbeat()
    
    async def get_dashboard_data(self):
        """Obtener datos del dashboard"""
        try:
            data_manager = RealTimeDataManager(self.organization_id)
            dashboard_data = await data_manager.get_dashboard_data()
            
            await self.send(text_data=json.dumps({
                'type': 'dashboard_data',
                'data': dashboard_data
            }))
            
        except Exception as e:
            await self.send_error(f'Error obteniendo datos: {str(e)}')
    
    async def subscribe_updates(self, components):
        """Suscribirse a actualizaciones específicas"""
        # Implementar suscripción a componentes específicos
        await self.send_success({'subscribed_to': components})
    
    async def refresh_metrics(self):
        """Refrescar métricas"""
        try:
            # Limpiar cache y obtener datos frescos
            cache.delete(f"realtime_{self.organization_id}_dashboard")
            await self.get_dashboard_data()
            
        except Exception as e:
            await self.send_error(f'Error refrescando métricas: {str(e)}')
    
    async def handle_heartbeat(self):
        """Manejar heartbeat"""
        await self.send(text_data=json.dumps({
            'type': 'heartbeat_ack',
            'timestamp': timezone.now().isoformat()
        }))
    
    # Handlers para mensajes de grupo
    async def dashboard_update(self, event):
        """Recibir actualización del dashboard"""
        await self.send(text_data=json.dumps(event['data']))

class NotificationConsumer(BaseConsumer):
    """Consumidor para notificaciones en tiempo real"""
    
    async def join_groups(self):
        """Unirse a grupo de notificaciones del usuario"""
        self.group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de grupo de notificaciones"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes de notificaciones"""
        if message_type == 'get_notifications':
            await self.get_notifications(data.get('limit', 50))
        
        elif message_type == 'mark_as_read':
            await self.mark_notification_as_read(data.get('notification_id'))
        
        elif message_type == 'mark_all_read':
            await self.mark_all_notifications_read()
    
    async def get_notifications(self, limit):
        """Obtener notificaciones del usuario"""
        try:
            from .push_notifications import NotificationManager
            manager = NotificationManager()
            
            notifications = manager.get_user_notifications(
                self.user.id,
                limit=limit
            )
            
            await self.send(text_data=json.dumps({
                'type': 'notifications_list',
                'data': notifications
            }))
            
        except Exception as e:
            await self.send_error(f'Error obteniendo notificaciones: {str(e)}')
    
    async def mark_notification_as_read(self, notification_id):
        """Marcar notificación como leída"""
        try:
            from .push_notifications import NotificationManager
            manager = NotificationManager()
            
            result = manager.mark_as_read(notification_id, self.user.id)
            
            if result['success']:
                await self.send_success({'notification_id': notification_id})
            else:
                await self.send_error(result['error'])
                
        except Exception as e:
            await self.send_error(f'Error marcando notificación: {str(e)}')
    
    async def mark_all_notifications_read(self):
        """Marcar todas las notificaciones como leídas"""
        try:
            from .push_notifications import NotificationLog
            
            updated = await database_sync_to_async(
                NotificationLog.objects.filter(
                    usuario=self.user,
                    leido=False
                ).update
            )(leido=True, fecha_lectura=timezone.now())
            
            await self.send_success({'marked_read': updated})
            
        except Exception as e:
            await self.send_error(f'Error marcando notificaciones: {str(e)}')
    
    # Handlers para notificaciones
    async def notification_message(self, event):
        """Recibir nueva notificación"""
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'data': event['data']
        }))

class ChatConsumer(BaseConsumer):
    """Consumidor para chat en tiempo real"""
    
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        
        await super().connect()
    
    async def join_groups(self):
        """Unirse a sala de chat"""
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de sala de chat"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes de chat"""
        if message_type == 'send_message':
            await self.send_chat_message(data.get('message', ''))
        
        elif message_type == 'typing_start':
            await self.handle_typing(True)
        
        elif message_type == 'typing_stop':
            await self.handle_typing(False)
        
        elif message_type == 'get_history':
            await self.get_chat_history(data.get('limit', 50))
    
    async def send_chat_message(self, message):
        """Enviar mensaje de chat"""
        if not message.strip():
            await self.send_error('Mensaje vacío')
            return
        
        # Guardar mensaje en base de datos
        chat_message = await self.save_chat_message(message)
        
        # Enviar a grupo
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'user': f"{self.user.first_name} {self.user.last_name}",
                'user_id': self.user.id,
                'timestamp': timezone.now().isoformat(),
                'message_id': chat_message.id if chat_message else None
            }
        )
    
    @database_sync_to_async
    def save_chat_message(self, message):
        """Guardar mensaje en base de datos"""
        try:
            # Aquí implementarías el modelo ChatMessage
            # return ChatMessage.objects.create(...)
            return None
        except Exception as e:
            logger.error(f"Error guardando mensaje: {str(e)}")
            return None
    
    async def handle_typing(self, is_typing):
        """Manejar indicador de escritura"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user': f"{self.user.first_name} {self.user.last_name}",
                'user_id': self.user.id,
                'is_typing': is_typing
            }
        )
    
    async def get_chat_history(self, limit):
        """Obtener historial de chat"""
        # Implementar obtención de historial
        await self.send_success({'history': []})
    
    # Handlers de grupo
    async def chat_message(self, event):
        """Recibir mensaje de chat"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'data': event
        }))
    
    async def typing_indicator(self, event):
        """Recibir indicador de escritura"""
        # No enviar a quien está escribiendo
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'data': event
            }))

class MetricsConsumer(BaseConsumer):
    """Consumidor para métricas en tiempo real"""
    
    async def join_groups(self):
        """Unirse a grupo de métricas"""
        self.group_name = f"metrics_{self.organization_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de grupo de métricas"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def check_permissions(self):
        """Solo administradores y managers pueden ver métricas"""
        return self.user.is_staff or hasattr(self.user, 'is_manager')
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes de métricas"""
        if message_type == 'get_live_metrics':
            await self.get_live_metrics()
        
        elif message_type == 'subscribe_metric':
            await self.subscribe_metric(data.get('metric_type'))
        
        elif message_type == 'reset_metrics':
            await self.reset_metrics(data.get('metric_type'))
    
    async def get_live_metrics(self):
        """Obtener métricas en vivo"""
        try:
            from .realtime_data import get_live_metrics
            
            metrics = get_live_metrics(self.organization_id)
            
            await self.send(text_data=json.dumps({
                'type': 'live_metrics',
                'data': metrics
            }))
            
        except Exception as e:
            await self.send_error(f'Error obteniendo métricas: {str(e)}')
    
    async def subscribe_metric(self, metric_type):
        """Suscribirse a métrica específica"""
        await self.send_success({'subscribed_to': metric_type})
    
    async def reset_metrics(self, metric_type):
        """Resetear métricas"""
        try:
            from .realtime_data import reset_live_metrics
            
            reset_live_metrics(self.organization_id, metric_type)
            await self.send_success({'reset': metric_type})
            
        except Exception as e:
            await self.send_error(f'Error reseteando métricas: {str(e)}')
    
    # Handlers de grupo
    async def metrics_update(self, event):
        """Recibir actualización de métricas"""
        await self.send(text_data=json.dumps({
            'type': 'metrics_update',
            'data': event['data']
        }))

class ProjectUpdatesConsumer(BaseConsumer):
    """Consumidor para actualizaciones de proyectos"""
    
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        await super().connect()
    
    async def join_groups(self):
        """Unirse a grupo del proyecto"""
        self.group_name = f"project_{self.project_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de grupo del proyecto"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes del proyecto"""
        if message_type == 'get_project_status':
            await self.get_project_status()
        
        elif message_type == 'update_progress':
            await self.update_project_progress(data.get('progress', 0))
        
        elif message_type == 'add_comment':
            await self.add_project_comment(data.get('comment', ''))
    
    async def get_project_status(self):
        """Obtener estado del proyecto"""
        try:
            project = await database_sync_to_async(
                Project.objects.get
            )(id=self.project_id)
            
            project_data = {
                'id': project.id,
                'nombre': project.nombre,
                'estado': project.estado,
                'progreso': getattr(project, 'progreso', 0),
                'fecha_inicio': project.fecha_inicio.isoformat() if project.fecha_inicio else None,
                'fecha_fin': project.fecha_fin.isoformat() if project.fecha_fin else None
            }
            
            await self.send(text_data=json.dumps({
                'type': 'project_status',
                'data': project_data
            }))
            
        except Project.DoesNotExist:
            await self.send_error('Proyecto no encontrado')
        except Exception as e:
            await self.send_error(f'Error obteniendo estado: {str(e)}')
    
    async def update_project_progress(self, progress):
        """Actualizar progreso del proyecto"""
        try:
            if not 0 <= progress <= 100:
                await self.send_error('Progreso debe estar entre 0 y 100')
                return
            
            # Actualizar progreso en base de datos
            await database_sync_to_async(
                Project.objects.filter(id=self.project_id).update
            )(progreso=progress)
            
            # Notificar a grupo
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'project_progress_update',
                    'progress': progress,
                    'updated_by': self.user.id,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            await self.send_error(f'Error actualizando progreso: {str(e)}')
    
    async def add_project_comment(self, comment):
        """Agregar comentario al proyecto"""
        if not comment.strip():
            await self.send_error('Comentario vacío')
            return
        
        try:
            # Guardar comentario (implementar modelo ProjectComment)
            # comment_obj = await self.save_project_comment(comment)
            
            # Notificar a grupo
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'project_comment_added',
                    'comment': comment,
                    'user': f"{self.user.first_name} {self.user.last_name}",
                    'user_id': self.user.id,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            await self.send_error(f'Error agregando comentario: {str(e)}')
    
    # Handlers de grupo
    async def project_progress_update(self, event):
        """Recibir actualización de progreso"""
        await self.send(text_data=json.dumps({
            'type': 'progress_update',
            'data': event
        }))
    
    async def project_comment_added(self, event):
        """Recibir nuevo comentario"""
        await self.send(text_data=json.dumps({
            'type': 'comment_added',
            'data': event
        }))

class TrackingConsumer(BaseConsumer):
    """Consumidor para tracking en tiempo real"""
    
    async def join_groups(self):
        """Unirse a grupo de tracking"""
        self.group_name = f"tracking_{self.organization_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de grupo de tracking"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def check_permissions(self):
        """Solo administradores pueden acceder al tracking"""
        return self.user.is_staff
    
    async def handle_message(self, message_type, data):
        """Manejar mensajes de tracking"""
        if message_type == 'get_tracking_data':
            await self.get_tracking_data()
        
        elif message_type == 'start_tracking':
            await self.start_tracking(data.get('contractor_id'))
        
        elif message_type == 'stop_tracking':
            await self.stop_tracking(data.get('contractor_id'))

class AlertsConsumer(BaseConsumer):
    """Consumidor para alertas del sistema"""
    
    async def join_groups(self):
        """Unirse a grupo de alertas"""
        self.group_name = f"alerts_{self.organization_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
    
    async def leave_groups(self):
        """Salir de grupo de alertas"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

class AdminConsumer(BaseConsumer):
    """Consumidor para canal de administración"""
    
    async def check_permissions(self):
        """Solo administradores pueden acceder"""
        return self.user.is_staff
    
    async def join_groups(self):
        """Unirse a canal de administración"""
        self.group_name = f"admin_{self.organization_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
