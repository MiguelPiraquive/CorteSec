from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils.translation import gettext_lazy as _
from django.urls import reverse_lazy

from .models import TipoCantidad
from .forms import TipoCantidadForm, TipoCantidadFiltroForm


@login_required
def lista_tipos_cantidad(request):
    """Vista para listar tipos de cantidad con búsqueda y filtros"""
    queryset = TipoCantidad.objects.all()
    
    # Aplicar filtros
    filtro_form = TipoCantidadFiltroForm(request.GET)
    
    if filtro_form.is_valid():
        search = filtro_form.cleaned_data.get('search')
        estado = filtro_form.cleaned_data.get('estado')
        orden_por = filtro_form.cleaned_data.get('orden_por')
        
        if search:
            queryset = queryset.filter(
                Q(codigo__icontains=search) |
                Q(descripcion__icontains=search) |
                Q(simbolo__icontains=search)
            )
        
        if estado == 'activos':
            queryset = queryset.filter(activo=True)
        elif estado == 'inactivos':
            queryset = queryset.filter(activo=False)
        
        # Ordenamiento
        if orden_por:
            queryset = queryset.order_by(orden_por, 'codigo')
    
    # Orden por defecto
    if not filtro_form.is_valid() or not filtro_form.cleaned_data.get('orden_por'):
        queryset = queryset.order_by('orden', 'codigo')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': TipoCantidad.objects.count(),
        'activos': TipoCantidad.objects.filter(activo=True).count(),
        'inactivos': TipoCantidad.objects.filter(activo=False).count(),
    }
    
    context = {
        'tipos': page_obj,
        'filtro_form': filtro_form,
        'stats': stats,
        'title': _('Tipos de Cantidad'),
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'tipos_cantidad/table.html', context)
    
    return render(request, 'tipos_cantidad/list.html', context)


@login_required
def crear_tipo_cantidad(request):
    """Vista para crear un nuevo tipo de cantidad"""
    if request.method == 'POST':
        form = TipoCantidadForm(request.POST)
        if form.is_valid():
            tipo = form.save()
            messages.success(request, f'Tipo de cantidad "{tipo.codigo}" creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Tipo de cantidad "{tipo.codigo}" creado exitosamente.',
                    'redirect_url': reverse_lazy('tipos_cantidad:lista')
                })
            
            return redirect('tipos_cantidad:lista')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = TipoCantidadForm()
    
    context = {
        'form': form,
        'object': None,
        'title': 'Crear Tipo de Cantidad'
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'tipos_cantidad/form.html', context)
    
    return render(request, 'tipos_cantidad/form.html', context)


@login_required
def editar_tipo_cantidad(request, pk):
    """Vista para editar un tipo de cantidad"""
    tipo = get_object_or_404(TipoCantidad, pk=pk)
    
    if request.method == 'POST':
        form = TipoCantidadForm(request.POST, instance=tipo)
        if form.is_valid():
            tipo = form.save()
            messages.success(request, f'Tipo de cantidad "{tipo.codigo}" actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Tipo de cantidad "{tipo.codigo}" actualizado exitosamente.',
                    'redirect_url': reverse_lazy('tipos_cantidad:lista')
                })
            
            return redirect('tipos_cantidad:lista')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = TipoCantidadForm(instance=tipo)
    
    context = {
        'form': form,
        'object': tipo,
        'title': 'Editar Tipo de Cantidad'
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'tipos_cantidad/form.html', context)
    
    return render(request, 'tipos_cantidad/form.html', context)


@login_required
def detalle_tipo_cantidad(request, pk):
    """Vista para ver el detalle de un tipo de cantidad"""
    tipo = get_object_or_404(TipoCantidad, pk=pk)
    
    # TODO: Agregar estadísticas de uso del tipo
    context = {
        'object': tipo,
        'title': f'Detalle: {tipo.codigo}',
    }
    return render(request, 'tipos_cantidad/detail.html', context)


@login_required
def eliminar_tipo_cantidad(request, pk):
    """Vista para eliminar un tipo de cantidad"""
    tipo = get_object_or_404(TipoCantidad, pk=pk)
    
    if request.method == 'POST':
        if not tipo.puede_eliminarse():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Este tipo de cantidad no se puede eliminar porque es del sistema.'
                })
            messages.error(request, 'Este tipo de cantidad no se puede eliminar porque es del sistema.')
            return redirect('tipos_cantidad:lista')
        
        try:
            codigo = tipo.codigo
            tipo.delete()
            
            message = f'Tipo de cantidad "{codigo}" eliminado exitosamente.'
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': message
                })
            
            messages.success(request, message)
        except Exception as e:
            message = f'Error al eliminar tipo de cantidad: {str(e)}'
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': message
                })
            
            messages.error(request, message)
        
        return redirect('tipos_cantidad:lista')
    
    # GET request - mostrar página de confirmación
    context = {
        'object': tipo,
        'title': f'Eliminar: {tipo.codigo}',
    }
    return render(request, 'tipos_cantidad/confirm_delete.html', context)


@login_required
@require_http_methods(["POST"])
def toggle_activo(request, pk):
    """Vista AJAX para activar/desactivar un tipo de cantidad"""
    tipo = get_object_or_404(TipoCantidad, pk=pk)
    
    if tipo.es_sistema and not request.user.is_superuser:
        return JsonResponse({
            'success': False,
            'message': _('No se pueden modificar tipos de cantidad del sistema')
        })
    
    tipo.activo = not tipo.activo
    tipo.save()
    
    estado = _('activado') if tipo.activo else _('desactivado')
    return JsonResponse({
        'success': True,
        'message': f'Tipo de cantidad {estado} exitosamente',
        'activo': tipo.activo
    })


@login_required
def api_tipos_cantidad(request):
    """API para obtener tipos de cantidad para selects dinámicos"""
    activos_solo = request.GET.get('activos_solo', 'true') == 'true'
    
    tipos = TipoCantidad.objects.all()
    if activos_solo:
        tipos = tipos.filter(activo=True)
    
    tipos = tipos.order_by('orden', 'codigo')
    
    data = [{
        'id': tipo.id,
        'codigo': tipo.codigo,
        'descripcion': tipo.descripcion,
        'simbolo': tipo.simbolo,
        'descripcion_completa': tipo.descripcion_completa
    } for tipo in tipos]
    
    return JsonResponse({'tipos': data})
