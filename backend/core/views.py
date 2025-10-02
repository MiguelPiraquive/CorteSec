"""
Vistas de la aplicación Core
============================

Vistas para funcionalidades centrales del sistema:
- Gestión de organizaciones
- Notificaciones
- Búsqueda global
- Health checks y system status
- APIs de utilidad

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
import json
import logging

from .models import Organizacion, Notificacion, ConfiguracionSistema, LogAuditoria
from .forms import OrganizacionForm, NotificacionForm

User = get_user_model()
logger = logging.getLogger(__name__)


# ==================== REACT SPA ====================

def react_app(request):
    """Vista que sirve la aplicación React SPA con datos de autenticación"""
    context = {
        'user_data': None,
        'user_permissions': [],
        'csrf_token': None
    }
    
    if request.user.is_authenticated:
        # Serializar datos del usuario para JavaScript
        context['user_data'] = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'last_login': request.user.last_login.isoformat() if request.user.last_login else None,
        }
        
        # Obtener permisos del usuario
        context['user_permissions'] = list(request.user.get_all_permissions())
        
        # Token CSRF para APIs
        from django.middleware.csrf import get_token
        context['csrf_token'] = get_token(request)
    
    return render(request, 'core/react_app.html', context)


def react_spa_dev(request):
    """Vista que redirige al servidor de desarrollo de React con autenticación"""
    from django.http import HttpResponseRedirect
    
    if request.user.is_authenticated:
        # En desarrollo, redirigir a Vite con parámetros de usuario
        return HttpResponseRedirect('http://localhost:5173/')
    else:
        # Si no está autenticado, redirigir al login
        return HttpResponseRedirect('/login/')


# ==================== DASHBOARD CORE ====================

@login_required
def dashboard_core(request):
    """Dashboard principal de core con estadísticas generales"""
    stats = {
        'organizaciones_total': Organizacion.objects.count(),
        'organizaciones_activas': Organizacion.objects.filter(activa=True).count(),
        'notificaciones_no_leidas': Notificacion.objects.filter(
            usuario=request.user, leida=False
        ).count(),
        'configuraciones_activas': ConfiguracionSistema.objects.filter(activa=True).count(),
        'logs_hoy': LogAuditoria.objects.filter(
            created_at__date=timezone.now().date()
        ).count(),
    }
    
    # Notificaciones recientes
    notificaciones_recientes = Notificacion.objects.filter(
        usuario=request.user
    ).order_by('-fecha')[:5]
    
    # Organizaciones recientes
    organizaciones_recientes = Organizacion.objects.filter(
        activa=True
    ).order_by('-created_at')[:5]
    
    context = {
        'stats': stats,
        'notificaciones_recientes': notificaciones_recientes,
        'organizaciones_recientes': organizaciones_recientes,
        'title': 'Dashboard Core'
    }
    
    # Redirigir al dashboard principal
    return redirect('dashboard:principal')


# ==================== ORGANIZACIONES ====================

@login_required
def organizaciones_list(request):
    """Lista de organizaciones con filtros y paginación"""
    queryset = Organizacion.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    activa = request.GET.get('activa', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(razon_social__icontains=search) |
            Q(nit__icontains=search) |
            Q(email__icontains=search)
        )
    
    if activa:
        queryset = queryset.filter(activa=activa == 'true')
    
    # Orden
    order_by = request.GET.get('order_by', 'nombre')
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    organizaciones = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': Organizacion.objects.count(),
        'activas': Organizacion.objects.filter(activa=True).count(),
        'inactivas': Organizacion.objects.filter(activa=False).count(),
    }
    
    context = {
        'organizaciones': organizaciones,
        'stats': stats,
        'search': search,
        'activa': activa,
        'order_by': order_by,
        'title': 'Organizaciones'
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'core/organizaciones/table.html', context)
    
    return render(request, 'core/organizaciones/list.html', context)


@login_required
def organizacion_detail(request, pk):
    """Detalle de una organización"""
    organizacion = get_object_or_404(Organizacion, pk=pk)
    
    # Estadísticas de la organización
    stats = {
        'usuarios_count': organizacion.usuarios_count,
        'configuraciones': organizacion.configuracion,
        'es_principal': organizacion.es_principal,
    }
    
    context = {
        'organizacion': organizacion,
        'stats': stats,
        'title': f'Organización: {organizacion.nombre}'
    }
    return render(request, 'core/organizaciones/detail.html', context)


@login_required
def organizacion_create(request):
    """Crear una nueva organización"""
    if request.method == 'POST':
        form = OrganizacionForm(request.POST, request.FILES)
        if form.is_valid():
            organizacion = form.save(commit=False)
            organizacion.created_by = request.user
            organizacion.updated_by = request.user
            organizacion.save()
            
            messages.success(
                request, 
                f'Organización "{organizacion.nombre}" creada exitosamente.'
            )
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Organización "{organizacion.nombre}" creada exitosamente.',
                    'redirect_url': f'/core/organizaciones/{organizacion.pk}/'
                })
            
            return redirect('core:organizacion_detail', pk=organizacion.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = OrganizacionForm()
    
    context = {
        'form': form,
        'title': 'Crear Organización'
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'core/organizaciones/form.html', context)
    
    return render(request, 'core/organizaciones/form.html', context)


@login_required
def organizacion_edit(request, pk):
    """Editar una organización"""
    organizacion = get_object_or_404(Organizacion, pk=pk)
    
    if request.method == 'POST':
        form = OrganizacionForm(request.POST, request.FILES, instance=organizacion)
        if form.is_valid():
            organizacion = form.save(commit=False)
            organizacion.updated_by = request.user
            organizacion.save()
            
            messages.success(
                request, 
                f'Organización "{organizacion.nombre}" actualizada exitosamente.'
            )
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Organización "{organizacion.nombre}" actualizada exitosamente.',
                    'redirect_url': f'/core/organizaciones/{organizacion.pk}/'
                })
            
            return redirect('core:organizacion_detail', pk=organizacion.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = OrganizacionForm(instance=organizacion)
    
    context = {
        'form': form,
        'organizacion': organizacion,
        'title': f'Editar: {organizacion.nombre}'
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'core/organizaciones/form.html', context)
    
    return render(request, 'core/organizaciones/form.html', context)


@login_required
@require_http_methods(["DELETE"])
def organizacion_delete(request, pk):
    """Eliminar una organización"""
    organizacion = get_object_or_404(Organizacion, pk=pk)
    
    try:
        organizacion_nombre = organizacion.nombre
        organizacion.delete()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Organización "{organizacion_nombre}" eliminada exitosamente.'
            })
        
        messages.success(request, f'Organización "{organizacion_nombre}" eliminada exitosamente.')
        return redirect('core:organizaciones_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar la organización: {str(e)}'
            })
        
        messages.error(request, f'Error al eliminar la organización: {str(e)}')
        return redirect('core:organizacion_detail', pk=pk)


# ==================== NOTIFICACIONES ====================

@login_required
def notificaciones(request):
    """Vista para mostrar las notificaciones del usuario"""
    queryset = Notificacion.objects.filter(usuario=request.user)
    
    # Filtros
    tipo = request.GET.get('tipo', '')
    leida = request.GET.get('leida', '')
    
    if tipo:
        queryset = queryset.filter(tipo=tipo)
    
    if leida:
        queryset = queryset.filter(leida=leida == 'true')
    
    # Orden
    order_by = request.GET.get('order_by', '-fecha')
    queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 20)
    page_number = request.GET.get('page')
    notificaciones = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': Notificacion.objects.filter(usuario=request.user).count(),
        'no_leidas': Notificacion.objects.filter(usuario=request.user, leida=False).count(),
        'por_tipo': {}
    }
    
    # Conteo por tipo
    for tipo_choice in Notificacion._meta.get_field('tipo').choices:
        count = Notificacion.objects.filter(
            usuario=request.user, 
            tipo=tipo_choice[0]
        ).count()
        if count > 0:
            stats['por_tipo'][tipo_choice[0]] = {
                'nombre': tipo_choice[1],
                'count': count
            }
    
    context = {
        'notificaciones': notificaciones,
        'stats': stats,
        'tipo': tipo,
        'leida': leida,
        'order_by': order_by,
        'title': 'Notificaciones'
    }
    
    return render(request, 'core/notificaciones/list.html', context)


@login_required
@require_http_methods(["POST"])
def notificacion_marcar_leida(request, pk):
    """Marcar una notificación como leída"""
    notificacion = get_object_or_404(
        Notificacion, 
        pk=pk, 
        usuario=request.user
    )
    
    notificacion.marcar_como_leida()
    
    return JsonResponse({
        'success': True,
        'message': 'Notificación marcada como leída.'
    })


@login_required
@require_http_methods(["POST"])
def notificacion_marcar_todas_leidas(request):
    """Marcar todas las notificaciones del usuario como leídas"""
    count = Notificacion.objects.filter(
        usuario=request.user, 
        leida=False
    ).update(
        leida=True,
        fecha_leida=timezone.now()
    )
    
    return JsonResponse({
        'success': True,
        'message': f'{count} notificaciones marcadas como leídas.'
    })


# ==================== BÚSQUEDA Y UTILIDADES ====================

@login_required
def buscar(request):
    """Vista de búsqueda básica (legacy)"""
    query = request.GET.get('q', '').strip()
    results = []
    
    if query:
        # Búsqueda en organizaciones
        org_results = Organizacion.objects.filter(
            Q(nombre__icontains=query) |
            Q(codigo__icontains=query) |
            Q(razon_social__icontains=query)
        )[:10]
        
        for org in org_results:
            results.append({
                'tipo': 'Organización',
                'titulo': org.nombre,
                'descripcion': org.razon_social,
                'url': f'/core/organizaciones/{org.pk}/',
                'icono': 'fas fa-building'
            })
        
        # Búsqueda en notificaciones
        notif_results = Notificacion.objects.filter(
            usuario=request.user,
            titulo__icontains=query
        )[:5]
        
        for notif in notif_results:
            results.append({
                'tipo': 'Notificación',
                'titulo': notif.titulo,
                'descripcion': notif.mensaje,
                'url': notif.url_accion or '#',
                'icono': 'fas fa-bell'
            })
    
    context = {
        'query': query,
        'results': results,
        'total_results': len(results)
    }
    
    return render(request, 'core/buscar_resultados.html', context)


@login_required
def system_check(request):
    """Vista para verificar el estado del sistema"""
    checks = []
    
    try:
        # Check base de datos
        Organizacion.objects.count()
        checks.append({
            'name': 'Base de Datos',
            'status': 'OK',
            'message': 'Conexión exitosa',
            'icon': 'fas fa-database',
            'color': 'success'
        })
    except Exception as e:
        checks.append({
            'name': 'Base de Datos',
            'status': 'ERROR',
            'message': f'Error de conexión: {str(e)}',
            'icon': 'fas fa-database',
            'color': 'danger'
        })
    
    # Check configuraciones
    try:
        config_count = ConfiguracionSistema.objects.filter(activa=True).count()
        checks.append({
            'name': 'Configuraciones',
            'status': 'OK',
            'message': f'{config_count} configuraciones activas',
            'icon': 'fas fa-cogs',
            'color': 'success'
        })
    except Exception as e:
        checks.append({
            'name': 'Configuraciones',
            'status': 'ERROR',
            'message': f'Error: {str(e)}',
            'icon': 'fas fa-cogs',
            'color': 'danger'
        })
    
    # Check usuarios
    try:
        user_count = User.objects.filter(is_active=True).count()
        checks.append({
            'name': 'Usuarios Activos',
            'status': 'OK',
            'message': f'{user_count} usuarios activos',
            'icon': 'fas fa-users',
            'color': 'info'
        })
    except Exception as e:
        checks.append({
            'name': 'Usuarios',
            'status': 'ERROR',
            'message': f'Error: {str(e)}',
            'icon': 'fas fa-users',
            'color': 'danger'
        })
    
    # Check organizaciones
    try:
        org_count = Organizacion.objects.filter(activa=True).count()
        checks.append({
            'name': 'Organizaciones',
            'status': 'OK',
            'message': f'{org_count} organizaciones activas',
            'icon': 'fas fa-building',
            'color': 'info'
        })
    except Exception as e:
        checks.append({
            'name': 'Organizaciones',
            'status': 'ERROR',
            'message': f'Error: {str(e)}',
            'icon': 'fas fa-building',
            'color': 'danger'
        })
    
    # Check notificaciones no leídas
    try:
        notif_count = Notificacion.objects.filter(leida=False).count()
        status = 'WARNING' if notif_count > 10 else 'OK'
        color = 'warning' if notif_count > 10 else 'info'
        checks.append({
            'name': 'Notificaciones',
            'status': status,
            'message': f'{notif_count} notificaciones no leídas',
            'icon': 'fas fa-bell',
            'color': color
        })
    except Exception as e:
        checks.append({
            'name': 'Notificaciones',
            'status': 'ERROR',
            'message': f'Error: {str(e)}',
            'icon': 'fas fa-bell',
            'color': 'danger'
        })
    
    overall_status = 'OK'
    if any(check['status'] == 'ERROR' for check in checks):
        overall_status = 'ERROR'
    elif any(check['status'] == 'WARNING' for check in checks):
        overall_status = 'WARNING'
    
    context = {
        'checks': checks,
        'overall_status': overall_status,
        'check_time': timezone.now()
    }
    
    return render(request, 'system_check.html', context)


def health_check(request):
    """Health check API endpoint"""
    try:
        # Check básico de BD
        Organizacion.objects.count()
        
        return JsonResponse({
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'service': 'core',
            'version': '2.0.0'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'timestamp': timezone.now().isoformat(),
            'service': 'core',
            'error': str(e)
        }, status=503)


@login_required
def test_sticky(request):
    """Vista de prueba para header sticky"""
    context = {
        'test_data': {
            'title': 'Página de Prueba',
            'description': 'Esta es una página para probar funcionalidades',
            'timestamp': timezone.now()
        }
    }
    
    return render(request, 'test_sticky.html', context)


# ==================== VISTAS AJAX PARA NOTIFICACIONES ====================

@require_http_methods(["POST"])
@login_required
def notificacion_toggle(request):
    """Vista AJAX para cambiar el estado de leída de una notificación"""
    try:
        import json
        data = json.loads(request.body)
        notificacion_id = data.get('notificacion_id')
        leida = data.get('leida', True)
        
        notificacion = get_object_or_404(
            Notificacion, 
            id=notificacion_id, 
            usuario=request.user
        )
        
        notificacion.leida = leida
        notificacion.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Notificación marcada como {"leída" if leida else "no leída"}'
        })
        
    except Exception as e:
        logger.error(f"Error al cambiar estado de notificación: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error al procesar la solicitud'
        }, status=500)


@require_http_methods(["POST"])
@login_required
def notificaciones_marcar_todas(request):
    """Vista AJAX para marcar todas las notificaciones como leídas"""
    try:
        count = Notificacion.objects.filter(
            usuario=request.user,
            leida=False
        ).update(leida=True)
        
        return JsonResponse({
            'success': True,
            'message': f'{count} notificaciones marcadas como leídas',
            'count': count
        })
        
    except Exception as e:
        logger.error(f"Error al marcar todas las notificaciones: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error al procesar la solicitud'
        }, status=500)


@require_http_methods(["POST"])
@login_required
def notificacion_delete(request):
    """Vista AJAX para eliminar una notificación"""
    try:
        import json
        data = json.loads(request.body)
        notificacion_id = data.get('notificacion_id')
        
        notificacion = get_object_or_404(
            Notificacion, 
            id=notificacion_id, 
            usuario=request.user
        )
        
        notificacion.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Notificación eliminada correctamente'
        })
        
    except Exception as e:
        logger.error(f"Error al eliminar notificación: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error al procesar la solicitud'
        }, status=500)


# ==================== APIs DE UTILIDAD ====================

@login_required
def api_organizaciones(request):
    """API para obtener organizaciones filtradas"""
    search = request.GET.get('search', '')
    activa = request.GET.get('activa', 'true')
    
    queryset = Organizacion.objects.all()
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )
    
    if activa:
        queryset = queryset.filter(activa=activa == 'true')
    
    organizaciones = []
    for org in queryset[:20]:  # Limitar a 20 resultados
        organizaciones.append({
            'id': str(org.id),
            'nombre': org.nombre,
            'codigo': org.codigo,
            'activa': org.activa,
            'nit': org.nit,
            'email': org.email,
        })
    
    return JsonResponse({'organizaciones': organizaciones})


@login_required
def api_configuracion(request, clave):
    """API para obtener una configuración específica"""
    try:
        config = ConfiguracionSistema.objects.get(clave=clave, activa=True)
        return JsonResponse({
            'success': True,
            'clave': config.clave,
            'valor': config.get_valor_typed(),
            'tipo': config.tipo_dato,
            'descripcion': config.descripcion
        })
    except ConfiguracionSistema.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Configuración no encontrada'
        }, status=404)


@login_required
def api_notificaciones(request):
    """API para obtener notificaciones del usuario"""
    from django.utils import timezone
    
    try:
        # Obtener notificaciones del usuario
        notificaciones = Notificacion.objects.filter(usuario=request.user).order_by('-fecha')[:10]
        
        # Preparar datos
        notifications_data = []
        for notif in notificaciones:
            notifications_data.append({
                'id': notif.id,
                'title': notif.titulo,
                'message': notif.mensaje,
                'type': notif.tipo,
                'is_read': notif.leida,
                'created_at': notif.fecha.isoformat(),
                'priority': 'high' if notif.tipo in ['error', 'warning'] else 'normal',
                'action_url': getattr(notif, 'url_accion', None)
            })
        
        # Contar no leídas
        unread_count = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        
        return JsonResponse({
            'notifications': notifications_data,
            'unread_count': unread_count,
            'total_count': notificaciones.count()
        })
        
    except Exception as e:
        # Si hay error, devolver datos mock
        return JsonResponse({
            'notifications': [
                {
                    'id': 1,
                    'title': 'Bienvenido al sistema',
                    'message': 'Tu cuenta ha sido activada correctamente',
                    'type': 'info',
                    'is_read': False,
                    'created_at': timezone.now().isoformat(),
                    'priority': 'normal',
                    'action_url': None
                }
            ],
            'unread_count': 1,
            'total_count': 1
        })
