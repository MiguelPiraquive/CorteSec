"""
Dashboard de Permisos - Estadísticas y Monitoreo
Sistema RBAC - CorteSec
"""

from django.db.models import Count, Q, Prefetch
from django.utils import timezone
from datetime import timedelta

from roles.models import Rol, AsignacionRol, TipoRol
from permisos.models import Permiso, ModuloSistema, TipoPermiso
from django.contrib.auth import get_user_model

User = get_user_model()


def get_permisos_dashboard_stats(organization=None):
    """
    Obtiene estadísticas completas del sistema de permisos

    Returns:
        dict: Estadísticas del sistema de permisos y roles
    """
    now = timezone.now()

    # Filtros base por organización
    roles_qs = Rol.objects.filter(activo=True)
    permisos_qs = Permiso.objects.filter(activo=True)
    asignaciones_qs = AsignacionRol.objects.filter(activa=True)

    if organization:
        # Filtrar solo usuarios de la organización
        usuarios_org = User.objects.filter(
            Q(organization=organization) | Q(organizacion=organization)
        ).values_list('id', flat=True)
        asignaciones_qs = asignaciones_qs.filter(usuario_id__in=usuarios_org)

    # =========================================================================
    # ESTADÍSTICAS DE ROLES
    # =========================================================================

    # Total de roles en el sistema
    roles_total = roles_qs.count()

    # Roles sin permisos asignados
    roles_sin_permisos = roles_qs.annotate(
        num_permisos=Count('permisos')
    ).filter(num_permisos=0).count()

    # Roles con permisos
    roles_con_permisos = roles_total - roles_sin_permisos

    # Distribución de permisos por rol (Top 10)
    roles_top_permisos = list(
        roles_qs.annotate(
            num_permisos=Count('permisos')
        ).order_by('-num_permisos').values('id', 'nombre', 'codigo', 'num_permisos')[:10]
    )

    # Roles por tipo (related_name default es 'rol_set' no 'roles')
    roles_por_tipo = list(
        TipoRol.objects.filter(activo=True).annotate(
            num_roles=Count('rol', filter=Q(rol__activo=True))
        ).values('id', 'nombre', 'num_roles')
    )

    # =========================================================================
    # ESTADÍSTICAS DE PERMISOS
    # =========================================================================

    # Total de permisos
    permisos_total = permisos_qs.count()

    # Permisos sin asignar a ningún rol
    permisos_sin_asignar = permisos_qs.annotate(
        num_roles=Count('roles_asignados', filter=Q(roles_asignados__activo=True))
    ).filter(num_roles=0).count()

    # Permisos asignados
    permisos_asignados = permisos_total - permisos_sin_asignar

    # Distribución por módulo
    permisos_por_modulo = list(
        ModuloSistema.objects.filter(activo=True).annotate(
            total_permisos=Count('permisos', filter=Q(permisos__activo=True)),
            permisos_asignados=Count(
                'permisos',
                filter=Q(
                    permisos__activo=True,
                    permisos__roles_asignados__activo=True
                )
            )
        ).order_by('-total_permisos').values(
            'id', 'nombre', 'codigo', 'total_permisos', 'permisos_asignados'
        )
    )

    # Distribución por tipo de permiso
    permisos_por_tipo = list(
        TipoPermiso.objects.filter(activo=True).annotate(
            num_permisos=Count('permisos', filter=Q(permisos__activo=True))
        ).order_by('-num_permisos').values('id', 'nombre', 'codigo', 'num_permisos')
    )

    # =========================================================================
    # ESTADÍSTICAS DE ASIGNACIONES
    # =========================================================================

    # Usuarios con roles asignados
    usuarios_con_roles = asignaciones_qs.values('usuario').distinct().count()

    # Total de usuarios en el sistema
    usuarios_totales = User.objects.filter(is_active=True)
    if organization:
        usuarios_totales = usuarios_totales.filter(
            Q(organization=organization) | Q(organizacion=organization)
        )
    usuarios_totales_count = usuarios_totales.count()

    # Usuarios sin roles
    usuarios_sin_roles = usuarios_totales_count - usuarios_con_roles

    # Total de asignaciones
    total_asignaciones = asignaciones_qs.count()

    # Asignaciones temporales (con fecha de fin)
    asignaciones_temporales = asignaciones_qs.filter(
        fecha_fin__isnull=False
    ).count()

    # Asignaciones permanentes (sin fecha de fin)
    asignaciones_permanentes = total_asignaciones - asignaciones_temporales

    # Asignaciones que expiran pronto (próximos 30 días)
    fecha_limite = now + timedelta(days=30)
    asignaciones_por_expirar = asignaciones_qs.filter(
        fecha_fin__isnull=False,
        fecha_fin__gte=now,
        fecha_fin__lte=fecha_limite
    ).count()

    # Asignaciones expiradas (pero marcadas como activas - ERROR)
    asignaciones_expiradas = asignaciones_qs.filter(
        fecha_fin__isnull=False,
        fecha_fin__lt=now
    ).count()

    # Asignaciones que aún no han iniciado (futuras)
    asignaciones_futuras = asignaciones_qs.filter(
        fecha_inicio__isnull=False,
        fecha_inicio__gt=now
    ).count()

    # Asignaciones vigentes (iniciadas y no expiradas)
    asignaciones_vigentes = total_asignaciones - asignaciones_expiradas - asignaciones_futuras

    # Distribución de asignaciones por rol (Top 10)
    asignaciones_por_rol = list(
        asignaciones_qs.values(
            'rol__id', 'rol__nombre', 'rol__codigo'
        ).annotate(
            num_asignaciones=Count('id')
        ).order_by('-num_asignaciones')[:10]
    )

    # Usuarios con múltiples roles
    usuarios_multiples_roles = asignaciones_qs.values('usuario').annotate(
        num_roles=Count('rol', distinct=True)
    ).filter(num_roles__gt=1).count()

    # =========================================================================
    # SALUD DEL SISTEMA (Health Indicators)
    # =========================================================================

    health_indicators = {
        # Crítico: Roles sin permisos
        'roles_sin_permisos': {
            'valor': roles_sin_permisos,
            'total': roles_total,
            'porcentaje': round((roles_sin_permisos / roles_total * 100) if roles_total > 0 else 0, 2),
            'severidad': 'critico' if roles_sin_permisos > 0 else 'ok',
            'mensaje': f'{roles_sin_permisos} roles sin permisos asignados' if roles_sin_permisos > 0 else 'Todos los roles tienen permisos'
        },

        # Advertencia: Usuarios sin roles
        'usuarios_sin_roles': {
            'valor': usuarios_sin_roles,
            'total': usuarios_totales_count,
            'porcentaje': round((usuarios_sin_roles / usuarios_totales_count * 100) if usuarios_totales_count > 0 else 0, 2),
            'severidad': 'advertencia' if usuarios_sin_roles > 0 else 'ok',
            'mensaje': f'{usuarios_sin_roles} usuarios sin roles asignados' if usuarios_sin_roles > 0 else 'Todos los usuarios tienen roles'
        },

        # Crítico: Asignaciones expiradas
        'asignaciones_expiradas': {
            'valor': asignaciones_expiradas,
            'total': total_asignaciones,
            'porcentaje': round((asignaciones_expiradas / total_asignaciones * 100) if total_asignaciones > 0 else 0, 2),
            'severidad': 'critico' if asignaciones_expiradas > 0 else 'ok',
            'mensaje': f'{asignaciones_expiradas} asignaciones expiradas (deben desactivarse)' if asignaciones_expiradas > 0 else 'No hay asignaciones expiradas'
        },

        # Info: Asignaciones por expirar
        'asignaciones_por_expirar': {
            'valor': asignaciones_por_expirar,
            'total': asignaciones_temporales,
            'porcentaje': round((asignaciones_por_expirar / asignaciones_temporales * 100) if asignaciones_temporales > 0 else 0, 2),
            'severidad': 'info' if asignaciones_por_expirar > 0 else 'ok',
            'mensaje': f'{asignaciones_por_expirar} asignaciones expiran en 30 días' if asignaciones_por_expirar > 0 else 'No hay asignaciones próximas a expirar'
        },

        # Advertencia: Permisos sin asignar
        'permisos_sin_asignar': {
            'valor': permisos_sin_asignar,
            'total': permisos_total,
            'porcentaje': round((permisos_sin_asignar / permisos_total * 100) if permisos_total > 0 else 0, 2),
            'severidad': 'advertencia' if permisos_sin_asignar > 50 else 'info',
            'mensaje': f'{permisos_sin_asignar} permisos no asignados a ningún rol'
        }
    }

    # Estado general del sistema
    tiene_criticos = any(
        ind['severidad'] == 'critico'
        for ind in health_indicators.values()
    )
    tiene_advertencias = any(
        ind['severidad'] == 'advertencia'
        for ind in health_indicators.values()
    )

    if tiene_criticos:
        estado_general = 'critico'
        mensaje_general = 'Sistema requiere atención inmediata'
    elif tiene_advertencias:
        estado_general = 'advertencia'
        mensaje_general = 'Sistema requiere revisión'
    else:
        estado_general = 'ok'
        mensaje_general = 'Sistema funcionando correctamente'

    # =========================================================================
    # RETORNAR TODAS LAS ESTADÍSTICAS
    # =========================================================================

    return {
        'timestamp': now.isoformat(),
        'organization_id': organization.id if organization else None,

        # Resumen ejecutivo
        'resumen': {
            'roles_total': roles_total,
            'roles_con_permisos': roles_con_permisos,
            'roles_sin_permisos': roles_sin_permisos,
            'permisos_total': permisos_total,
            'permisos_asignados': permisos_asignados,
            'permisos_sin_asignar': permisos_sin_asignar,
            'usuarios_total': usuarios_totales_count,
            'usuarios_con_roles': usuarios_con_roles,
            'usuarios_sin_roles': usuarios_sin_roles,
            'asignaciones_total': total_asignaciones,
            'asignaciones_vigentes': asignaciones_vigentes,
            'asignaciones_expiradas': asignaciones_expiradas,
        },

        # Roles
        'roles': {
            'total': roles_total,
            'con_permisos': roles_con_permisos,
            'sin_permisos': roles_sin_permisos,
            'top_permisos': roles_top_permisos,
            'por_tipo': roles_por_tipo,
        },

        # Permisos
        'permisos': {
            'total': permisos_total,
            'asignados': permisos_asignados,
            'sin_asignar': permisos_sin_asignar,
            'por_modulo': permisos_por_modulo,
            'por_tipo': permisos_por_tipo,
        },

        # Asignaciones
        'asignaciones': {
            'total': total_asignaciones,
            'vigentes': asignaciones_vigentes,
            'temporales': asignaciones_temporales,
            'permanentes': asignaciones_permanentes,
            'expiradas': asignaciones_expiradas,
            'futuras': asignaciones_futuras,
            'por_expirar': asignaciones_por_expirar,
            'por_rol': asignaciones_por_rol,
        },

        # Usuarios
        'usuarios': {
            'total': usuarios_totales_count,
            'con_roles': usuarios_con_roles,
            'sin_roles': usuarios_sin_roles,
            'multiples_roles': usuarios_multiples_roles,
        },

        # Salud del sistema
        'salud': {
            'estado': estado_general,
            'mensaje': mensaje_general,
            'indicadores': health_indicators,
        }
    }


def get_roles_sin_permisos(organization=None):
    """
    Obtiene lista de roles que no tienen permisos asignados

    Returns:
        QuerySet: Roles sin permisos
    """
    roles_qs = Rol.objects.filter(activo=True)

    return roles_qs.annotate(
        num_permisos=Count('permisos')
    ).filter(num_permisos=0).values('id', 'nombre', 'codigo', 'descripcion', 'tipo_rol__nombre')


def get_usuarios_sin_roles(organization=None):
    """
    Obtiene lista de usuarios activos sin roles asignados

    Returns:
        QuerySet: Usuarios sin roles
    """
    usuarios_qs = User.objects.filter(is_active=True)

    if organization:
        usuarios_qs = usuarios_qs.filter(
            Q(organization=organization) | Q(organizacion=organization)
        )

    # Usuarios que no tienen asignaciones activas
    usuarios_con_roles = AsignacionRol.objects.filter(
        activa=True
    ).values_list('usuario_id', flat=True)

    return usuarios_qs.exclude(
        id__in=usuarios_con_roles
    ).values('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')


def get_asignaciones_expiradas(organization=None):
    """
    Obtiene lista de asignaciones que ya expiraron pero siguen activas

    Returns:
        QuerySet: Asignaciones expiradas
    """
    now = timezone.now()
    asignaciones_qs = AsignacionRol.objects.filter(activa=True)

    if organization:
        usuarios_org = User.objects.filter(
            Q(organization=organization) | Q(organizacion=organization)
        ).values_list('id', flat=True)
        asignaciones_qs = asignaciones_qs.filter(usuario_id__in=usuarios_org)

    return asignaciones_qs.filter(
        fecha_fin__isnull=False,
        fecha_fin__lt=now
    ).select_related('usuario', 'rol').values(
        'id',
        'usuario__username',
        'usuario__email',
        'rol__nombre',
        'rol__codigo',
        'fecha_inicio',
        'fecha_fin'
    )


def get_permisos_sin_asignar(limit=50):
    """
    Obtiene lista de permisos que no están asignados a ningún rol

    Args:
        limit: Número máximo de permisos a retornar

    Returns:
        QuerySet: Permisos sin asignar
    """
    return Permiso.objects.filter(activo=True).annotate(
        num_roles=Count('roles_asignados', filter=Q(roles_asignados__activo=True))
    ).filter(num_roles=0).select_related('modulo', 'tipo_permiso').values(
        'id',
        'codigo',
        'nombre',
        'modulo__nombre',
        'tipo_permiso__nombre'
    )[:limit]


def get_dashboard_alerts(organization=None):
    """
    Genera alertas para el dashboard basadas en el estado del sistema

    Returns:
        list: Lista de alertas con severidad y mensaje
    """
    stats = get_permisos_dashboard_stats(organization)
    alerts = []

    # Revisar cada indicador de salud
    for key, indicador in stats['salud']['indicadores'].items():
        if indicador['severidad'] in ['critico', 'advertencia']:
            alerts.append({
                'tipo': key,
                'severidad': indicador['severidad'],
                'mensaje': indicador['mensaje'],
                'valor': indicador['valor'],
                'total': indicador['total'],
                'porcentaje': indicador['porcentaje'],
            })

    # Ordenar por severidad (crítico primero)
    alerts.sort(key=lambda x: 0 if x['severidad'] == 'critico' else 1)

    return alerts
