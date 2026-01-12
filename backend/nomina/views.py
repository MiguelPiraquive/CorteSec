"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    VIEWS DE NÓMINA - CORTESEC                                 ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

ViewSets DRF con CRUD completo para todos los modelos de nómina.
Incluye endpoint de cálculo automático.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.mixins import MultiTenantViewSetMixin

from .models import (
    Empleado,
    TipoContrato,
    Contrato,
    ParametroLegal,
    ConceptoLaboral,
    NominaSimple,
    NominaItem,
    NominaConcepto,
)
from .serializers import (
    EmpleadoListSerializer,
    EmpleadoDetailSerializer,
    EmpleadoCreateSerializer,
    TipoContratoSerializer,
    ContratoSerializer,
    ContratoCreateSerializer,
    ParametroLegalSerializer,
    ConceptoLaboralSerializer,
    NominaSimpleListSerializer,
    NominaSimpleDetailSerializer,
    NominaSimpleCreateSerializer,
    NominaItemSerializer,
    NominaItemCreateSerializer,
    NominaConceptoSerializer,
    CalculoNominaSerializer,
)
from .services import calcular_nomina


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Empleados'])
class EmpleadoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gestión de empleados.
    
    Endpoints:
    - GET /empleados/ - Listar empleados
    - POST /empleados/ - Crear empleado
    - GET /empleados/{id}/ - Detalle de empleado
    - PUT /empleados/{id}/ - Actualizar empleado
    - DELETE /empleados/{id}/ - Eliminar empleado
    """
    
    queryset = Empleado.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'tipo_documento']
    search_fields = ['primer_nombre', 'primer_apellido', 'numero_documento', 'email']
    ordering_fields = ['primer_apellido', 'fecha_ingreso', 'created_at']
    ordering = ['primer_apellido', 'primer_nombre']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmpleadoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EmpleadoCreateSerializer
        return EmpleadoDetailSerializer
    
    @extend_schema(
        summary="Listar empleados activos",
        description="Retorna solo empleados en estado activo"
    )
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Lista solo empleados activos"""
        queryset = self.get_queryset().filter(estado='activo')
        serializer = EmpleadoListSerializer(queryset, many=True)
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: TIPO DE CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Configuración'])
class TipoContratoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para tipos de contrato.
    
    Define las reglas de aplicación de aportes según el tipo de contrato.
    """
    
    queryset = TipoContrato.objects.all()
    serializer_class = TipoContratoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['activo', 'aplica_salud', 'aplica_pension']
    search_fields = ['nombre', 'codigo']
    ordering = ['nombre']


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Contratos'])
class ContratoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para contratos laborales.
    
    Define la relación empleado-empresa con salario y configuración.
    """
    
    queryset = Contrato.objects.select_related('empleado', 'tipo_contrato').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['empleado', 'tipo_contrato', 'activo', 'nivel_arl']
    search_fields = ['empleado__primer_nombre', 'empleado__numero_documento', 'cargo']
    ordering_fields = ['fecha_inicio', 'salario']
    ordering = ['-fecha_inicio']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ContratoCreateSerializer
        return ContratoSerializer
    
    @extend_schema(
        summary="Contratos activos",
        description="Lista solo contratos vigentes"
    )
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Lista contratos activos"""
        queryset = self.get_queryset().filter(activo=True)
        serializer = ContratoSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Contratos de un empleado",
        parameters=[
            OpenApiParameter(name='empleado_id', description='ID del empleado', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def por_empleado(self, request):
        """Lista contratos de un empleado específico"""
        empleado_id = request.query_params.get('empleado_id')
        if not empleado_id:
            return Response(
                {'error': 'Se requiere empleado_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        queryset = self.get_queryset().filter(empleado_id=empleado_id)
        serializer = ContratoSerializer(queryset, many=True)
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: PARÁMETRO LEGAL
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Configuración'])
class ParametroLegalViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para parámetros legales.
    
    Tabla de configuración para todos los porcentajes legales.
    No requiere valores quemados en código.
    """
    
    queryset = ParametroLegal.objects.all()
    serializer_class = ParametroLegalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['concepto', 'activo']
    search_fields = ['concepto', 'descripcion']
    ordering_fields = ['concepto', 'vigente_desde']
    ordering = ['concepto', '-vigente_desde']
    
    @extend_schema(
        summary="Parámetros vigentes",
        description="Lista solo parámetros activos y vigentes"
    )
    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        """Lista parámetros vigentes"""
        from django.utils import timezone
        from django.db.models import Q
        
        hoy = timezone.now().date()
        queryset = self.get_queryset().filter(
            activo=True,
            vigente_desde__lte=hoy
        ).filter(
            Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=hoy)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: CONCEPTO LABORAL
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Configuración'])
class ConceptoLaboralViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para conceptos laborales.
    
    Define devengados y deducciones que pueden aplicarse en la nómina.
    """
    
    queryset = ConceptoLaboral.objects.all()
    serializer_class = ConceptoLaboralSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'activo', 'es_legal', 'aplica_porcentaje']
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering_fields = ['tipo', 'orden', 'nombre']
    ordering = ['tipo', 'orden']
    
    @extend_schema(
        summary="Devengados activos",
        description="Lista solo conceptos de tipo devengado activos"
    )
    @action(detail=False, methods=['get'])
    def devengados(self, request):
        """Lista conceptos de tipo DEVENGADO"""
        queryset = self.get_queryset().filter(tipo='DEVENGADO', activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Deducciones activas",
        description="Lista solo conceptos de tipo deducción activos"
    )
    @action(detail=False, methods=['get'])
    def deducciones(self, request):
        """Lista conceptos de tipo DEDUCCION"""
        queryset = self.get_queryset().filter(tipo='DEDUCCION', activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: NÓMINA SIMPLE
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Principal'])
class NominaSimpleViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para nóminas.
    
    Modelo principal de nómina con cálculo automático de:
    - IBC según tipo de contrato
    - Aportes de seguridad social
    - Parafiscales
    - Conceptos laborales
    - Descuentos de préstamos
    """
    
    queryset = NominaSimple.objects.select_related(
        'contrato', 'contrato__empleado', 'contrato__tipo_contrato'
    ).prefetch_related('items', 'conceptos', 'prestamos').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contrato', 'contrato__empleado', 'estado']
    search_fields = ['numero', 'contrato__empleado__primer_nombre', 'contrato__empleado__numero_documento']
    ordering_fields = ['periodo_fin', 'created_at', 'total_pagar']
    ordering = ['-periodo_fin', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NominaSimpleListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return NominaSimpleCreateSerializer
        return NominaSimpleDetailSerializer
    
    @extend_schema(
        summary="Calcular nómina",
        description="Calcula automáticamente todos los valores de la nómina",
        request=CalculoNominaSerializer,
        responses={200: NominaSimpleDetailSerializer}
    )
    @action(detail=True, methods=['post'])
    def calcular(self, request, pk=None):
        """
        Calcula la nómina automáticamente.
        
        Incluye:
        - IBC según tipo de contrato
        - Salud y pensión (empleado y empleador)
        - ARL según nivel de riesgo
        - Parafiscales si aplica
        - Conceptos laborales configurados
        - Descuentos de préstamos
        - Totales
        """
        nomina = self.get_object()
        
        if nomina.estado not in ['borrador', 'calculada']:
            return Response(
                {'error': f'No se puede calcular una nómina en estado {nomina.estado}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            resumen = calcular_nomina(nomina)
            nomina.refresh_from_db()
            
            return Response({
                'mensaje': 'Nómina calculada exitosamente',
                'resumen': resumen,
                'nomina': NominaSimpleDetailSerializer(nomina).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Aprobar nómina",
        description="Cambia el estado de la nómina a aprobada"
    )
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprueba la nómina"""
        nomina = self.get_object()
        
        if nomina.estado != 'calculada':
            return Response(
                {'error': 'Solo se pueden aprobar nóminas calculadas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        nomina.estado = 'aprobada'
        nomina.save()
        
        return Response({
            'mensaje': 'Nómina aprobada exitosamente',
            'nomina': NominaSimpleDetailSerializer(nomina).data
        })
    
    @extend_schema(
        summary="Marcar como pagada",
        description="Cambia el estado de la nómina a pagada"
    )
    @action(detail=True, methods=['post'])
    def pagar(self, request, pk=None):
        """Marca la nómina como pagada"""
        nomina = self.get_object()
        
        if nomina.estado != 'aprobada':
            return Response(
                {'error': 'Solo se pueden pagar nóminas aprobadas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        nomina.estado = 'pagada'
        nomina.fecha_pago = timezone.now().date()
        nomina.save()
        
        # TODO: Actualizar cuotas de préstamos si aplica
        
        return Response({
            'mensaje': 'Nómina marcada como pagada',
            'nomina': NominaSimpleDetailSerializer(nomina).data
        })
    
    @extend_schema(
        summary="Anular nómina",
        description="Anula la nómina (no se puede deshacer)"
    )
    @action(detail=True, methods=['post'])
    def anular(self, request, pk=None):
        """Anula la nómina"""
        nomina = self.get_object()
        
        if nomina.estado == 'anulada':
            return Response(
                {'error': 'La nómina ya está anulada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        nomina.estado = 'anulada'
        nomina.save()
        
        return Response({
            'mensaje': 'Nómina anulada exitosamente',
            'nomina': NominaSimpleDetailSerializer(nomina).data
        })
    
    @extend_schema(
        summary="Nóminas por período",
        parameters=[
            OpenApiParameter(name='periodo_inicio', description='Fecha inicio', required=True, type=str),
            OpenApiParameter(name='periodo_fin', description='Fecha fin', required=True, type=str),
        ]
    )
    @action(detail=False, methods=['get'])
    def por_periodo(self, request):
        """Lista nóminas de un período específico"""
        periodo_inicio = request.query_params.get('periodo_inicio')
        periodo_fin = request.query_params.get('periodo_fin')
        
        if not periodo_inicio or not periodo_fin:
            return Response(
                {'error': 'Se requieren periodo_inicio y periodo_fin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            periodo_inicio=periodo_inicio,
            periodo_fin=periodo_fin
        ).exclude(estado='anulada')
        
        serializer = NominaSimpleListSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Estadísticas de nóminas",
        description="Retorna estadísticas generales de nóminas"
    )
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Retorna estadísticas de nóminas"""
        from django.db.models import Sum, Avg, Count
        from django.db.models.functions import Coalesce
        from decimal import Decimal
        
        queryset = self.get_queryset().exclude(estado='anulada')
        
        # Calcular estadísticas
        stats = queryset.aggregate(
            total_nominas=Count('id'),
            total_pagado=Coalesce(Sum('total_pagar'), Decimal('0')),
            promedio_por_nomina=Coalesce(Avg('total_pagar'), Decimal('0')),
            total_devengado=Coalesce(Sum('total_devengado'), Decimal('0')),
            total_deducciones=Coalesce(Sum('total_deducciones'), Decimal('0')),
        )
        
        # Empleados/contratos con nómina
        empleados_con_nomina = queryset.values('contrato__empleado').distinct().count()
        
        # Estadísticas por estado
        por_estado = queryset.values('estado').annotate(
            cantidad=Count('id'),
            total=Coalesce(Sum('total_pagar'), Decimal('0'))
        )
        
        return Response({
            'total_nominas': stats['total_nominas'],
            'total_pagado': float(stats['total_pagado']),
            'promedio_por_nomina': float(stats['promedio_por_nomina']),
            'total_devengado': float(stats['total_devengado']),
            'total_deducciones': float(stats['total_deducciones']),
            'empleados_con_nomina': empleados_con_nomina,
            'por_estado': list(por_estado)
        })


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: NÓMINA ITEM
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Items'])
class NominaItemViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para items de nómina.
    
    Representa el trabajo realizado (producción) asociado a una nómina.
    """
    
    queryset = NominaItem.objects.select_related('item', 'nomina').all()
    serializer_class = NominaItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['nomina', 'item']
    search_fields = ['item__nombre']
    ordering = ['item__nombre']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return NominaItemCreateSerializer
        return NominaItemSerializer
    
    def perform_create(self, serializer):
        """Al crear, copiar el valor unitario del item"""
        item = serializer.validated_data['item']
        valor_unitario = serializer.validated_data.get('valor_unitario', item.precio_unitario)
        serializer.save(
            organization=self.request.user.organization,
            valor_unitario=valor_unitario
        )


# ══════════════════════════════════════════════════════════════════════════════
# VIEWSET: NÓMINA CONCEPTO
# ══════════════════════════════════════════════════════════════════════════════

@extend_schema(tags=['Nómina - Conceptos'])
class NominaConceptoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para conceptos de nómina.
    
    Almacena los devengados y deducciones calculados para cada nómina.
    """
    
    queryset = NominaConcepto.objects.select_related('concepto', 'nomina').all()
    serializer_class = NominaConceptoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['nomina', 'concepto', 'tipo']
    search_fields = ['concepto__nombre', 'concepto__codigo']
    ordering = ['tipo', 'concepto__orden']
