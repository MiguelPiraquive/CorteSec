from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from datetime import datetime, timedelta

from .models import PlanCuentas, ComprobanteContable, MovimientoContable, FlujoCaja
from .serializers import (
    PlanCuentasSerializer, ComprobanteContableSerializer,
    MovimientoContableSerializer, FlujoCajaSerializer
)
from core.mixins import MultiTenantViewSetMixin


class PlanCuentasViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar Plan de Cuentas"""
    queryset = PlanCuentas.objects.all()
    serializer_class = PlanCuentasSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_cuenta', 'naturaleza', 'activa', 'acepta_movimientos', 'nivel']
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering_fields = ['codigo', 'nombre', 'nivel', 'fecha_creacion']
    ordering = ['codigo']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtros adicionales por query params
        activa = self.request.query_params.get('activa')
        if activa is not None:
            queryset = queryset.filter(activa=activa.lower() == 'true')
        
        nivel = self.request.query_params.get('nivel')
        if nivel:
            queryset = queryset.filter(nivel=nivel)
            
        return queryset

    @action(detail=False, methods=['get'])
    def jerarquia(self, request):
        """Obtener cuentas organizadas en jerarquía"""
        cuentas_raiz = self.get_queryset().filter(cuenta_padre__isnull=True)
        def construir_jerarquia(cuenta):
            serializer = self.get_serializer(cuenta)
            data = serializer.data
            subcuentas = cuenta.subcuentas.filter(activa=True)
            if subcuentas.exists():
                data['subcuentas'] = [construir_jerarquia(sub) for sub in subcuentas]
            return data
        
        jerarquia = [construir_jerarquia(cuenta) for cuenta in cuentas_raiz]
        return Response(jerarquia)

    @action(detail=True, methods=['get'])
    def saldo(self, request, pk=None):
        """Obtener saldo actual de una cuenta"""
        cuenta = self.get_object()
        saldo = cuenta.calcular_saldo()
        return Response({
            'cuenta_id': cuenta.id,
            'codigo': cuenta.codigo,
            'nombre': cuenta.nombre,
            'saldo_actual': saldo,
            'naturaleza': cuenta.naturaleza
        })

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas del plan de cuentas"""
        queryset = self.get_queryset()
        stats = {
            'total_cuentas': queryset.count(),
            'cuentas_activas': queryset.filter(activa=True).count(),
            'cuentas_por_tipo': {
                tipo[0]: queryset.filter(tipo_cuenta=tipo[0]).count()
                for tipo in PlanCuentas.TIPOS_CUENTA
            },
            'cuentas_por_naturaleza': {
                nat[0]: queryset.filter(naturaleza=nat[0]).count()
                for nat in PlanCuentas.NATURALEZA_CHOICES
            },
            'cuentas_con_movimientos': queryset.filter(acepta_movimientos=True).count()
        }
        return Response(stats)


class ComprobanteContableViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar Comprobantes Contables"""
    queryset = ComprobanteContable.objects.all()
    serializer_class = ComprobanteContableSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_comprobante', 'estado', 'fecha']
    search_fields = ['numero', 'descripcion']
    ordering_fields = ['numero', 'fecha', 'fecha_creacion']
    ordering = ['-fecha', '-fecha_creacion']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=['post'])
    def contabilizar(self, request, pk=None):
        """Contabilizar un comprobante"""
        comprobante = self.get_object()
        
        if comprobante.estado == 'contabilizado':
            return Response(
                {'error': 'El comprobante ya está contabilizado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que esté cuadrado
        if not comprobante.esta_cuadrado():
            return Response(
                {'error': 'El comprobante no está cuadrado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comprobante.estado = 'contabilizado'
        comprobante.contabilizado_por = request.user
        comprobante.fecha_contabilizacion = timezone.now()
        comprobante.save()
        
        return Response({'message': 'Comprobante contabilizado correctamente'})

    @action(detail=True, methods=['post'])
    def anular(self, request, pk=None):
        """Anular un comprobante"""
        comprobante = self.get_object()
        
        if comprobante.estado == 'anulado':
            return Response(
                {'error': 'El comprobante ya está anulado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comprobante.estado = 'anulado'
        comprobante.save()
        
        return Response({'message': 'Comprobante anulado correctamente'})

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de comprobantes"""
        queryset = self.get_queryset()
        
        # Filtros de fecha para estadísticas
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        stats = {
            'total_comprobantes': queryset.count(),
            'comprobantes_mes': queryset.filter(fecha__gte=inicio_mes).count(),
            'comprobantes_por_estado': {
                estado[0]: queryset.filter(estado=estado[0]).count()
                for estado in ComprobanteContable.ESTADOS
            },
            'comprobantes_por_tipo': {
                tipo[0]: queryset.filter(tipo_comprobante=tipo[0]).count()
                for tipo in ComprobanteContable.TIPOS_COMPROBANTE
            },
            'valor_total_mes': queryset.filter(
                fecha__gte=inicio_mes,
                estado='contabilizado'
            ).aggregate(total=Sum('total_debito'))['total'] or 0
        }
        return Response(stats)


class MovimientoContableViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar Movimientos Contables"""
    queryset = MovimientoContable.objects.select_related('comprobante', 'cuenta')
    serializer_class = MovimientoContableSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['comprobante', 'cuenta', 'comprobante__estado']
    search_fields = ['descripcion', 'tercero', 'cuenta__nombre', 'comprobante__numero']
    ordering_fields = ['comprobante__fecha', 'valor_debito', 'valor_credito']
    ordering = ['-comprobante__fecha']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por cuenta específica
        cuenta_id = self.request.query_params.get('cuenta_id')
        if cuenta_id:
            queryset = queryset.filter(cuenta_id=cuenta_id)
            
        # Filtrar por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            queryset = queryset.filter(comprobante__fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(comprobante__fecha__lte=fecha_hasta)
            
        return queryset

    @action(detail=False, methods=['get'])
    def por_cuenta(self, request):
        """Obtener movimientos agrupados por cuenta"""
        cuenta_id = request.query_params.get('cuenta_id')
        if not cuenta_id:
            return Response(
                {'error': 'Se requiere el parámetro cuenta_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        movimientos = self.get_queryset().filter(cuenta_id=cuenta_id)
        serializer = self.get_serializer(movimientos, many=True)
        
        # Calcular totales
        totales = movimientos.aggregate(
            total_debitos=Sum('valor_debito'),
            total_creditos=Sum('valor_credito')
        )
        
        return Response({
            'movimientos': serializer.data,
            'totales': totales,
            'saldo': (totales['total_debitos'] or 0) - (totales['total_creditos'] or 0)
        })

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de movimientos"""
        queryset = self.get_queryset()
        
        # Filtros de fecha
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        stats = {
            'total_movimientos': queryset.count(),
            'movimientos_mes': queryset.filter(comprobante__fecha__gte=inicio_mes).count(),
            'total_debitos': queryset.aggregate(total=Sum('valor_debito'))['total'] or 0,
            'total_creditos': queryset.aggregate(total=Sum('valor_credito'))['total'] or 0,
            'movimientos_por_cuenta': queryset.values('cuenta__nombre').annotate(
                total=Count('id')
            ).order_by('-total')[:10]
        }
        return Response(stats)


class FlujoCajaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar Flujo de Caja"""
    queryset = FlujoCaja.objects.all()
    serializer_class = FlujoCajaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_movimiento', 'categoria', 'fecha']
    search_fields = ['descripcion', 'referencia']
    ordering_fields = ['fecha', 'valor']
    ordering = ['-fecha']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtener resumen del flujo de caja"""
        queryset = self.get_queryset()
        
        ingresos = queryset.filter(tipo_movimiento='ingreso').aggregate(
            total=Sum('valor')
        )['total'] or 0
        
        egresos = queryset.filter(tipo_movimiento='egreso').aggregate(
            total=Sum('valor')
        )['total'] or 0
        
        return Response({
            'total_ingresos': ingresos,
            'total_egresos': egresos,
            'flujo_neto': ingresos - egresos,
            'movimientos_count': queryset.count()
        })

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas del flujo de caja"""
        queryset = self.get_queryset()
        
        # Estadísticas por período
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        stats = {
            'total_movimientos': queryset.count(),
            'movimientos_mes': queryset.filter(fecha__gte=inicio_mes).count(),
            'ingresos_por_categoria': queryset.filter(
                tipo_movimiento='ingreso'
            ).values('categoria').annotate(
                total=Sum('valor')
            ).order_by('-total'),
            'egresos_por_categoria': queryset.filter(
                tipo_movimiento='egreso'
            ).values('categoria').annotate(
                total=Sum('valor')
            ).order_by('-total')
        }
        return Response(stats)
