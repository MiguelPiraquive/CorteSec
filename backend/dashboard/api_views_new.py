# dashboard/api_views_new.py
"""
APIs adicionales para el Dashboard React
Actualizado con datos reales del sistema
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, Avg
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from core.models import LogAuditoria, Notificacion
from .policies import DashboardAccessPolicy, DashboardViewPolicy

User = get_user_model()


def _get_request_org(request):
    return (
        getattr(request, 'tenant', None)
        or getattr(request.user, 'organization', None)
        or getattr(request.user, 'organizacion', None)
    )


def _model_has_field(model, name):
    try:
        model._meta.get_field(name)
        return True
    except Exception:
        return False


def _filter_by_org(queryset, org):
    if not org:
        return queryset
    model = queryset.model
    if _model_has_field(model, 'organization'):
        return queryset.filter(organization=org)
    if _model_has_field(model, 'organizacion'):
        return queryset.filter(organizacion=org)
    return queryset


def _get_active_project(request):
    """Obtiene el proyecto activo del usuario, o None si está en modo 'todos'."""
    from .models import ActiveProject
    proyecto_id = request.GET.get('proyecto')
    if proyecto_id:
        try:
            from .models import Project
            return Project.objects.get(pk=proyecto_id)
        except Exception:
            return None
    try:
        ap = ActiveProject.objects.select_related('project').get(user=request.user)
        if ap.mode == 'single' and ap.project:
            return ap.project
    except ActiveProject.DoesNotExist:
        pass
    return None


def _filter_by_project(queryset, project):
    """Filtra un queryset por proyecto si el modelo tiene campo 'proyecto'."""
    if not project:
        return queryset
    model = queryset.model
    if _model_has_field(model, 'proyecto'):
        return queryset.filter(proyecto=project)
    return queryset


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
def dashboard_metrics(request):
    """API para obtener métricas básicas del dashboard con datos reales"""
    try:
        org = _get_request_org(request)
        active_project = _get_active_project(request)
        today = timezone.now()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)

        if not org:
            return Response({
                'status': 'error',
                'message': 'Organización requerida',
                'empleados': {'total': 0, 'activos': 0, 'inactivos': 0, 'cambio_porcentual': 0},
                'cargos': {'total': 0, 'activos': 0, 'inactivos': 0},
                'nominas': {'procesadas_mes': 0, 'total_pagado_mes': 0, 'cambio_porcentual': 0},
                'prestamos': {'total': 0, 'activos': 0, 'pendientes': 0},
                'contratos': {'activos': 0, 'por_vencer': 0},
                'actividad': {'registros_hoy': 0, 'registros_mes': 0, 'ultimo_update': timezone.now().isoformat()}
            }, status=400)
        
        # EMPLEADOS
        try:
            from nomina.models import Empleado
            from .models import AsignacionProyecto
            empleados_qs = Empleado.objects.filter(organization=org)
            if active_project:
                emp_ids = AsignacionProyecto.objects.filter(
                    proyecto=active_project, activo=True
                ).values_list('empleado_id', flat=True)
                empleados_qs = empleados_qs.filter(id__in=emp_ids)
            total_empleados = empleados_qs.count()
            empleados_activos = empleados_qs.filter(estado='activo').count()
            empleados_mes = empleados_qs.filter(
                created_at__gte=current_month_start,
            ).count()
            empleados_mes_anterior = empleados_qs.filter(
                created_at__gte=last_month_start,
                created_at__lt=current_month_start,
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
            total_cargos = Cargo.objects.filter(organization=org).count()
            cargos_activos = Cargo.objects.filter(activo=True, organization=org).count()
        except ImportError:
            total_cargos = 0
            cargos_activos = 0

        # NÓMINAS
        try:
            from nomina.models import NominaSimple as Nomina
            nominas_base = _filter_by_project(Nomina.objects.filter(organization=org), active_project)
            nominas_mes = nominas_base.filter(
                fecha_pago__gte=current_month_start,
            ).count()
            total_nomina_mes = nominas_base.filter(
                fecha_pago__gte=current_month_start,
            ).aggregate(total=Sum('total_pagar'))['total'] or 0
            
            nominas_mes_anterior = nominas_base.filter(
                fecha_pago__gte=last_month_start,
                fecha_pago__lt=current_month_start,
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
            prestamos_base = _filter_by_project(Prestamo.objects.filter(organization=org), active_project)
            prestamos_activos = prestamos_base.filter(estado='activo').count()
            prestamos_pendientes = prestamos_base.filter(estado='pendiente').count()
            total_prestamos = prestamos_activos + prestamos_pendientes
        except ImportError:
            total_prestamos = 0
            prestamos_pendientes = 0

        # CONTRATOS
        try:
            try:
                from nomina.models import Contrato
            except Exception:
                from cargos.models import Contrato

            contratos_qs = _filter_by_project(_filter_by_org(Contrato.objects.all(), org), active_project)
            contratos_activos = contratos_qs.filter(activo=True).count()
            contratos_por_vencer = contratos_qs.filter(
                fecha_fin__lte=today + timedelta(days=30),
                fecha_fin__gte=today,
                activo=True,
            ).count()
        except Exception:
            contratos_activos = 0
            contratos_por_vencer = 0

        # ACTIVIDAD RECIENTE
        try:
            logs_qs = LogAuditoria.objects.all()
            if _model_has_field(User, 'organization'):
                logs_qs = logs_qs.filter(usuario__organization=org)
            elif _model_has_field(User, 'organizacion'):
                logs_qs = logs_qs.filter(usuario__organizacion=org)
            registros_hoy = logs_qs.filter(created_at__date=today.date()).count()
            registros_mes = logs_qs.filter(created_at__gte=current_month_start).count()
        except Exception:
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
@permission_classes([DashboardViewPolicy])
def dashboard_recent_activity(request):
    """API para obtener actividad reciente del sistema"""
    try:
        org = _get_request_org(request)

        if not org:
            return Response({
                'actividades': [],
                'total': 0,
                'status': 'error',
                'message': 'Organización requerida'
            }, status=400)
        
        try:
            logs = LogAuditoria.objects.all().select_related('usuario')
            if _model_has_field(User, 'organization'):
                logs = logs.filter(usuario__organization=org)
            elif _model_has_field(User, 'organizacion'):
                logs = logs.filter(usuario__organizacion=org)

            limit = request.GET.get('limit')
            try:
                limit = int(limit)
            except Exception:
                limit = 20
            limit = max(1, min(limit, 50))

            logs = logs.order_by('-created_at')[:limit]
            
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
                diff = timezone.now() - log.created_at
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
                    'mensaje': f"{log.accion} - {log.modelo}",
                    'detalle': (log.metadata.get('detail') if isinstance(log.metadata, dict) else '') or '',
                    'usuario': log.usuario.get_full_name() if log.usuario else 'Sistema',
                    'tiempo': tiempo,
                    'fecha': log.created_at.isoformat()
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
@permission_classes([DashboardViewPolicy])
def dashboard_charts(request):
    """API para obtener datos de gráficas avanzadas"""
    try:
        org = _get_request_org(request)
        active_project = _get_active_project(request)
        today = timezone.now()

        if not org:
            return Response({
                'tendencias': {
                    'meses': [],
                    'empleados': [],
                    'nominas': [],
                    'prestamos': []
                },
                'departamentos': [],
                'status': 'error',
                'message': 'Organización requerida'
            }, status=400)
        
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
                from .models import AsignacionProyecto
                empleados_qs = Empleado.objects.filter(
                    created_at__lt=mes_siguiente,
                    estado='activo',
                    organization=org
                )
                if active_project:
                    emp_ids = AsignacionProyecto.objects.filter(
                        proyecto=active_project, activo=True
                    ).values_list('empleado_id', flat=True)
                    empleados_qs = empleados_qs.filter(id__in=emp_ids)
                empleados_data.append(empleados_qs.count())
            except ImportError:
                empleados_data.append(0)
            
            # Nóminas pagadas ese mes
            try:
                try:
                    from nomina.models import Nomina
                except Exception:
                    from nomina.models import NominaSimple as Nomina
                nominas_qs = _filter_by_org(Nomina.objects.all(), org)
                nominas_qs = _filter_by_project(nominas_qs, active_project)
                nominas_mes = nominas_qs.filter(
                    fecha_pago__gte=mes_actual,
                    fecha_pago__lt=mes_siguiente,
                ).aggregate(total=Sum('total_pagar'))['total'] or 0
                nominas_data.append(float(nominas_mes))
            except Exception:
                nominas_data.append(0)
            
            # Préstamos activos ese mes
            try:
                from prestamos.models import Prestamo
                prestamos_qs = Prestamo.objects.filter(
                    fecha_solicitud__lt=mes_siguiente,
                    estado__in=['activo', 'aprobado'],
                    organization=org
                )
                prestamos_qs = _filter_by_project(prestamos_qs, active_project)
                prestamos_data.append(prestamos_qs.count())
            except ImportError:
                prestamos_data.append(0)
        
        # Distribución por departamento
        departamentos_data = []
        try:
            from nomina.models import Empleado
            from cargos.models import Cargo
            
            # Filtrar por proyecto activo en departamentos
            contratos_filter = Q(contratos__activo=True)
            if active_project:
                contratos_filter &= Q(contratos__proyecto=active_project)
            cargos_con_empleados = Cargo.objects.filter(
                organization=org
            ).annotate(
                num_empleados=Count('contratos__empleado', filter=contratos_filter, distinct=True)
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
@permission_classes([DashboardViewPolicy])  # Siempre requerir autenticación
def dashboard_stats(request):
    """API para obtener estadísticas generales reales"""
    org = _get_request_org(request)
    if not org:
        return Response({'stats': {}, 'charts': {}}, status=400)

    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7_days = now - timedelta(days=7)

    users_qs = User.objects.all()
    if _model_has_field(User, 'organization'):
        users_qs = users_qs.filter(organization=org)
    elif _model_has_field(User, 'organizacion'):
        users_qs = users_qs.filter(organizacion=org)

    total_users = users_qs.count()
    active_users = users_qs.filter(is_active=True).count()
    active_sessions = users_qs.filter(last_login__gte=last_24h).count()

    logs_qs = LogAuditoria.objects.all()
    if _model_has_field(User, 'organization'):
        logs_qs = logs_qs.filter(usuario__organization=org)
    elif _model_has_field(User, 'organizacion'):
        logs_qs = logs_qs.filter(usuario__organizacion=org)

    activity_series = []
    for i in range(7):
        day = (last_7_days + timedelta(days=i)).date()
        activity_series.append(
            logs_qs.filter(created_at__date=day).count()
        )

    performance_series = []
    for count in activity_series:
        performance_series.append(min(100, int((count / max(max(activity_series), 1)) * 100)))

    notificaciones_qs = Notificacion.objects.filter(usuario=request.user)
    unread = notificaciones_qs.filter(leida=False).count()

    return Response({
        'stats': {
            'total_users': total_users,
            'active_users': active_users,
            'active_sessions': active_sessions,
            'unread_notifications': unread,
            'system_status': 'operational'
        },
        'charts': {
            'activity': activity_series,
            'performance': performance_series
        }
    })


@api_view(['GET'])
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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
@permission_classes([DashboardViewPolicy])
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


# =============================================================================
# DASHBOARD DE PERMISOS - Sistema RBAC
# =============================================================================

@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_dashboard_stats(request):
    """
    API para obtener estadísticas completas del sistema de permisos

    Retorna:
        - Resumen ejecutivo (roles, permisos, usuarios, asignaciones)
        - Estadísticas detalladas por categoría
        - Indicadores de salud del sistema
        - Alertas y problemas detectados
    """
    try:
        from .permisos_dashboard import get_permisos_dashboard_stats

        org = _get_request_org(request)
        stats = get_permisos_dashboard_stats(organization=org)

        return Response({
            'status': 'success',
            'data': stats
        })

    except Exception as e:
        import traceback
        print(f"Error en permisos_dashboard_stats: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'status': 'error',
            'message': str(e),
            'data': None
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_dashboard_alerts(request):
    """
    API para obtener alertas del sistema de permisos

    Retorna lista de alertas ordenadas por severidad:
        - critico: Requiere atención inmediata
        - advertencia: Requiere revisión
        - info: Información útil
    """
    try:
        from .permisos_dashboard import get_dashboard_alerts

        org = _get_request_org(request)
        alerts = get_dashboard_alerts(organization=org)

        return Response({
            'status': 'success',
            'alerts': alerts,
            'total': len(alerts)
        })

    except Exception as e:
        import traceback
        print(f"Error en permisos_dashboard_alerts: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'status': 'error',
            'message': str(e),
            'alerts': []
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_roles_sin_permisos(request):
    """
    API para listar roles que no tienen permisos asignados

    Problema crítico: Roles sin permisos no pueden hacer nada en el sistema
    """
    try:
        from .permisos_dashboard import get_roles_sin_permisos

        org = _get_request_org(request)
        roles = get_roles_sin_permisos(organization=org)

        return Response({
            'status': 'success',
            'roles': list(roles),
            'total': len(roles)
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'roles': []
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_usuarios_sin_roles(request):
    """
    API para listar usuarios activos sin roles asignados

    Problema: Usuarios sin roles no tienen permisos en el sistema
    """
    try:
        from .permisos_dashboard import get_usuarios_sin_roles

        org = _get_request_org(request)
        usuarios = get_usuarios_sin_roles(organization=org)

        return Response({
            'status': 'success',
            'usuarios': list(usuarios),
            'total': len(usuarios)
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'usuarios': []
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_asignaciones_expiradas(request):
    """
    API para listar asignaciones de roles que ya expiraron

    Problema crítico: Asignaciones expiradas deben desactivarse automáticamente
    """
    try:
        from .permisos_dashboard import get_asignaciones_expiradas

        org = _get_request_org(request)
        asignaciones = get_asignaciones_expiradas(organization=org)

        return Response({
            'status': 'success',
            'asignaciones': list(asignaciones),
            'total': len(asignaciones)
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'asignaciones': []
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_sin_asignar(request):
    """
    API para listar permisos que no están asignados a ningún rol

    Info: Permisos sin asignar pueden estar reservados o pendientes de configuración
    """
    try:
        from .permisos_dashboard import get_permisos_sin_asignar

        limit = int(request.GET.get('limit', 50))
        permisos = get_permisos_sin_asignar(limit=limit)

        return Response({
            'status': 'success',
            'permisos': list(permisos),
            'total': len(permisos)
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'permisos': []
        }, status=500)


@api_view(['GET'])
@permission_classes([DashboardAccessPolicy])
def permisos_resumen(request):
    """
    API para obtener resumen ejecutivo del sistema de permisos

    Retorna solo los datos más importantes para vista rápida
    """
    try:
        from .permisos_dashboard import get_permisos_dashboard_stats

        org = _get_request_org(request)
        stats = get_permisos_dashboard_stats(organization=org)

        return Response({
            'status': 'success',
            'resumen': stats['resumen'],
            'salud': stats['salud']
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'resumen': None
        }, status=500)
