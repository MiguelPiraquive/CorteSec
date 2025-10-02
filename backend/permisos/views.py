"""
Vistas del Sistema de Gestión de Permisos
==========================================

Vistas específicas para la gestión de permisos, sin lógica de roles.
La lógica de roles está en la app 'roles'.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-10
"""

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from django.utils import timezone
import json

from .models import (
    ModuloSistema, TipoPermiso, CondicionPermiso, 
    Permiso, PermisoDirecto, AuditoriaPermisos, PermisoI18N, ConfiguracionEntorno
)
from core.models import Organizacion
from .forms import (
    ModuloSistemaForm, TipoPermisoForm, 
    CondicionPermisoForm, PermisoForm, PermisoDirectoForm
)

User = get_user_model()


# ===================== DASHBOARD PRINCIPAL =====================

@login_required
def dashboard(request):
    """Dashboard principal del sistema de permisos."""
    # Estadísticas generales
    stats = {
        'total_usuarios': User.objects.count(),
        'total_organizaciones': Organizacion.objects.count(),
        'total_modulos': ModuloSistema.objects.count(),
        'total_permisos': Permiso.objects.count(),
        'total_tipos_permiso': TipoPermiso.objects.count(),
        'total_condiciones': CondicionPermiso.objects.count(),
        'total_permisos_directos': PermisoDirecto.objects.count(),
    }
    
    # Módulos más utilizados
    modulos_populares = ModuloSistema.objects.annotate(
        num_permisos=Count('permisos')
    ).filter(activo=True).order_by('-num_permisos')[:5]
    
    # Permisos más populares
    permisos_populares = Permiso.objects.filter(
        activo=True
    ).order_by('-prioridad')[:10]
    
    # Permisos directos recientes
    permisos_directos_recientes = PermisoDirecto.objects.select_related(
        'usuario', 'permiso'
    ).filter(activo=True).order_by('-created_at')[:5]
    
    context = {
        'stats': stats,
        'modulos_populares': modulos_populares,
        'permisos_populares': permisos_populares,
        'permisos_directos_recientes': permisos_directos_recientes,
    }
    
    return render(request, 'permisos/dashboard/main.html', context)


# ===================== MÓDULOS DEL SISTEMA =====================

@login_required
def modulos_list(request):
    """Lista de módulos con filtros y paginación."""
    queryset = ModuloSistema.objects.select_related('padre')
    
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
        'total': ModuloSistema.objects.count(),
        'activos': ModuloSistema.objects.filter(activo=True).count(),
        'inactivos': ModuloSistema.objects.filter(activo=False).count(),
    }
    
    context = {
        'modulos': modulos,
        'stats': stats,
        'search': search,
        'activo': activo,
        'order_by': order_by,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/table.html', context)
    
    return render(request, 'permisos/modulos/list.html', context)


@login_required
def modulo_detail(request, pk):
    """Detalle de un módulo."""
    modulo = get_object_or_404(
        ModuloSistema.objects.select_related('padre').prefetch_related(
            'hijos', 'permisos__tipo_permiso', 'permisos__organizacion'
        ), 
        pk=pk
    )
    
    # Obtener tipos de permiso únicos asociados al módulo
    tipos_permiso = TipoPermiso.objects.filter(
        permisos__modulo=modulo
    ).distinct()
    
    # Obtener organizaciones únicas asociadas al módulo
    organizaciones = Organizacion.objects.filter(
        permisos__modulo=modulo
    ).distinct()
    
    context = {
        'modulo': modulo,
        'tipos_permiso': tipos_permiso,
        'organizaciones': organizaciones,
    }
    return render(request, 'permisos/modulos/detail.html', context)


@login_required
def modulo_create(request):
    """Crear un nuevo módulo."""
    if request.method == 'POST':
        form = ModuloSistemaForm(request.POST)
        if form.is_valid():
            modulo = form.save()
            messages.success(request, f'Módulo "{modulo.nombre}" creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Módulo "{modulo.nombre}" creado exitosamente.',
                    'redirect_url': f'/permisos/modulos/{modulo.pk}/'
                })
            
            return redirect('permisos:modulo_detail', pk=modulo.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = ModuloSistemaForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/form.html', context)
    
    return render(request, 'permisos/modulos/form.html', context)


@login_required
def modulo_edit(request, pk):
    """Editar un módulo."""
    modulo = get_object_or_404(ModuloSistema, pk=pk)
    
    if request.method == 'POST':
        form = ModuloSistemaForm(request.POST, instance=modulo)
        if form.is_valid():
            modulo = form.save()
            messages.success(request, f'Módulo "{modulo.nombre}" actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Módulo "{modulo.nombre}" actualizado exitosamente.',
                    'redirect_url': f'/permisos/modulos/{modulo.pk}/'
                })
            
            return redirect('permisos:modulo_detail', pk=modulo.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = ModuloSistemaForm(instance=modulo)
    
    context = {
        'form': form,
        'modulo': modulo
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/form.html', context)
    
    return render(request, 'permisos/modulos/form.html', context)


@login_required
def modulo_delete_confirm(request, pk):
    """Mostrar confirmación de eliminación de módulo."""
    modulo = get_object_or_404(ModuloSistema, pk=pk)
    
    # Verificar que no sea un módulo del sistema
    if modulo.es_sistema:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'No se pueden eliminar módulos del sistema.'
            })
        messages.error(request, 'No se pueden eliminar módulos del sistema.')
        return redirect('permisos:modulos_list')
    
    context = {
        'modulo': modulo,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/modulos/delete_confirm.html', context)
    
    return render(request, 'permisos/modulos/delete_confirm.html', context)


@login_required
@require_http_methods(["DELETE"])
def modulo_delete(request, pk):
    """Eliminar un módulo."""
    modulo = get_object_or_404(ModuloSistema, pk=pk)
    
    try:
        modulo_nombre = modulo.nombre
        modulo.delete()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Módulo "{modulo_nombre}" eliminado exitosamente.'
            })
        
        messages.success(request, f'Módulo "{modulo_nombre}" eliminado exitosamente.')
        return redirect('permisos:modulos_list')
        
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar el módulo: {str(e)}'
            })
        
        messages.error(request, f'Error al eliminar el módulo: {str(e)}')
        return redirect('permisos:modulo_detail', pk=pk)


# ===================== TIPOS DE PERMISO =====================

@login_required
def tipos_permiso_list(request):
    """Lista de tipos de permiso con filtros y paginación."""
    queryset = TipoPermiso.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    # Orden
    order_by = request.GET.get('order_by', 'nombre')
    if order_by:
        queryset = queryset.order_by(order_by)
    
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
        'order_by': order_by,
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
            tipo_permiso = form.save()
            messages.success(request, f'Tipo de permiso "{tipo_permiso.nombre}" creado exitosamente.')
            return redirect('permisos:tipos_permiso_list')
    else:
        form = TipoPermisoForm()
    
    return render(request, 'permisos/tipos_permiso/form.html', {'form': form, 'action': 'create'})


@login_required
def tipo_permiso_edit(request, pk):
    """Editar un tipo de permiso."""
    tipo_permiso = get_object_or_404(TipoPermiso, pk=pk)
    
    if request.method == 'POST':
        form = TipoPermisoForm(request.POST, instance=tipo_permiso)
        if form.is_valid():
            tipo_permiso = form.save()
            messages.success(request, f'Tipo de permiso "{tipo_permiso.nombre}" actualizado exitosamente.')
            return redirect('permisos:tipos_permiso_list')
    else:
        form = TipoPermisoForm(instance=tipo_permiso)
    
    return render(request, 'permisos/tipos_permiso/form.html', {
        'form': form,
        'tipo_permiso': tipo_permiso,
        'action': 'edit'
    })


# ===================== CONDICIONES DE PERMISO =====================

@login_required
def condiciones_list(request):
    """Lista de condiciones con filtros y paginación."""
    queryset = CondicionPermiso.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    activa = request.GET.get('activa', '')
    tipo = request.GET.get('tipo', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(codigo__icontains=search)
        )
    
    if activa:
        queryset = queryset.filter(activa=activa == 'true')
        
    if tipo:
        queryset = queryset.filter(tipo=tipo)
    
    # Orden
    order_by = request.GET.get('order_by', 'nombre')
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    condiciones = paginator.get_page(page_number)
    
    # Datos para filtros
    tipos_condicion = CondicionPermiso.TIPO_CONDICION_CHOICES
    
    # Estadísticas
    stats = {
        'total': CondicionPermiso.objects.count(),
        'activas': CondicionPermiso.objects.filter(activa=True).count(),
        'inactivas': CondicionPermiso.objects.filter(activa=False).count(),
    }
    
    context = {
        'condiciones': condiciones,
        'stats': stats,
        'tipos_condicion': tipos_condicion,
        'search': search,
        'activa': activa,
        'tipo': tipo,
        'order_by': order_by,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/condiciones/table.html', context)
    
    return render(request, 'permisos/condiciones/list.html', context)


@login_required
def condicion_create(request):
    """Crear una nueva condición."""
    if request.method == 'POST':
        form = CondicionPermisoForm(request.POST)
        if form.is_valid():
            condicion = form.save()
            messages.success(request, f'Condición "{condicion.nombre}" creada exitosamente.')
            return redirect('permisos:condiciones_list')
    else:
        form = CondicionPermisoForm()
    
    return render(request, 'permisos/condiciones/form.html', {'form': form, 'action': 'create'})


@login_required
def condicion_edit(request, pk):
    """Editar una condición."""
    condicion = get_object_or_404(CondicionPermiso, pk=pk)
    
    if request.method == 'POST':
        form = CondicionPermisoForm(request.POST, instance=condicion)
        if form.is_valid():
            condicion = form.save()
            messages.success(request, f'Condición "{condicion.nombre}" actualizada exitosamente.')
            return redirect('permisos:condiciones_list')
    else:
        form = CondicionPermisoForm(instance=condicion)
    
    return render(request, 'permisos/condiciones/form.html', {
        'form': form,
        'condicion': condicion,
        'action': 'edit'
    })


# ===================== PERMISOS =====================

@login_required
def permisos_list(request):
    """Lista de permisos con filtros y paginación."""
    queryset = Permiso.objects.select_related('modulo', 'tipo_permiso').prefetch_related('condiciones')
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    modulo_id = request.GET.get('modulo', '')
    tipo_id = request.GET.get('tipo', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
        
    if modulo_id:
        queryset = queryset.filter(modulo_id=modulo_id)
        
    if tipo_id:
        queryset = queryset.filter(tipo_permiso_id=tipo_id)
    
    # Orden
    order_by = request.GET.get('order_by', 'nombre')
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    permisos = paginator.get_page(page_number)
    
    # Datos para filtros
    modulos = ModuloSistema.objects.filter(activo=True).order_by('nombre')
    tipos_permiso = TipoPermiso.objects.filter(activo=True).order_by('nombre')
    
    # Estadísticas
    stats = {
        'total': Permiso.objects.count(),
        'activos': Permiso.objects.filter(activo=True).count(),
        'inactivos': Permiso.objects.filter(activo=False).count(),
        'sistema': Permiso.objects.filter(es_sistema=True).count(),
    }
    
    context = {
        'permisos': permisos,
        'stats': stats,
        'modulos': modulos,
        'tipos_permiso': tipos_permiso,
        'search': search,
        'activo': activo,
        'modulo_id': modulo_id,
        'tipo_id': tipo_id,
        'order_by': order_by,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos/table.html', context)
    
    return render(request, 'permisos/permisos/list.html', context)


@login_required
def permiso_detail(request, pk):
    """Detalle de un permiso."""
    permiso = get_object_or_404(
        Permiso.objects.select_related('modulo', 'tipo_permiso').prefetch_related('condiciones'), 
        pk=pk
    )
    
    # Usuarios con este permiso directo
    usuarios_con_permiso = PermisoDirecto.objects.filter(
        permiso=permiso,
        activo=True
    ).select_related('usuario')
    
    context = {
        'permiso': permiso,
        'usuarios_con_permiso': usuarios_con_permiso,
    }
    return render(request, 'permisos/permisos/detail.html', context)


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
                    'redirect_url': f'/permisos/permisos/{permiso.pk}/'
                })
            
            return redirect('permisos:permiso_detail', pk=permiso.pk)
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
    
    return render(request, 'permisos/permisos/form.html', context)


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
                    'redirect_url': f'/permisos/permisos/{permiso.pk}/'
                })
            
            return redirect('permisos:permiso_detail', pk=permiso.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PermisoForm(instance=permiso)
    
    context = {
        'form': form,
        'permiso': permiso
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos/form.html', context)
    
    return render(request, 'permisos/permisos/form.html', context)


# ===================== PERMISOS DIRECTOS =====================

@login_required
def permisos_directos_list(request):
    """Lista de permisos directos con filtros y paginación."""
    queryset = PermisoDirecto.objects.select_related('usuario', 'permiso', 'asignado_por')
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    usuario_id = request.GET.get('usuario', '')
    permiso_id = request.GET.get('permiso', '')
    
    if search:
        queryset = queryset.filter(
            Q(usuario__username__icontains=search) |
            Q(usuario__first_name__icontains=search) |
            Q(usuario__last_name__icontains=search) |
            Q(permiso__nombre__icontains=search) |
            Q(permiso__codigo__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
        
    if usuario_id:
        queryset = queryset.filter(usuario_id=usuario_id)
        
    if permiso_id:
        queryset = queryset.filter(permiso_id=permiso_id)
    
    # Orden
    order_by = request.GET.get('order_by', '-fecha_inicio')
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    permisos_directos = paginator.get_page(page_number)
    
    # Datos para filtros
    usuarios = User.objects.filter(is_active=True).order_by('username')
    permisos = Permiso.objects.filter(activo=True).order_by('nombre')
    
    # Estadísticas
    stats = {
        'total': PermisoDirecto.objects.count(),
        'activos': PermisoDirecto.objects.filter(activo=True).count(),
        'inactivos': PermisoDirecto.objects.filter(activo=False).count(),
        'vigentes': PermisoDirecto.objects.filter(
            activo=True,
            fecha_inicio__lte=timezone.now(),
            fecha_fin__gte=timezone.now()
        ).count(),
    }
    
    context = {
        'permisos_directos': permisos_directos,
        'stats': stats,
        'usuarios': usuarios,
        'permisos': permisos,
        'search': search,
        'activo': activo,
        'usuario_id': usuario_id,
        'permiso_id': permiso_id,
        'order_by': order_by,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'permisos/permisos_directos/table.html', context)
    
    return render(request, 'permisos/permisos_directos/list.html', context)


@login_required
def permiso_directo_create(request):
    """Crear un nuevo permiso directo."""
    if request.method == 'POST':
        form = PermisoDirectoForm(request.POST)
        if form.is_valid():
            permiso_directo = form.save(commit=False)
            permiso_directo.asignado_por = request.user
            permiso_directo.save()
            messages.success(request, 'Permiso directo asignado exitosamente.')
            return redirect('permisos:permisos_directos_list')
    else:
        form = PermisoDirectoForm()
    
    return render(request, 'permisos/permisos_directos/form.html', {'form': form, 'action': 'create'})


@login_required
def permiso_directo_edit(request, pk):
    """Editar un permiso directo."""
    permiso_directo = get_object_or_404(PermisoDirecto, pk=pk)
    
    if request.method == 'POST':
        form = PermisoDirectoForm(request.POST, instance=permiso_directo)
        if form.is_valid():
            permiso_directo = form.save()
            messages.success(request, 'Permiso directo actualizado exitosamente.')
            return redirect('permisos:permisos_directos_list')
    else:
        form = PermisoDirectoForm(instance=permiso_directo)
    
    return render(request, 'permisos/permisos_directos/form.html', {
        'form': form,
        'permiso_directo': permiso_directo,
        'action': 'edit'
    })


# ===================== ASIGNACIONES DIRECTAS (ALIAS DE PERMISOS DIRECTOS) =====================

@login_required
def asignaciones_list(request):
    """Vista alias para permisos directos - para compatibilidad con templates."""
    return permisos_directos_list(request)


@login_required 
def asignacion_create(request):
    """Vista alias para crear permiso directo - para compatibilidad con templates."""
    return permiso_directo_create(request)


@login_required
def asignacion_edit(request, pk):
    """Vista alias para editar permiso directo - para compatibilidad con templates."""
    return permiso_directo_edit(request, pk)


@login_required
def asignacion_detail(request, pk):
    """Detalle de una asignación directa de permiso."""
    permiso_directo = get_object_or_404(
        PermisoDirecto.objects.select_related('usuario', 'permiso', 'asignado_por'), 
        pk=pk
    )
    
    context = {
        'permiso_directo': permiso_directo,
        'asignacion': permiso_directo,  # Alias para compatibilidad
    }
    return render(request, 'permisos/asignaciones/detail.html', context)


# ===================== AUDITORÍAS =====================

@login_required
def auditoria_permisos_list(request):
    """Lista de auditorías de permisos."""
    queryset = AuditoriaPermisos.objects.all()

    # Filtros
    search = request.GET.get('search', '')
    if search:
        queryset = queryset.filter(
            Q(accion__icontains=search) |
            Q(usuario__username__icontains=search) |
            Q(permiso__nombre__icontains=search)
        )

    # Orden
    order_by = request.GET.get('order_by', '-fecha')
    if order_by:
        queryset = queryset.order_by(order_by)

    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    auditorias = paginator.get_page(page_number)

    context = {
        'auditorias': auditorias,
        'search': search,
        'order_by': order_by,
    }

    return render(request, 'permisos/auditorias/list.html', context)


# ===================== PERMISOS INTERNACIONALIZADOS =====================

@login_required
def permiso_internacionalizado_list(request):
    """Lista de permisos internacionalizados."""
    queryset = PermisoI18N.objects.all()

    # Filtros
    search = request.GET.get('search', '')
    idioma = request.GET.get('idioma', '')

    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(descripcion__icontains=search)
        )

    if idioma:
        queryset = queryset.filter(idioma=idioma)

    # Orden
    order_by = request.GET.get('order_by', 'idioma')
    if order_by:
        queryset = queryset.order_by(order_by)

    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    permisos_i18n = paginator.get_page(page_number)

    context = {
        'permisos_i18n': permisos_i18n,
        'search': search,
        'idioma': idioma,
        'order_by': order_by,
    }

    return render(request, 'permisos/internacionalizados/list.html', context)


# ===================== CONFIGURACIONES POR ENTORNO =====================

@login_required
def configuracion_entorno_list(request):
    """Lista de configuraciones por entorno."""
    queryset = ConfiguracionEntorno.objects.all()

    # Filtros
    search = request.GET.get('search', '')
    entorno = request.GET.get('entorno', '')

    if search:
        queryset = queryset.filter(
            Q(entorno__icontains=search) |
            Q(permiso__nombre__icontains=search)
        )

    if entorno:
        queryset = queryset.filter(entorno=entorno)

    # Orden
    order_by = request.GET.get('order_by', 'entorno')
    if order_by:
        queryset = queryset.order_by(order_by)

    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    configuraciones = paginator.get_page(page_number)

    context = {
        'configuraciones': configuraciones,
        'search': search,
        'entorno': entorno,
        'order_by': order_by,
    }

    return render(request, 'permisos/configuraciones/list.html', context)


# ===================== APIs =====================

@login_required
def api_permisos(request):
    """API para obtener permisos filtrados."""
    search = request.GET.get('search', '')
    modulo_id = request.GET.get('modulo', '')
    activo = request.GET.get('activo', 'true')
    
    queryset = Permiso.objects.select_related('modulo', 'tipo_permiso')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search)
        )
    
    if modulo_id:
        queryset = queryset.filter(modulo_id=modulo_id)
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    permisos = []
    for permiso in queryset[:20]:  # Limitar a 20 resultados
        permisos.append({
            'id': str(permiso.id),
            'nombre': permiso.nombre,
            'codigo': permiso.codigo,
            'modulo': permiso.modulo.nombre if permiso.modulo else '',
            'tipo': permiso.tipo_permiso.nombre if permiso.tipo_permiso else '',
        })
    
    return JsonResponse({'permisos': permisos})


@login_required
def api_verificar_permiso(request):
    """API para verificar si un usuario tiene un permiso específico."""
    if request.method == 'POST':
        data = json.loads(request.body)
        usuario_id = data.get('usuario_id')
        codigo_permiso = data.get('codigo_permiso')
        
        try:
            usuario = User.objects.get(id=usuario_id)
            permiso = Permiso.objects.get(codigo=codigo_permiso, activo=True)
            
            # Verificar permiso directo
            tiene_permiso_directo = PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso=permiso,
                activo=True
            ).exists()
            
            # Aquí se podría integrar con la app roles para verificar permisos heredados
            # from roles.utils import verificar_permiso_rol
            # tiene_permiso_rol = verificar_permiso_rol(usuario, codigo_permiso)
            
            tiene_permiso = tiene_permiso_directo  # + tiene_permiso_rol (cuando se integre)
            
            return JsonResponse({
                'tiene_permiso': tiene_permiso,
                'permiso_directo': tiene_permiso_directo,
                # 'permiso_rol': tiene_permiso_rol,
            })
            
        except (User.DoesNotExist, Permiso.DoesNotExist):
            return JsonResponse({'error': 'Usuario o permiso no encontrado'}, status=404)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


@login_required
def api_usuario_permisos(request, user_id):
    """API para obtener todos los permisos de un usuario."""
    try:
        usuario = User.objects.get(id=user_id)
        
        # Permisos directos
        permisos_directos = PermisoDirecto.objects.filter(
            usuario=usuario,
            activo=True
        ).select_related('permiso')
        
        permisos_data = []
        for pd in permisos_directos:
            permisos_data.append({
                'id': str(pd.permiso.id),
                'nombre': pd.permiso.nombre,
                'codigo': pd.permiso.codigo,
                'tipo': 'directo',
                'fecha_inicio': pd.fecha_inicio.isoformat(),
                'fecha_fin': pd.fecha_fin.isoformat() if pd.fecha_fin else None,
                'vigente': pd.esta_vigente(),
            })
        
        # Aquí se podrían agregar permisos heredados de roles
        # from roles.utils import obtener_permisos_usuario
        # permisos_roles = obtener_permisos_usuario(usuario)
        
        return JsonResponse({
            'usuario': {
                'id': usuario.id,
                'username': usuario.username,
                'nombre_completo': f"{usuario.first_name} {usuario.last_name}".strip(),
            },
            'permisos_directos': permisos_data,
            'total_permisos': len(permisos_data),
        })
        
    except User.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)


# ===================== REPORTES Y ESTADÍSTICAS =====================

@login_required
def reportes_dashboard(request):
    """Dashboard de reportes y estadísticas."""
    
    # Estadísticas generales
    stats_generales = {
        'total_usuarios': User.objects.count(),
        'total_organizaciones': Organizacion.objects.count(),
        'total_modulos': ModuloSistema.objects.count(),
        'total_permisos': Permiso.objects.count(),
        'total_permisos_directos': PermisoDirecto.objects.count(),
    }
    
    # Distribución por estado
    distribucion_permisos = {
        'activos': Permiso.objects.filter(activo=True).count(),
        'inactivos': Permiso.objects.filter(activo=False).count(),
        'sistema': Permiso.objects.filter(es_sistema=True).count(),
    }
    
    # Módulos más utilizados
    modulos_mas_utilizados = ModuloSistema.objects.annotate(
        num_permisos=Count('permisos')
    ).filter(activo=True).order_by('-num_permisos')[:10]
    
    # Usuarios con más permisos directos
    usuarios_con_mas_permisos = User.objects.annotate(
        num_permisos_directos=Count('permisos_directos')
    ).filter(num_permisos_directos__gt=0).order_by('-num_permisos_directos')[:10]
    
    context = {
        'stats_generales': stats_generales,
        'distribucion_permisos': distribucion_permisos,
        'modulos_mas_utilizados': modulos_mas_utilizados,
        'usuarios_con_mas_permisos': usuarios_con_mas_permisos,
    }
    
    return render(request, 'permisos/reportes/dashboard.html', context)
