from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count
from django.views.decorators.http import require_http_methods
from django.urls import reverse_lazy
from django.utils import timezone
from decimal import Decimal
import json
from datetime import datetime, timedelta

from .models import PlanCuentas, ComprobanteContable, MovimientoContable, FlujoCaja
from .forms import (
    PlanCuentasForm, ComprobanteContableForm, MovimientoContableForm, 
    FlujoCajaForm, MovimientoFormSet, FiltroContableForm,
    BalanceGeneralForm, EstadoResultadosForm
)


# ===================== PLAN DE CUENTAS =====================

@login_required
def plan_cuentas_list(request):
    """Lista del plan de cuentas con filtros y paginación."""
    queryset = PlanCuentas.objects.select_related('cuenta_padre').all()
    
    # Filtros
    search = request.GET.get('search', '')
    tipo_cuenta = request.GET.get('tipo_cuenta', '')
    activa = request.GET.get('activa', '')
    nivel = request.GET.get('nivel', '')
    
    if search:
        queryset = queryset.filter(
            Q(codigo__icontains=search) |
            Q(nombre__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if tipo_cuenta:
        queryset = queryset.filter(tipo_cuenta=tipo_cuenta)
    
    if activa:
        queryset = queryset.filter(activa=activa == 'true')
    
    if nivel:
        queryset = queryset.filter(nivel=nivel)
    
    # Orden jerárquico
    queryset = queryset.order_by('codigo')
    
    # Paginación
    paginator = Paginator(queryset, 20)
    page_number = request.GET.get('page')
    cuentas = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': PlanCuentas.objects.count(),
        'activas': PlanCuentas.objects.filter(activa=True).count(),
        'inactivas': PlanCuentas.objects.filter(activa=False).count(),
        'con_movimientos': PlanCuentas.objects.filter(acepta_movimientos=True).count(),
    }
    
    context = {
        'cuentas': cuentas,
        'stats': stats,
        'search': search,
        'tipo_cuenta': tipo_cuenta,
        'activa': activa,
        'nivel': nivel,
        'tipos_cuenta': PlanCuentas.TIPO_CUENTA_CHOICES,
        'niveles_disponibles': range(1, 6),  # Hasta 5 niveles
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/plan_cuentas/table.html', context)
    
    return render(request, 'contabilidad/plan_cuentas/list.html', context)


@login_required
def plan_cuentas_detail(request, pk):
    """Detalle de una cuenta contable."""
    cuenta = get_object_or_404(PlanCuentas, pk=pk)
    subcuentas = cuenta.subcuentas.filter(activa=True)
    
    # Movimientos recientes
    movimientos = MovimientoContable.objects.filter(
        cuenta=cuenta
    ).select_related('comprobante').order_by('-comprobante__fecha')[:10]
    
    context = {
        'cuenta': cuenta,
        'subcuentas': subcuentas,
        'movimientos': movimientos,
        'saldo_actual': cuenta.saldo_actual,
    }
    return render(request, 'contabilidad/plan_cuentas/detail.html', context)


@login_required
def plan_cuentas_create(request):
    """Crear una nueva cuenta contable."""
    if request.method == 'POST':
        form = PlanCuentasForm(request.POST)
        if form.is_valid():
            cuenta = form.save()
            messages.success(request, f'Cuenta "{cuenta.codigo} - {cuenta.nombre}" creada exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Cuenta "{cuenta.codigo} - {cuenta.nombre}" creada exitosamente.',
                    'redirect_url': reverse_lazy('contabilidad:plan_cuentas_list')
                })
            
            return redirect('contabilidad:plan_cuentas_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PlanCuentasForm()
    
    context = {'form': form, 'object': None}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/plan_cuentas/form.html', context)
    
    return render(request, 'contabilidad/plan_cuentas/form.html', context)


@login_required
def plan_cuentas_edit(request, pk):
    """Editar una cuenta contable."""
    cuenta = get_object_or_404(PlanCuentas, pk=pk)
    
    if request.method == 'POST':
        form = PlanCuentasForm(request.POST, instance=cuenta)
        if form.is_valid():
            cuenta = form.save()
            messages.success(request, f'Cuenta "{cuenta.codigo} - {cuenta.nombre}" actualizada exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Cuenta "{cuenta.codigo} - {cuenta.nombre}" actualizada exitosamente.',
                    'redirect_url': reverse_lazy('contabilidad:plan_cuentas_list')
                })
            
            return redirect('contabilidad:plan_cuentas_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = PlanCuentasForm(instance=cuenta)
    
    context = {'form': form, 'object': cuenta}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/plan_cuentas/form.html', context)
    
    return render(request, 'contabilidad/plan_cuentas/form.html', context)


@login_required
@require_http_methods(["DELETE"])
def plan_cuentas_delete(request, pk):
    """Eliminar una cuenta contable."""
    cuenta = get_object_or_404(PlanCuentas, pk=pk)
    
    # Verificar si tiene movimientos
    if cuenta.movimientos.exists():
        message = 'No se puede eliminar una cuenta que tiene movimientos contables.'
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': message
            })
        messages.error(request, message)
        return redirect('contabilidad:plan_cuentas_list')
    
    # Verificar si tiene subcuentas
    if cuenta.subcuentas.exists():
        message = 'No se puede eliminar una cuenta que tiene subcuentas.'
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': message
            })
        messages.error(request, message)
        return redirect('contabilidad:plan_cuentas_list')
    
    cuenta_nombre = f"{cuenta.codigo} - {cuenta.nombre}"
    cuenta.delete()
    
    message = f'Cuenta "{cuenta_nombre}" eliminada exitosamente.'
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': message
        })
    
    messages.success(request, message)
    return redirect('contabilidad:plan_cuentas_list')


# ===================== COMPROBANTES CONTABLES =====================

@login_required
def comprobantes_list(request):
    """Lista de comprobantes contables con filtros y paginación."""
    queryset = ComprobanteContable.objects.select_related('creado_por').all()
    
    # Filtros
    search = request.GET.get('search', '')
    tipo = request.GET.get('tipo', '')
    estado = request.GET.get('estado', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    
    if search:
        queryset = queryset.filter(
            Q(numero__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(referencia__icontains=search)
        )
    
    if tipo:
        queryset = queryset.filter(tipo=tipo)
    
    if estado:
        queryset = queryset.filter(estado=estado)
    
    if fecha_desde:
        queryset = queryset.filter(fecha__gte=fecha_desde)
    
    if fecha_hasta:
        queryset = queryset.filter(fecha__lte=fecha_hasta)
    
    # Orden
    queryset = queryset.order_by('-fecha', '-numero')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    comprobantes = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': ComprobanteContable.objects.count(),
        'confirmados': ComprobanteContable.objects.filter(estado='CONFIRMADO').count(),
        'pendientes': ComprobanteContable.objects.filter(estado='BORRADOR').count(),
        'valor_total': ComprobanteContable.objects.filter(estado='CONFIRMADO').aggregate(
            total=Sum('valor_total')
        )['total'] or 0
    }
    
    context = {
        'comprobantes': comprobantes,
        'stats': stats,
        'search': search,
        'tipo': tipo,
        'estado': estado,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'tipos_comprobante': ComprobanteContable.TIPO_CHOICES,
        'estados_comprobante': ComprobanteContable.ESTADO_CHOICES,
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/comprobantes/table.html', context)
    
    return render(request, 'contabilidad/comprobantes/list.html', context)


@login_required
def comprobante_detail(request, pk):
    """Detalle de un comprobante contable."""
    comprobante = get_object_or_404(ComprobanteContable, pk=pk)
    movimientos = comprobante.movimientos.select_related('cuenta').all()
    
    # Calcular totales
    total_debitos = movimientos.aggregate(total=Sum('debito'))['total'] or 0
    total_creditos = movimientos.aggregate(total=Sum('credito'))['total'] or 0
    
    context = {
        'comprobante': comprobante,
        'movimientos': movimientos,
        'total_debitos': total_debitos,
        'total_creditos': total_creditos,
    }
    return render(request, 'contabilidad/comprobantes/detail.html', context)


@login_required
def comprobante_create(request):
    """Crear un nuevo comprobante contable."""
    if request.method == 'POST':
        form = ComprobanteContableForm(request.POST)
        movimientos_data = json.loads(request.POST.get('movimientos', '[]'))
        
        if form.is_valid() and movimientos_data:
            # Validar que el comprobante esté balanceado
            total_debitos = sum(Decimal(str(mov.get('debito', 0))) for mov in movimientos_data)
            total_creditos = sum(Decimal(str(mov.get('credito', 0))) for mov in movimientos_data)
            
            if total_debitos != total_creditos:
                return JsonResponse({
                    'success': False,
                    'message': 'El comprobante debe estar balanceado (débitos = créditos)'
                })
            
            comprobante = form.save(commit=False)
            comprobante.creado_por = request.user
            comprobante.valor_total = total_debitos
            comprobante.save()
            
            # Crear movimientos
            for mov_data in movimientos_data:
                MovimientoContable.objects.create(
                    comprobante=comprobante,
                    cuenta_id=mov_data['cuenta_id'],
                    descripcion=mov_data.get('descripcion', comprobante.descripcion),
                    debito=Decimal(str(mov_data.get('debito', 0))),
                    credito=Decimal(str(mov_data.get('credito', 0)))
                )
            
            messages.success(request, f'Comprobante {comprobante.numero} creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Comprobante {comprobante.numero} creado exitosamente.'
                })
            
            return redirect('contabilidad:comprobante_detail', pk=comprobante.pk)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = ComprobanteContableForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/comprobantes/form.html', context)
    
    return render(request, 'contabilidad/comprobantes/create.html', context)


@login_required
def comprobante_edit(request, pk):
    """Editar un comprobante contable (solo si está en borrador)."""
    comprobante = get_object_or_404(ComprobanteContable, pk=pk)
    
    if comprobante.estado != 'BORRADOR':
        messages.error(request, 'Solo se pueden editar comprobantes en estado borrador.')
        return redirect('contabilidad:comprobante_detail', pk=pk)
    
    if request.method == 'POST':
        form = ComprobanteContableForm(request.POST, instance=comprobante)
        movimientos_data = json.loads(request.POST.get('movimientos', '[]'))
        
        if form.is_valid() and movimientos_data:
            # Validar balance
            total_debitos = sum(Decimal(str(mov.get('debito', 0))) for mov in movimientos_data)
            total_creditos = sum(Decimal(str(mov.get('credito', 0))) for mov in movimientos_data)
            
            if total_debitos != total_creditos:
                return JsonResponse({
                    'success': False,
                    'message': 'El comprobante debe estar balanceado'
                })
            
            comprobante = form.save(commit=False)
            comprobante.modificado_por = request.user
            comprobante.valor_total = total_debitos
            comprobante.save()
            
            # Eliminar movimientos existentes y crear nuevos
            comprobante.movimientos.all().delete()
            for mov_data in movimientos_data:
                MovimientoContable.objects.create(
                    comprobante=comprobante,
                    cuenta_id=mov_data['cuenta_id'],
                    descripcion=mov_data.get('descripcion', comprobante.descripcion),
                    debito=Decimal(str(mov_data.get('debito', 0))),
                    credito=Decimal(str(mov_data.get('credito', 0)))
                )
            
            messages.success(request, f'Comprobante {comprobante.numero} actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            
            return redirect('contabilidad:comprobante_detail', pk=comprobante.pk)
    else:
        form = ComprobanteContableForm(instance=comprobante)
        movimientos_json = json.dumps([
            {
                'cuenta_id': mov.cuenta.id,
                'debito': float(mov.debito),
                'credito': float(mov.credito),
                'descripcion': mov.descripcion
            } for mov in comprobante.movimientos.all()
        ])
    
    context = {
        'form': form, 
        'comprobante': comprobante,
        'movimientos_json': movimientos_json
    }
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/comprobantes/form.html', context)
    
    return render(request, 'contabilidad/comprobantes/edit.html', context)


@login_required
@require_http_methods(["POST"])
def comprobante_confirm(request, pk):
    """Confirmar un comprobante contable."""
    comprobante = get_object_or_404(ComprobanteContable, pk=pk)
    
    if comprobante.estado != 'BORRADOR':
        return JsonResponse({
            'success': False,
            'message': 'Solo se pueden confirmar comprobantes en borrador'
        })
    
    # Validar que esté balanceado
    total_debitos = comprobante.movimientos.aggregate(total=Sum('debito'))['total'] or 0
    total_creditos = comprobante.movimientos.aggregate(total=Sum('credito'))['total'] or 0
    
    if total_debitos != total_creditos:
        return JsonResponse({
            'success': False,
            'message': 'El comprobante debe estar balanceado para confirmar'
        })
    
    comprobante.estado = 'CONFIRMADO'
    comprobante.fecha_confirmacion = timezone.now()
    comprobante.save()
    
    messages.success(request, f'Comprobante {comprobante.numero} confirmado exitosamente.')
    
    return JsonResponse({'success': True})


@login_required
@require_http_methods(["DELETE"])
def comprobante_delete(request, pk):
    """Eliminar un comprobante contable (solo borradores)."""
    comprobante = get_object_or_404(ComprobanteContable, pk=pk)
    
    if comprobante.estado != 'BORRADOR':
        return JsonResponse({
            'success': False,
            'message': 'Solo se pueden eliminar comprobantes en borrador'
        })
    
    numero = comprobante.numero
    comprobante.delete()
    
    messages.success(request, f'Comprobante {numero} eliminado exitosamente.')
    
    return JsonResponse({'success': True})


# ===================== MOVIMIENTOS CONTABLES =====================

@login_required
def movimientos_list(request):
    """Lista de movimientos contables con filtros."""
    queryset = MovimientoContable.objects.select_related(
        'comprobante', 'cuenta'
    ).all()
    
    # Filtros
    search = request.GET.get('search', '')
    cuenta = request.GET.get('cuenta', '')
    tipo_comprobante = request.GET.get('tipo_comprobante', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    
    if search:
        queryset = queryset.filter(
            Q(cuenta__codigo__icontains=search) |
            Q(cuenta__nombre__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(comprobante__numero__icontains=search)
        )
    
    if cuenta:
        queryset = queryset.filter(cuenta_id=cuenta)
    
    if tipo_comprobante:
        queryset = queryset.filter(comprobante__tipo=tipo_comprobante)
    
    if fecha_desde:
        queryset = queryset.filter(comprobante__fecha__gte=fecha_desde)
    
    if fecha_hasta:
        queryset = queryset.filter(comprobante__fecha__lte=fecha_hasta)
    
    # Orden
    queryset = queryset.order_by('-comprobante__fecha', '-id')
    
    # Paginación
    paginator = Paginator(queryset, 20)
    page_number = request.GET.get('page')
    movimientos = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': MovimientoContable.objects.count(),
        'total_debitos': MovimientoContable.objects.aggregate(total=Sum('debito'))['total'] or 0,
        'total_creditos': MovimientoContable.objects.aggregate(total=Sum('credito'))['total'] or 0,
    }
    stats['balance'] = abs(stats['total_debitos'] - stats['total_creditos'])
    
    context = {
        'movimientos': movimientos,
        'stats': stats,
        'search': search,
        'cuenta': cuenta,
        'tipo_comprobante': tipo_comprobante,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'cuentas': PlanCuentas.objects.filter(acepta_movimientos=True),
        'tipos_comprobante': ComprobanteContable.TIPO_CHOICES,
    }
    
    return render(request, 'contabilidad/movimientos/list.html', context)


@login_required
def movimiento_detail(request, pk):
    """Detalle de un movimiento contable."""
    movimiento = get_object_or_404(
        MovimientoContable.objects.select_related('comprobante', 'cuenta'), 
        pk=pk
    )
    
    context = {
        'movimiento': movimiento,
    }
    return render(request, 'contabilidad/movimientos/detail.html', context)


# ===================== FLUJO DE CAJA =====================

@login_required
def flujo_caja_list(request):
    """Lista de flujo de caja con filtros y gráficos."""
    queryset = FlujoCaja.objects.all()
    
    # Filtros
    search = request.GET.get('search', '')
    tipo = request.GET.get('tipo', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    
    if search:
        queryset = queryset.filter(
            Q(concepto__icontains=search) |
            Q(observaciones__icontains=search)
        )
    
    if tipo:
        queryset = queryset.filter(tipo_movimiento=tipo)
    
    if fecha_desde:
        queryset = queryset.filter(fecha__gte=fecha_desde)
    
    if fecha_hasta:
        queryset = queryset.filter(fecha__lte=fecha_hasta)
    
    # Orden
    queryset = queryset.order_by('-fecha', '-id')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    flujos = paginator.get_page(page_number)
    
    # Estadísticas
    current_month = timezone.now().month
    current_year = timezone.now().year
    
    stats = {
        'saldo_actual': FlujoCaja.get_saldo_actual(),
        'ingresos_mes': FlujoCaja.objects.filter(
            tipo_movimiento='ingreso',
            fecha__month=current_month,
            fecha__year=current_year
        ).aggregate(total=Sum('valor'))['total'] or 0,
        'egresos_mes': FlujoCaja.objects.filter(
            tipo_movimiento='egreso',
            fecha__month=current_month,
            fecha__year=current_year
        ).aggregate(total=Sum('valor'))['total'] or 0,
    }
    stats['flujo_neto'] = stats['ingresos_mes'] - stats['egresos_mes']
    
    # Datos para gráficos
    monthly_data = FlujoCaja.get_monthly_data()
    
    context = {
        'flujos': flujos,
        'stats': stats,
        'search': search,
        'tipo': tipo,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'tipos_flujo': FlujoCaja.TIPO_MOVIMIENTO_CHOICES,
        'monthly_ingresos': [month['ingresos'] for month in monthly_data],
        'monthly_egresos': [month['egresos'] for month in monthly_data],
        'projection_labels': [f"Mes {i+1}" for i in range(3)],
        'projection_data': FlujoCaja.get_projection_data(),
    }
    
    return render(request, 'contabilidad/flujo_caja/list.html', context)


@login_required
def flujo_caja_create(request):
    """Crear un nuevo movimiento de flujo de caja."""
    if request.method == 'POST':
        form = FlujoCajaForm(request.POST)
        if form.is_valid():
            flujo = form.save(commit=False)
            flujo.creado_por = request.user
            flujo.save()
            
            messages.success(request, 'Movimiento de caja creado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            
            return redirect('contabilidad:flujo_caja_list')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = FlujoCajaForm()
    
    context = {'form': form}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/flujo_caja/form.html', context)
    
    return render(request, 'contabilidad/flujo_caja/create.html', context)


@login_required
def flujo_caja_edit(request, pk):
    """Editar un movimiento de flujo de caja."""
    flujo = get_object_or_404(FlujoCaja, pk=pk)
    
    if request.method == 'POST':
        form = FlujoCajaForm(request.POST, instance=flujo)
        if form.is_valid():
            flujo = form.save(commit=False)
            flujo.modificado_por = request.user
            flujo.save()
            
            messages.success(request, 'Movimiento de caja actualizado exitosamente.')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            
            return redirect('contabilidad:flujo_caja_list')
    else:
        form = FlujoCajaForm(instance=flujo)
    
    context = {'form': form, 'flujo': flujo}
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'contabilidad/flujo_caja/form.html', context)
    
    return render(request, 'contabilidad/flujo_caja/edit.html', context)


@login_required
def flujo_caja_detail(request, pk):
    """Detalle de un movimiento de flujo de caja."""
    flujo = get_object_or_404(FlujoCaja, pk=pk)
    context = {'flujo': flujo}
    return render(request, 'contabilidad/flujo_caja/detail.html', context)


@login_required
@require_http_methods(["DELETE"])
def flujo_caja_delete(request, pk):
    """Eliminar un movimiento de flujo de caja."""
    flujo = get_object_or_404(FlujoCaja, pk=pk)
    descripcion = flujo.descripcion
    flujo.delete()
    
    messages.success(request, f'Movimiento "{descripcion}" eliminado exitosamente.')
    
    return JsonResponse({'success': True})


# ===================== REPORTES CONTABLES =====================

@login_required
def reportes_list(request):
    """Dashboard de reportes contables."""
    # Estadísticas para el dashboard
    stats = {
        'reportes_generados': 0,  # TODO: Implementar modelo de reportes generados
        'descargas_mes': 0,
        'reportes_programados': 0,
        'usuarios_activos': 1,
    }
    
    # Datos para gráficos
    monthly_data = FlujoCaja.get_monthly_data()
    
    context = {
        'stats': stats,
        'monthly_income': [month['ingresos'] for month in monthly_data],
        'monthly_expenses': [month['egresos'] for month in monthly_data],
        'category_labels': ['Operacionales', 'Administrativos', 'Financieros', 'Otros'],
        'category_data': [40, 25, 20, 15],  # TODO: Calcular datos reales
        'last_update': {
            'estado_resultados': timezone.now().strftime('%d/%m/%Y'),
            'balance_general': timezone.now().strftime('%d/%m/%Y'),
            'flujo_efectivo': timezone.now().strftime('%d/%m/%Y'),
            'libro_mayor': timezone.now().strftime('%d/%m/%Y'),
            'balance_comprobacion': timezone.now().strftime('%d/%m/%Y'),
            'analisis_financiero': timezone.now().strftime('%d/%m/%Y'),
        }
    }
    
    return render(request, 'contabilidad/reportes/list.html', context)


@login_required
def export_comprobantes(request):
    """Exportar comprobantes a Excel."""
    # TODO: Implementar exportación real
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/vnd.ms-excel')
    response['Content-Disposition'] = 'attachment; filename="comprobantes.xlsx"'
    # Simular archivo Excel vacío
    return response


@login_required
def export_movimientos(request):
    """Exportar movimientos a Excel."""
    # TODO: Implementar exportación real
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/vnd.ms-excel')
    response['Content-Disposition'] = 'attachment; filename="movimientos.xlsx"'
    return response


@login_required
def export_flujo_caja(request):
    """Exportar flujo de caja a Excel."""
    # TODO: Implementar exportación real
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/vnd.ms-excel')
    response['Content-Disposition'] = 'attachment; filename="flujo_caja.xlsx"'
    return response


@login_required
@require_http_methods(["POST"])
def flujo_caja_preview(request):
    """Vista previa del impacto de un movimiento de flujo de caja."""
    data = json.loads(request.body)
    tipo = data.get('tipo')
    monto = Decimal(str(data.get('monto', 0)))
    
    saldo_actual = FlujoCaja.get_saldo_actual()
    
    if tipo == 'INGRESO':
        saldo_proyectado = saldo_actual + monto
    elif tipo == 'EGRESO':
        saldo_proyectado = saldo_actual - monto
    else:
        saldo_proyectado = saldo_actual
    
    return JsonResponse({
        'saldo_actual': float(saldo_actual),
        'tipo': tipo,
        'monto': float(monto),
        'saldo_proyectado': float(saldo_proyectado),
        'show': True
    })


@login_required
def comprobante_pdf(request, pk):
    """Generar PDF de un comprobante."""
    # TODO: Implementar generación de PDF real
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="comprobante_{pk}.pdf"'
    return response


@login_required
@require_http_methods(["POST"])
def generate_report(request):
    """Generar un reporte contable."""
    data = json.loads(request.body)
    report_type = data.get('type')
    
    # TODO: Implementar generación real de reportes
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report_type}.pdf"'
    return response


@login_required
def download_report(request, pk):
    """Descargar un reporte generado."""
    # TODO: Implementar descarga real
    from django.http import HttpResponse
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="reporte_{pk}.pdf"'
    return response


@login_required
def view_report(request, pk):
    """Ver un reporte en el navegador."""
    # TODO: Implementar vista de reporte
    return render(request, 'contabilidad/reportes/view.html', {'report_id': pk})


@login_required
def custom_report_form(request):
    """Formulario para reportes personalizados."""
    return render(request, 'contabilidad/reportes/custom_form.html')


@login_required
def schedule_report_form(request):
    """Formulario para programar reportes."""
    return render(request, 'contabilidad/reportes/schedule_form.html')


@login_required
def recent_reports(request):
    """API para obtener reportes recientes."""
    # TODO: Implementar modelo de reportes generados
    reports = [
        {
            'id': 1,
            'nombre': 'Estado de Resultados',
            'usuario': request.user.get_full_name() or request.user.username,
            'fecha_generacion': timezone.now().isoformat(),
            'periodo': 'Enero 2024',
            'estado': 'GENERADO',
            'estado_display': 'Generado'
        },
        {
            'id': 2,
            'nombre': 'Balance General',
            'usuario': request.user.get_full_name() or request.user.username,
            'fecha_generacion': (timezone.now() - timedelta(days=1)).isoformat(),
            'periodo': 'Diciembre 2023',
            'estado': 'GENERADO',
            'estado_display': 'Generado'
        }
    ]
    return JsonResponse(reports, safe=False)


# ===================== API ENDPOINTS =====================

@login_required
def cuentas_api(request):
    """API para obtener cuentas contables."""
    cuentas = PlanCuentas.objects.filter(acepta_movimientos=True).values(
        'id', 'codigo', 'nombre'
    )
    return JsonResponse(list(cuentas), safe=False)


@login_required
def comprobantes_api(request):
    """API para obtener comprobantes contables."""
    comprobantes = ComprobanteContable.objects.select_related('creado_por').values(
        'id', 'numero', 'fecha', 'tipo', 'descripcion', 'estado', 'valor_total',
        'creado_por__username'
    )
    
    # Convertir a lista y agregar campos calculados
    comprobantes_list = []
    for comp in comprobantes:
        comp['tipo_display'] = dict(ComprobanteContable.TIPO_CHOICES)[comp['tipo']]
        comp['estado_display'] = dict(ComprobanteContable.ESTADO_CHOICES)[comp['estado']]
        comp['fecha'] = comp['fecha'].isoformat() if comp['fecha'] else None
        comprobantes_list.append(comp)
    
    return JsonResponse(comprobantes_list, safe=False)


@login_required
def movimientos_api(request):
    """API para obtener movimientos contables."""
    movimientos = MovimientoContable.objects.select_related(
        'comprobante', 'cuenta'
    ).values(
        'id', 'descripcion', 'debito', 'credito',
        'comprobante__numero', 'comprobante__fecha', 'comprobante__tipo',
        'cuenta__codigo', 'cuenta__nombre'
    )
    
    # Convertir a lista y reorganizar datos
    movimientos_list = []
    for mov in movimientos:
        movimientos_list.append({
            'id': mov['id'],
            'descripcion': mov['descripcion'],
            'debito': float(mov['debito']),
            'credito': float(mov['credito']),
            'comprobante': {
                'id': mov['id'],  # TODO: Obtener ID real del comprobante
                'numero': mov['comprobante__numero'],
                'fecha': mov['comprobante__fecha'].isoformat(),
                'tipo': mov['comprobante__tipo'],
                'tipo_display': dict(ComprobanteContable.TIPO_CHOICES)[mov['comprobante__tipo']]
            },
            'cuenta': {
                'id': mov['id'],  # TODO: Obtener ID real de la cuenta
                'codigo': mov['cuenta__codigo'],
                'nombre': mov['cuenta__nombre']
            }
        })
    
    return JsonResponse(movimientos_list, safe=False)


@login_required
def flujo_caja_api(request):
    """API para obtener flujo de caja."""
    flujos = FlujoCaja.objects.values(
        'id', 'fecha', 'tipo', 'descripcion', 'monto', 'categoria',
        'referencia', 'saldo_acumulado'
    )
    
    # Convertir a lista y agregar campos calculados
    flujos_list = []
    for flujo in flujos:
        flujo['tipo_display'] = dict(FlujoCaja.TIPO_CHOICES)[flujo['tipo']]
        flujo['fecha'] = flujo['fecha'].isoformat() if flujo['fecha'] else None
        flujo['monto'] = float(flujo['monto'])
        flujo['saldo_acumulado'] = float(flujo['saldo_acumulado'])
        flujos_list.append(flujo)
    
    return JsonResponse(flujos_list, safe=False)


# ===================== ESTADÍSTICAS Y MÉTRICAS =====================

@login_required
def comprobantes_stats(request):
    """Estadísticas de comprobantes."""
    stats = {
        'total': ComprobanteContable.objects.count(),
        'confirmados': ComprobanteContable.objects.filter(estado='CONFIRMADO').count(),
        'pendientes': ComprobanteContable.objects.filter(estado='BORRADOR').count(),
        'valor_total': float(ComprobanteContable.objects.filter(
            estado='CONFIRMADO'
        ).aggregate(total=Sum('valor_total'))['total'] or 0)
    }
    return JsonResponse(stats)


@login_required
def movimientos_stats(request):
    """Estadísticas de movimientos."""
    stats = {
        'total': MovimientoContable.objects.count(),
        'total_debitos': float(MovimientoContable.objects.aggregate(
            total=Sum('debito'))['total'] or 0),
        'total_creditos': float(MovimientoContable.objects.aggregate(
            total=Sum('credito'))['total'] or 0)
    }
    return JsonResponse(stats)


@login_required
def flujo_caja_stats(request):
    """Estadísticas de flujo de caja."""
    current_month = timezone.now().month
    current_year = timezone.now().year
    
    stats = {
        'saldo_actual': float(FlujoCaja.get_saldo_actual()),
        'ingresos_mes': float(FlujoCaja.objects.filter(
            tipo='INGRESO',
            fecha__month=current_month,
            fecha__year=current_year
        ).aggregate(total=Sum('monto'))['total'] or 0),
        'egresos_mes': float(FlujoCaja.objects.filter(
            tipo='EGRESO',
            fecha__month=current_month,
            fecha__year=current_year
        ).aggregate(total=Sum('monto'))['total'] or 0),
    }
    stats['flujo_neto'] = stats['ingresos_mes'] - stats['egresos_mes']
    
    return JsonResponse(stats)


@login_required
def saldo_actual(request):
    """Obtener saldo actual de caja."""
    return JsonResponse({
        'saldo_actual': float(FlujoCaja.get_saldo_actual())
    })


@login_required
def reportes_stats(request):
    """Estadísticas de reportes."""
    stats = {
        'reportes_generados': 0,  # TODO: Implementar
        'descargas_mes': 0,
        'reportes_programados': 0,
        'usuarios_activos': 1,
    }
    return JsonResponse(stats)


# ===================== UTILIDADES =====================
