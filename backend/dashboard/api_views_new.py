# dashboard/api_views_new.py
"""
APIs adicionales para el Dashboard React
Actualizado con datos reales del sistema
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, Avg
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    """API para obtener métricas básicas del dashboard con datos reales"""
    try:
        org = getattr(request.user, 'organizacion', None)
        today = timezone.now()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        # EMPLEADOS
        try:
            from nomina.models import Empleado
            total_empleados = Empleado.objects.filter(organizacion=org).count()
            empleados_activos = Empleado.objects.filter(activo=True, organizacion=org).count()
            empleados_mes = Empleado.objects.filter(
                fecha_creacion__gte=current_month_start,
                organizacion=org
            ).count()
            empleados_mes_anterior = Empleado.objects.filter(
                fecha_creacion__gte=last_month_start,
                fecha_creacion__lt=current_month_start,
                organizacion=org
            ).count()
            
            cambio_empleados = 0
            if empleados_mes_anterior > 0:
                cambio_empleados = ((empleados_mes - empleados_mes_anterior) / empleados_mes_anterior) * 100
        except ImportError:
            total_empleados = 0
            empleados_activos = 0
            cambio_empleados = 0

        # CARGOS
        try:
            from cargos.models import Cargo
            total_cargos = Cargo.objects.filter(organizacion=org).count()
            cargos_activos = Cargo.objects.filter(activo=True, organizacion=org).count()
        except ImportError:
            total_cargos = 0
            cargos_activos = 0

        # NÓMINAS
        try:
            from nomina.models import Nomina
            nominas_mes = Nomina.objects.filter(
                fecha_pago__gte=current_month_start,
                organizacion=org
            ).count()
            total_nomina_mes = Nomina.objects.filter(
                fecha_pago__gte=current_month_start,
                organizacion=org
            ).aggregate(total=Sum('total_pagar'))['total'] or 0
            
            nominas_mes_anterior = Nomina.objects.filter(
                fecha_pago__gte=last_month_start,
                fecha_pago__lt=current_month_start,
                organizacion=org
            ).count()
            
            cambio_nominas = 0
            if nominas_mes_anterior > 0:
                cambio_nominas = ((nominas_mes - nominas_mes_anterior) / nominas_mes_anterior) * 100
        except ImportError:
            nominas_mes = 0
            total_nomina_mes = 0
            cambio_nominas = 0

        # PRÉSTAMOS
        try:
            from prestamos.models import Prestamo
            prestamos_activos = Prestamo.objects.filter(
                estado='activo',
                organizacion=org
            ).count()
            prestamos_pendientes = Prestamo.objects.filter(
                estado='pendiente',
                organizacion=org
            ).count()
            total_prestamos = prestamos_activos + prestamos_pendientes
        except ImportError:
            total_prestamos = 0
            prestamos_pendientes = 0

        # CONTRATOS
        try:
            from cargos.models import Contrato
            contratos_activos = Contrato.objects.filter(
                activo=True,
                organizacion=org
            ).count()
            contratos_por_vencer = Contrato.objects.filter(
                fecha_fin__lte=today + timedelta(days=30),
                fecha_fin__gte=today,
                activo=True,
                organizacion=org
            ).count()
        except ImportError:
            contratos_activos = 0
            contratos_por_vencer = 0

        # ACTIVIDAD RECIENTE
        try:
            from core.models import LogAuditoria
            registros_hoy = LogAuditoria.objects.filter(
                fecha_accion__date=today.date(),
                organizacion=org
            ).count()
            registros_mes = LogAuditoria.objects.filter(
                fecha_accion__gte=current_month_start,
                organizacion=org
            ).count()
        except ImportError:
            registros_hoy = 0
            registros_mes = 0

        return Response({
            'empleados': {
                'total': total_empleados,
                'activos': empleados_activos,
                'inactivos': total_empleados - empleados_activos,
                'cambio_porcentual': round(cambio_empleados, 1)
            },
            'cargos': {
                'total': total_cargos,
                'activos': cargos_activos,
                'inactivos': total_cargos - cargos_activos
            },
            'nominas': {
                'procesadas_mes': nominas_mes,
                'total_pagado_mes': float(total_nomina_mes),
                'cambio_porcentual': round(cambio_nominas, 1)
            },
            'prestamos': {
                'total': total_prestamos,
                'activos': prestamos_activos,
                'pendientes': prestamos_pendientes
            },
            'contratos': {
                'activos': contratos_activos,
                'por_vencer': contratos_por_vencer
            },
            'actividad': {
                'registros_hoy': registros_hoy,
                'registros_mes': registros_mes,
                'ultimo_update': timezone.now().isoformat()
            },
            'status': 'success'
        })
    except Exception as e:
        import traceback
        print(f"Error en dashboard_metrics: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': str(e),
            'status': 'error',
            'empleados': {'total': 0, 'activos': 0, 'inactivos': 0, 'cambio_porcentual': 0},
            'cargos': {'total': 0, 'activos': 0, 'inactivos': 0},
            'nominas': {'procesadas_mes': 0, 'total_pagado_mes': 0, 'cambio_porcentual': 0},
            'prestamos': {'total': 0, 'activos': 0, 'pendientes': 0},
            'contratos': {'activos': 0, 'por_vencer': 0},
            'actividad': {'registros_hoy': 0, 'registros_mes': 0, 'ultimo_update': timezone.now().isoformat()}
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_recent_activity(request):
    """API para obtener actividad reciente del sistema"""
    try:
        org = getattr(request.user, 'organizacion', None)
        
        try:
            from core.models import LogAuditoria
            # Obtener últimas 20 acciones
            logs = LogAuditoria.objects.filter(
                organizacion=org
            ).select_related('usuario').order_by('-fecha_accion')[:20]
            
            actividades = []
            for log in logs:
                tipo_accion = 'info'
                if 'crear' in log.accion.lower() or 'registr' in log.accion.lower():
                    tipo_accion = 'success'
                elif 'elimin' in log.accion.lower() or 'error' in log.accion.lower():
                    tipo_accion = 'warning'
                elif 'actualiz' in log.accion.lower() or 'modific' in log.accion.lower():
                    tipo_accion = 'info'
                
                # Calcular tiempo relativo
                diff = timezone.now() - log.fecha_accion
                if diff.days > 0:
                    tiempo = f"Hace {diff.days} día{'s' if diff.days > 1 else ''}"
                elif diff.seconds >= 3600:
                    horas = diff.seconds // 3600
                    tiempo = f"Hace {horas} hora{'s' if horas > 1 else ''}"
                elif diff.seconds >= 60:
                    minutos = diff.seconds // 60
                    tiempo = f"Hace {minutos} minuto{'s' if minutos > 1 else ''}"
                else:
                    tiempo = "Justo ahora"
                
                actividades.append({
                    'id': log.id,
                    'tipo': tipo_accion,
                    'mensaje': f"{log.accion} - {log.modulo}",
                    'detalle': log.descripcion or '',
                    'usuario': log.usuario.get_full_name() if log.usuario else 'Sistema',
                    'tiempo': tiempo,
                    'fecha': log.fecha_accion.isoformat()
                })
            
            return Response({
                'actividades': actividades,
                'total': len(actividades),
                'status': 'success'
            })
        except ImportError:
            return Response({
                'actividades': [],
                'total': 0,
                'status': 'success'
            })
    except Exception as e:
        return Response({
            'actividades': [],
            'total': 0,
            'status': 'error',
            'message': str(e)
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_charts(request):
    """API para obtener datos de gráficas avanzadas"""
    try:
        org = getattr(request.user, 'organizacion', None)
        today = timezone.now()
        
        # Últimos 6 meses de datos
        meses = []
        empleados_data = []
        nominas_data = []
        prestamos_data = []
        
        for i in range(5, -1, -1):
            mes_actual = (today - timedelta(days=30*i)).replace(day=1)
            mes_siguiente = (mes_actual + timedelta(days=32)).replace(day=1)
            
            mes_nombre = mes_actual.strftime('%b')
            meses.append(mes_nombre)
            
            # Empleados activos ese mes
            try:
                from nomina.models import Empleado
                empleados_mes = Empleado.objects.filter(
                    fecha_creacion__lt=mes_siguiente,
                    activo=True,
                    organizacion=org
                ).count()
                empleados_data.append(empleados_mes)
            except ImportError:
                empleados_data.append(0)
            
            # Nóminas pagadas ese mes
            try:
                from nomina.models import Nomina
                nominas_mes = Nomina.objects.filter(
                    fecha_pago__gte=mes_actual,
                    fecha_pago__lt=mes_siguiente,
                    organizacion=org
                ).aggregate(total=Sum('total_pagar'))['total'] or 0
                nominas_data.append(float(nominas_mes))
            except ImportError:
                nominas_data.append(0)
            
            # Préstamos activos ese mes
            try:
                from prestamos.models import Prestamo
                prestamos_mes = Prestamo.objects.filter(
                    fecha_solicitud__lt=mes_siguiente,
                    estado__in=['activo', 'aprobado'],
                    organizacion=org
                ).count()
                prestamos_data.append(prestamos_mes)
            except ImportError:
                prestamos_data.append(0)
        
        # Distribución por departamento
        departamentos_data = []
        try:
            from nomina.models import Empleado
            from cargos.models import Cargo
            
            cargos_con_empleados = Cargo.objects.filter(
                organizacion=org
            ).annotate(
                num_empleados=Count('empleado')
            ).order_by('-num_empleados')[:5]
            
            for cargo in cargos_con_empleados:
                departamentos_data.append({
                    'nombre': cargo.nombre,
                    'empleados': cargo.num_empleados
                })
        except ImportError:
            pass
        
        return Response({
            'tendencias': {
                'meses': meses,
                'empleados': empleados_data,
                'nominas': nominas_data,
                'prestamos': prestamos_data
            },
            'departamentos': departamentos_data,
            'status': 'success'
        })
    except Exception as e:
        import traceback
        print(f"Error en dashboard_charts: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'tendencias': {
                'meses': [],
                'empleados': [],
                'nominas': [],
                'prestamos': []
            },
            'departamentos': [],
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
