"""
AI Analytics para Dashboard
===========================

Métricas predictivas y análisis ligeros sin dependencias externas.
"""

from rest_framework.decorators import api_view, permission_classes
from .policies import DashboardViewPolicy
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Sum
from .models import Project


def _get_organization_from_request(request):
    return (
        getattr(request, 'tenant', None)
        or getattr(request.user, 'organization', None)
        or getattr(request.user, 'organizacion', None)
    )


def _filter_by_org(queryset, org):
    if not org:
        return queryset
    model = queryset.model
    if hasattr(model, 'organization'):
        return queryset.filter(organization=org)
    if hasattr(model, 'organizacion'):
        return queryset.filter(organizacion=org)
    return queryset


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def contractor_performance_prediction(request):
    """Predicción simple de rendimiento basado en actividad reciente de proyectos."""
    org = _get_organization_from_request(request)
    if not org:
        return Response({'error': 'Organización requerida'}, status=400)

    projects = _filter_by_org(Project.objects.all(), org)

    last_90 = timezone.now().date() - timedelta(days=90)
    active_projects = projects.filter(end_date__isnull=True).count()
    completed_projects = projects.filter(end_date__isnull=False, end_date__gte=last_90).count()

    total_projects = projects.count()
    performance_score = 0
    if total_projects > 0:
        performance_score = min(100, int(((active_projects + completed_projects) / total_projects) * 20))

    return Response({
        'score': performance_score,
        'active_projects': active_projects,
        'completed_recent': completed_projects,
        'insight': 'Score estimado basado en proyectos activos y completados recientes.'
    })


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def salary_intelligence(request):
    """Inteligencia salarial (legacy - datos movidos a Flujo de Caja)."""
    return Response({
        'average_payment': 0,
        'total_paid': 0,
        'recommendation': 'Los datos financieros se gestionan desde el módulo de Flujo de Caja.'
    })


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def predictive_analytics(request):
    """Proyección de ingresos (legacy - datos movidos a Flujo de Caja)."""
    return Response({
        'last_30_total': 0,
        'projection_next_30': 0,
        'note': 'Los datos financieros se gestionan desde el módulo de Flujo de Caja.'
    })
