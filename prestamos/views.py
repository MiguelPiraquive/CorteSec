from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from django.views.decorators.http import require_http_methods
from django.template.loader import render_to_string
from django.utils import timezone
from decimal import Decimal, InvalidOperation

from .models import Prestamo, PagoPrestamo, TipoPrestamo
from .forms import PrestamoForm, PagoPrestamoForm
from payroll.models import Empleado


@login_required
def lista_prestamos(request):
    """Vista para listar préstamos con búsqueda y paginación"""
    search_query = request.GET.get('search', '')
    estado_filter = request.GET.get('estado', '')
    empleado_filter = request.GET.get('empleado', '')
    
    prestamos = Prestamo.objects.select_related('empleado').all()
    
    # Filtro de búsqueda
    if search_query:
        prestamos = prestamos.filter(
            Q(empleado__nombres__icontains=search_query) |
            Q(empleado__apellidos__icontains=search_query) |
            Q(numero_prestamo__icontains=search_query) |
            Q(observaciones__icontains=search_query)
        )
    
    # Filtro por estado
    if estado_filter:
        prestamos = prestamos.filter(estado=estado_filter)
    
    # Filtro por empleado
    if empleado_filter:
        prestamos = prestamos.filter(empleado_id=empleado_filter)
    
    prestamos = prestamos.order_by('-fecha_solicitud')
    
    # Paginación
    paginator = Paginator(prestamos, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Estadísticas
    estadisticas = {
        'total_prestamos': Prestamo.objects.count(),
        'pendientes': Prestamo.objects.filter(estado='pendiente').count(),
        'aprobados': Prestamo.objects.filter(estado='aprobado').count(),
        'activos': Prestamo.objects.filter(estado='activo').count(),
        'completados': Prestamo.objects.filter(estado='completado').count(),
        'cancelados': Prestamo.objects.filter(estado='cancelado').count(),
        'rechazados': Prestamo.objects.filter(estado='rechazado').count(),
        'monto_total_prestado': Prestamo.objects.filter(
            estado__in=['aprobado', 'activo', 'completado']
        ).aggregate(total=Sum('monto_solicitado'))['total'] or 0,
        'monto_total_pendiente': Prestamo.objects.filter(
            estado__in=['activo']
        ).aggregate(total=Sum('saldo_pendiente'))['total'] or 0,
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        # Respuesta AJAX
        html = render_to_string('prestamos/partials/tabla_prestamos.html', {
            'page_obj': page_obj,
            'search_query': search_query,
            'estado_filter': estado_filter,
            'empleado_filter': empleado_filter,
        })
        return JsonResponse({
            'html': html,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': page_obj.paginator.num_pages,
        })
    
    context = {
        'prestamos': page_obj,  # Los préstamos paginados
        'page_obj': page_obj,
        'is_paginated': page_obj.has_other_pages(),
        'search_query': search_query,
        'estado_filter': estado_filter,
        'empleado_filter': empleado_filter,
        'estadisticas': estadisticas,
        'empleados': Empleado.objects.all().order_by('nombres', 'apellidos'),
        'title': 'Gestión de Préstamos',
    }
    return render(request, 'prestamos/lista.html', context)


@login_required
def crear_prestamo(request):
    """Vista para crear un nuevo préstamo"""
    if request.method == 'POST':
        form = PrestamoForm(request.POST)
        if form.is_valid():
            prestamo = form.save(commit=False)
            prestamo.solicitado_por = request.user
            
            # Si no tiene monto aprobado, usar el solicitado
            if not prestamo.monto_aprobado:
                prestamo.monto_aprobado = prestamo.monto_solicitado
            
            # Calcular saldo pendiente inicial
            prestamo.saldo_pendiente = prestamo.monto_aprobado or prestamo.monto_solicitado
            
            prestamo.save()
            
            # Generar cuotas automáticamente si el préstamo está aprobado
            # TODO: Implementar generación automática de cuotas de pago
            if prestamo.estado == 'aprobado':
                # TODO: Implementar método generar_cuotas() o similar
                pass
            
            messages.success(request, f'Préstamo para {prestamo.empleado} creado exitosamente.')
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Préstamo para {prestamo.empleado} creado exitosamente.',
                    'redirect': '/prestamos/'
                })
            
            return redirect('prestamos:lista')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PrestamoForm()
    
    context = {
        'form': form,
        'title': 'Crear Préstamo',
        'action': 'Crear'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('prestamos/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'prestamos/formulario.html', context)


@login_required
def editar_prestamo(request, pk):
    """Vista para editar un préstamo existente"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    
    if request.method == 'POST':
        form = PrestamoForm(request.POST, instance=prestamo)
        if form.is_valid():
            prestamo_anterior_estado = prestamo.estado
            prestamo = form.save(commit=False)
            
            # Si no tiene monto aprobado, usar el solicitado
            if not prestamo.monto_aprobado:
                prestamo.monto_aprobado = prestamo.monto_solicitado
            
            # Recalcular saldo pendiente si es necesario
            if prestamo_anterior_estado != prestamo.estado and prestamo.estado == 'aprobado':
                prestamo.saldo_pendiente = prestamo.monto_aprobado or prestamo.monto_solicitado
            
            prestamo.save()
            
            # Si cambió de pendiente a aprobado, generar cuotas
            # Si cambió de pendiente a aprobado, generar cuotas
            # TODO: Implementar generación automática de cuotas de pago
            if prestamo_anterior_estado == 'pendiente' and prestamo.estado == 'aprobado':
                # TODO: Implementar método generar_cuotas() o similar
                pass
            
            messages.success(request, f'Préstamo de {prestamo.empleado} actualizado exitosamente.')
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Préstamo de {prestamo.empleado} actualizado exitosamente.',
                    'redirect': '/prestamos/'
                })
            
            return redirect('prestamos:lista')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PrestamoForm(instance=prestamo)
    
    context = {
        'form': form,
        'object': prestamo,  # Agregar object para el template
        'prestamo': prestamo,
        'title': f'Editar Préstamo: {prestamo.empleado}',
        'action': 'Actualizar'
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('prestamos/formulario.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'prestamos/formulario.html', context)


@login_required
def detalle_prestamo(request, pk):
    """Vista para ver los detalles de un préstamo"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    pagos = prestamo.pagos.all().order_by('numero_pago')
    
    context = {
        'prestamo': prestamo,
        'pagos': pagos,
        'title': f'Detalle del Préstamo: {prestamo.empleado}',
    }
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        html = render_to_string('prestamos/detalle.html', context, request=request)
        return JsonResponse({'html': html})
    
    return render(request, 'prestamos/detalle.html', context)


@login_required
@require_http_methods(["POST"])
def eliminar_prestamo(request, pk):
    """Vista para eliminar un préstamo"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    
    try:
        empleado_nombre = str(prestamo.empleado)
        prestamo.delete()
        messages.success(request, f'Préstamo de {empleado_nombre} eliminado exitosamente.')
        
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Préstamo de {empleado_nombre} eliminado exitosamente.'
            })
        
    except Exception as e:
        messages.error(request, f'Error al eliminar el préstamo: {str(e)}')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'Error al eliminar el préstamo: {str(e)}'
            })
    
    return redirect('prestamos:lista')


@login_required
@require_http_methods(["POST"])
def aprobar_prestamo(request, pk):
    """Vista para aprobar un préstamo"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    
    if prestamo.estado not in ['solicitado', 'pendiente']:
        message = 'Solo se pueden aprobar préstamos pendientes o solicitados.'
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': message})
        messages.error(request, message)
        return redirect('prestamos:lista')
    
    # Obtener monto aprobado del formulario
    monto_aprobado = request.POST.get('monto_aprobado')
    observaciones = request.POST.get('observaciones', '')
    
    if monto_aprobado:
        try:
            prestamo.monto_aprobado = Decimal(monto_aprobado)
        except (ValueError, InvalidOperation):
            prestamo.monto_aprobado = prestamo.monto_solicitado
    else:
        prestamo.monto_aprobado = prestamo.monto_solicitado
    
    prestamo.estado = 'aprobado'
    prestamo.fecha_aprobacion = timezone.now().date()
    prestamo.aprobado_por = request.user
    
    # Agregar observaciones si las hay
    if observaciones:
        if prestamo.observaciones:
            prestamo.observaciones += f"\n\nAprobación: {observaciones}"
        else:
            prestamo.observaciones = f"Aprobación: {observaciones}"
    
    prestamo.save()
    
    message = f'Préstamo de {prestamo.empleado} aprobado exitosamente por ${prestamo.monto_aprobado:,.0f}.'
    messages.success(request, message)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    return redirect('prestamos:lista')


@login_required
@require_http_methods(["POST"])
def rechazar_prestamo(request, pk):
    """Vista para rechazar un préstamo"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    
    if prestamo.estado not in ['solicitado', 'pendiente']:
        message = 'Solo se pueden rechazar préstamos pendientes o solicitados.'
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': message})
        messages.error(request, message)
        return redirect('prestamos:lista')
    
    # Obtener motivo del rechazo del formulario
    motivo_rechazo = request.POST.get('motivo_rechazo', '')
    
    prestamo.estado = 'rechazado'
    prestamo.fecha_rechazo = timezone.now().date()
    
    # Agregar motivo del rechazo a las observaciones
    if motivo_rechazo:
        if prestamo.observaciones:
            prestamo.observaciones += f"\n\nRechazo: {motivo_rechazo}"
        else:
            prestamo.observaciones = f"Rechazo: {motivo_rechazo}"
    
    prestamo.save()
    
    message = f'Préstamo de {prestamo.empleado} rechazado.'
    messages.success(request, message)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    return redirect('prestamos:lista')


@login_required
@require_http_methods(["POST"])
def pagar_cuota(request, prestamo_pk, cuota_pk):
    """Vista para marcar una cuota como pagada"""
    prestamo = get_object_or_404(Prestamo, pk=prestamo_pk)
    cuota = get_object_or_404(PagoPrestamo, pk=cuota_pk, prestamo=prestamo)
    
    if cuota.pagada:
        message = 'Esta cuota ya está marcada como pagada.'
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': message})
        messages.error(request, message)
        return redirect('prestamos:detalle', pk=prestamo.pk)
    
    cuota.pagada = True
    cuota.fecha_pago = timezone.now().date()
    cuota.save()
    
    # Verificar si el préstamo está completado
    prestamo.verificar_completado()
    
    message = f'Cuota #{cuota.numero_cuota} marcada como pagada.'
    messages.success(request, message)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    return redirect('prestamos:detalle', pk=prestamo.pk)


# ============ API Views ============

@login_required
def api_prestamos(request):
    """API para obtener préstamos"""
    search = request.GET.get('search', '')
    empleado_id = request.GET.get('empleado_id', '')
    
    prestamos = Prestamo.objects.select_related('empleado')
    
    if search:
        prestamos = prestamos.filter(
            Q(empleado__nombres__icontains=search) |
            Q(empleado__apellidos__icontains=search) |
            Q(numero_prestamo__icontains=search)
        )
    
    if empleado_id:
        prestamos = prestamos.filter(empleado_id=empleado_id)
    
    prestamos_data = []
    for prestamo in prestamos[:20]:  # Limitar a 20 resultados
        prestamos_data.append({
            'id': prestamo.id,
            'empleado': str(prestamo.empleado),
            'monto': float(prestamo.monto_solicitado),
            'estado': prestamo.get_estado_display(),
            'fecha_solicitud': prestamo.fecha_solicitud.strftime('%d/%m/%Y'),
            'saldo_pendiente': float(prestamo.saldo_pendiente),
        })
    
    return JsonResponse({
        'results': prestamos_data,
        'pagination': {'more': prestamos.count() > 20}
    })


@login_required
@require_http_methods(["POST"])
def desembolsar_prestamo(request, pk):
    """Vista para desembolsar un préstamo"""
    prestamo = get_object_or_404(Prestamo, pk=pk)
    
    if prestamo.estado != 'aprobado':
        message = 'Solo se pueden desembolsar préstamos aprobados.'
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': message})
        messages.error(request, message)
        return redirect('prestamos:lista')
    
    prestamo.estado = 'desembolsado'
    prestamo.fecha_desembolso = timezone.now().date()
    prestamo.saldo_pendiente = prestamo.monto_aprobado or prestamo.monto_solicitado
    prestamo.save()
    
    message = f'Préstamo de {prestamo.empleado} desembolsado exitosamente.'
    messages.success(request, message)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    return redirect('prestamos:lista')
