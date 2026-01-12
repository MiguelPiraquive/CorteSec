from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q, Count, F
from django.views.decorators.http import require_http_methods


# ===================== API REST VIEWSETS =====================

from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .serializers import CargoSerializer, HistorialCargoSerializer
from .models import Cargo, HistorialCargo
from .forms import CargoForm


# ===================== CARGOS =====================

@login_required
def cargos_list(request):
    """Lista de cargos con filtros y paginación."""
    queryset = Cargo.objects.select_related('cargo_superior').all()
    
    # Filtros
    search = request.GET.get('search', '')
    activo = request.GET.get('activo', '')
    nivel_jerarquico = request.GET.get('nivel_jerarquico', '')
    cargo_superior = request.GET.get('cargo_superior', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    
    if search:
        queryset = queryset.filter(
            Q(nombre__icontains=search) |
            Q(codigo__icontains=search) |
            Q(descripcion__icontains=search)
        )
    
    if activo:
        queryset = queryset.filter(activo=activo == 'true')
    
    if nivel_jerarquico:
        queryset = queryset.filter(nivel_jerarquico=nivel_jerarquico)
    
    if cargo_superior:
        queryset = queryset.filter(cargo_superior_id=cargo_superior)
        
    # Filtros de fecha
    if fecha_desde:
        from datetime import datetime
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha_creacion__gte=fecha_desde_obj)
        except ValueError:
            pass
    
    if fecha_hasta:
        from datetime import datetime
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha_creacion__lte=fecha_hasta_obj)
        except ValueError:
            pass
    
    # Orden
    order_by = request.GET.get('order_by', 'nivel_jerarquico')
    if order_by:
        queryset = queryset.order_by(order_by, 'nombre')
    
    # Paginación
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Estadísticas
    stats = {
        'total': Cargo.objects.count(),
        'activos': Cargo.objects.filter(activo=True).count(),
        'inactivos': Cargo.objects.filter(activo=False).count(),
        'niveles': Cargo.objects.aggregate(Count('nivel_jerarquico', distinct=True))['nivel_jerarquico__count'] or 0
    }
    
    # Calcular total de empleados (necesitamos revisar el modelo de empleados)
    try:
        from nomina.models import Empleado
        total_empleados = Empleado.objects.count()
    except ImportError:
        total_empleados = 0
    
    # Cargos superiores para filtro
    cargos_superiores = Cargo.objects.filter(activo=True).order_by('nivel_jerarquico', 'nombre')
    
    context = {
        'page_obj': page_obj,
        'cargos': page_obj.object_list,  # Para compatibilidad con el template
        'is_paginated': page_obj.has_other_pages(),
        'total_empleados': total_empleados,
        'search': search,
        'activo': activo,
        'nivel_jerarquico': nivel_jerarquico,
        'cargo_superior': cargo_superior,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'order_by': order_by,
        'stats': stats,
        'cargos_superiores': cargos_superiores,
        'niveles_disponibles': list(range(1, 11)),  # Niveles del 1 al 10
    }
    
    return render(request, 'cargos/cargos/list.html', context)

@login_required
def cargo_detail(request, pk):
    """Detalle de un cargo específico."""
    cargo = get_object_or_404(Cargo, pk=pk)
    
    # Historial de empleados en este cargo (buscar en cargo_nuevo y cargo_anterior)
    from django.db.models import Q
    historial = HistorialCargo.objects.filter(
        Q(cargo_nuevo=cargo) | Q(cargo_anterior=cargo)
    ).select_related(
        'empleado', 'cargo_anterior', 'cargo_nuevo'
    ).order_by('-fecha_inicio')
    
    # Cargos subordinados
    subordinados = Cargo.objects.filter(cargo_superior=cargo).order_by('nombre')
    
    context = {
        'cargo': cargo,
        'historial': historial,
        'subordinados': subordinados,
    }
    
    return render(request, 'cargos/cargos/detail.html', context)


@login_required
def cargo_create(request):
    """Crear un nuevo cargo."""
    if request.method == 'POST':
        form = CargoForm(request.POST)
        if form.is_valid():
            cargo = form.save()
            messages.success(request, f'Cargo "{cargo.nombre}" creado exitosamente.')
            return redirect('cargos:detail', pk=cargo.pk)
        else:
            messages.error(request, 'Por favor corrija los errores en el formulario.')
    else:
        form = CargoForm()
    
    context = {
        'form': form,
        'title': 'Crear Cargo',
        'submit_text': 'Crear Cargo'
    }
    
    return render(request, 'cargos/cargos/form.html', context)


@login_required
def cargo_update(request, pk):
    """Actualizar un cargo existente."""
    cargo = get_object_or_404(Cargo, pk=pk)
    
    if request.method == 'POST':
        form = CargoForm(request.POST, instance=cargo)
        if form.is_valid():
            cargo = form.save()
            messages.success(request, f'Cargo "{cargo.nombre}" actualizado exitosamente.')
            return redirect('cargos:detail', pk=cargo.pk)
        else:
            messages.error(request, 'Por favor corrija los errores en el formulario.')
    else:
        form = CargoForm(instance=cargo)
    
    context = {
        'form': form,
        'cargo': cargo,
        'title': f'Editar Cargo: {cargo.nombre}',
        'submit_text': 'Actualizar Cargo'
    }
    
    return render(request, 'cargos/cargos/form.html', context)


@login_required
def cargo_delete(request, pk):
    """Eliminar un cargo."""
    cargo = get_object_or_404(Cargo, pk=pk)
    
    if request.method == 'POST':
        try:
            nombre = cargo.nombre
            cargo.delete()
            messages.success(request, f'Cargo "{nombre}" eliminado exitosamente.')
            return redirect('cargos:list')
        except Exception as e:
            messages.error(request, f'No se pudo eliminar el cargo: {str(e)}')
            return redirect('cargos:detail', pk=cargo.pk)
    
    # GET request - mostrar página de confirmación
    context = {
        'cargo': cargo,
    }
    return render(request, 'cargos/cargos/confirmar_eliminar.html', context)


@login_required
@require_http_methods(["POST"])
def cargo_toggle_activo(request, pk):
    """Activar/desactivar un cargo."""
    cargo = get_object_or_404(Cargo, pk=pk)
    
    cargo.activo = not cargo.activo
    cargo.save()
    
    estado = "activado" if cargo.activo else "desactivado"
    messages.success(request, f'Cargo "{cargo.nombre}" {estado} exitosamente.')
    
    return redirect('cargos:detail', pk=cargo.pk)


@login_required
@require_http_methods(["POST"])
def cargo_toggle(request, pk):
    """Toggle estado activo/inactivo de un cargo."""
    cargo = get_object_or_404(Cargo, pk=pk)
    
    try:
        import json
        data = json.loads(request.body)
        activate = data.get('activate', not cargo.activo)
        
        cargo.activo = activate
        cargo.save()
        
        action = "activado" if activate else "desactivado"
        return JsonResponse({
            'success': True,
            'message': f'Cargo {action} exitosamente',
            'activo': cargo.activo
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al cambiar el estado del cargo: {str(e)}'
        })

@login_required
@require_http_methods(["POST"])
def bulk_action(request):
    """Ejecutar acciones masivas en múltiples cargos."""
    try:
        import json
        data = json.loads(request.body)
        cargo_ids = data.get('cargo_ids', [])
        action = data.get('action', '')
        
        if not cargo_ids:
            return JsonResponse({
                'success': False,
                'message': 'No se seleccionaron cargos'
            })
        
        cargos = Cargo.objects.filter(pk__in=cargo_ids)
        
        if action == 'activate':
            cargos.update(activo=True)
            message = f'{cargos.count()} cargos activados exitosamente'
        elif action == 'deactivate':
            cargos.update(activo=False)
            message = f'{cargos.count()} cargos desactivados exitosamente'
        elif action == 'delete':
            count = cargos.count()
            cargos.delete()
            message = f'{count} cargos eliminados exitosamente'
        else:
            return JsonResponse({
                'success': False,
                'message': 'Acción no válida'
            })
        
        return JsonResponse({
            'success': True,
            'message': message
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al ejecutar la acción: {str(e)}'
        })


# ===================== API ENDPOINTS =====================

@login_required
def api_cargos_jerarquia(request):
    """API para obtener la jerarquía de cargos en formato JSON."""
    cargos = Cargo.objects.filter(activo=True).select_related('cargo_superior')
    
    def build_hierarchy(cargos_list, parent_id=None):
        result = []
        for cargo in cargos_list:
            if cargo.cargo_superior_id == parent_id:
                children = build_hierarchy(cargos_list, cargo.id)
                cargo_data = {
                    'id': cargo.id,
                    'nombre': cargo.nombre,
                    'codigo': cargo.codigo,
                    'nivel_jerarquico': cargo.nivel_jerarquico,
                    'children': children
                }
                result.append(cargo_data)
        return result
    
    hierarchy = build_hierarchy(cargos)
    return JsonResponse({'hierarchy': hierarchy})


@login_required
def api_cargos_search(request):
    """API para búsqueda de cargos con autocompletado."""
    term = request.GET.get('term', '')
    activos_only = request.GET.get('activos_only', 'true') == 'true'
    
    queryset = Cargo.objects.all()
    
    if activos_only:
        queryset = queryset.filter(activo=True)
    
    if term:
        queryset = queryset.filter(
            Q(nombre__icontains=term) |
            Q(codigo__icontains=term)
        )
    
    results = []
    for cargo in queryset[:10]:  # Limitar a 10 resultados
        results.append({
            'id': cargo.id,
            'text': f"{cargo.codigo} - {cargo.nombre}",
            'nombre': cargo.nombre,
            'codigo': cargo.codigo,
            'nivel_jerarquico': cargo.nivel_jerarquico
        })
    
    return JsonResponse({'results': results})


# ===================== HISTORIAL CARGOS =====================

@login_required
def historial_cargo_list(request):
    """Lista del historial de cargos con filtros avanzados."""
    queryset = HistorialCargo.objects.select_related(
        'empleado', 'cargo_anterior', 'cargo_nuevo', 'creado_por'
    ).all()
    
    # Filtros
    search_empleado = request.GET.get('search_empleado', '')
    cargo_id = request.GET.get('cargo', '')
    activo = request.GET.get('activo', '')
    tipo_cambio = request.GET.get('tipo_cambio', '')
    fecha_desde = request.GET.get('fecha_desde', '')
    fecha_hasta = request.GET.get('fecha_hasta', '')
    order_by = request.GET.get('order_by', '-fecha_inicio')
    
    # Filtro por empleado (nombre o documento)
    if search_empleado:
        queryset = queryset.filter(
            Q(empleado__nombres__icontains=search_empleado) |
            Q(empleado__apellidos__icontains=search_empleado) |
            Q(empleado__documento__icontains=search_empleado) |
            Q(empleado__numero_empleado__icontains=search_empleado)
        )
    
    # Filtro por cargo
    if cargo_id:
        queryset = queryset.filter(
            Q(cargo_nuevo_id=cargo_id) | Q(cargo_anterior_id=cargo_id)
        )
    
    # Filtro por estado
    if activo == 'true':
        queryset = queryset.filter(fecha_fin__isnull=True)
    elif activo == 'false':
        queryset = queryset.filter(fecha_fin__isnull=False)
    
    # Filtro por tipo de cambio
    if tipo_cambio == 'promocion':
        # Promoción: cuando el nuevo cargo tiene nivel jerárquico menor (más alto)
        queryset = queryset.filter(
            cargo_anterior__isnull=False,
            cargo_nuevo__nivel_jerarquico__lt=F('cargo_anterior__nivel_jerarquico')
        )
    elif tipo_cambio == 'traslado':
        # Traslado: mismo nivel jerárquico
        queryset = queryset.filter(
            cargo_anterior__isnull=False,
            cargo_nuevo__nivel_jerarquico=F('cargo_anterior__nivel_jerarquico')
        )
    elif tipo_cambio == 'nuevo':
        # Nueva asignación: sin cargo anterior
        queryset = queryset.filter(cargo_anterior__isnull=True)
    
    # Filtros de fecha
    if fecha_desde:
        from datetime import datetime
        try:
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha_inicio__gte=fecha_desde_obj)
        except ValueError:
            pass
    
    if fecha_hasta:
        from datetime import datetime
        try:
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha_inicio__lte=fecha_hasta_obj)
        except ValueError:
            pass
    
    # Ordenamiento
    if order_by:
        queryset = queryset.order_by(order_by)
    
    # Paginación
    paginator = Paginator(queryset, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Estadísticas para el template
    stats = {
        'total_registros': queryset.count(),
        'asignaciones_activas': queryset.filter(fecha_fin__isnull=True).count(),
        'empleados_involucrados': queryset.values('empleado').distinct().count(),
        'cargos_afectados': queryset.values('cargo_nuevo').distinct().count(),
    }
    
    # Cargos disponibles para filtro
    cargos_disponibles = Cargo.objects.all().order_by('nombre')
    
    context = {
        'page_obj': page_obj,
        'search_empleado': search_empleado,
        'cargo_id': cargo_id,
        'activo': activo,
        'tipo_cambio': tipo_cambio,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'order_by': order_by,
        'cargos_disponibles': cargos_disponibles,
        'stats': stats,
    }
    
    return render(request, 'cargos/cargos/historial_list.html', context)


@login_required
def historial_cargo_detail(request, pk):
    """Detalle de un registro del historial de cargos."""
    historial = get_object_or_404(HistorialCargo, pk=pk)
    
    context = {
        'historial': historial,
    }
    
    return render(request, 'cargos/cargos/historial_detail.html', context)


@login_required
def toast_examples(request):
    """Página de ejemplos y documentación del sistema de toast notifications."""
    return render(request, 'cargos/cargos/toast_examples.html')



class StandardResultsSetPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class CargoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar cargos.
    
    Proporciona operaciones CRUD completas y endpoints adicionales para:
    - Jerarquía de cargos
    - Búsqueda y filtrado
    - Estadísticas
    - Activación/desactivación
    """
    
    queryset = Cargo.objects.select_related('cargo_superior').all()
    serializer_class = CargoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'nivel_jerarquico', 'cargo_superior', 'requiere_aprobacion']
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering_fields = ['nombre', 'codigo', 'nivel_jerarquico', 'fecha_creacion']
    ordering = ['nivel_jerarquico', 'nombre']

    def get_queryset(self):
        """Optimizar consultas con select_related y filtros adicionales."""
        queryset = super().get_queryset()
        
        # Filtros de fecha
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            try:
                from datetime import datetime
                fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_creacion__gte=fecha_desde_obj)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                from datetime import datetime
                fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_creacion__lte=fecha_hasta_obj)
            except ValueError:
                pass
        
        return queryset

    @action(detail=False, methods=['get'])
    def jerarquia(self, request):
        """
        Obtiene la jerarquía completa de cargos en formato de árbol.
        """
        cargos = Cargo.objects.filter(activo=True).select_related('cargo_superior')
        
        def build_hierarchy(cargos_list, parent_id=None):
            result = []
            for cargo in cargos_list:
                if cargo.cargo_superior_id == parent_id:
                    children = build_hierarchy(cargos_list, cargo.id)
                    cargo_data = {
                        'id': cargo.id,
                        'nombre': cargo.nombre,
                        'codigo': cargo.codigo,
                        'nivel_jerarquico': cargo.nivel_jerarquico,
                        'salario_base_minimo': float(cargo.salario_base_minimo) if cargo.salario_base_minimo else None,
                        'salario_base_maximo': float(cargo.salario_base_maximo) if cargo.salario_base_maximo else None,
                        'empleados_count': cargo.empleados_count,
                        'requiere_aprobacion': cargo.requiere_aprobacion,
                        'children': children
                    }
                    result.append(cargo_data)
            return result
        
        hierarchy = build_hierarchy(cargos)
        return Response({'hierarchy': hierarchy})

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas generales de los cargos.
        """
        total = Cargo.objects.count()
        activos = Cargo.objects.filter(activo=True).count()
        inactivos = Cargo.objects.filter(activo=False).count()
        niveles = Cargo.objects.aggregate(Count('nivel_jerarquico', distinct=True))['nivel_jerarquico__count'] or 0
        
        # Estadísticas por nivel jerárquico
        por_nivel = list(
            Cargo.objects.filter(activo=True)
            .values('nivel_jerarquico')
            .annotate(count=Count('id'))
            .order_by('nivel_jerarquico')
        )
        
        # Cargos que requieren aprobación
        requieren_aprobacion = Cargo.objects.filter(
            activo=True, 
            requiere_aprobacion=True
        ).count()
        
        # Total de empleados (si existe el modelo)
        try:
            from nomina.models import Empleado
            total_empleados = Empleado.objects.count()
        except ImportError:
            total_empleados = 0
        
        return Response({
            'total': total,
            'activos': activos,
            'inactivos': inactivos,
            'niveles': niveles,
            'por_nivel': por_nivel,
            'requieren_aprobacion': requieren_aprobacion,
            'total_empleados': total_empleados
        })

    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """
        Búsqueda rápida de cargos para autocompletado.
        """
        term = request.query_params.get('q', '')
        activos_only = request.query_params.get('activos_only', 'true') == 'true'
        limit = int(request.query_params.get('limit', 10))
        
        queryset = Cargo.objects.all()
        
        if activos_only:
            queryset = queryset.filter(activo=True)
        
        if term:
            queryset = queryset.filter(
                Q(nombre__icontains=term) |
                Q(codigo__icontains=term)
            )
        
        results = []
        for cargo in queryset[:limit]:
            results.append({
                'id': cargo.id,
                'label': f"{cargo.codigo} - {cargo.nombre}",
                'nombre': cargo.nombre,
                'codigo': cargo.codigo,
                'nivel_jerarquico': cargo.nivel_jerarquico,
                'activo': cargo.activo
            })
        
        return Response({'results': results})

    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """
        Activa o desactiva un cargo.
        """
        cargo = self.get_object()
        cargo.activo = not cargo.activo
        cargo.save()
        
        return Response({
            'message': f'Cargo {"activado" if cargo.activo else "desactivado"} exitosamente',
            'activo': cargo.activo
        })

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Ejecuta acciones masivas en múltiples cargos.
        """
        cargo_ids = request.data.get('cargo_ids', [])
        action = request.data.get('action', '')
        
        if not cargo_ids:
            return Response(
                {'error': 'No se seleccionaron cargos'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cargos = Cargo.objects.filter(pk__in=cargo_ids)
        
        if action == 'activate':
            cargos.update(activo=True)
            message = f'{cargos.count()} cargos activados exitosamente'
        elif action == 'deactivate':
            cargos.update(activo=False)
            message = f'{cargos.count()} cargos desactivados exitosamente'
        elif action == 'delete':
            count = cargos.count()
            cargos.delete()
            message = f'{count} cargos eliminados exitosamente'
        else:
            return Response(
                {'error': 'Acción no válida'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'message': message})

    @action(detail=True, methods=['get'])
    def subordinados(self, request, pk=None):
        """
        Obtiene todos los cargos subordinados de un cargo específico.
        """
        cargo = self.get_object()
        subordinados = Cargo.objects.filter(cargo_superior=cargo).order_by('nombre')
        serializer = self.get_serializer(subordinados, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """
        Obtiene el historial de empleados para un cargo específico.
        """
        cargo = self.get_object()
        historial = HistorialCargo.objects.filter(
            Q(cargo_nuevo=cargo) | Q(cargo_anterior=cargo)
        ).select_related(
            'empleado', 'cargo_anterior', 'cargo_nuevo'
        ).order_by('-fecha_inicio')
        
        # Paginar resultados
        page = self.paginate_queryset(historial)
        if page is not None:
            serializer = HistorialCargoSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = HistorialCargoSerializer(historial, many=True)
        return Response(serializer.data)


class HistorialCargoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar el historial de cargos.
    Solo permite operaciones de lectura.
    """
    
    queryset = HistorialCargo.objects.select_related(
        'empleado', 'cargo_anterior', 'cargo_nuevo', 'creado_por'
    ).all()
    serializer_class = HistorialCargoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['cargo_nuevo', 'cargo_anterior', 'empleado']
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'fecha_registro']
    ordering = ['-fecha_inicio']

    def get_queryset(self):
        """Filtros adicionales para el historial."""
        queryset = super().get_queryset()
        
        # Filtro por estado activo
        activo = self.request.query_params.get('activo')
        if activo == 'true':
            queryset = queryset.filter(fecha_fin__isnull=True)
        elif activo == 'false':
            queryset = queryset.filter(fecha_fin__isnull=False)
        
        # Filtro por tipo de cambio
        tipo_cambio = self.request.query_params.get('tipo_cambio')
        if tipo_cambio == 'promocion':
            queryset = queryset.filter(
                cargo_anterior__isnull=False,
                cargo_nuevo__nivel_jerarquico__lt=F('cargo_anterior__nivel_jerarquico')
            )
        elif tipo_cambio == 'traslado':
            queryset = queryset.filter(
                cargo_anterior__isnull=False,
                cargo_nuevo__nivel_jerarquico=F('cargo_anterior__nivel_jerarquico')
            )
        elif tipo_cambio == 'nuevo':
            queryset = queryset.filter(cargo_anterior__isnull=True)
        
        # Filtros de fecha
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            try:
                from datetime import datetime
                fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_inicio__gte=fecha_desde_obj)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                from datetime import datetime
                fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_inicio__lte=fecha_hasta_obj)
            except ValueError:
                pass
        
        return queryset

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtiene estadísticas del historial de cargos.
        """
        total_registros = self.get_queryset().count()
        asignaciones_activas = self.get_queryset().filter(fecha_fin__isnull=True).count()
        empleados_involucrados = self.get_queryset().values('empleado').distinct().count()
        cargos_afectados = self.get_queryset().values('cargo_nuevo').distinct().count()
        
        # Tendencias por mes (últimos 12 meses)
        from datetime import datetime, timedelta
        fecha_limite = datetime.now().date() - timedelta(days=365)
        
        tendencias = list(
            self.get_queryset()
            .filter(fecha_inicio__gte=fecha_limite)
            .extra(select={'mes': "strftime('%%Y-%%m', fecha_inicio)"})
            .values('mes')
            .annotate(count=Count('id'))
            .order_by('mes')
        )
        
        return Response({
            'total_registros': total_registros,
            'asignaciones_activas': asignaciones_activas,
            'empleados_involucrados': empleados_involucrados,
            'cargos_afectados': cargos_afectados,
            'tendencias': tendencias
        })
