"""
BÚSQUEDA GLOBAL ULTRA PROFESIONAL - CORTESEC ENTERPRISE
========================================================
API endpoints para búsqueda global en todos los módulos del sistema.
Implementación enterprise con filtros avanzados, relevancia y performance optimizada.
"""

from django.http import JsonResponse
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
import json
import time

# Importar modelos del sistema
from django.contrib.auth import get_user_model
from core.models import Notificacion, LogAuditoria, SearchHistory, SearchClick
from core.policies.utils import check_permission, build_permission_codes

User = get_user_model()

# Límites y cache
SEARCH_MAX_PER_PAGE = 50
SEARCH_SUGGESTIONS_TTL = 60
SEARCH_COUNTS_TTL = 30
SEARCH_AUTOCOMPLETE_TTL = 60
SEARCH_MAX_QUERY_LENGTH = 120
SEARCH_MIN_QUERY_LENGTH = 2

# ================================================================================
# MAPEO DE MÓDULO DE BÚSQUEDA → PERMISO REQUERIDO
# ================================================================================
# Módulos que NO requieren permiso especial (acceso general para cualquier autenticado):
#   - paginas (navegación pública del sistema)
#   - notificaciones (filtradas por usuario en _search_notificaciones)
#   - ayuda (centro de ayuda general)
#   - dashboard (panel básico)

SEARCH_MODULE_PERMISSION_MAP = {
    'usuarios': 'usuarios.view',
    'logs': 'auditoria.view',
    'empleados': 'empleados.view',
    'cargos': 'cargos.view',
    'contratos': 'contratos.view',
    'nominas': 'nomina.view',
    'conceptos': 'conceptos_laborales.view',
    'parametros': 'parametros_legales.view',
    'prestamos': 'prestamos.view',
    'tipos_prestamo': 'tipos_prestamo.view',
    'pagos_prestamo': 'prestamos.view',
    'items': 'items.view',
    'ubicaciones': 'departamentos.view',
    'roles': 'roles.view',
    'permisos': 'permisos.view',
    'configuracion': 'configuracion.view',
    'contabilidad': 'contabilidad.view',
    'documentacion': 'documentacion.view',
}


def _user_can_search_module(user, module_id):
    """Verifica si el usuario tiene permiso para buscar en un módulo específico."""
    if user.is_superuser:
        return True
    perm_code = SEARCH_MODULE_PERMISSION_MAP.get(module_id)
    if not perm_code:
        # Módulos sin permiso especial (paginas, notificaciones, ayuda, dashboard)
        return True
    # Caso especial: logs requiere is_staff O permiso
    if module_id == 'logs' and user.is_staff:
        return True
    codes = build_permission_codes(*perm_code.rsplit('.', 1))
    return check_permission(user, codes)


# ================================================================================
# BÚSQUEDA PRINCIPAL
# ================================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_global(request):
    """
    Búsqueda global ultra profesional en todos los módulos
    Retorna resultados estructurados con relevancia y metadatos
    """
    start_time = time.time()
    
    query = request.GET.get('q', '').strip()[:SEARCH_MAX_QUERY_LENGTH]
    module_filter = request.GET.get('module', 'all')
    date_filter = request.GET.get('date', 'all')
    status_filter = request.GET.get('status', 'all')
    sort_by = request.GET.get('sort', 'relevance')
    page = _safe_int(request.GET.get('page', 1), 1, 1)
    per_page = _safe_int(request.GET.get('per_page', 10), 10, 1, SEARCH_MAX_PER_PAGE)
    
    if not query or len(query) < SEARCH_MIN_QUERY_LENGTH:
        return JsonResponse({
            'success': False,
            'message': 'Query de búsqueda requerido',
            'results': [],
            'total': 0
        })
    
    # Ejecutar búsquedas por módulo (gated por permisos del usuario)
    all_results = []
    org = _get_request_organization(request)
    user = request.user

    # Helper: solo buscar si el usuario tiene permiso para el módulo
    def _search_if_allowed(mod_id, search_fn, *args):
        if module_filter in ['all', mod_id] and _user_can_search_module(user, mod_id):
            all_results.extend(search_fn(*args))

    _search_if_allowed('usuarios', _search_usuarios, query, user, org)
    _search_if_allowed('notificaciones', _search_notificaciones, query, user)
    _search_if_allowed('logs', _search_logs, query, user)
    _search_if_allowed('paginas', _search_pages, query)
    _search_if_allowed('empleados', _search_empleados, query, org)
    _search_if_allowed('cargos', _search_cargos, query, org)
    _search_if_allowed('contratos', _search_contratos, query, org)
    _search_if_allowed('nominas', _search_nominas, query, org)
    _search_if_allowed('conceptos', _search_conceptos_laborales, query, org)
    _search_if_allowed('parametros', _search_parametros_legales, query, org)
    _search_if_allowed('prestamos', _search_prestamos, query, org)
    _search_if_allowed('tipos_prestamo', _search_tipos_prestamo, query, org)
    _search_if_allowed('pagos_prestamo', _search_pagos_prestamo, query, org)
    _search_if_allowed('items', _search_items, query, org)
    _search_if_allowed('ubicaciones', _search_ubicaciones, query, org)
    _search_if_allowed('roles', _search_roles, query, org)
    _search_if_allowed('permisos', _search_permisos, query, org)
    _search_if_allowed('configuracion', _search_configuracion, query, org)
    _search_if_allowed('contabilidad', _search_contabilidad, query, org)
    _search_if_allowed('documentacion', _search_documentacion, query, org)
    _search_if_allowed('ayuda', _search_ayuda, query, org)
    _search_if_allowed('dashboard', _search_dashboard, query, org)
    
    # Aplicar filtros adicionales
    filtered_results = _apply_filters(all_results, date_filter, status_filter)
    
    # Ordenar resultados
    sorted_results = _sort_results(filtered_results, sort_by)
    
    # Paginar resultados
    paginator = Paginator(sorted_results, per_page)
    page_obj = paginator.get_page(page)
    
    # Calcular tiempo de ejecución
    execution_time = round((time.time() - start_time) * 1000, 2)

    # Guardar historial de búsqueda
    try:
        SearchHistory.objects.create(
            user=request.user,
            query=query,
            module=module_filter,
            filters={
                'date': date_filter,
                'status': status_filter,
                'sort': sort_by,
            },
            results_count=paginator.count,
            execution_time_ms=execution_time,
        )
    except Exception:
        pass
    
    return JsonResponse({
        'success': True,
        'results': list(page_obj),
        'total': paginator.count,
        'page': page,
        'total_pages': paginator.num_pages,
        'per_page': per_page,
        'execution_time_ms': execution_time,
        'query': query,
        'filters': {
            'module': module_filter,
            'date': date_filter,
            'status': status_filter,
            'sort': sort_by
        }
    })


# ================================================================================
# BÚSQUEDAS POR MÓDULO
# ================================================================================

def _search_usuarios(query, user, org=None):
    """Búsqueda en usuarios (scoped a la organización del usuario)"""
    results = []

    qs = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query)
    )

    # Filtrar por organización para evitar fuga de datos cross-tenant
    if org:
        org_id = getattr(org, 'id', None) or getattr(org, 'pk', None)
        if org_id:
            qs = qs.filter(organization_id=org_id)

    usuarios = qs.distinct()[:20]
    
    for usuario in usuarios:
        relevance = _calculate_relevance(query, [
            usuario.username,
            usuario.first_name,
            usuario.last_name,
            usuario.email
        ])
        
        results.append({
            'id': usuario.id,
            'type': 'usuario',
            'title': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
            'subtitle': usuario.email,
            'description': f"Usuario: {usuario.username}",
            'url': f"/perfil/usuario/{usuario.id}/",
            'icon': 'fas fa-user',
            'relevance': relevance,
            'date': usuario.date_joined,
            'status': 'activo' if usuario.is_active else 'inactivo',
            'module': 'usuarios',
            'metadata': {
                'username': usuario.username,
                'email': usuario.email,
                'is_staff': usuario.is_staff,
                'is_active': usuario.is_active
            }
        })
    
    return results


def _search_notificaciones(query, user):
    """Búsqueda en notificaciones"""
    results = []
    
    notificaciones = Notificacion.objects.filter(
        Q(titulo__icontains=query) |
        Q(mensaje__icontains=query),
        usuario=user
    ).distinct()[:20]
    
    for notif in notificaciones:
        relevance = _calculate_relevance(query, [
            notif.titulo,
            notif.mensaje
        ])
        
        results.append({
            'id': notif.id,
            'type': 'notificacion',
            'title': notif.titulo,
            'subtitle': notif.get_tipo_display(),
            'description': notif.mensaje[:100] + '...' if len(notif.mensaje) > 100 else notif.mensaje,
            'url': f"/dashboard/notificaciones",
            'icon': 'fas fa-bell',
            'relevance': relevance,
            'date': notif.fecha,
            'status': 'leida' if notif.leida else 'no_leida',
            'module': 'notificaciones',
            'metadata': {
                'tipo': notif.tipo,
                'leida': notif.leida,
                'fecha_lectura': notif.fecha_leida
            }
        })
    
    return results


def _search_logs(query, user):
    """Búsqueda en logs del sistema"""
    results = []
    
    # Solo admins pueden ver logs
    if not user.is_staff:
        return results
    
    logs = LogAuditoria.objects.filter(
        Q(accion__icontains=query) |
        Q(modelo__icontains=query) |
        Q(usuario__username__icontains=query)
    ).select_related('usuario').distinct().order_by('-created_at')[:20]
    
    for log in logs:
        relevance = _calculate_relevance(query, [
            log.accion,
            log.modelo,
            log.usuario.username if log.usuario else ''
        ])
        
        results.append({
            'id': log.id,
            'type': 'log',
            'title': log.accion,
            'subtitle': log.usuario.username if log.usuario else 'Sistema',
            'description': f"{log.modelo} ({log.objeto_id})" if log.objeto_id else log.modelo,
            'url': f"/dashboard/auditoria",
            'icon': 'fas fa-list-alt',
            'relevance': relevance,
            'date': log.created_at,
            'status': 'completed',
            'module': 'logs',
            'metadata': {
                'ip_address': log.ip_address,
                'user_agent': log.user_agent[:50] + '...' if log.user_agent and len(log.user_agent) > 50 else log.user_agent
            }
        })
    
    return results


def _get_request_organization(request):
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


def _build_query(model, query, fields):
    q = Q()
    for field in fields:
        base = field.split('__')[0]
        if _model_has_field(model, base):
            q |= Q(**{f"{field}__icontains": query})
    return q


def _get_queryset_for_model(model, org):
    qs = model.objects.all()
    if org and _model_has_field(model, 'organization'):
        qs = qs.filter(organization=org)
    elif org and _model_has_field(model, 'organizacion'):
        qs = qs.filter(organizacion=org)
    return qs


def _resolve_attr(obj, attrs):
    if not attrs:
        return None
    for attr in attrs:
        value = getattr(obj, attr, None)
        if value:
            return value
    return None


def _get_cache_key(prefix, user, org, query, extra=None):
    org_id = getattr(org, 'id', None) or getattr(org, 'pk', None) or 'none'
    user_id = getattr(user, 'id', None) or 'anon'
    extra_part = f":{extra}" if extra else ''
    return f"search:{prefix}:{user_id}:{org_id}:{query.lower()}{extra_part}"


def _safe_int(value, default, min_value=None, max_value=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if min_value is not None:
        parsed = max(min_value, parsed)
    if max_value is not None:
        parsed = min(max_value, parsed)
    return parsed


def _search_model_records(model, query, org, fields, module, result_type, url, title_attrs=None, subtitle_attrs=None, description_attrs=None, date_field=None, status_field=None, icon='fas fa-file', limit=20):
    results = []
    try:
        qs = _get_queryset_for_model(model, org)
        q = _build_query(model, query, fields)
        if q:
            qs = qs.filter(q)
        else:
            return results

        for obj in qs.distinct()[:limit]:
            title = _resolve_attr(obj, title_attrs) or str(obj)
            subtitle = _resolve_attr(obj, subtitle_attrs) or ''
            description = _resolve_attr(obj, description_attrs) or subtitle or title
            date_value = getattr(obj, date_field, None) if date_field else None
            status_value = getattr(obj, status_field, None) if status_field else None
            results.append({
                'id': str(getattr(obj, 'id', title)),
                'type': result_type,
                'title': title,
                'subtitle': subtitle,
                'description': description,
                'url': url,
                'icon': icon,
                'relevance': _calculate_relevance(query, [title, subtitle, description]),
                'date': date_value,
                'status': status_value or 'activo',
                'module': module,
                'metadata': {}
            })
    except Exception:
        return results

    return results


def _count_model_records(model, query, org, fields):
    try:
        qs = _get_queryset_for_model(model, org)
        q = _build_query(model, query, fields)
        if not q:
            return 0
        return qs.filter(q).distinct().count()
    except Exception:
        return 0


def _get_pages_catalog():
    return [
        {
            'title': 'Dashboard',
            'subtitle': 'Inicio y métricas',
            'description': 'Resumen ejecutivo del sistema',
            'url': '/dashboard',
            'keywords': ['inicio', 'panel', 'resumen', 'estadísticas', 'métricas'],
        },
        {
            'title': 'Empleados',
            'subtitle': 'Gestión de personal',
            'description': 'Listado y administración de empleados',
            'url': '/dashboard/empleados',
            'keywords': ['rrhh', 'personal', 'contratación', 'nómina'],
        },
        {
            'title': 'Cargos',
            'subtitle': 'Estructura organizacional',
            'description': 'Cargos, jerarquías y roles',
            'url': '/dashboard/cargos',
            'keywords': ['puestos', 'jerarquía', 'estructura'],
        },
        {
            'title': 'Contratos',
            'subtitle': 'Gestión contractual',
            'description': 'Contratos laborales y estados',
            'url': '/dashboard/contratos',
            'keywords': ['laboral', 'vinculación', 'vigencia'],
        },
        {
            'title': 'Nómina',
            'subtitle': 'Procesos de nómina',
            'description': 'Procesar pagos y periodos',
            'url': '/dashboard/nomina',
            'keywords': ['pagos', 'salarios', 'liquidación'],
        },
        {
            'title': 'Préstamos',
            'subtitle': 'Finanzas internas',
            'description': 'Solicitudes y seguimiento de préstamos',
            'url': '/dashboard/prestamos',
            'keywords': ['finanzas', 'cuotas', 'aprobaciones'],
        },
        {
            'title': 'Items',
            'subtitle': 'Inventario',
            'description': 'Gestión de items y activos',
            'url': '/dashboard/items',
            'keywords': ['inventario', 'activos', 'materiales'],
        },
        {
            'title': 'Usuarios',
            'subtitle': 'Control de acceso',
            'description': 'Administrar usuarios del sistema',
            'url': '/dashboard/usuarios',
            'keywords': ['accesos', 'cuentas', 'roles'],
        },
        {
            'title': 'Roles',
            'subtitle': 'Permisos por rol',
            'description': 'Gestión de roles y jerarquías',
            'url': '/dashboard/roles',
            'keywords': ['seguridad', 'permisos', 'acceso'],
        },
        {
            'title': 'Permisos',
            'subtitle': 'Control granular',
            'description': 'Configurar permisos y condiciones',
            'url': '/dashboard/permisos',
            'keywords': ['seguridad', 'acceso', 'condiciones'],
        },
        {
            'title': 'Auditoría',
            'subtitle': 'Bitácora del sistema',
            'description': 'Actividad y registros de seguridad',
            'url': '/dashboard/auditoria',
            'keywords': ['logs', 'registros', 'trazabilidad'],
        },
        {
            'title': 'Configuración',
            'subtitle': 'Parámetros del sistema',
            'description': 'Configuración general y módulos',
            'url': '/dashboard/configuracion',
            'keywords': ['ajustes', 'parámetros', 'módulos'],
        },
        {
            'title': 'Planes',
            'subtitle': 'Suscripciones',
            'description': 'Gestión de planes y límites',
            'url': '/dashboard/planes',
            'keywords': ['suscripción', 'límites', 'facturación'],
        },
        {
            'title': 'Perfil',
            'subtitle': 'Cuenta personal',
            'description': 'Información del usuario y organización',
            'url': '/dashboard/perfil',
            'keywords': ['usuario', 'cuenta', 'preferencias'],
        },
        {
            'title': 'Centro de Ayuda',
            'subtitle': 'Soporte y documentación',
            'description': 'Artículos, tutoriales y soporte',
            'url': '/dashboard/ayuda',
            'keywords': ['soporte', 'faq', 'tutoriales', 'guías'],
        },
        {
            'title': 'Reportes',
            'subtitle': 'Analítica',
            'description': 'Reportes y análisis',
            'url': '/dashboard/reportes',
            'keywords': ['analítica', 'indicadores', 'reportes'],
        },
        {
            'title': 'Ubicaciones',
            'subtitle': 'Departamentos y municipios',
            'description': 'Gestión de ubicaciones',
            'url': '/dashboard/departamentos',
            'keywords': ['ubicaciones', 'departamentos', 'municipios'],
        },
    ]


def _search_pages(query):
    results = []
    pages = _get_pages_catalog()

    for page in pages:
        relevance = _calculate_relevance(query, [
            page['title'],
            page['subtitle'],
            page['description'],
            ' '.join(page.get('keywords', []))
        ])
        if relevance == 0:
            continue

        results.append({
            'id': page['url'],
            'type': 'page',
            'title': page['title'],
            'subtitle': page['subtitle'],
            'description': page['description'],
            'url': page['url'],
            'icon': 'fas fa-layer-group',
            'relevance': relevance,
            'date': None,
            'status': 'activo',
            'module': 'paginas',
            'metadata': {
                'keywords': page.get('keywords', [])
            }
        })

    return results


def _count_pages(query):
    count = 0
    pages = _get_pages_catalog()

    for page in pages:
        relevance = _calculate_relevance(query, [
            page['title'],
            page['subtitle'],
            page['description'],
            ' '.join(page.get('keywords', []))
        ])
        if relevance > 0:
            count += 1

    return count


def _search_empleados(query, org):
    if not org:
        return []
    try:
        from nomina.models import Empleado
        return _search_model_records(
            Empleado,
            query,
            org,
            ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'numero_documento', 'email'],
            'empleados',
            'empleado',
            '/dashboard/empleados',
            title_attrs=['nombre_completo', 'primer_nombre'],
            subtitle_attrs=['numero_documento'],
            description_attrs=['email'],
            date_field='created_at',
            status_field='estado',
            icon='fas fa-id-badge'
        )
    except Exception:
        return []


def _search_cargos(query, org):
    if not org:
        return []
    try:
        from cargos.models import Cargo
        return _search_model_records(
            Cargo,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'cargos',
            'cargo',
            '/dashboard/cargos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='fecha_creacion',
            status_field='activo',
            icon='fas fa-briefcase'
        )
    except Exception:
        return []


def _search_contratos(query, org):
    if not org:
        return []
    try:
        from nomina.models import Contrato
        return _search_model_records(
            Contrato,
            query,
            org,
            ['empleado__primer_nombre', 'empleado__primer_apellido', 'tipo_contrato__nombre', 'cargo__nombre'],
            'contratos',
            'contrato',
            '/dashboard/contratos',
            title_attrs=['empleado'],
            subtitle_attrs=['tipo_contrato'],
            description_attrs=['cargo'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-file-contract'
        )
    except Exception:
        return []


def _search_nominas(query, org):
    if not org:
        return []
    try:
        from nomina.models import NominaSimple
        return _search_model_records(
            NominaSimple,
            query,
            org,
            ['periodo', 'estado', 'descripcion'],
            'nominas',
            'nomina',
            '/dashboard/nomina',
            title_attrs=['periodo'],
            subtitle_attrs=['estado'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='estado',
            icon='fas fa-file-invoice-dollar'
        )
    except Exception:
        return []


def _search_conceptos_laborales(query, org):
    if not org:
        return []
    try:
        from nomina.models import ConceptoLaboral
        return _search_model_records(
            ConceptoLaboral,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'conceptos',
            'concepto',
            '/dashboard/conceptos-laborales',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-coins'
        )
    except Exception:
        return []


def _search_parametros_legales(query, org):
    if not org:
        return []
    try:
        from nomina.models import ParametroLegal
        return _search_model_records(
            ParametroLegal,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'parametros',
            'parametro',
            '/dashboard/parametros-legales',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-scale-balanced'
        )
    except Exception:
        return []


def _search_prestamos(query, org):
    if not org:
        return []
    try:
        from prestamos.models import Prestamo
        return _search_model_records(
            Prestamo,
            query,
            org,
            ['numero_prestamo', 'empleado__primer_nombre', 'empleado__primer_apellido', 'empleado__numero_documento', 'estado'],
            'prestamos',
            'prestamo',
            '/dashboard/prestamos',
            title_attrs=['numero_prestamo'],
            subtitle_attrs=['estado'],
            description_attrs=['monto_solicitado'],
            date_field='fecha_solicitud',
            status_field='estado',
            icon='fas fa-credit-card'
        )
    except Exception:
        return []


def _search_tipos_prestamo(query, org):
    if not org:
        return []
    try:
        from prestamos.models import TipoPrestamo
        return _search_model_records(
            TipoPrestamo,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'tipos_prestamo',
            'tipo_prestamo',
            '/dashboard/tipos-prestamo',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-tags'
        )
    except Exception:
        return []


def _search_pagos_prestamo(query, org):
    if not org:
        return []
    try:
        from prestamos.models import PagoPrestamo
        return _search_model_records(
            PagoPrestamo,
            query,
            org,
            ['prestamo__numero_prestamo', 'metodo_pago', 'observaciones'],
            'pagos_prestamo',
            'pago_prestamo',
            '/dashboard/prestamos',
            title_attrs=['prestamo'],
            subtitle_attrs=['metodo_pago'],
            description_attrs=['observaciones'],
            date_field='fecha_pago',
            status_field='estado',
            icon='fas fa-hand-holding-dollar'
        )
    except Exception:
        return []


def _search_items(query, org):
    if not org:
        return []
    try:
        from items.models import Item
        return _search_model_records(
            Item,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'items',
            'item',
            '/dashboard/items',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-box'
        )
    except Exception:
        return []


def _search_ubicaciones(query, org):
    if not org:
        return []
    results = []
    try:
        from locations.models import Departamento, Municipio
        results.extend(_search_model_records(
            Departamento,
            query,
            org,
            ['nombre', 'codigo', 'capital', 'region'],
            'ubicaciones',
            'departamento',
            '/dashboard/departamentos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['capital', 'region'],
            date_field='created_at',
            status_field=None,
            icon='fas fa-map'
        ))
        results.extend(_search_model_records(
            Municipio,
            query,
            org,
            ['nombre', 'codigo', 'departamento__nombre'],
            'ubicaciones',
            'municipio',
            '/dashboard/municipios',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['departamento'],
            date_field='created_at',
            status_field=None,
            icon='fas fa-location-dot'
        ))
    except Exception:
        return results
    return results


def _search_roles(query, org):
    if not org:
        return []
    results = []
    try:
        from roles.models import Rol, TipoRol
        results.extend(_search_model_records(
            Rol,
            query,
            org,
            ['nombre', 'codigo', 'descripcion', 'categoria'],
            'roles',
            'rol',
            '/dashboard/roles',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-user-shield'
        ))
        results.extend(_search_model_records(
            TipoRol,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'roles',
            'tipo_rol',
            '/dashboard/roles',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-layer-group'
        ))
    except Exception:
        return results
    return results


def _search_permisos(query, org):
    if not org:
        return []
    results = []
    try:
        from permisos.models import Permiso, ModuloSistema, TipoPermiso
        results.extend(_search_model_records(
            Permiso,
            query,
            org,
            ['nombre', 'codigo', 'descripcion', 'modulo__nombre'],
            'permisos',
            'permiso',
            '/dashboard/permisos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-key'
        ))
        results.extend(_search_model_records(
            ModuloSistema,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'permisos',
            'modulo',
            '/dashboard/permisos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-puzzle-piece'
        ))
        results.extend(_search_model_records(
            TipoPermiso,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'permisos',
            'tipo_permiso',
            '/dashboard/permisos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-shield'
        ))
    except Exception:
        return results
    return results


def _search_configuracion(query, org):
    if not org:
        return []
    results = []
    try:
        from configuracion.models import ParametroSistema, ConfiguracionModulo, ConfiguracionGeneral
        results.extend(_search_model_records(
            ParametroSistema,
            query,
            org,
            ['nombre', 'clave', 'descripcion', 'valor'],
            'configuracion',
            'parametro',
            '/dashboard/parametros',
            title_attrs=['nombre', 'clave'],
            subtitle_attrs=['clave'],
            description_attrs=['descripcion', 'valor'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-sliders-h'
        ))
        results.extend(_search_model_records(
            ConfiguracionModulo,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'configuracion',
            'modulo',
            '/dashboard/modulos',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-cubes'
        ))
        results.extend(_search_model_records(
            ConfiguracionGeneral,
            query,
            org,
            ['nombre', 'descripcion'],
            'configuracion',
            'configuracion',
            '/dashboard/configuracion',
            title_attrs=['nombre'],
            subtitle_attrs=['descripcion'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-gear'
        ))
    except Exception:
        return results
    return results


def _search_contabilidad(query, org):
    if not org:
        return []
    results = []
    try:
        from contabilidad.models import PlanCuentas, ComprobanteContable, MovimientoContable, CentroCosto
        results.extend(_search_model_records(
            PlanCuentas,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'contabilidad',
            'plan_cuentas',
            '/dashboard/contabilidad',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-book'
        ))
        results.extend(_search_model_records(
            ComprobanteContable,
            query,
            org,
            ['numero', 'descripcion', 'estado'],
            'contabilidad',
            'comprobante',
            '/dashboard/contabilidad',
            title_attrs=['numero'],
            subtitle_attrs=['estado'],
            description_attrs=['descripcion'],
            date_field='fecha',
            status_field='estado',
            icon='fas fa-receipt'
        ))
        results.extend(_search_model_records(
            MovimientoContable,
            query,
            org,
            ['descripcion', 'cuenta__nombre', 'cuenta__codigo'],
            'contabilidad',
            'movimiento',
            '/dashboard/contabilidad',
            title_attrs=['descripcion'],
            subtitle_attrs=['cuenta'],
            description_attrs=['descripcion'],
            date_field='fecha',
            status_field='estado',
            icon='fas fa-money-bill'
        ))
        results.extend(_search_model_records(
            CentroCosto,
            query,
            org,
            ['nombre', 'codigo', 'descripcion'],
            'contabilidad',
            'centro_costo',
            '/dashboard/contabilidad',
            title_attrs=['nombre'],
            subtitle_attrs=['codigo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-sitemap'
        ))
    except Exception:
        return results
    return results


def _search_documentacion(query, org):
    if not org:
        return []
    results = []
    try:
        from documentacion.models import Documento, CategoriaDocumento
        results.extend(_search_model_records(
            Documento,
            query,
            org,
            ['titulo', 'descripcion', 'tags'],
            'documentacion',
            'documento',
            '/dashboard/documentacion',
            title_attrs=['titulo'],
            subtitle_attrs=['categoria'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='estado',
            icon='fas fa-file-lines'
        ))
        results.extend(_search_model_records(
            CategoriaDocumento,
            query,
            org,
            ['nombre', 'descripcion'],
            'documentacion',
            'categoria',
            '/dashboard/documentacion',
            title_attrs=['nombre'],
            subtitle_attrs=['descripcion'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-folder'
        ))
    except Exception:
        return results
    return results


def _search_ayuda(query, org):
    if not org:
        return []
    results = []
    try:
        from ayuda.models import ArticuloAyuda, FAQ, Tutorial, RecursoAyuda
        results.extend(_search_model_records(
            ArticuloAyuda,
            query,
            org,
            ['titulo', 'contenido', 'tags'],
            'ayuda',
            'articulo',
            '/dashboard/ayuda/articulos',
            title_attrs=['titulo'],
            subtitle_attrs=['categoria'],
            description_attrs=['resumen'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-book'
        ))
        results.extend(_search_model_records(
            FAQ,
            query,
            org,
            ['pregunta', 'respuesta', 'tags'],
            'ayuda',
            'faq',
            '/dashboard/ayuda/faqs',
            title_attrs=['pregunta'],
            subtitle_attrs=['categoria'],
            description_attrs=['respuesta'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-circle-question'
        ))
        results.extend(_search_model_records(
            Tutorial,
            query,
            org,
            ['titulo', 'descripcion', 'tags'],
            'ayuda',
            'tutorial',
            '/dashboard/ayuda/tutoriales',
            title_attrs=['titulo'],
            subtitle_attrs=['categoria'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-graduation-cap'
        ))
        results.extend(_search_model_records(
            RecursoAyuda,
            query,
            org,
            ['titulo', 'descripcion', 'tags'],
            'ayuda',
            'recurso',
            '/dashboard/ayuda',
            title_attrs=['titulo'],
            subtitle_attrs=['tipo'],
            description_attrs=['descripcion'],
            date_field='created_at',
            status_field='activo',
            icon='fas fa-life-ring'
        ))
    except Exception:
        return results
    return results


def _search_dashboard(query, org):
    if not org:
        return []
    results = []
    try:
        from dashboard.models import Project
        results.extend(_search_model_records(
            Project,
            query,
            org,
            ['name', 'description'],
            'dashboard',
            'project',
            '/dashboard',
            title_attrs=['name'],
            subtitle_attrs=['description'],
            description_attrs=['description'],
            date_field='created_at',
            status_field=None,
            icon='fas fa-diagram-project'
        ))
    except Exception:
        return results
    return results


# ================================================================================
# FUNCIONES AUXILIARES
# ================================================================================

def _calculate_relevance(query, texts):
    """Calcula relevancia de búsqueda"""
    query_lower = query.lower()
    total_score = 0
    
    for text in texts:
        if not text:
            continue
        
        text_lower = str(text).lower()
        
        # Coincidencia exacta
        if query_lower == text_lower:
            total_score += 100
        # Comienza con la query
        elif text_lower.startswith(query_lower):
            total_score += 80
        # Contiene la query
        elif query_lower in text_lower:
            total_score += 60
        # Palabras parciales
        else:
            words = query_lower.split()
            for word in words:
                if word in text_lower:
                    total_score += 20
    
    return min(total_score, 100)


def _apply_filters(results, date_filter, status_filter):
    """Aplica filtros a los resultados"""
    filtered = results
    
    # Filtro por fecha
    if date_filter != 'all':
        now = timezone.now()
        if date_filter == 'today':
            cutoff = now - timedelta(days=1)
        elif date_filter == 'week':
            cutoff = now - timedelta(days=7)
        elif date_filter == 'month':
            cutoff = now - timedelta(days=30)
        else:
            cutoff = None
        
        if cutoff:
            filtered = [r for r in filtered if r.get('date') and r['date'] >= cutoff]
    
    # Filtro por estado
    if status_filter != 'all':
        filtered = [r for r in filtered if r.get('status') == status_filter]
    
    return filtered


def _sort_results(results, sort_by):
    """Ordena los resultados"""
    if sort_by == 'relevance':
        return sorted(results, key=lambda x: x.get('relevance', 0), reverse=True)
    elif sort_by == 'date':
        return sorted(results, key=lambda x: x.get('date') or timezone.now(), reverse=True)
    elif sort_by == 'title':
        return sorted(results, key=lambda x: x.get('title', '').lower())
    else:
        return results


# ================================================================================
# API ENDPOINTS ADICIONALES
# ================================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_suggestions(request):
    """Obtiene sugerencias de búsqueda (filtrado por permisos y organización)"""
    query = request.GET.get('q', '').strip()[:SEARCH_MAX_QUERY_LENGTH]
    
    if len(query) < 2:
        return JsonResponse({'suggestions': []})

    org = _get_request_organization(request)
    cache_key = _get_cache_key('suggestions', request.user, org, query)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({'suggestions': cached})
    
    suggestions = []
    
    # Sugerencias de usuarios (solo si tiene permiso y scoped a org)
    if _user_can_search_module(request.user, 'usuarios'):
        qs = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        )
        if org:
            org_id = getattr(org, 'id', None) or getattr(org, 'pk', None)
            if org_id:
                qs = qs.filter(organization_id=org_id)
        for usuario in qs[:5]:
            suggestions.append({
                'text': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                'type': 'usuario',
                'icon': 'fas fa-user'
            })

    # Sugerencias de páginas
    for page in _search_pages(query)[:5]:
        suggestions.append({
            'text': page['title'],
            'type': 'pagina',
            'icon': 'fas fa-layer-group'
        })
    
    cache.set(cache_key, suggestions, SEARCH_SUGGESTIONS_TTL)

    return JsonResponse({'suggestions': suggestions})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_modules(request):
    """Lista módulos disponibles para búsqueda (filtrado por permisos del usuario)"""
    all_modules = [
        {'id': 'all', 'name': 'Todos los módulos', 'icon': 'fas fa-search'},
        {'id': 'paginas', 'name': 'Páginas', 'icon': 'fas fa-layer-group'},
        {'id': 'empleados', 'name': 'Empleados', 'icon': 'fas fa-id-badge'},
        {'id': 'cargos', 'name': 'Cargos', 'icon': 'fas fa-briefcase'},
        {'id': 'contratos', 'name': 'Contratos', 'icon': 'fas fa-file-contract'},
        {'id': 'nominas', 'name': 'Nóminas', 'icon': 'fas fa-file-invoice-dollar'},
        {'id': 'conceptos', 'name': 'Conceptos Laborales', 'icon': 'fas fa-coins'},
        {'id': 'parametros', 'name': 'Parámetros Legales', 'icon': 'fas fa-scale-balanced'},
        {'id': 'prestamos', 'name': 'Préstamos', 'icon': 'fas fa-credit-card'},
        {'id': 'tipos_prestamo', 'name': 'Tipos de Préstamo', 'icon': 'fas fa-tags'},
        {'id': 'pagos_prestamo', 'name': 'Pagos de Préstamo', 'icon': 'fas fa-hand-holding-dollar'},
        {'id': 'items', 'name': 'Items', 'icon': 'fas fa-box'},
        {'id': 'ubicaciones', 'name': 'Ubicaciones', 'icon': 'fas fa-map'},
        {'id': 'roles', 'name': 'Roles', 'icon': 'fas fa-user-shield'},
        {'id': 'permisos', 'name': 'Permisos', 'icon': 'fas fa-key'},
        {'id': 'configuracion', 'name': 'Configuración', 'icon': 'fas fa-gear'},
        {'id': 'contabilidad', 'name': 'Contabilidad', 'icon': 'fas fa-book'},
        {'id': 'documentacion', 'name': 'Documentación', 'icon': 'fas fa-file-lines'},
        {'id': 'ayuda', 'name': 'Centro de Ayuda', 'icon': 'fas fa-life-ring'},
        {'id': 'reportes', 'name': 'Reportes', 'icon': 'fas fa-chart-line'},
        {'id': 'dashboard', 'name': 'Dashboard', 'icon': 'fas fa-gauge'},
        {'id': 'usuarios', 'name': 'Usuarios', 'icon': 'fas fa-users'},
        {'id': 'notificaciones', 'name': 'Notificaciones', 'icon': 'fas fa-bell'},
        {'id': 'logs', 'name': 'Logs del Sistema', 'icon': 'fas fa-list-alt'},
    ]

    # Filtrar módulos por permisos del usuario
    user = request.user
    modules = [m for m in all_modules if _user_can_search_module(user, m['id'])]
    
    return JsonResponse({'modules': modules})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_counts(request):
    """Obtiene conteos de resultados por módulo (filtrado por permisos)"""
    query = request.GET.get('q', '').strip()
    org = _get_request_organization(request)
    user = request.user
    
    if not query or len(query) < SEARCH_MIN_QUERY_LENGTH:
        return JsonResponse({'counts': {}})

    cache_key = _get_cache_key('counts', user, org, query)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({'counts': cached})
    
    counts = {}

    # Helper: solo contar si el usuario tiene permiso
    def _can(mod_id):
        return _user_can_search_module(user, mod_id)

    counts['paginas'] = _count_pages(query) if _can('paginas') else 0

    if _can('usuarios'):
        qs = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        )
        if org:
            org_id = getattr(org, 'id', None) or getattr(org, 'pk', None)
            if org_id:
                qs = qs.filter(organization_id=org_id)
        counts['usuarios'] = qs.count()
    else:
        counts['usuarios'] = 0

    counts['notificaciones'] = Notificacion.objects.filter(
        Q(titulo__icontains=query) |
        Q(mensaje__icontains=query),
        usuario=user
    ).count() if _can('notificaciones') else 0

    # Inicializar módulos org-scoped en 0
    org_modules = [
        'empleados', 'cargos', 'contratos', 'nominas', 'conceptos',
        'parametros', 'prestamos', 'tipos_prestamo', 'pagos_prestamo',
        'items', 'ubicaciones', 'roles', 'permisos', 'configuracion',
        'contabilidad', 'documentacion', 'ayuda', 'reportes', 'dashboard',
    ]
    for m in org_modules:
        counts[m] = 0

    if org:
        if _can('empleados') or _can('contratos') or _can('nominas') or _can('conceptos') or _can('parametros'):
            try:
                from nomina.models import Empleado, Contrato, NominaSimple, ConceptoLaboral, ParametroLegal
                if _can('empleados'):
                    counts['empleados'] = _count_model_records(
                        Empleado, query, org,
                        ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'numero_documento', 'email']
                    )
                if _can('contratos'):
                    counts['contratos'] = _count_model_records(
                        Contrato, query, org,
                        ['empleado__primer_nombre', 'empleado__primer_apellido', 'tipo_contrato__nombre', 'cargo__nombre']
                    )
                if _can('nominas'):
                    counts['nominas'] = _count_model_records(
                        NominaSimple, query, org,
                        ['periodo', 'estado', 'descripcion']
                    )
                if _can('conceptos'):
                    counts['conceptos'] = _count_model_records(
                        ConceptoLaboral, query, org,
                        ['nombre', 'codigo', 'descripcion']
                    )
                if _can('parametros'):
                    counts['parametros'] = _count_model_records(
                        ParametroLegal, query, org,
                        ['nombre', 'codigo', 'descripcion']
                    )
            except Exception:
                pass

        if _can('cargos'):
            try:
                from cargos.models import Cargo
                counts['cargos'] = _count_model_records(
                    Cargo, query, org,
                    ['nombre', 'codigo', 'descripcion']
                )
            except Exception:
                pass

        if _can('prestamos') or _can('tipos_prestamo') or _can('pagos_prestamo'):
            try:
                from prestamos.models import Prestamo, TipoPrestamo, PagoPrestamo
                if _can('prestamos'):
                    counts['prestamos'] = _count_model_records(
                        Prestamo, query, org,
                        ['numero_prestamo', 'empleado__primer_nombre', 'empleado__primer_apellido', 'empleado__numero_documento', 'estado']
                    )
                if _can('tipos_prestamo'):
                    counts['tipos_prestamo'] = _count_model_records(
                        TipoPrestamo, query, org,
                        ['nombre', 'codigo', 'descripcion']
                    )
                if _can('pagos_prestamo'):
                    counts['pagos_prestamo'] = _count_model_records(
                        PagoPrestamo, query, org,
                        ['prestamo__numero_prestamo', 'metodo_pago', 'observaciones']
                    )
            except Exception:
                pass

        if _can('items'):
            try:
                from items.models import Item
                counts['items'] = _count_model_records(
                    Item, query, org,
                    ['nombre', 'codigo', 'descripcion']
                )
            except Exception:
                pass

        if _can('ubicaciones'):
            try:
                from locations.models import Departamento, Municipio
                counts['ubicaciones'] = (
                    _count_model_records(Departamento, query, org, ['nombre', 'codigo', 'capital', 'region'])
                    + _count_model_records(Municipio, query, org, ['nombre', 'codigo', 'departamento__nombre'])
                )
            except Exception:
                pass

        if _can('roles'):
            try:
                from roles.models import Rol, TipoRol
                counts['roles'] = (
                    _count_model_records(Rol, query, org, ['nombre', 'codigo', 'descripcion', 'categoria'])
                    + _count_model_records(TipoRol, query, org, ['nombre', 'codigo', 'descripcion'])
                )
            except Exception:
                pass

        if _can('permisos'):
            try:
                from permisos.models import Permiso, ModuloSistema, TipoPermiso
                counts['permisos'] = (
                    _count_model_records(Permiso, query, org, ['nombre', 'codigo', 'descripcion', 'modulo__nombre'])
                    + _count_model_records(ModuloSistema, query, org, ['nombre', 'codigo', 'descripcion'])
                    + _count_model_records(TipoPermiso, query, org, ['nombre', 'codigo', 'descripcion'])
                )
            except Exception:
                pass

        if _can('configuracion'):
            try:
                from configuracion.models import ParametroSistema, ConfiguracionModulo, ConfiguracionGeneral
                counts['configuracion'] = (
                    _count_model_records(ParametroSistema, query, org, ['nombre', 'clave', 'descripcion', 'valor'])
                    + _count_model_records(ConfiguracionModulo, query, org, ['nombre', 'codigo', 'descripcion'])
                    + _count_model_records(ConfiguracionGeneral, query, org, ['nombre', 'descripcion'])
                )
            except Exception:
                pass

        if _can('contabilidad'):
            try:
                from contabilidad.models import PlanCuentas, ComprobanteContable, MovimientoContable, CentroCosto
                counts['contabilidad'] = (
                    _count_model_records(PlanCuentas, query, org, ['nombre', 'codigo', 'descripcion'])
                    + _count_model_records(ComprobanteContable, query, org, ['numero', 'descripcion', 'estado'])
                    + _count_model_records(MovimientoContable, query, org, ['descripcion', 'cuenta__nombre', 'cuenta__codigo'])
                    + _count_model_records(CentroCosto, query, org, ['nombre', 'codigo', 'descripcion'])
                )
            except Exception:
                pass

        if _can('documentacion'):
            try:
                from documentacion.models import Documento, CategoriaDocumento
                counts['documentacion'] = (
                    _count_model_records(Documento, query, org, ['titulo', 'descripcion', 'tags'])
                    + _count_model_records(CategoriaDocumento, query, org, ['nombre', 'descripcion'])
                )
            except Exception:
                pass

        if _can('ayuda'):
            try:
                from ayuda.models import ArticuloAyuda, FAQ, Tutorial, RecursoAyuda
                counts['ayuda'] = (
                    _count_model_records(ArticuloAyuda, query, org, ['titulo', 'contenido', 'tags'])
                    + _count_model_records(FAQ, query, org, ['pregunta', 'respuesta', 'tags'])
                    + _count_model_records(Tutorial, query, org, ['titulo', 'descripcion', 'tags'])
                    + _count_model_records(RecursoAyuda, query, org, ['titulo', 'descripcion', 'tags'])
                )
            except Exception:
                pass

        if _can('dashboard'):
            try:
                from dashboard.models import Project
                counts['dashboard'] = (
                    _count_model_records(Project, query, org, ['name', 'description'])
                )
            except Exception:
                pass

    if _can('logs'):
        counts['logs'] = LogAuditoria.objects.filter(
            Q(accion__icontains=query) |
            Q(modelo__icontains=query) |
            Q(usuario__username__icontains=query)
        ).count()

    counts['total'] = sum(counts.values())

    cache.set(cache_key, counts, SEARCH_COUNTS_TTL)

    return JsonResponse({'counts': counts})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_autocomplete(request):
    """Autocompletado de búsqueda (scoped a organización y permisos)"""
    query = request.GET.get('q', '').strip()[:SEARCH_MAX_QUERY_LENGTH]
    
    if len(query) < SEARCH_MIN_QUERY_LENGTH:
        return JsonResponse({'suggestions': []})

    org = _get_request_organization(request)
    cache_key = _get_cache_key('autocomplete', request.user, org, query)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({'suggestions': cached})
    
    suggestions = []
    
    # Autocompletado de usuarios (solo si tiene permiso y scoped a org)
    if _user_can_search_module(request.user, 'usuarios'):
        qs = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        )
        if org:
            org_id = getattr(org, 'id', None) or getattr(org, 'pk', None)
            if org_id:
                qs = qs.filter(organization_id=org_id)
        for usuario in qs[:5]:
            name = f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username
            suggestions.append({
                'text': name,
                'value': name,
                'type': 'usuario',
                'icon': 'fas fa-user',
                'url': f"/perfil/usuario/{usuario.id}/"
            })
    
    cache.set(cache_key, suggestions, SEARCH_AUTOCOMPLETE_TTL)

    return JsonResponse({'suggestions': suggestions})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_smart_suggestions(request):
    """Sugerencias inteligentes basadas en contexto"""
    query = request.GET.get('q', '').strip()[:SEARCH_MAX_QUERY_LENGTH]
    context = request.GET.get('context', 'general')
    
    suggestions = []

    if len(query) < SEARCH_MIN_QUERY_LENGTH:
        return JsonResponse({'suggestions': []})

    org = _get_request_organization(request)
    cache_key = _get_cache_key('smart', request.user, org, query, extra=context)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({'suggestions': cached})

    if len(query) >= SEARCH_MIN_QUERY_LENGTH:
        # Sugerencias basadas en el contexto
        if context == 'usuarios' and _user_can_search_module(request.user, 'usuarios'):
            qs = User.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )
            if org:
                org_id = getattr(org, 'id', None) or getattr(org, 'pk', None)
                if org_id:
                    qs = qs.filter(organization_id=org_id)
            
            for usuario in qs[:3]:
                suggestions.append({
                    'text': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                    'type': 'usuario',
                    'relevance': 90,
                    'icon': 'fas fa-user'
                })

        if context in ['paginas', 'general']:
            for page in _search_pages(query)[:5]:
                suggestions.append({
                    'text': page['title'],
                    'type': 'pagina',
                    'relevance': 85,
                    'icon': 'fas fa-layer-group'
                })
        
        # Agregar sugerencias comunes
        common_searches = [
            'configuración', 'reportes', 'usuarios activos',
            'notificaciones', 'dashboard', 'perfil',
            'empleados', 'cargos', 'préstamos', 'nómina'
        ]
        
        for search in common_searches:
            if query.lower() in search.lower():
                suggestions.append({
                    'text': search,
                    'type': 'común',
                    'relevance': 60,
                    'icon': 'fas fa-search'
                })
    
    # Ordenar por relevancia
    suggestions.sort(key=lambda x: x.get('relevance', 0), reverse=True)
    
    suggestions = suggestions[:8]
    cache.set(cache_key, suggestions, SEARCH_SUGGESTIONS_TTL)

    return JsonResponse({'suggestions': suggestions})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_recent_history(request):
    """Historial reciente de búsquedas del usuario"""
    recent_searches = SearchHistory.objects.filter(
        user=request.user
    ).order_by('-created_at')[:5]

    return JsonResponse({
        'recent_searches': [
            {
                'id': item.id,
                'query': item.query,
                'timestamp': item.created_at,
                'module': item.module,
                'results_count': item.results_count,
            }
            for item in recent_searches
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_track_click(request):
    """Rastrea clicks en resultados de búsqueda"""
    try:
        data = json.loads(request.body)
        query = data.get('query')
        search_id = data.get('search_id')
        result_id = data.get('result_id')
        result_type = data.get('result_type')
        module = data.get('module')
        position = data.get('position')
        url = data.get('url')
        
        history = None
        if search_id:
            history = SearchHistory.objects.filter(id=search_id, user=request.user).first()
        elif query:
            history = SearchHistory.objects.filter(user=request.user, query=query).order_by('-created_at').first()

        if not history:
            return JsonResponse({
                'success': False,
                'message': 'No se encontró historial de búsqueda'
            }, status=404)

        SearchClick.objects.create(
            history=history,
            result_id=str(result_id) if result_id is not None else '',
            result_type=result_type or '',
            module=module or history.module,
            position=position if isinstance(position, int) else None,
            url=url or '',
            metadata={
                'query': query,
            }
        )

        history.clicked_result = True
        history.last_clicked_at = timezone.now()
        history.save(update_fields=['clicked_result', 'last_clicked_at'])
        
        return JsonResponse({
            'success': True,
            'message': 'Click rastreado correctamente'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Datos JSON inválidos'
        }, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_history(request):
    """Historial completo de búsquedas del usuario"""
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))

    history_qs = SearchHistory.objects.filter(user=request.user).order_by('-created_at')
    paginator = Paginator(history_qs, per_page)
    page_obj = paginator.get_page(page)
    
    return JsonResponse({
        'history': [
            {
                'id': item.id,
                'query': item.query,
                'timestamp': item.created_at,
                'results_count': item.results_count,
                'clicked_result': item.clicked_result,
                'module': item.module,
                'execution_time_ms': item.execution_time_ms,
            }
            for item in page_obj
        ],
        'total': paginator.count,
        'page': page,
        'total_pages': paginator.num_pages
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_stats(request):
    """Estadísticas de búsqueda del usuario"""
    now = timezone.now()
    last_30_days = now - timedelta(days=30)
    last_7_days = now - timedelta(days=7)

    qs = SearchHistory.objects.filter(user=request.user)
    total_searches = qs.count()
    last_30_count = qs.filter(created_at__gte=last_30_days).count()
    avg_per_day = round(last_30_count / 30, 2) if last_30_count else 0

    # Tendencia últimos 7 días
    trend = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_count = qs.filter(created_at__date=day).count()
        trend.append(day_count)

    # Términos más buscados
    terms = (
        qs.values('query')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Módulos populares
    modules = (
        qs.values('module')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    modules_total = sum(item['count'] for item in modules) or 1
    popular_modules = [
        {
            'module': item['module'],
            'percentage': round((item['count'] / modules_total) * 100)
        }
        for item in modules
    ]

    stats = {
        'total_searches': total_searches,
        'avg_searches_per_day': avg_per_day,
        'most_searched_terms': [
            {'term': item['query'], 'count': item['count']} for item in terms
        ],
        'search_trends': {
            'last_7_days': trend,
            'last_30_days': last_30_count
        },
        'popular_modules': popular_modules
    }

    return JsonResponse({'stats': stats})
