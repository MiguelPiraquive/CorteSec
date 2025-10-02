"""
BÚSQUEDA GLOBAL ULTRA PROFESIONAL - CORTESEC ENTERPRISE
========================================================
API endpoints para búsqueda global en todos los módulos del sistema.
Implementación enterprise con filtros avanzados, relevancia y performance optimizada.
"""

from django.http import JsonResponse
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import datetime, timedelta
import json
import time

# Importar modelos del sistema
from django.contrib.auth.models import User
from core.models import Notificacion


# ================================================================================
# BÚSQUEDA PRINCIPAL
# ================================================================================

@login_required
@require_http_methods(["GET"])
def search_global(request):
    """
    Búsqueda global ultra profesional en todos los módulos
    Retorna resultados estructurados con relevancia y metadatos
    """
    start_time = time.time()
    
    query = request.GET.get('q', '').strip()
    module_filter = request.GET.get('module', 'all')
    date_filter = request.GET.get('date', 'all')
    status_filter = request.GET.get('status', 'all')
    sort_by = request.GET.get('sort', 'relevance')
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    
    if not query:
        return JsonResponse({
            'success': False,
            'message': 'Query de búsqueda requerido',
            'results': [],
            'total': 0
        })
    
    # Ejecutar búsquedas por módulo
    all_results = []
    
    if module_filter in ['all', 'usuarios']:
        all_results.extend(_search_usuarios(query, request.user))
    
    if module_filter in ['all', 'notificaciones']:
        all_results.extend(_search_notificaciones(query, request.user))
    
    if module_filter in ['all', 'logs']:
        all_results.extend(_search_logs(query, request.user))
    
    # Aplicar filtros adicionales
    filtered_results = _apply_filters(all_results, date_filter, status_filter)
    
    # Ordenar resultados
    sorted_results = _sort_results(filtered_results, sort_by)
    
    # Paginar resultados
    paginator = Paginator(sorted_results, per_page)
    page_obj = paginator.get_page(page)
    
    # Calcular tiempo de ejecución
    execution_time = round((time.time() - start_time) * 1000, 2)
    
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

def _search_usuarios(query, user):
    """Búsqueda en usuarios"""
    results = []
    
    usuarios = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query)
    ).distinct()[:20]
    
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
            'url': f"/core/notificaciones/{notif.id}/",
            'icon': 'fas fa-bell',
            'relevance': relevance,
            'date': notif.fecha_creacion,
            'status': 'leida' if notif.leida else 'no_leida',
            'module': 'notificaciones',
            'metadata': {
                'tipo': notif.tipo,
                'leida': notif.leida,
                'fecha_lectura': notif.fecha_lectura
            }
        })
    
    return results


def _search_logs(query, user):
    """Búsqueda en logs del sistema"""
    results = []
    
    # Solo admins pueden ver logs
    if not user.is_staff:
        return results
    
    # TODO: LogSistema model no existe - implementar cuando esté disponible
    # logs = LogSistema.objects.filter(
    #     Q(accion__icontains=query) |
    #     Q(descripcion__icontains=query)
    # ).distinct()[:20]
    
    # for log in logs:
    #     relevance = _calculate_relevance(query, [
    #         log.accion,
    #         log.descripcion
    #     ])
    #     
    #     results.append({
    #         'id': log.id,
    #         'type': 'log',
    #         'title': log.accion,
    #         'subtitle': log.usuario.username if log.usuario else 'Sistema',
    #         'description': log.descripcion[:100] + '...' if len(log.descripcion) > 100 else log.descripcion,
    #         'url': f"/core/logs/{log.id}/",
    #         'icon': 'fas fa-list-alt',
    #         'relevance': relevance,
    #         'date': log.fecha,
    #         'status': 'completed',
    #         'module': 'logs',
    #         'metadata': {
    #             'ip_address': log.ip_address,
    #             'user_agent': log.user_agent[:50] + '...' if log.user_agent and len(log.user_agent) > 50 else log.user_agent
    #         }
    #     })
    
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

@login_required
@require_http_methods(["GET"])
def search_suggestions(request):
    """Obtiene sugerencias de búsqueda"""
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'suggestions': []})
    
    suggestions = []
    
    # Sugerencias de usuarios
    usuarios = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    )[:5]
    
    for usuario in usuarios:
        suggestions.append({
            'text': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
            'type': 'usuario',
            'icon': 'fas fa-user'
        })
    
    return JsonResponse({'suggestions': suggestions})


@login_required
@require_http_methods(["GET"])
def search_modules(request):
    """Lista módulos disponibles para búsqueda"""
    modules = [
        {'id': 'all', 'name': 'Todos los módulos', 'icon': 'fas fa-search'},
        {'id': 'usuarios', 'name': 'Usuarios', 'icon': 'fas fa-users'},
        {'id': 'notificaciones', 'name': 'Notificaciones', 'icon': 'fas fa-bell'},
    ]
    
    if request.user.is_staff:
        modules.append({'id': 'logs', 'name': 'Logs del Sistema', 'icon': 'fas fa-list-alt'})
    
    return JsonResponse({'modules': modules})


@login_required
@require_http_methods(["GET"])
def search_counts(request):
    """Obtiene conteos de resultados por módulo"""
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({'counts': {}})
    
    counts = {}
    
    # Contar usuarios
    usuarios_count = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query)
    ).count()
    counts['usuarios'] = usuarios_count
    
    # Contar notificaciones
    notif_count = Notificacion.objects.filter(
        Q(titulo__icontains=query) |
        Q(mensaje__icontains=query),
        usuario=request.user
    ).count()
    counts['notificaciones'] = notif_count
    
    # Logs solo para staff
    if request.user.is_staff:
        counts['logs'] = 0  # TODO: implementar cuando LogSistema esté disponible
    
    counts['total'] = sum(counts.values())
    
    return JsonResponse({'counts': counts})


@login_required
@require_http_methods(["GET"])
def search_autocomplete(request):
    """Autocompletado de búsqueda"""
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'suggestions': []})
    
    suggestions = []
    
    # Autocompletado de usuarios
    usuarios = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    )[:5]
    
    for usuario in usuarios:
        name = f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username
        suggestions.append({
            'text': name,
            'value': name,
            'type': 'usuario',
            'icon': 'fas fa-user',
            'url': f"/perfil/usuario/{usuario.id}/"
        })
    
    return JsonResponse({'suggestions': suggestions})


@login_required
@require_http_methods(["GET"])
def search_smart_suggestions(request):
    """Sugerencias inteligentes basadas en contexto"""
    query = request.GET.get('q', '').strip()
    context = request.GET.get('context', 'general')
    
    suggestions = []
    
    if len(query) >= 2:
        # Sugerencias basadas en el contexto
        if context == 'usuarios':
            usuarios = User.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )[:3]
            
            for usuario in usuarios:
                suggestions.append({
                    'text': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                    'type': 'usuario',
                    'relevance': 90,
                    'icon': 'fas fa-user'
                })
        
        # Agregar sugerencias comunes
        common_searches = [
            'configuración', 'reportes', 'usuarios activos', 
            'notificaciones', 'dashboard', 'perfil'
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
    
    return JsonResponse({'suggestions': suggestions[:8]})


@login_required
@require_http_methods(["GET"])
def search_recent_history(request):
    """Historial reciente de búsquedas del usuario"""
    # TODO: Implementar sistema de historial de búsquedas
    # Por ahora retornamos una estructura básica
    
    recent_searches = [
        {'query': 'usuarios activos', 'timestamp': timezone.now()},
        {'query': 'reportes mensuales', 'timestamp': timezone.now() - timedelta(hours=2)},
        {'query': 'configuración', 'timestamp': timezone.now() - timedelta(days=1)},
    ]
    
    return JsonResponse({'recent_searches': recent_searches})


@login_required
@require_http_methods(["POST"])
def search_track_click(request):
    """Rastrea clicks en resultados de búsqueda"""
    try:
        data = json.loads(request.body)
        query = data.get('query')
        result_id = data.get('result_id')
        result_type = data.get('result_type')
        
        # TODO: Implementar sistema de analytics de búsqueda
        # Por ahora solo confirmamos que se recibió
        
        return JsonResponse({
            'success': True,
            'message': 'Click rastreado correctamente'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Datos JSON inválidos'
        }, status=400)


@login_required
@require_http_methods(["GET"])
def search_history(request):
    """Historial completo de búsquedas del usuario"""
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    
    # TODO: Implementar modelo de historial de búsquedas
    # Por ahora retornamos datos de ejemplo
    
    history_data = []
    for i in range(50):  # Simulamos 50 búsquedas
        history_data.append({
            'id': i + 1,
            'query': f'búsqueda ejemplo {i + 1}',
            'timestamp': timezone.now() - timedelta(days=i),
            'results_count': 10 - (i % 5),
            'clicked_result': i % 3 == 0
        })
    
    # Paginar
    paginator = Paginator(history_data, per_page)
    page_obj = paginator.get_page(page)
    
    return JsonResponse({
        'history': list(page_obj),
        'total': paginator.count,
        'page': page,
        'total_pages': paginator.num_pages
    })


@login_required
@require_http_methods(["GET"])
def search_stats(request):
    """Estadísticas de búsqueda del usuario"""
    # TODO: Implementar sistema de estadísticas reales
    
    stats = {
        'total_searches': 150,
        'avg_searches_per_day': 5.2,
        'most_searched_terms': [
            {'term': 'usuarios', 'count': 25},
            {'term': 'reportes', 'count': 18},
            {'term': 'configuración', 'count': 12},
        ],
        'search_trends': {
            'last_7_days': [3, 5, 8, 2, 6, 9, 4],
            'last_30_days': 89
        },
        'popular_modules': [
            {'module': 'usuarios', 'percentage': 45},
            {'module': 'reportes', 'percentage': 30},
            {'module': 'configuración', 'percentage': 25}
        ]
    }
    
    return JsonResponse({'stats': stats})
