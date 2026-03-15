# dashboard/realtime_data.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Count, Sum, Avg, Q
from asgiref.sync import async_to_sync
from rest_framework.decorators import api_view, permission_classes
from .policies import DashboardViewPolicy
from rest_framework.response import Response
import json
import asyncio
from datetime import datetime, timedelta
from .models import Project
from core.models import LogAuditoria, Organizacion
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class RealTimeDataManager:
    """Gestor de datos en tiempo real"""
    
    def __init__(self, organization_id):
        self.organization_id = organization_id
        self.cache_prefix = f"realtime_{organization_id}_"
        self.update_interval = 30  # segundos
    
    async def get_dashboard_data(self):
        """Obtiene datos del dashboard en tiempo real"""
        try:
            data = {
                'timestamp': timezone.now().isoformat(),
                'metrics': await self._get_real_time_metrics(),
                'activities': await self._get_recent_activities(),
                'alerts': await self._get_active_alerts(),
                'performance': await self._get_performance_metrics(),
                'financial': await self._get_financial_summary()
            }
            
            # Cache por corto tiempo
            cache.set(f"{self.cache_prefix}dashboard", data, 60)
            
            return data
            
        except Exception as e:
            logger.error(f"Error obteniendo datos en tiempo real: {str(e)}")
            return {'error': str(e)}
    
    @database_sync_to_async
    def _get_real_time_metrics(self):
        """Métricas básicas en tiempo real"""
        try:
            organization = Organizacion.objects.get(id=self.organization_id)
            
            projects = Project.objects.filter(organization=organization)
            
            today = timezone.now().date()
            
            return {
                'projects': {
                    'total': projects.count(),
                    'active': projects.filter(end_date__isnull=True).count(),
                    'due_today': projects.filter(
                        end_date=today
                    ).count(),
                    'overdue': projects.filter(
                        end_date__lt=today,
                        end_date__isnull=False
                    ).count()
                }
            }
            
        except Exception as e:
            logger.error(f"Error en métricas tiempo real: {str(e)}")
            return {}
    
    @database_sync_to_async
    def _get_recent_activities(self, limit=10):
        """Actividades recientes"""
        try:
            activities = LogAuditoria.objects.filter(
                usuario__organization_id=self.organization_id
            ).select_related('usuario').order_by('-created_at')[:limit]
            
            return [
                {
                    'id': activity.id,
                    'usuario': f"{activity.usuario.first_name} {activity.usuario.last_name}",
                    'accion': activity.accion,
                    'modelo': activity.modelo,
                    'timestamp': activity.created_at.isoformat(),
                    'detalles': activity.metadata
                }
                for activity in activities
            ]
            
        except Exception as e:
            logger.error(f"Error en actividades recientes: {str(e)}")
            return []
    
    @database_sync_to_async
    def _get_active_alerts(self):
        """Alertas activas del sistema"""
        try:
            organization = Organizacion.objects.get(id=self.organization_id)
            alerts = []
            
            # Proyectos vencidos
            overdue_projects = Project.objects.filter(
                organization=organization,
                end_date__lt=timezone.now().date(),
                end_date__isnull=False
            ).count()
            
            if overdue_projects > 0:
                alerts.append({
                    'type': 'warning',
                    'title': 'Proyectos Vencidos',
                    'message': f'{overdue_projects} proyecto(s) vencido(s)',
                    'count': overdue_projects,
                    'url': '/projects?filter=overdue'
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error en alertas activas: {str(e)}")
            return []
    
    @database_sync_to_async
    def _get_performance_metrics(self):
        """Métricas de rendimiento"""
        try:
            organization = Organizacion.objects.get(id=self.organization_id)
            
            # Tasa de completación de proyectos
            total_projects = Project.objects.filter(organization=organization).count()
            completed_projects = Project.objects.filter(
                organization=organization,
                end_date__isnull=False
            ).count()
            
            completion_rate = (
                (completed_projects / total_projects * 100) 
                if total_projects > 0 else 0
            )
            
            return {
                'completion_rate': round(completion_rate, 2),
                'active_projects_ratio': round(
                    (Project.objects.filter(
                        organization=organization,
                        end_date__isnull=True
                    ).count() / total_projects * 100) if total_projects > 0 else 0, 2
                )
            }
            
        except Exception as e:
            logger.error(f"Error en métricas de rendimiento: {str(e)}")
            return {}
    
    @database_sync_to_async
    def _get_financial_summary(self):
        """Resumen financiero (legacy - datos en Flujo de Caja)"""
        return {
            'monthly_income': 0,
            'monthly_expenses': 0,
            'monthly_profit': 0,
            'pending_payments': 0,
            'cash_flow_trend': []
        }


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def realtime_snapshot(request):
    """Snapshot de datos en tiempo real para dashboard."""
    organization = (
        getattr(request, 'tenant', None)
        or getattr(request.user, 'organization', None)
        or getattr(request.user, 'organizacion', None)
    )

    if not organization:
        return Response({'error': 'Organización requerida'}, status=400)

    manager = RealTimeDataManager(str(organization.id))
    data = async_to_sync(manager.get_dashboard_data)()
    return Response(data)
    
class RealTimeUpdater:
    """Actualizador de datos en tiempo real"""
    
    def __init__(self):
        self.active_connections = {}
        self.update_tasks = {}
    
    async def start_updates_for_user(self, user_id, organization_id, websocket):
        """Inicia actualizaciones para un usuario"""
        connection_key = f"{user_id}_{organization_id}"
        
        self.active_connections[connection_key] = {
            'websocket': websocket,
            'user_id': user_id,
            'organization_id': organization_id,
            'last_update': timezone.now()
        }
        
        # Iniciar tarea de actualización
        if connection_key not in self.update_tasks:
            self.update_tasks[connection_key] = asyncio.create_task(
                self._update_loop(connection_key)
            )
    
    async def stop_updates_for_user(self, user_id, organization_id):
        """Detiene actualizaciones para un usuario"""
        connection_key = f"{user_id}_{organization_id}"
        
        # Cancelar tarea
        if connection_key in self.update_tasks:
            self.update_tasks[connection_key].cancel()
            del self.update_tasks[connection_key]
        
        # Remover conexión
        if connection_key in self.active_connections:
            del self.active_connections[connection_key]
    
    async def _update_loop(self, connection_key):
        """Loop de actualización para una conexión"""
        try:
            while connection_key in self.active_connections:
                connection = self.active_connections[connection_key]
                
                # Obtener datos actualizados
                data_manager = RealTimeDataManager(connection['organization_id'])
                data = await data_manager.get_dashboard_data()
                
                # Enviar datos por WebSocket
                await connection['websocket'].send(text_data=json.dumps({
                    'type': 'dashboard_update',
                    'data': data
                }))
                
                connection['last_update'] = timezone.now()
                
                # Esperar antes de la siguiente actualización
                await asyncio.sleep(30)  # 30 segundos
                
        except asyncio.CancelledError:
            logger.info(f"Actualización cancelada para {connection_key}")
        except Exception as e:
            logger.error(f"Error en loop de actualización: {str(e)}")
    
    async def broadcast_update(self, organization_id, update_type, data):
        """Transmite actualización a todos los usuarios de una organización"""
        message = json.dumps({
            'type': update_type,
            'data': data,
            'timestamp': timezone.now().isoformat()
        })
        
        for connection_key, connection in self.active_connections.items():
            if connection['organization_id'] == organization_id:
                try:
                    await connection['websocket'].send(text_data=message)
                except Exception as e:
                    logger.error(f"Error enviando broadcast: {str(e)}")

# Instancia global del actualizador
realtime_updater = RealTimeUpdater()

class LiveMetricsTracker:
    """Rastreador de métricas en vivo"""
    
    def __init__(self, organization_id):
        self.organization_id = organization_id
        self.metrics_cache = f"live_metrics_{organization_id}"
    
    async def track_event(self, event_type, entity_type, entity_id, user_id=None):
        """Rastrea un evento en tiempo real"""
        try:
            event_data = {
                'event_type': event_type,
                'entity_type': entity_type,
                'entity_id': entity_id,
                'user_id': user_id,
                'timestamp': timezone.now().isoformat(),
                'organization_id': self.organization_id
            }
            
            # Actualizar métricas en cache
            await self._update_live_metrics(event_type, entity_type)
            
            # Broadcast del evento
            await realtime_updater.broadcast_update(
                self.organization_id,
                'live_event',
                event_data
            )
            
            # Log del evento
            if user_id:
                await self._log_event(event_data)
            
        except Exception as e:
            logger.error(f"Error rastreando evento: {str(e)}")
    
    @database_sync_to_async
    def _update_live_metrics(self, event_type, entity_type):
        """Actualiza métricas en vivo"""
        cache_key = f"{self.metrics_cache}_{entity_type}"
        current_metrics = cache.get(cache_key, {})
        
        if event_type not in current_metrics:
            current_metrics[event_type] = 0
        
        current_metrics[event_type] += 1
        current_metrics['last_update'] = timezone.now().isoformat()
        
        cache.set(cache_key, current_metrics, 3600)  # 1 hora
    
    @database_sync_to_async
    def _log_event(self, event_data):
        """Registra evento en log de auditoría"""
        try:
            user = User.objects.get(id=event_data['user_id'])
            organization = Organizacion.objects.get(id=self.organization_id)
            
            LogAuditoria.objects.create(
                usuario=user,
                accion=f"live_{event_data['event_type']}",
                modelo=event_data['entity_type'],
                objeto_id=event_data['entity_id'],
                metadata={
                    'organization_id': str(self.organization_id),
                    'event_type': event_data['event_type'],
                    'entity_type': event_data['entity_type'],
                    'entity_id': event_data['entity_id']
                }
            )
            
        except Exception as e:
            logger.error(f"Error registrando evento: {str(e)}")

# Funciones de utilidad para integración
async def notify_project_update(project_id, update_type, user_id=None):
    """Notifica actualización de proyecto en tiempo real"""
    try:
        project = await database_sync_to_async(Project.objects.get)(id=project_id)
        tracker = LiveMetricsTracker(project.organization.id)
        
        await tracker.track_event(
            event_type=update_type,
            entity_type='project',
            entity_id=project_id,
            user_id=user_id
        )
        
    except Exception as e:
        logger.error(f"Error notificando actualización de proyecto: {str(e)}")


def get_live_metrics(organization_id, entity_type=None):
    """Obtiene métricas en vivo"""
    if entity_type:
        cache_key = f"live_metrics_{organization_id}_{entity_type}"
        return cache.get(cache_key, {})
    else:
        # Obtener todas las métricas
        all_metrics = {}
        for entity in ['project']:
            cache_key = f"live_metrics_{organization_id}_{entity}"
            cache.delete(cache_key)

# Configuración de señales para actualizaciones automáticas
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Project)
def project_saved_handler(sender, instance, created, **kwargs):
    """Handler para guardado de proyecto"""
    event_type = 'created' if created else 'updated'
    async_to_sync(notify_project_update)(instance.id, event_type)

@receiver(post_delete, sender=Project)
def project_deleted_handler(sender, instance, **kwargs):
    """Handler para eliminación de proyecto"""
    async_to_sync(notify_project_update)(instance.id, 'deleted')
