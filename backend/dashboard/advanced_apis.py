# dashboard/advanced_apis.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.cache import cache
from django.http import JsonResponse
import json
from .models import Contractor, Project, Payment
from core.models import LogAuditoria, Organizacion
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def advanced_dashboard_metrics(request):
    """API avanzada para métricas del dashboard"""
    user = request.user
    organization = user.organizacion
    
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
    contractors = Contractor.objects.filter(organizacion=organization)
    projects = Project.objects.filter(organizacion=organization)
    payments = Payment.objects.filter(organizacion=organization)
    
    metrics = {
        'contractors': {
            'total': contractors.count(),
            'active': contractors.filter(estado='activo').count(),
            'new_this_month': contractors.filter(fecha_registro__gte=last_30_days).count(),
            'by_status': dict(contractors.values('estado').annotate(count=Count('id')).values_list('estado', 'count')),
        },
        'projects': {
            'total': projects.count(),
            'active': projects.filter(estado='activo').count(),
            'completed_this_month': projects.filter(
                estado='completado',
                fecha_fin__gte=last_30_days
            ).count(),
            'by_status': dict(projects.values('estado').annotate(count=Count('id')).values_list('estado', 'count')),
            'avg_duration': projects.exclude(fecha_fin__isnull=True).aggregate(
                avg_days=Avg('fecha_fin') - Avg('fecha_inicio')
            )['avg_days'] or 0,
        },
        'payments': {
            'total': payments.count(),
            'pending': payments.filter(estado='pendiente').count(),
            'completed_this_month': payments.filter(
                estado='completado',
                fecha_pago__gte=last_30_days
            ).count(),
            'total_amount': payments.filter(estado='completado').aggregate(Sum('monto'))['monto__sum'] or 0,
            'pending_amount': payments.filter(estado='pendiente').aggregate(Sum('monto'))['monto__sum'] or 0,
        },
        'trends': {
            'contractors_weekly': get_weekly_trend(contractors, 'fecha_registro'),
            'projects_weekly': get_weekly_trend(projects, 'fecha_inicio'),
            'payments_weekly': get_weekly_trend(payments, 'fecha_pago'),
        },
        'performance': {
            'completion_rate': calculate_completion_rate(projects),
            'payment_efficiency': calculate_payment_efficiency(payments),
            'contractor_satisfaction': calculate_satisfaction_score(contractors),
        }
    }
    
    # Cache por 15 minutos
    cache.set(cache_key, metrics, 900)
    
    return Response(metrics)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contractor_analytics(request):
    """Análisis detallado de contratistas"""
    user = request.user
    organization = user.organizacion
    
    contractors = Contractor.objects.filter(organizacion=organization)
    
    analytics = {
        'demographics': {
            'age_distribution': get_age_distribution(contractors),
            'experience_levels': dict(contractors.values('nivel_experiencia').annotate(count=Count('id')).values_list('nivel_experiencia', 'count')),
            'geographic_distribution': dict(contractors.values('ubicacion').annotate(count=Count('id')).values_list('ubicacion', 'count')),
        },
        'performance': {
            'top_performers': get_top_performers(contractors),
            'project_success_rate': get_project_success_rates(contractors),
            'average_rating': contractors.aggregate(Avg('calificacion_promedio'))['calificacion_promedio__avg'] or 0,
        },
        'financial': {
            'payment_history': get_payment_history(contractors),
            'earning_trends': get_earning_trends(contractors),
            'cost_efficiency': calculate_cost_efficiency(contractors),
        }
    }
    
    return Response(analytics)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_analytics(request):
    """Análisis detallado de proyectos"""
    user = request.user
    organization = user.organizacion
    
    projects = Project.objects.filter(organizacion=organization)
    
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
            'by_type': dict(projects.values('tipo').annotate(count=Count('id')).values_list('tipo', 'count')),
            'by_priority': dict(projects.values('prioridad').annotate(count=Count('id')).values_list('prioridad', 'count')),
            'by_complexity': dict(projects.values('complejidad').annotate(count=Count('id')).values_list('complejidad', 'count')),
        }
    }
    
    return Response(analytics)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_analytics(request):
    """Análisis financiero avanzado"""
    user = request.user
    organization = user.organizacion
    
    payments = Payment.objects.filter(organizacion=organization)
    
    analytics = {
        'cash_flow': {
            'monthly_income': get_monthly_income(payments),
            'monthly_expenses': get_monthly_expenses(payments),
            'net_profit': calculate_net_profit(payments),
            'growth_rate': calculate_growth_rate(payments),
        },
        'payment_patterns': {
            'average_payment_time': calculate_average_payment_time(payments),
            'late_payments': payments.filter(fecha_vencimiento__lt=timezone.now(), estado='pendiente').count(),
            'payment_methods': dict(payments.values('metodo_pago').annotate(count=Count('id')).values_list('metodo_pago', 'count')),
        },
        'forecasting': {
            'next_month_projection': forecast_next_month(payments),
            'quarterly_projection': forecast_quarterly(payments),
            'risk_assessment': assess_financial_risks(payments),
        }
    }
    
    return Response(analytics)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_operations(request):
    """Operaciones en lote para el dashboard"""
    user = request.user
    organization = user.organizacion
    
    operation = request.data.get('operation')
    entity_type = request.data.get('entity_type')
    entity_ids = request.data.get('entity_ids', [])
    
    if not all([operation, entity_type, entity_ids]):
        return Response({'error': 'Faltan parámetros requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if entity_type == 'contractors':
            queryset = Contractor.objects.filter(organizacion=organization, id__in=entity_ids)
        elif entity_type == 'projects':
            queryset = Project.objects.filter(organizacion=organization, id__in=entity_ids)
        elif entity_type == 'payments':
            queryset = Payment.objects.filter(organizacion=organization, id__in=entity_ids)
        else:
            return Response({'error': 'Tipo de entidad no válido'}, status=status.HTTP_400_BAD_REQUEST)
        
        result = perform_bulk_operation(operation, queryset, request.data.get('parameters', {}))
        
        # Log de auditoría
        LogAuditoria.objects.create(
            usuario=user,
            organizacion=organization,
            accion=f'bulk_{operation}',
            modelo=entity_type,
            detalles=f'Operación en lote: {operation} en {len(entity_ids)} elementos'
        )
        
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Exportar datos del dashboard"""
    user = request.user
    organization = user.organizacion
    
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
    """Obtiene tendencia semanal"""
    last_7_days = timezone.now().date() - timedelta(days=7)
    return list(queryset.filter(**{f'{date_field}__gte': last_7_days}).extra(
        {'day': f"date({date_field})"}).values('day').annotate(count=Count('id')).order_by('day'))

def calculate_completion_rate(projects):
    """Calcula tasa de completación"""
    total = projects.count()
    if total == 0:
        return 0
    completed = projects.filter(estado='completado').count()
    return (completed / total) * 100

def calculate_payment_efficiency(payments):
    """Calcula eficiencia de pagos"""
    total = payments.count()
    if total == 0:
        return 0
    on_time = payments.filter(fecha_pago__lte=timezone.now()).count()
    return (on_time / total) * 100

def calculate_satisfaction_score(contractors):
    """Calcula puntuación de satisfacción"""
    avg_rating = contractors.aggregate(Avg('calificacion_promedio'))['calificacion_promedio__avg']
    return avg_rating or 0

def get_age_distribution(contractors):
    """Distribución por edades"""
    # Implementar lógica de distribución por edades
    return {}

def get_top_performers(contractors):
    """Obtiene mejores contratistas"""
    return list(contractors.order_by('-calificacion_promedio')[:10].values(
        'id', 'nombre', 'apellido', 'calificacion_promedio'
    ))

def get_project_success_rates(contractors):
    """Tasa de éxito por contratista"""
    # Implementar lógica de tasa de éxito
    return {}

def get_payment_history(contractors):
    """Historial de pagos por contratista"""
    # Implementar lógica de historial de pagos
    return {}

def get_earning_trends(contractors):
    """Tendencias de ganancias"""
    # Implementar lógica de tendencias
    return {}

def calculate_cost_efficiency(contractors):
    """Calcula eficiencia de costos"""
    # Implementar lógica de eficiencia
    return 0

def calculate_project_success_rate(projects):
    """Tasa de éxito de proyectos"""
    total = projects.count()
    if total == 0:
        return 0
    successful = projects.filter(estado='completado').count()
    return (successful / total) * 100

def calculate_average_duration(projects):
    """Duración promedio de proyectos"""
    completed = projects.filter(estado='completado').exclude(fecha_fin__isnull=True)
    if not completed.exists():
        return 0
    
    total_days = 0
    count = 0
    for project in completed:
        if project.fecha_inicio and project.fecha_fin:
            duration = (project.fecha_fin - project.fecha_inicio).days
            total_days += duration
            count += 1
    
    return total_days / count if count > 0 else 0

def calculate_budget_efficiency(projects):
    """Eficiencia presupuestaria"""
    # Implementar lógica de eficiencia presupuestaria
    return 0

def get_monthly_project_trends(projects):
    """Tendencias mensuales de proyectos"""
    # Implementar lógica de tendencias mensuales
    return []

def get_completion_trends(projects):
    """Tendencias de completación"""
    # Implementar lógica de tendencias de completación
    return []

def get_budget_trends(projects):
    """Tendencias presupuestarias"""
    # Implementar lógica de tendencias presupuestarias
    return []

def get_monthly_income(payments):
    """Ingresos mensuales"""
    # Implementar lógica de ingresos mensuales
    return []

def get_monthly_expenses(payments):
    """Gastos mensuales"""
    # Implementar lógica de gastos mensuales
    return []

def calculate_net_profit(payments):
    """Ganancia neta"""
    income = payments.filter(tipo='ingreso', estado='completado').aggregate(Sum('monto'))['monto__sum'] or 0
    expenses = payments.filter(tipo='gasto', estado='completado').aggregate(Sum('monto'))['monto__sum'] or 0
    return income - expenses

def calculate_growth_rate(payments):
    """Tasa de crecimiento"""
    # Implementar lógica de tasa de crecimiento
    return 0

def calculate_average_payment_time(payments):
    """Tiempo promedio de pago"""
    # Implementar lógica de tiempo promedio
    return 0

def forecast_next_month(payments):
    """Proyección del próximo mes"""
    # Implementar lógica de proyección
    return 0

def forecast_quarterly(payments):
    """Proyección trimestral"""
    # Implementar lógica de proyección trimestral
    return 0

def assess_financial_risks(payments):
    """Evaluación de riesgos financieros"""
    # Implementar lógica de evaluación de riesgos
    return {}

def perform_bulk_operation(operation, queryset, parameters):
    """Realiza operaciones en lote"""
    if operation == 'update_status':
        new_status = parameters.get('status')
        if new_status:
            updated = queryset.update(estado=new_status)
            return {'updated': updated, 'message': f'{updated} elementos actualizados'}
    
    elif operation == 'delete':
        count = queryset.count()
        queryset.delete()
        return {'deleted': count, 'message': f'{count} elementos eliminados'}
    
    elif operation == 'archive':
        updated = queryset.update(archivado=True)
        return {'archived': updated, 'message': f'{updated} elementos archivados'}
    
    return {'error': 'Operación no válida'}

def generate_export(organization, entity_type, date_range, export_type):
    """Genera archivo de exportación"""
    # Implementar lógica de exportación
    return f"/exports/{organization.id}_{entity_type}_{date_range}.{export_type}"
