"""
Vistas del Sistema de Préstamos
==============================

Vistas web para la gestión del sistema de préstamos.
Incluye funcionalidades completas para tipos de préstamo, préstamos y pagos.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count, Avg
from django.views.decorators.http import require_http_methods, require_POST
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.template.loader import render_to_string
from decimal import Decimal
import json
import datetime

from .models import TipoPrestamo, Prestamo, PagoPrestamo
from .forms import (
    TipoPrestamoForm, PrestamoForm, PrestamoAprobacionForm,
    PagoPrestamoForm, PrestamoFiltroForm, CalculadoraPrestamoForm
)


# ==================== DASHBOARD ====================

@login_required
def dashboard(request):
    """Dashboard principal de préstamos"""
    organization = request.user.organizacion
    
    # Estadísticas generales
    total_prestamos = Prestamo.objects.filter(organizacion=organization).count()
    prestamos_activos = Prestamo.objects.filter(
        organizacion=organization,
        estado__in=['aprobado', 'desembolsado', 'activo']
    ).count()
    prestamos_pendientes = Prestamo.objects.filter(
        organizacion=organization,
        estado__in=['solicitado', 'en_revision', 'pendiente']
    ).count()
    prestamos_en_mora = Prestamo.objects.filter(
        organizacion=organization,
        estado='en_mora'
    ).count()
    
    # Montos
    monto_total_prestado = Prestamo.objects.filter(organizacion=organization).aggregate(
        total=Sum('monto_aprobado')
    )['total'] or Decimal('0.00')
    
    monto_pendiente_pago = Prestamo.objects.filter(organizacion=organization).aggregate(
        total=Sum('saldo_pendiente')
    )['total'] or Decimal('0.00')
    
    monto_total_pagado = Prestamo.objects.filter(organizacion=organization).aggregate(
        total=Sum('total_pagado')
    )['total'] or Decimal('0.00')
    
    # Préstamos recientes
    prestamos_recientes = Prestamo.objects.filter(
        organizacion=organization
    ).select_related('empleado', 'tipo_prestamo').order_by('-created_at')[:5]
    
    # Pagos recientes
    pagos_recientes = PagoPrestamo.objects.filter(
        prestamo__organizacion=organization
    ).select_related('prestamo', 'prestamo__empleado').order_by('-created_at')[:5]
    
    # Distribución por estados
    distribucion_estados = {}
    for estado_value, estado_label in Prestamo.ESTADO_CHOICES:
        count = Prestamo.objects.filter(
            organizacion=organization,
            estado=estado_value
        ).count()
        if count > 0:
            distribucion_estados[estado_value] = {
                'label': estado_label,
                'count': count,
                'porcentaje': round((count / total_prestamos) * 100, 2) if total_prestamos > 0 else 0
            }
    
    context = {
        'total_prestamos': total_prestamos,
        'prestamos_activos': prestamos_activos,
        'prestamos_pendientes': prestamos_pendientes,
        'prestamos_en_mora': prestamos_en_mora,
        'monto_total_prestado': monto_total_prestado,
        'monto_pendiente_pago': monto_pendiente_pago,
        'monto_total_pagado': monto_total_pagado,
        'prestamos_recientes': prestamos_recientes,
        'pagos_recientes': pagos_recientes,
        'distribucion_estados': distribucion_estados,
    }
    
    return render(request, 'prestamos/dashboard.html', context)


# ==================== TIPOS DE PRÉSTAMO ====================

@login_required
def tipos_list(request):
    """Lista de tipos de préstamo"""
    tipos = TipoPrestamo.objects.filter(
        organizacion=request.user.organizacion
    ).order_by('orden', 'codigo')
    
    # Búsqueda
    search = request.GET.get('search')
    if search:
        tipos = tipos.filter(
            Q(codigo__icontains=search) |
            Q(nombre__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    # Filtro por estado
    activo = request.GET.get('activo')
    if activo:
        tipos = tipos.filter(activo=activo == 'true')
    
    # Paginación
    paginator = Paginator(tipos, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'search': search,
        'activo': activo,
    }
    
    return render(request, 'prestamos/tipos/list.html', context)


@login_required
def tipo_create(request):
    """Crear tipo de préstamo"""
    if request.method == 'POST':
        form = TipoPrestamoForm(
            request.POST,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            tipo = form.save(commit=False)
            tipo.organizacion = request.user.organizacion
            tipo.created_by = request.user
            tipo.save()
            messages.success(request, _('Tipo de préstamo creado exitosamente.'))
            return redirect('prestamos:tipos_list')
    else:
        form = TipoPrestamoForm(
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'title': 'Crear Tipo de Préstamo',
        'action': 'Crear'
    }
    
    return render(request, 'prestamos/tipos/form.html', context)


@login_required
def tipo_detail(request, pk):
    """Detalle de tipo de préstamo"""
    tipo = get_object_or_404(
        TipoPrestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    # Estadísticas del tipo
    prestamos = tipo.prestamos.all()
    stats = {
        'total_prestamos': prestamos.count(),
        'prestamos_activos': prestamos.filter(estado__in=['aprobado', 'desembolsado', 'activo']).count(),
        'monto_total': prestamos.aggregate(total=Sum('monto_aprobado'))['total'] or Decimal('0.00'),
        'monto_promedio': prestamos.aggregate(promedio=Avg('monto_aprobado'))['promedio'] or Decimal('0.00'),
    }
    
    # Préstamos recientes de este tipo
    prestamos_recientes = prestamos.select_related('empleado').order_by('-created_at')[:10]
    
    context = {
        'tipo': tipo,
        'stats': stats,
        'prestamos_recientes': prestamos_recientes,
    }
    
    return render(request, 'prestamos/tipos/detail.html', context)


@login_required
def tipo_edit(request, pk):
    """Editar tipo de préstamo"""
    tipo = get_object_or_404(
        TipoPrestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    if request.method == 'POST':
        form = TipoPrestamoForm(
            request.POST,
            instance=tipo,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            tipo = form.save(commit=False)
            tipo.updated_by = request.user
            tipo.save()
            messages.success(request, _('Tipo de préstamo actualizado exitosamente.'))
            return redirect('prestamos:tipo_detail', pk=tipo.pk)
    else:
        form = TipoPrestamoForm(
            instance=tipo,
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'tipo': tipo,
        'title': f'Editar: {tipo.nombre}',
        'action': 'Actualizar'
    }
    
    return render(request, 'prestamos/tipos/form.html', context)


@login_required
@require_POST
def tipo_delete(request, pk):
    """Eliminar tipo de préstamo"""
    tipo = get_object_or_404(
        TipoPrestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    # Verificar que no tenga préstamos asociados
    if tipo.prestamos.exists():
        messages.error(
            request,
            _('No se puede eliminar este tipo porque tiene préstamos asociados.')
        )
        return redirect('prestamos:tipo_detail', pk=tipo.pk)
    
    nombre = tipo.nombre
    tipo.delete()
    messages.success(request, _('Tipo de préstamo "{}" eliminado exitosamente.').format(nombre))
    return redirect('prestamos:tipos_list')


# ==================== PRÉSTAMOS ====================

@login_required
def prestamos_list(request):
    """Lista de préstamos"""
    prestamos = Prestamo.objects.filter(
        organizacion=request.user.organizacion
    ).select_related('empleado', 'tipo_prestamo', 'solicitado_por').order_by('-fecha_solicitud')
    
    # Aplicar filtros
    form = PrestamoFiltroForm(request.GET, organizacion=request.user.organizacion)
    if form.is_valid():
        if form.cleaned_data.get('busqueda'):
            search = form.cleaned_data['busqueda']
            prestamos = prestamos.filter(
                Q(numero_prestamo__icontains=search) |
                Q(empleado__nombres__icontains=search) |
                Q(empleado__apellidos__icontains=search) |
                Q(empleado__numero_identificacion__icontains=search)
            )
        
        if form.cleaned_data.get('estado'):
            prestamos = prestamos.filter(estado=form.cleaned_data['estado'])
        
        if form.cleaned_data.get('tipo_prestamo'):
            prestamos = prestamos.filter(tipo_prestamo=form.cleaned_data['tipo_prestamo'])
        
        if form.cleaned_data.get('fecha_desde'):
            prestamos = prestamos.filter(fecha_solicitud__gte=form.cleaned_data['fecha_desde'])
        
        if form.cleaned_data.get('fecha_hasta'):
            prestamos = prestamos.filter(fecha_solicitud__lte=form.cleaned_data['fecha_hasta'])
    
    # Paginación
    paginator = Paginator(prestamos, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'form': form,
    }
    
    return render(request, 'prestamos/prestamos/list.html', context)


@login_required
def prestamo_create(request):
    """Crear préstamo"""
    if request.method == 'POST':
        form = PrestamoForm(
            request.POST,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            prestamo = form.save(commit=False)
            prestamo.organizacion = request.user.organizacion
            prestamo.solicitado_por = request.user
            prestamo.created_by = request.user
            
            # Aplicar valores por defecto del tipo de préstamo
            if not prestamo.tasa_interes:
                prestamo.tasa_interes = prestamo.tipo_prestamo.tasa_interes_defecto
            
            prestamo.save()
            messages.success(request, _('Préstamo creado exitosamente.'))
            return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    else:
        form = PrestamoForm(
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'title': 'Crear Préstamo',
        'action': 'Crear'
    }
    
    return render(request, 'prestamos/prestamos/form.html', context)


@login_required
def prestamo_detail(request, pk):
    """Detalle de préstamo"""
    prestamo = get_object_or_404(
        Prestamo.objects.select_related('empleado', 'tipo_prestamo', 'solicitado_por', 'aprobado_por'),
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    # Historial de pagos
    pagos = prestamo.pagos.all().order_by('-fecha_pago')
    
    # Información calculada
    info_calculada = {
        'cuota_mensual': prestamo.calcular_cuota_mensual(),
        'total_con_intereses': prestamo.calcular_total_con_intereses(),
        'porcentaje_pagado': prestamo.calcular_porcentaje_pagado(),
        'esta_vigente': prestamo.esta_vigente(),
        'puede_recibir_pagos': prestamo.puede_recibir_pagos(),
    }
    
    context = {
        'prestamo': prestamo,
        'pagos': pagos,
        'info_calculada': info_calculada,
    }
    
    return render(request, 'prestamos/prestamos/detail.html', context)


@login_required
def prestamo_edit(request, pk):
    """Editar préstamo"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    if request.method == 'POST':
        form = PrestamoForm(
            request.POST,
            instance=prestamo,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            prestamo = form.save(commit=False)
            prestamo.updated_by = request.user
            prestamo.save()
            messages.success(request, _('Préstamo actualizado exitosamente.'))
            return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    else:
        form = PrestamoForm(
            instance=prestamo,
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'prestamo': prestamo,
        'title': f'Editar: {prestamo.numero_prestamo}',
        'action': 'Actualizar'
    }
    
    return render(request, 'prestamos/prestamos/form.html', context)


@login_required
def prestamo_aprobar(request, pk):
    """Aprobar préstamo"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    if prestamo.estado not in ['solicitado', 'en_revision', 'pendiente']:
        messages.error(request, _('Este préstamo no puede ser aprobado en su estado actual.'))
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    if request.method == 'POST':
        form = PrestamoAprobacionForm(request.POST, instance=prestamo)
        if form.is_valid():
            accion = form.cleaned_data['accion']
            
            if accion == 'aprobar':
                try:
                    prestamo.aprobar(
                        usuario=request.user,
                        monto_aprobado=form.cleaned_data.get('monto_aprobado'),
                        observaciones=form.cleaned_data.get('observaciones_aprobacion')
                    )
                    messages.success(request, _('Préstamo aprobado exitosamente.'))
                except Exception as e:
                    messages.error(request, str(e))
            
            elif accion == 'rechazar':
                try:
                    prestamo.rechazar(
                        usuario=request.user,
                        motivo=form.cleaned_data['motivo_rechazo']
                    )
                    messages.success(request, _('Préstamo rechazado.'))
                except Exception as e:
                    messages.error(request, str(e))
            
            return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    else:
        form = PrestamoAprobacionForm(instance=prestamo)
        # Inicializar monto aprobado con el solicitado
        form.fields['monto_aprobado'].initial = prestamo.monto_solicitado
    
    context = {
        'form': form,
        'prestamo': prestamo,
        'title': f'Revisar: {prestamo.numero_prestamo}',
    }
    
    return render(request, 'prestamos/prestamos/aprobar.html', context)


@login_required
def prestamo_desembolsar(request, pk):
    """Desembolsar préstamo"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    if prestamo.estado != 'aprobado':
        messages.error(request, _('Solo se pueden desembolsar préstamos aprobados.'))
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    if request.method == 'POST':
        fecha_desembolso = request.POST.get('fecha_desembolso')
        if fecha_desembolso:
            fecha_desembolso = datetime.datetime.strptime(fecha_desembolso, '%Y-%m-%d').date()
        
        try:
            prestamo.desembolsar(
                usuario=request.user,
                fecha_desembolso=fecha_desembolso
            )
            messages.success(request, _('Préstamo desembolsado exitosamente.'))
        except Exception as e:
            messages.error(request, str(e))
        
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    context = {
        'prestamo': prestamo,
        'fecha_hoy': timezone.now().date(),
    }
    
    return render(request, 'prestamos/prestamos/desembolsar.html', context)


@login_required
def prestamo_cronograma(request, pk):
    """Ver cronograma de pagos"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    if not prestamo.cuota_mensual or prestamo.plazo_meses <= 0:
        messages.error(request, _('El préstamo no tiene información suficiente para generar cronograma.'))
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    # Generar cronograma
    cronograma = []
    saldo = prestamo.monto_final
    fecha_pago = prestamo.fecha_primer_pago or timezone.now().date()
    
    for i in range(1, prestamo.plazo_meses + 1):
        if prestamo.tasa_interes > 0:
            interes = saldo * (prestamo.tasa_interes / 100 / 12)
            capital = prestamo.cuota_mensual - interes
        else:
            interes = Decimal('0.00')
            capital = prestamo.cuota_mensual
        
        saldo -= capital
        
        cronograma.append({
            'cuota': i,
            'fecha_pago': fecha_pago,
            'cuota_mensual': prestamo.cuota_mensual,
            'capital': capital,
            'interes': interes,
            'saldo': max(saldo, Decimal('0.00'))
        })
        
        # Próxima fecha (aproximadamente 30 días después)
        try:
            fecha_pago = fecha_pago.replace(
                month=fecha_pago.month % 12 + 1 if fecha_pago.month < 12 else 1,
                year=fecha_pago.year + (1 if fecha_pago.month == 12 else 0)
            )
        except ValueError:
            # Manejar casos como 31 de enero -> 28/29 de febrero
            if fecha_pago.month == 1:
                fecha_pago = fecha_pago.replace(month=2, day=28, year=fecha_pago.year)
            else:
                fecha_pago = fecha_pago.replace(month=fecha_pago.month + 1, day=1)
    
    context = {
        'prestamo': prestamo,
        'cronograma': cronograma,
        'resumen': {
            'total_cuotas': len(cronograma),
            'total_intereses': sum(c['interes'] for c in cronograma),
            'total_a_pagar': prestamo.calcular_total_con_intereses()
        }
    }
    
    return render(request, 'prestamos/prestamos/cronograma.html', context)


@login_required
@require_POST
def prestamo_delete(request, pk):
    """Eliminar préstamo"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=pk,
        organizacion=request.user.organizacion
    )
    
    # Solo permitir eliminar préstamos en borrador o rechazados
    if prestamo.estado not in ['borrador', 'rechazado']:
        messages.error(
            request,
            _('Solo se pueden eliminar préstamos en borrador o rechazados.')
        )
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    numero = prestamo.numero_prestamo
    prestamo.delete()
    messages.success(request, _('Préstamo "{}" eliminado exitosamente.').format(numero))
    return redirect('prestamos:prestamos_list')


# ==================== PAGOS ====================

@login_required
def pagos_list(request):
    """Lista de pagos"""
    pagos = PagoPrestamo.objects.filter(
        prestamo__organizacion=request.user.organizacion
    ).select_related('prestamo', 'prestamo__empleado', 'registrado_por').order_by('-fecha_pago')
    
    # Filtros básicos
    search = request.GET.get('search')
    if search:
        pagos = pagos.filter(
            Q(numero_pago__icontains=search) |
            Q(prestamo__numero_prestamo__icontains=search) |
            Q(prestamo__empleado__nombres__icontains=search) |
            Q(prestamo__empleado__apellidos__icontains=search)
        )
    
    # Paginación
    paginator = Paginator(pagos, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'search': search,
    }
    
    return render(request, 'prestamos/pagos/list.html', context)


@login_required
def pago_create(request):
    """Crear pago"""
    if request.method == 'POST':
        form = PagoPrestamoForm(
            request.POST,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            pago = form.save(commit=False)
            
            # Calcular saldos
            prestamo = pago.prestamo
            pago.saldo_anterior = prestamo.saldo_pendiente
            pago.saldo_nuevo = pago.saldo_anterior - pago.monto_pago
            pago.registrado_por = request.user
            
            pago.save()
            messages.success(request, _('Pago registrado exitosamente.'))
            return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    else:
        form = PagoPrestamoForm(
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'title': 'Registrar Pago',
        'action': 'Registrar'
    }
    
    return render(request, 'prestamos/pagos/form.html', context)


@login_required
def pago_create_for_prestamo(request, prestamo_pk):
    """Crear pago para un préstamo específico"""
    prestamo = get_object_or_404(
        Prestamo,
        pk=prestamo_pk,
        organizacion=request.user.organizacion
    )
    
    if not prestamo.puede_recibir_pagos():
        messages.error(request, _('Este préstamo no puede recibir pagos en su estado actual.'))
        return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    
    if request.method == 'POST':
        form = PagoPrestamoForm(
            request.POST,
            prestamo=prestamo,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            pago = form.save(commit=False)
            pago.saldo_anterior = prestamo.saldo_pendiente
            pago.saldo_nuevo = pago.saldo_anterior - pago.monto_pago
            pago.registrado_por = request.user
            pago.save()
            messages.success(request, _('Pago registrado exitosamente.'))
            return redirect('prestamos:prestamo_detail', pk=prestamo.pk)
    else:
        form = PagoPrestamoForm(
            prestamo=prestamo,
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'prestamo': prestamo,
        'title': f'Registrar Pago - {prestamo.numero_prestamo}',
        'action': 'Registrar'
    }
    
    return render(request, 'prestamos/pagos/form.html', context)


@login_required
def pago_detail(request, pk):
    """Detalle de pago"""
    pago = get_object_or_404(
        PagoPrestamo.objects.select_related('prestamo', 'prestamo__empleado', 'registrado_por'),
        pk=pk,
        prestamo__organizacion=request.user.organizacion
    )
    
    context = {
        'pago': pago,
    }
    
    return render(request, 'prestamos/pagos/detail.html', context)


@login_required
def pago_edit(request, pk):
    """Editar pago"""
    pago = get_object_or_404(
        PagoPrestamo,
        pk=pk,
        prestamo__organizacion=request.user.organizacion
    )
    
    if request.method == 'POST':
        form = PagoPrestamoForm(
            request.POST,
            instance=pago,
            organizacion=request.user.organizacion,
            user=request.user
        )
        if form.is_valid():
            pago = form.save()
            messages.success(request, _('Pago actualizado exitosamente.'))
            return redirect('prestamos:pago_detail', pk=pago.pk)
    else:
        form = PagoPrestamoForm(
            instance=pago,
            organizacion=request.user.organizacion,
            user=request.user
        )
    
    context = {
        'form': form,
        'pago': pago,
        'title': f'Editar: {pago.numero_pago}',
        'action': 'Actualizar'
    }
    
    return render(request, 'prestamos/pagos/form.html', context)


# ==================== UTILIDADES ====================

@login_required
def calculadora(request):
    """Calculadora de préstamos"""
    resultado = None
    
    if request.method == 'POST':
        form = CalculadoraPrestamoForm(request.POST)
        if form.is_valid():
            resultado = form.calcular_cuota()
    else:
        form = CalculadoraPrestamoForm()
    
    context = {
        'form': form,
        'resultado': resultado,
    }
    
    return render(request, 'prestamos/calculadora.html', context)


# ==================== AJAX ENDPOINTS ====================

@login_required
def ajax_tipo_prestamo_datos(request, pk):
    """Obtener datos de un tipo de préstamo via AJAX"""
    try:
        tipo = TipoPrestamo.objects.get(
            pk=pk,
            organizacion=request.user.organizacion
        )
        data = {
            'monto_minimo': float(tipo.monto_minimo),
            'monto_maximo': float(tipo.monto_maximo),
            'tasa_interes_defecto': float(tipo.tasa_interes_defecto),
            'tasa_interes_minima': float(tipo.tasa_interes_minima),
            'tasa_interes_maxima': float(tipo.tasa_interes_maxima),
            'plazo_minimo_meses': tipo.plazo_minimo_meses,
            'plazo_maximo_meses': tipo.plazo_maximo_meses,
            'requiere_garantia': tipo.requiere_garantia,
        }
        return JsonResponse(data)
    except TipoPrestamo.DoesNotExist:
        return JsonResponse({'error': 'Tipo no encontrado'}, status=404)


@login_required
def ajax_calcular_cuota(request):
    """Calcular cuota mensual via AJAX"""
    try:
        monto = Decimal(request.GET.get('monto', '0'))
        tasa = Decimal(request.GET.get('tasa', '0'))
        plazo = int(request.GET.get('plazo', '0'))
        
        if monto <= 0 or plazo <= 0:
            return JsonResponse({'error': 'Valores inválidos'}, status=400)
        
        if tasa == 0:
            cuota_mensual = monto / plazo
        else:
            tasa_mensual = tasa / 100 / 12
            factor = (1 + tasa_mensual) ** plazo
            cuota_mensual = monto * (tasa_mensual * factor) / (factor - 1)
        
        total_con_intereses = cuota_mensual * plazo
        total_intereses = total_con_intereses - monto
        
        return JsonResponse({
            'cuota_mensual': round(float(cuota_mensual), 2),
            'total_con_intereses': round(float(total_con_intereses), 2),
            'total_intereses': round(float(total_intereses), 2)
        })
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Valores inválidos'}, status=400)


@login_required
def ajax_empleado_prestamos(request, empleado_pk):
    """Obtener préstamos activos de un empleado via AJAX"""
    try:
        from nomina.models import Empleado
        empleado = Empleado.objects.get(
            pk=empleado_pk,
            organizacion=request.user.organizacion
        )
        
        prestamos_activos = Prestamo.objects.filter(
            empleado=empleado,
            estado__in=['aprobado', 'desembolsado', 'activo']
        ).values('numero_prestamo', 'estado', 'monto_aprobado', 'saldo_pendiente')
        
        return JsonResponse({
            'empleado': f"{empleado.nombres} {empleado.apellidos}",
            'prestamos_activos': list(prestamos_activos)
        })
    except Exception:
        return JsonResponse({'prestamos_activos': []})


# ==================== REPORTES (PENDIENTES) ====================

@login_required
def reportes(request):
    """Vista de reportes"""
    return render(request, 'prestamos/reportes/index.html')


@login_required
def reporte_prestamos(request):
    """Reporte de préstamos"""
    # TODO: Implementar reporte de préstamos
    pass


@login_required
def reporte_pagos(request):
    """Reporte de pagos"""
    # TODO: Implementar reporte de pagos
    pass
