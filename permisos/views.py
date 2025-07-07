from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
import json

from .models import Modulo, TipoPermiso, Permiso
from .forms import ModuloForm, TipoPermisoForm, PermisoForm


# ===================== MÓDULOS =====================

@login_required
def modulos_list(request):
    """Lista de módulos con filtros y paginación."""
    queryset = Modulo.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    es_sistema = request.GET.get('es_sistema', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    if es_sistema:
        queryset = queryset.filter(es_sistema=es_sistema == 'true')
    
    # Orden
    order_by = request.GET.get('order_by', 'orden')
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    modulos = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': Modulo.objects.count(),
        'activos': Modulo.objects.filter(activo=True).count(),
        'inactivos': Modulo.objects.filter(activo=False).count(),
        'sistema': Modulo.objects.filter(es_sistema=True).count(),
    }
    
    context = {
        'modulos': modulos,
        'stats': stats,
        'search': search,
        'activo': activo,
        'es_sistema': es_sistema,
        'order_by': order_by,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/table.html', context)
    
    return render(request, 'permisos/modulos/list.html', context)


@login_required
def modulo_detail(request, pk):
    """Detalle de un módulo."""
    modulo = get_object_or_404(Modulo, pk=pk)
    permisos = modulo.permisos.select_related('tipo_permiso').all()
    
    context = {
        'modulo': modulo,
        'permisos': permisos,
    }
    return render(request, 'permisos/modulos/detail.html', context)


@login_required
def modulo_create(request):
    """Crear un nuevo módulo."""
    if request.method == 'POST':
        form = ModuloForm(request.POST)
        if form.is_valid():
            modulo = form.save()
            messages.success(request, f'Módulo "{modulo.nombre}" creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Módulo "{modulo.nombre}" creado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:modulos_list')
                })
            
            return redirect('permisos:modulos_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = ModuloForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/form.html', context)
    
    return render(request, 'permisos/modulos/create.html', context)


@login_required
def modulo_edit(request, pk):
    """Editar un módulo."""
    modulo = get_object_or_404(Modulo, pk=pk)
    
    if request.method == 'POST':
        form = ModuloForm(request.POST, instance=modulo)
        if form.is_valid():
            modulo = form.save()
            messages.success(request, f'Módulo "{modulo.nombre}" actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Módulo "{modulo.nombre}" actualizado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:modulos_list')
                })
            
            return redirect('permisos:modulos_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = ModuloForm(instance=modulo)
    
    context = {'form': form, 'modulo': modulo}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/form.html', context)
    
    return render(request, 'permisos/modulos/edit.html', context)


@login_required
@require_http_methods(["DELETE"])
def modulo_delete(request, pk):
    """Eliminar un módulo."""
    modulo = get_object_or_404(Modulo, pk=pk)
    
    if modulo.es_sistema:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'No se puede eliminar un módulo del sistema.'
            })
        messages.error(request, 'No se puede eliminar un módulo del sistema.')
        return redirect('permisos:modulos_list')
    
    modulo_nombre = modulo.nombre
    modulo.delete()
    
    message = f'Módulo "{modulo_nombre}" eliminado exitosamente.'
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    messages.success(request, message)
    return redirect('permisos:modulos_list')


# ===================== TIPOS DE PERMISO =====================

@login_required
def tipos_permiso_list(request):
    """Lista de tipos de permiso."""
    queryset = TipoPermiso.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    tipos_permiso = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': TipoPermiso.objects.count(),
        'activos': TipoPermiso.objects.filter(activo=True).count(),
        'inactivos': TipoPermiso.objects.filter(activo=False).count(),
    }
    
    context = {
        'tipos_permiso': tipos_permiso,
        'stats': stats,
        'search': search,
        'activo': activo,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/tipos_permiso/table.html', context)
    
    return render(request, 'permisos/tipos_permiso/list.html', context)


@login_required
def tipo_permiso_create(request):
    """Crear un nuevo tipo de permiso."""
    if request.method == 'POST':
        form = TipoPermisoForm(request.POST)
        if form.is_valid():
            tipo = form.save()
            messages.success(request, f'Tipo de permiso "{tipo.nombre}" creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Tipo de permiso "{tipo.nombre}" creado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:tipos_permiso_list')
                })
            
            return redirect('permisos:tipos_permiso_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = TipoPermisoForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/tipos_permiso/form.html', context)
    
    return render(request, 'permisos/tipos_permiso/create.html', context)


@login_required
def tipo_permiso_edit(request, pk):
    """Editar un tipo de permiso."""
    tipo = get_object_or_404(TipoPermiso, pk=pk)
    
    if request.method == 'POST':
        form = TipoPermisoForm(request.POST, instance=tipo)
        if form.is_valid():
            tipo = form.save()
            messages.success(request, f'Tipo de permiso "{tipo.nombre}" actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Tipo de permiso "{tipo.nombre}" actualizado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:tipos_permiso_list')
                })
            
            return redirect('permisos:tipos_permiso_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = TipoPermisoForm(instance=tipo)
    
    context = {'form': form, 'tipo': tipo}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/tipos_permiso/form.html', context)
    
    return render(request, 'permisos/tipos_permiso/edit.html', context)


@login_required
@require_http_methods(["DELETE"])
def tipo_permiso_delete(request, pk):
    """Eliminar un tipo de permiso."""
    tipo = get_object_or_404(TipoPermiso, pk=pk)
    
    tipo_nombre = tipo.nombre
    tipo.delete()
    
    message = f'Tipo de permiso "{tipo_nombre}" eliminado exitosamente.'
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    messages.success(request, message)
    return redirect('permisos:tipos_permiso_list')


# ===================== PERMISOS =====================

@login_required
def permisos_list(request):
    """Lista de permisos con filtros."""
    queryset = Permiso.objects.select_related('modulo', 'tipo_permiso').all()
    
    # Filtros
    search = request.GET.get('search', '')
    modulo_id = request.GET.get('modulo', '')
    tipo_id = request.GET.get('tipo', '')
    activo = request.GET.get('activo', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if modulo_id:
        queryset = queryset.filter(modulo_id=modulo_id)
    
    if tipo_id:
        queryset = queryset.filter(tipo_permiso_id=tipo_id)
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    permisos = paginator.get_page(page_number)
    
    # Para los filtros
    modulos = Modulo.objects.filter(activo=True).order_by('nombre')
    tipos_permiso = TipoPermiso.objects.filter(activo=True).order_by('nombre')
    
    # Estadísticas
    stats = {
        'total': Permiso.objects.count(),
        'activos': Permiso.objects.filter(activo=True).count(),
        'inactivos': Permiso.objects.filter(activo=False).count(),
        'por_modulo': Permiso.objects.values('modulo__nombre').annotate(
            count=Count('id')).order_by('-count')[:5]
    }
    
    context = {
        'permisos': permisos,
        'modulos': modulos,
        'tipos_permiso': tipos_permiso,
        'stats': stats,
        'search': search,
        'modulo_id': modulo_id,
        'tipo_id': tipo_id,
        'activo': activo,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos/table.html', context)
    
    return render(request, 'permisos/permisos/list.html', context)


@login_required
def permiso_create(request):
    """Crear un nuevo permiso."""
    if request.method == 'POST':
        form = PermisoForm(request.POST)
        if form.is_valid():
            permiso = form.save()
            messages.success(request, f'Permiso "{permiso.nombre}" creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Permiso "{permiso.nombre}" creado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:permisos_list')
                })
            
            return redirect('permisos:permisos_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PermisoForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos/form.html', context)
    
    return render(request, 'permisos/permisos/create.html', context)


@login_required
def permiso_edit(request, pk):
    """Editar un permiso."""
    permiso = get_object_or_404(Permiso, pk=pk)
    
    if request.method == 'POST':
        form = PermisoForm(request.POST, instance=permiso)
        if form.is_valid():
            permiso = form.save()
            messages.success(request, f'Permiso "{permiso.nombre}" actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Permiso "{permiso.nombre}" actualizado exitosamente.',
                    'redirect_url': reverse_lazy('permisos:permisos_list')
                })
            
            return redirect('permisos:permisos_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PermisoForm(instance=permiso)
    
    context = {'form': form, 'permiso': permiso}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos/form.html', context)
    
    return render(request, 'permisos/permisos/edit.html', context)


@login_required
@require_http_methods(["DELETE"])
def permiso_delete(request, pk):
    """Eliminar un permiso."""
    permiso = get_object_or_404(Permiso, pk=pk)
    
    permiso_nombre = permiso.nombre
    permiso.delete()
    
    message = f'Permiso "{permiso_nombre}" eliminado exitosamente.'
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    messages.success(request, message)
    return redirect('permisos:permisos_list')


# ===================== API =====================

@login_required
def api_modulos(request):
    """API para obtener módulos."""
    modulos = Modulo.objects.filter(activo=True).values(
        'id', 'nombre', 'codigo', 'descripcion', 'icono', 'url_base'
    )
    return JsonResponse(list(modulos), safe=False)


@login_required
def api_tipos_permiso(request):
    """API para obtener tipos de permiso."""
    tipos = TipoPermiso.objects.filter(activo=True).values(
        'id', 'codigo', 'nombre', 'descripcion'
    )
    return JsonResponse(list(tipos), safe=False)


@login_required
def api_permisos_por_modulo(request, modulo_id):
    """API para obtener permisos de un módulo específico."""
    permisos = Permiso.objects.filter(
        modulo_id=modulo_id,
        activo=True
    ).select_related('tipo_permiso').values(
        'id', 'nombre', 'codigo', 'descripcion',
        'tipo_permiso__nombre', 'tipo_permiso__codigo'
    )
    return JsonResponse(list(permisos), safe=False)
