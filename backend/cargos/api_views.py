from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, F
from django.utils import timezone
from django.conf import settings

from .models import Cargo, HistorialCargo
from .serializers import CargoSerializer, HistorialCargoSerializer
from core.mixins import MultiTenantViewSetMixin


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class CargoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
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
    # Seguridad robusta - siempre requerir autenticación
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
            from payroll.models import Empleado
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


class HistorialCargoViewSet(MultiTenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
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
