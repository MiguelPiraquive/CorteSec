"""
Vistas API del Sistema de Préstamos
==================================

Vistas para la API REST del sistema de préstamos.
Incluye ViewSets completos con funcionalidades avanzadas.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum, Count, Avg
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal
import django_filters

from .models import TipoPrestamo, Prestamo, PagoPrestamo
from core.mixins import MultiTenantViewSetMixin
from .serializers import (
    TipoPrestamoSerializer, TipoPrestamoListSerializer,
    PrestamoSerializer, PrestamoListSerializer,
    PagoPrestamoSerializer, PagoPrestamoListSerializer,
    PrestamoAprobarSerializer, PrestamoRechazarSerializer,
    PrestamoDesembolsarSerializer, PrestamoCalculadoraSerializer
)


class TipoPrestamoFilter(django_filters.FilterSet):
    """Filtros para tipos de préstamo"""
    
    monto_min = django_filters.NumberFilter(field_name='monto_minimo', lookup_expr='gte')
    monto_max = django_filters.NumberFilter(field_name='monto_maximo', lookup_expr='lte')
    tasa_min = django_filters.NumberFilter(field_name='tasa_interes_minima', lookup_expr='gte')
    tasa_max = django_filters.NumberFilter(field_name='tasa_interes_maxima', lookup_expr='lte')
    plazo_min = django_filters.NumberFilter(field_name='plazo_minimo_meses', lookup_expr='gte')
    plazo_max = django_filters.NumberFilter(field_name='plazo_maximo_meses', lookup_expr='lte')
    
    class Meta:
        model = TipoPrestamo
        fields = {
            'codigo': ['exact', 'icontains'],
            'nombre': ['exact', 'icontains'],
            'activo': ['exact'],
            'requiere_garantia': ['exact'],
            'requiere_aprobacion': ['exact'],
            'permite_prepago': ['exact'],
        }


class TipoPrestamoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para tipos de préstamo"""
    
    queryset = TipoPrestamo.objects.all()
    serializer_class = TipoPrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TipoPrestamoFilter
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering_fields = ['codigo', 'nombre', 'orden', 'created_at']
    ordering = ['orden', 'codigo']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        return self.queryset.filter(organizacion=self.request.user.organizacion)
    
    def get_serializer_class(self):
        """Usar serializador simplificado para listas"""
        if self.action == 'list':
            return TipoPrestamoListSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Asignar organización y usuario al crear"""
        serializer.save(
            organizacion=self.request.user.organizacion,
            created_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Asignar usuario al actualizar"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo tipos activos"""
        queryset = self.get_queryset().filter(activo=True)
        serializer = TipoPrestamoListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activar un tipo de préstamo"""
        tipo = self.get_object()
        tipo.activo = True
        tipo.updated_by = request.user
        tipo.save()
        return Response({'status': 'activated'})
    
    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        """Desactivar un tipo de préstamo"""
        tipo = self.get_object()
        tipo.activo = False
        tipo.updated_by = request.user
        tipo.save()
        return Response({'status': 'deactivated'})
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Estadísticas de un tipo de préstamo"""
        tipo = self.get_object()
        prestamos = tipo.prestamos.all()
        
        stats = {
            'total_prestamos': prestamos.count(),
            'prestamos_activos': prestamos.filter(estado__in=['aprobado', 'desembolsado', 'activo']).count(),
            'prestamos_completados': prestamos.filter(estado='completado').count(),
            'monto_total_prestado': prestamos.aggregate(total=Sum('monto_aprobado'))['total'] or 0,
            'monto_promedio': prestamos.aggregate(promedio=Avg('monto_aprobado'))['promedio'] or 0,
            'distribucion_estados': {},
        }
        
        # Distribución por estados
        for estado_value, estado_label in Prestamo.ESTADO_CHOICES:
            count = prestamos.filter(estado=estado_value).count()
            if count > 0:
                stats['distribucion_estados'][estado_value] = {
                    'label': estado_label,
                    'count': count
                }
        
        return Response(stats)


class PrestamoFilter(django_filters.FilterSet):
    """Filtros para préstamos"""
    
    fecha_desde = django_filters.DateFilter(field_name='fecha_solicitud', lookup_expr='gte')
    fecha_hasta = django_filters.DateFilter(field_name='fecha_solicitud', lookup_expr='lte')
    monto_min = django_filters.NumberFilter(field_name='monto_solicitado', lookup_expr='gte')
    monto_max = django_filters.NumberFilter(field_name='monto_solicitado', lookup_expr='lte')
    empleado_nombre = django_filters.CharFilter(method='filter_empleado_nombre')
    
    class Meta:
        model = Prestamo
        fields = {
            'estado': ['exact', 'in'],
            'tipo_prestamo': ['exact'],
            'tipo_garantia': ['exact'],
            'empleado': ['exact'],
            'solicitado_por': ['exact'],
            'aprobado_por': ['exact'],
        }
    
    def filter_empleado_nombre(self, queryset, name, value):
        """Filtrar por nombre del empleado"""
        return queryset.filter(
            Q(empleado__nombres__icontains=value) |
            Q(empleado__apellidos__icontains=value) |
            Q(empleado__numero_identificacion__icontains=value)
        )


class PrestamoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para préstamos"""
    
    queryset = Prestamo.objects.select_related(
        'empleado', 'tipo_prestamo', 'solicitado_por', 'aprobado_por'
    ).prefetch_related('pagos')
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PrestamoFilter
    search_fields = [
        'numero_prestamo', 'empleado__nombres', 'empleado__apellidos',
        'empleado__numero_identificacion', 'observaciones'
    ]
    ordering_fields = [
        'numero_prestamo', 'fecha_solicitud', 'fecha_aprobacion',
        'monto_solicitado', 'estado'
    ]
    ordering = ['-fecha_solicitud', '-numero_prestamo']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        return self.queryset.filter(organizacion=self.request.user.organizacion)
    
    def get_serializer_class(self):
        """Usar serializador simplificado para listas"""
        if self.action == 'list':
            return PrestamoListSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Asignar organización y usuario al crear"""
        serializer.save(
            organizacion=self.request.user.organizacion,
            solicitado_por=self.request.user,
            created_by=self.request.user
        )
    
    def perform_update(self, serializer):
        """Asignar usuario al actualizar"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar un préstamo"""
        prestamo = self.get_object()
        serializer = PrestamoAprobarSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                prestamo.aprobar(
                    usuario=request.user,
                    monto_aprobado=serializer.validated_data.get('monto_aprobado'),
                    observaciones=serializer.validated_data.get('observaciones')
                )
                return Response({
                    'status': 'approved',
                    'message': _('Préstamo aprobado exitosamente'),
                    'prestamo': PrestamoSerializer(prestamo).data
                })
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar un préstamo"""
        prestamo = self.get_object()
        serializer = PrestamoRechazarSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                prestamo.rechazar(
                    usuario=request.user,
                    motivo=serializer.validated_data['motivo']
                )
                return Response({
                    'status': 'rejected',
                    'message': _('Préstamo rechazado'),
                    'prestamo': PrestamoSerializer(prestamo).data
                })
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def desembolsar(self, request, pk=None):
        """Desembolsar un préstamo"""
        prestamo = self.get_object()
        serializer = PrestamoDesembolsarSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                prestamo.desembolsar(
                    usuario=request.user,
                    fecha_desembolso=serializer.validated_data.get('fecha_desembolso')
                )
                return Response({
                    'status': 'disbursed',
                    'message': _('Préstamo desembolsado exitosamente'),
                    'prestamo': PrestamoSerializer(prestamo).data
                })
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activar un préstamo para inicio de pagos"""
        prestamo = self.get_object()
        
        try:
            prestamo.activar()
            return Response({
                'status': 'activated',
                'message': _('Préstamo activado para pagos'),
                'prestamo': PrestamoSerializer(prestamo).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def cronograma_pagos(self, request, pk=None):
        """Generar cronograma de pagos"""
        prestamo = self.get_object()
        
        if not prestamo.cuota_mensual or prestamo.plazo_meses <= 0:
            return Response(
                {'error': _('El préstamo no tiene información suficiente para generar cronograma')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
                'fecha_pago': fecha_pago.isoformat(),
                'cuota_mensual': float(prestamo.cuota_mensual),
                'capital': float(capital),
                'interes': float(interes),
                'saldo': float(max(saldo, Decimal('0.00')))
            })
            
            # Próxima fecha (aproximadamente 30 días después)
            fecha_pago = fecha_pago.replace(
                month=fecha_pago.month % 12 + 1 if fecha_pago.month < 12 else 1,
                year=fecha_pago.year + (1 if fecha_pago.month == 12 else 0)
            )
        
        return Response({
            'prestamo': prestamo.numero_prestamo,
            'cronograma': cronograma,
            'resumen': {
                'total_cuotas': len(cronograma),
                'cuota_mensual': float(prestamo.cuota_mensual),
                'total_intereses': sum(c['interes'] for c in cronograma),
                'total_a_pagar': float(prestamo.calcular_total_con_intereses())
            }
        })
    
    @action(detail=True, methods=['get'])
    def historial_pagos(self, request, pk=None):
        """Obtener historial de pagos del préstamo"""
        prestamo = self.get_object()
        pagos = prestamo.pagos.all().order_by('-fecha_pago', '-created_at')
        serializer = PagoPrestamoListSerializer(pagos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard de préstamos"""
        queryset = self.get_queryset()
        
        # Estadísticas generales
        total_prestamos = queryset.count()
        prestamos_activos = queryset.filter(estado__in=['aprobado', 'desembolsado', 'activo']).count()
        prestamos_pendientes = queryset.filter(estado__in=['solicitado', 'en_revision', 'pendiente']).count()
        prestamos_en_mora = queryset.filter(estado='en_mora').count()
        
        # Montos
        monto_total_prestado = queryset.aggregate(total=Sum('monto_aprobado'))['total'] or 0
        monto_total_pendiente = queryset.aggregate(total=Sum('saldo_pendiente'))['total'] or 0
        monto_total_pagado = queryset.aggregate(total=Sum('total_pagado'))['total'] or 0
        
        # Distribución por estados
        distribucion_estados = {}
        for estado_value, estado_label in Prestamo.ESTADO_CHOICES:
            count = queryset.filter(estado=estado_value).count()
            if count > 0:
                distribucion_estados[estado_value] = {
                    'label': estado_label,
                    'count': count,
                    'porcentaje': round((count / total_prestamos) * 100, 2) if total_prestamos > 0 else 0
                }
        
        # Distribución por tipos
        distribucion_tipos = {}
        for tipo in TipoPrestamo.objects.filter(organizacion=request.user.organizacion):
            count = queryset.filter(tipo_prestamo=tipo).count()
            if count > 0:
                distribucion_tipos[str(tipo.id)] = {
                    'nombre': tipo.nombre,
                    'count': count,
                    'porcentaje': round((count / total_prestamos) * 100, 2) if total_prestamos > 0 else 0
                }
        
        return Response({
            'resumen': {
                'total_prestamos': total_prestamos,
                'prestamos_activos': prestamos_activos,
                'prestamos_pendientes': prestamos_pendientes,
                'prestamos_en_mora': prestamos_en_mora,
                'monto_total_prestado': float(monto_total_prestado),
                'monto_total_pendiente': float(monto_total_pendiente),
                'monto_total_pagado': float(monto_total_pagado),
            },
            'distribucion_estados': distribucion_estados,
            'distribucion_tipos': distribucion_tipos,
        })
    
    @action(detail=False, methods=['post'])
    def calculadora(self, request):
        """Calculadora de préstamos"""
        serializer = PrestamoCalculadoraSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.to_representation(None))
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PagoPrestamoFilter(django_filters.FilterSet):
    """Filtros para pagos de préstamos"""
    
    fecha_desde = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='gte')
    fecha_hasta = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='lte')
    monto_min = django_filters.NumberFilter(field_name='monto_pago', lookup_expr='gte')
    monto_max = django_filters.NumberFilter(field_name='monto_pago', lookup_expr='lte')
    
    class Meta:
        model = PagoPrestamo
        fields = {
            'tipo_pago': ['exact'],
            'metodo_pago': ['exact'],
            'prestamo': ['exact'],
            'prestamo__estado': ['exact'],
            'prestamo__empleado': ['exact'],
            'registrado_por': ['exact'],
        }


class PagoPrestamoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para pagos de préstamos"""
    
    queryset = PagoPrestamo.objects.select_related(
        'prestamo', 'prestamo__empleado', 'prestamo__tipo_prestamo', 'registrado_por'
    )
    serializer_class = PagoPrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PagoPrestamoFilter
    search_fields = [
        'numero_pago', 'comprobante', 'prestamo__numero_prestamo',
        'prestamo__empleado__nombres', 'prestamo__empleado__apellidos'
    ]
    ordering_fields = ['fecha_pago', 'monto_pago', 'created_at']
    ordering = ['-fecha_pago', '-created_at']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        return self.queryset.filter(prestamo__organizacion=self.request.user.organizacion)
    
    def get_serializer_class(self):
        """Usar serializador simplificado para listas"""
        if self.action == 'list':
            return PagoPrestamoListSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Asignar usuario al crear"""
        prestamo = serializer.validated_data['prestamo']
        
        # Calcular saldos
        saldo_anterior = prestamo.saldo_pendiente
        monto_pago = serializer.validated_data['monto_pago']
        saldo_nuevo = saldo_anterior - monto_pago
        
        serializer.save(
            registrado_por=self.request.user,
            saldo_anterior=saldo_anterior,
            saldo_nuevo=saldo_nuevo
        )
    
    @action(detail=False, methods=['get'])
    def resumen_mensual(self, request):
        """Resumen de pagos mensuales"""
        from django.db.models import TruncMonth
        
        queryset = self.get_queryset()
        
        # Filtrar por fecha si se proporciona
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            queryset = queryset.filter(fecha_pago__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_pago__lte=fecha_hasta)
        
        resumen = queryset.annotate(
            mes=TruncMonth('fecha_pago')
        ).values('mes').annotate(
            total_pagos=Count('id'),
            monto_total=Sum('monto_pago'),
            monto_capital=Sum('monto_capital'),
            monto_interes=Sum('monto_interes'),
            monto_mora=Sum('monto_mora')
        ).order_by('mes')
        
        return Response(list(resumen))
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de pagos"""
        queryset = self.get_queryset()
        
        # Estadísticas generales
        total_pagos = queryset.count()
        monto_total = queryset.aggregate(total=Sum('monto_pago'))['total'] or 0
        monto_promedio = queryset.aggregate(promedio=Avg('monto_pago'))['promedio'] or 0
        
        # Distribución por tipo de pago
        distribucion_tipos = {}
        for tipo_value, tipo_label in PagoPrestamo.TIPO_PAGO_CHOICES:
            count = queryset.filter(tipo_pago=tipo_value).count()
            monto = queryset.filter(tipo_pago=tipo_value).aggregate(total=Sum('monto_pago'))['total'] or 0
            if count > 0:
                distribucion_tipos[tipo_value] = {
                    'label': tipo_label,
                    'count': count,
                    'monto': float(monto),
                    'porcentaje': round((count / total_pagos) * 100, 2) if total_pagos > 0 else 0
                }
        
        # Distribución por método de pago
        distribucion_metodos = {}
        for metodo_value, metodo_label in PagoPrestamo.METODO_PAGO_CHOICES:
            count = queryset.filter(metodo_pago=metodo_value).count()
            monto = queryset.filter(metodo_pago=metodo_value).aggregate(total=Sum('monto_pago'))['total'] or 0
            if count > 0:
                distribucion_metodos[metodo_value] = {
                    'label': metodo_label,
                    'count': count,
                    'monto': float(monto),
                    'porcentaje': round((count / total_pagos) * 100, 2) if total_pagos > 0 else 0
                }
        
        return Response({
            'resumen': {
                'total_pagos': total_pagos,
                'monto_total': float(monto_total),
                'monto_promedio': float(monto_promedio),
            },
            'distribucion_tipos': distribucion_tipos,
            'distribucion_metodos': distribucion_metodos,
        })
