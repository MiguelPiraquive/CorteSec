from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.http import require_http_methods
from django.template.loader import render_to_string

from .models import Rol
from .forms import RolForm


@login_required
def lista_roles(request):
    """Vista para listar roles con búsqueda y paginación"""
    search_query = request.GET.get('search', '')
    activo_filter = request.GET.get('activo', '')
    
    roles = Rol.objects.all()
    
    # Filtro de búsqueda
    if search_query:
        roles = roles.filter(
            Q(nombre__icontains=search_query) |
            Q(descripcion__icontains=search_query)
        )
    
    # Filtro por estado activo
    if activo_filter in ['true', 'false']:
        activo_bool = activo_filter == 'true'
        roles = roles.filter(activo=activo_bool)
    
    roles = roles.order_by('nombre')
    
    # Paginación
    paginator = Paginator(roles, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        # Respuesta AJAX
        html = render_to_string('roles/partials/tabla_roles.html', {
            'page_obj': page_obj,
            'search_query': search_query,
            'activo_filter': activo_filter,
        })
        return JsonResponse({
            'html': html,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': page_obj.paginator.num_pages,
        })
    
    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'activo_filter': activo_filter,
        'title': 'Gestión de Roles',
    }
    return render(request, 'roles/lista.html', context)


@login_required
def crear_rol(request):
    """Vista para crear un nuevo rol"""
    if request.method == 'POST':
        form = RolForm(request.POST)
        if form.is_valid():
            rol = form.save()
            messages.success(request, f'Rol "{rol.nombre}" creado exitosamente.')
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Rol "{rol.nombre}" creado exitosamente.',
                    'redirect': '/roles/'
                })
            
            return redirect('roles:lista')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = RolForm()
    
    context = {
        'form': form,
        'title': 'Crear Rol',
        'action': 'Crear'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/formulario.html', context)


@login_required
def editar_rol(request, pk):
    """Vista para editar un rol existente"""
    rol = get_object_or_404(Rol, pk=pk)
    
    if request.method == 'POST':
        form = RolForm(request.POST, instance=rol)
        if form.is_valid():
            rol = form.save()
            messages.success(request, f'Rol "{rol.nombre}" actualizado exitosamente.')
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Rol "{rol.nombre}" actualizado exitosamente.',
                    'redirect': '/roles/'
                })
            
            return redirect('roles:lista')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = RolForm(instance=rol)
    
    context = {
        'form': form,
        'rol': rol,
        'title': f'Editar Rol: {rol.nombre}',
        'action': 'Actualizar'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/formulario.html', context)


@login_required
def detalle_rol(request, pk):
    """Vista para ver los detalles de un rol"""
    rol = get_object_or_404(Rol, pk=pk)
    
    context = {
        'rol': rol,
        'title': f'Detalle del Rol: {rol.nombre}',
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('roles/detalle.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'roles/detalle.html', context)


@login_required
@require_http_methods(["POST"])
def eliminar_rol(request, pk):
    """Vista para eliminar un rol"""
    rol = get_object_or_404(Rol, pk=pk)
    
    try:
        nombre_rol = rol.nombre
        rol.delete()
        messages.success(request, f'Rol "{nombre_rol}" eliminado exitosamente.')
        
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Rol "{nombre_rol}" eliminado exitosamente.'
            })
        
    except Exception as e:
        messages.error(request, f'Error al eliminar el rol: {str(e)}')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar el rol: {str(e)}'
            })
    
    return redirect('roles:lista')


@login_required
@require_http_methods(["POST"])
def toggle_activo_rol(request, pk):
    """Vista para alternar el estado activo de un rol"""
    rol = get_object_or_404(Rol, pk=pk)
    
    rol.activo = not rol.activo
    rol.save()
    
    estado = "activado" if rol.activo else "desactivado"
    message = f'Rol "{rol.nombre}" {estado} exitosamente.'
    messages.success(request, message)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message,
            'activo': rol.activo
        })
    
    return redirect('roles:lista')


# ============ API Views ============

@login_required
def api_roles(request):
    """API para obtener roles (para select2, etc.)"""
    search = request.GET.get('search', '')
    roles = Rol.objects.filter(activo=True)
    
    if search:
        roles = roles.filter(nombre__icontains=search)
    
    roles_data = []
    for rol in roles[:20]:  # Limitar a 20 resultados
        roles_data.append({
            'id': rol.id,
            'text': rol.nombre,
            'descripcion': rol.descripcion,
            'activo': rol.activo,
            'permisos_count': rol.permisos.count() if hasattr(rol, 'permisos') else 0
        })
    
    return JsonResponse({
        'results': roles_data,
        'pagination': {'more': roles.count() > 20}
    })
