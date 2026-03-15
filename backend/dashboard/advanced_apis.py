# dashboard/advanced_apis.py
from rest_framework.decorators import api_view, permission_classes
from .policies import DashboardAccessPolicy, DashboardViewPolicy
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.cache import cache
from django.http import JsonResponse
import json
from .models import Project
from core.models import LogAuditoria, Organizacion
from django.contrib.auth import get_user_model

User = get_user_model()


def _get_organization_from_request(request):
    return (
        getattr(request, 'tenant', None)
        or getattr(request.user, 'organization', None)
        or getattr(request.user, 'organizacion', None)
    )

@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def advanced_dashboard_metrics(request):
    """API avanzada para métricas del dashboard"""
    user = request.user
    organization = _get_organization_from_request(request)

    if not organization:
        return Response({'error': 'Organización requerida'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Cache key para optimización
    cache_key = f'dashboard_metrics_{organization.id}_{user.id}'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        return Response(cached_data)
    
    # Fechas para análisis
    today = timezone.now().date()
    last_30_days = today - timedelta(days=30)
    last_7_days = today - timedelta(days=7)
    
    # Métricas avanzadas
    projects = Project.objects.filter(organization=organization)
    
    metrics = {
        'projects': {
            'total': projects.count(),
            'active': projects.filter(end_date__isnull=True).count(),
            'completed_this_month': projects.filter(
                end_date__isnull=False,
                end_date__gte=last_30_days
            ).count(),
            'by_status': {
                'active': projects.filter(end_date__isnull=True).count(),
                'completed': projects.filter(end_date__isnull=False).count(),
            },
            'avg_duration': calculate_average_duration(projects),
        },
        'trends': {
            'projects_weekly': get_weekly_trend(projects, 'start_date'),
        },
        'performance': {
            'completion_rate': calculate_completion_rate(projects),
        }
    }
    
    # Cache por 15 minutos
    cache.set(cache_key, metrics, 900)
    
    return Response(metrics)

@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def contractor_analytics(request):
    """Análisis detallado de proyectos (legacy endpoint)"""
    user = request.user
    organization = _get_organization_from_request(request)

    if not organization:
        return Response({'error': 'Organización requerida'}, status=status.HTTP_400_BAD_REQUEST)
    
    projects = Project.objects.filter(organization=organization)
    
    analytics = {
        'demographics': {},
        'performance': {
            'top_performers': [],
            'project_success_rate': calculate_project_success_rate(projects),
            'average_rating': 0,
        },
        'financial': {
            'payment_history': [],
            'earning_trends': [],
            'cost_efficiency': 0,
        }
    }
    
    return Response(analytics)

@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def project_analytics(request):
    """Análisis detallado de proyectos"""
    user = request.user
    organization = _get_organization_from_request(request)

    if not organization:
        return Response({'error': 'Organización requerida'}, status=status.HTTP_400_BAD_REQUEST)
    
    projects = Project.objects.filter(organization=organization)
    
    analytics = {
        'overview': {
            'total_projects': projects.count(),
            'success_rate': calculate_project_success_rate(projects),
            'average_duration': calculate_average_duration(projects),
            'budget_efficiency': calculate_budget_efficiency(projects),
        },
        'trends': {
            'monthly_projects': get_monthly_project_trends(projects),
            'completion_trends': get_completion_trends(projects),
            'budget_trends': get_budget_trends(projects),
        },
        'categories': {
            'by_status': {
                'active': projects.filter(end_date__isnull=True).count(),
                'completed': projects.filter(end_date__isnull=False).count(),
            },
        }
    }
    
    return Response(analytics)

@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def financial_analytics(request):
    """Análisis financiero avanzado (legacy - datos movidos a Flujo de Caja)"""
    return Response({
        'cash_flow': {},
        'payment_patterns': {},
        'forecasting': {},
        'note': 'Los datos financieros se gestionan desde el módulo de Flujo de Caja'
    })

@api_view(['POST'])
@permission_classes([DashboardAccessPolicy])
def bulk_operations(request):
    """Operaciones en lote para el dashboard"""
    user = request.user
    organization = _get_organization_from_request(request)

    if not organization:
        return Response({'error': 'Organización requerida'}, status=status.HTTP_400_BAD_REQUEST)
    
    operation = request.data.get('operation')
    entity_type = request.data.get('entity_type')
    entity_ids = request.data.get('entity_ids', [])
    
    if not all([operation, entity_type, entity_ids]):
        return Response({'error': 'Faltan parámetros requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if entity_type == 'projects':
            queryset = Project.objects.filter(organization=organization, id__in=entity_ids)
        else:
            return Response({'error': 'Tipo de entidad no válido'}, status=status.HTTP_400_BAD_REQUEST)
        
        result = perform_bulk_operation(operation, queryset, request.data.get('parameters', {}))
        
        # Log de auditoría
        LogAuditoria.objects.create(
            usuario=user,
            accion=f'bulk_{operation}',
            modelo=entity_type,
            metadata={
                'organization_id': str(organization.id),
                'operation': operation,
                'entity_type': entity_type,
                'entity_ids': entity_ids,
                'parameters': request.data.get('parameters', {})
            }
        )
        
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def export_data(request):
    """Exportar datos del dashboard"""
    user = request.user
    organization = _get_organization_from_request(request)

    if not organization:
        return Response({'error': 'Organización requerida'}, status=status.HTTP_400_BAD_REQUEST)
    
    export_type = request.GET.get('type', 'excel')
    entity_type = request.GET.get('entity_type', 'all')
    date_range = request.GET.get('date_range', '30')
    
    try:
        export_url = generate_export(organization, entity_type, date_range, export_type)
        
        return Response({
            'download_url': export_url,
            'expires_at': (timezone.now() + timedelta(hours=1)).isoformat()
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Funciones auxiliares
def get_weekly_trend(queryset, date_field):
    """Obtiene tendencia semanal usando ORM seguro"""
    from django.db.models.functions import TruncDate
    last_7_days = timezone.now().date() - timedelta(days=7)
    return list(
        queryset.filter(**{f'{date_field}__gte': last_7_days})
        .annotate(day=TruncDate(date_field))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )

def calculate_completion_rate(projects):
    """Calcula tasa de completación"""
    total = projects.count()
    if total == 0:
        return 0
    completed = projects.filter(end_date__isnull=False).count()
    return (completed / total) * 100

def calculate_satisfaction_score(queryset):
    """Calcula puntuación de satisfacción"""
    return 0

def get_age_distribution(queryset):
    """Distribución por antigüedad"""
    return {}

def get_top_performers(queryset):
    """Obtiene mejores entidades"""
    return []

def get_project_success_rates(queryset):
    """Tasa de éxito de proyectos"""
    return []

def calculate_cost_efficiency(queryset):
    """Calcula eficiencia de costos"""
    return 0

def calculate_project_success_rate(projects):
    """Tasa de éxito de proyectos"""
    total = projects.count()
    if total == 0:
        return 0
    successful = projects.filter(end_date__isnull=False).count()
    return (successful / total) * 100

def calculate_average_duration(projects):
    """Duración promedio de proyectos"""
    completed = projects.filter(end_date__isnull=False)
    if not completed.exists():
        return 0
    
    total_days = 0
    count = 0
    for project in completed:
        if project.start_date and project.end_date:
            duration = (project.end_date - project.start_date).days
            total_days += duration
            count += 1
    
    return total_days / count if count > 0 else 0

def calculate_budget_efficiency(projects):
    """Eficiencia presupuestaria"""
    total = projects.count() or 1
    completed = projects.filter(end_date__isnull=False).count()
    return (completed / total) * 100

def get_monthly_project_trends(projects):
    """Tendencias mensuales de proyectos"""
    trends = []
    today = timezone.now().date()
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        count = projects.filter(start_date__gte=month_start, start_date__lt=month_end).count()
        trends.append({'month': month_start.strftime('%Y-%m'), 'count': count})
    return trends

def get_completion_trends(projects):
    """Tendencias de completación"""
    trends = []
    today = timezone.now().date()
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        count = projects.filter(end_date__gte=month_start, end_date__lt=month_end).count()
        trends.append({'month': month_start.strftime('%Y-%m'), 'count': count})
    return trends

def get_budget_trends(projects):
    """Tendencias presupuestarias"""
    return get_monthly_project_trends(projects)


def perform_bulk_operation(operation, queryset, parameters):
    """Realiza operaciones en lote"""
    if operation == 'update_status':
        new_status = parameters.get('status')
        if new_status and hasattr(queryset.model, 'estado'):
            updated = queryset.update(estado=new_status)
            return {'updated': updated, 'message': f'{updated} elementos actualizados'}
        return {'error': 'El modelo no soporta estado'}

    elif operation == 'complete_projects':
        if queryset.model.__name__ == 'Project':
            updated = queryset.filter(end_date__isnull=True).update(end_date=timezone.now().date())
            return {'updated': updated, 'message': f'{updated} proyectos completados'}
        return {'error': 'Operación no válida para este modelo'}

    elif operation == 'delete':
        count = queryset.count()
        queryset.delete()
        return {'deleted': count, 'message': f'{count} elementos eliminados'}
    
    elif operation == 'archive':
        if hasattr(queryset.model, 'archivado'):
            updated = queryset.update(archivado=True)
            return {'archived': updated, 'message': f'{updated} elementos archivados'}
        return {'error': 'El modelo no soporta archivado'}
    
    return {'error': 'Operación no válida'}

def generate_export(organization, entity_type, date_range, export_type):
    """Genera archivo de exportación"""
    # Implementar lógica de exportación
    return f"/exports/{organization.id}_{entity_type}_{date_range}.{export_type}"
