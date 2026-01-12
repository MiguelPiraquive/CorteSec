# dashboard/api_views_new.py
"""
APIs adicionales para el Dashboard React
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Siempre requerir autenticación
def dashboard_metrics(request):
    """API para obtener métricas básicas del dashboard - Solo usuarios autenticados"""
    try:
        # Importaciones condicionales para evitar errores si los modelos no existen
        org = getattr(request.user, 'organization', None)
        try:
            from nomina.models import Empleado
            total_empleados = Empleado.objects.filter(organizacion=org).count()
            empleados_activos = Empleado.objects.filter(activo=True, organizacion=org).count()
        except ImportError:
            total_empleados = 0
            empleados_activos = 0

        try:
            from cargos.models import Cargo
            total_cargos = Cargo.objects.filter(organizacion=org).count()
            cargos_activos = Cargo.objects.filter(activo=True, organizacion=org).count()
        except ImportError:
            total_cargos = 0
            cargos_activos = 0

        try:
            from contabilidad.models import RegistroContable
            registros_mes = RegistroContable.objects.filter(
                fecha_creacion__month=timezone.now().month,
                fecha_creacion__year=timezone.now().year,
                organizacion=org
            ).count()
        except ImportError:
            registros_mes = 0

        return Response({
            'empleados': {
                'total': total_empleados,
                'activos': empleados_activos,
                'inactivos': total_empleados - empleados_activos
            },
            'cargos': {
                'total': total_cargos,
                'activos': cargos_activos,
                'inactivos': total_cargos - cargos_activos
            },
            'actividad': {
                'registros_mes': registros_mes,
                'ultimo_update': timezone.now().isoformat()
            },
            'status': 'success'
        })
    except Exception as e:
        return Response({
            'empleados': {'total': 0, 'activos': 0, 'inactivos': 0},
            'cargos': {'total': 0, 'activos': 0, 'inactivos': 0},
            'actividad': {'registros_mes': 0, 'ultimo_update': timezone.now().isoformat()},
            'status': 'error',
            'message': str(e)
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Siempre requerir autenticación
def dashboard_stats(request):
    """API para obtener estadísticas generales - Solo usuarios autenticados"""
    return Response({
        'stats': {
            'total_users': 1,
            'active_sessions': 1,
            'system_status': 'operational'
        },
        'charts': {
            'activity': [10, 20, 15, 30, 25],
            'performance': [85, 90, 88, 92, 87]
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_activity_heatmap(request):
    """API para obtener datos del heatmap de actividad"""
    return Response({
        'actividad': [
            {'fecha': '2024-01-01', 'valor': 45},
            {'fecha': '2024-01-02', 'valor': 32},
            {'fecha': '2024-01-03', 'valor': 67},
            {'fecha': '2024-01-04', 'valor': 28},
            {'fecha': '2024-01-05', 'valor': 89},
        ],
        'resumen': {
            'total_actividad': 261,
            'promedio_diario': 52.2,
            'dia_mas_activo': '2024-01-05'
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_historical_data(request):
    """API para obtener datos históricos"""
    return Response({
        'series': [
            {'nombre': 'Empleados', 'datos': [120, 125, 130, 128, 135]},
            {'nombre': 'Proyectos', 'datos': [15, 18, 22, 20, 25]},
            {'nombre': 'Ingresos', 'datos': [450000, 475000, 520000, 495000, 550000]}
        ],
        'periodos': ['Ene', 'Feb', 'Mar', 'Abr', 'May']
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_kpi_trends(request):
    """API para obtener tendencias de KPIs"""
    return Response({
        'tendencias': {
            'productividad': {'actual': 85.5, 'anterior': 82.1, 'cambio': 3.4},
            'satisfaccion': {'actual': 92.3, 'anterior': 89.7, 'cambio': 2.6},
            'eficiencia': {'actual': 78.9, 'anterior': 75.2, 'cambio': 3.7}
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_department_activity(request):
    """API para obtener actividad por departamento"""
    return Response({
        'departamentos': [
            {'nombre': 'Desarrollo', 'actividad': 85, 'empleados': 15},
            {'nombre': 'Marketing', 'actividad': 72, 'empleados': 8},
            {'nombre': 'Ventas', 'actividad': 91, 'empleados': 12},
            {'nombre': 'RRHH', 'actividad': 68, 'empleados': 5}
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_hourly_patterns(request):
    """API para obtener patrones por hora"""
    return Response({
        'patrones': [
            {'hora': '08:00', 'actividad': 20},
            {'hora': '09:00', 'actividad': 45},
            {'hora': '10:00', 'actividad': 80},
            {'hora': '11:00', 'actividad': 90},
            {'hora': '12:00', 'actividad': 60},
            {'hora': '13:00', 'actividad': 30},
            {'hora': '14:00', 'actividad': 70},
            {'hora': '15:00', 'actividad': 85},
            {'hora': '16:00', 'actividad': 75},
            {'hora': '17:00', 'actividad': 40}
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_productivity_heatmap(request):
    """API para obtener heatmap de productividad"""
    return Response({
        'heatmap': [
            {'dia': 'Lunes', 'horas': [65, 70, 85, 90, 80, 60, 75, 85]},
            {'dia': 'Martes', 'horas': [70, 75, 80, 85, 85, 65, 80, 90]},
            {'dia': 'Miércoles', 'horas': [75, 80, 90, 95, 90, 70, 85, 95]},
            {'dia': 'Jueves', 'horas': [68, 72, 82, 88, 82, 62, 78, 88]},
            {'dia': 'Viernes', 'horas': [60, 65, 75, 80, 75, 55, 70, 80]}
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_search_suggestions(request):
    """API para obtener sugerencias de búsqueda"""
    query = request.GET.get('q', '')
    
    # Aquí normalmente buscarías en base de datos
    sugerencias = [
        {'tipo': 'empleado', 'texto': 'Juan Pérez', 'url': '/empleados/1'},
        {'tipo': 'proyecto', 'texto': 'Proyecto Alpha', 'url': '/proyectos/1'},
        {'tipo': 'reporte', 'texto': 'Reporte Mensual', 'url': '/reportes/mensual'}
    ]
    
    return Response({'sugerencias': sugerencias})
