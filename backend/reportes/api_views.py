"""
API Views del Sistema de Reportes Multi-Módulo
==============================================

Vistas de la API REST para el sistema de reportes que permite
generar reportes de cualquier módulo del sistema.

Autor: Sistema CorteSec
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, Http404
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import datetime, timedelta
import json

from .models import ModuloReporte, ReporteGenerado, ConfiguracionReporte, LogReporte
from .serializers import (
    ModuloReporteSerializer, ModuloReporteDetalleSerializer,
    ReporteGeneradoSerializer, ReporteGeneradoListSerializer, ReporteGeneradoCreateSerializer,
    ConfiguracionReporteSerializer, LogReporteSerializer, EstadisticasReporteSerializer,
    GenerarReporteRequestSerializer, CamposModeloSerializer
)
from .views import _procesar_reporte  # Importar función de procesamiento
from core.mixins import MultiTenantViewSetMixin


def _user_organization(user):
    """Helper para obtener organization desde user o profile (compatibilidad)."""
    org = getattr(user, 'organization', None)
    if org:
        return org
    profile = getattr(user, 'profile', None)
    if profile and getattr(profile, 'organization', None):
        return profile.organizacion
    return None


class ModuloReporteViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para módulos de reporte
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'codigo']
    filterset_fields = ['activo', 'app_name']
    ordering_fields = ['nombre', 'orden', 'created_at']
    ordering = ['orden', 'nombre']

    def get_queryset(self):
        org = _user_organization(self.request.user)
        if not org:
            return ModuloReporte.objects.none()
        return ModuloReporte.objects.filter(organizacion=org)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ModuloReporteDetalleSerializer
        return ModuloReporteSerializer

    def perform_create(self, serializer):
        org = _user_organization(self.request.user)
        serializer.save(
            organizacion=org,
            created_by=self.request.user
        )

    @action(detail=True, methods=['get'])
    def campos(self, request, pk=None):
        """
        Obtiene los campos disponibles del modelo
        """
        modulo = self.get_object()
        model_class = modulo.get_model_class()
        
        if not model_class:
            return Response(
                {'error': 'Modelo no disponible'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campos = []
        for field in model_class._meta.get_fields():
            if hasattr(field, 'verbose_name'):
                field_type = type(field).__name__
                
                campo_info = {
                    'nombre': field.name,
                    'label': str(field.verbose_name),
                    'tipo': field_type,
                    'filtrable': field_type in [
                        'CharField', 'DateField', 'DateTimeField',
                        'BooleanField', 'IntegerField', 'DecimalField',
                        'ForeignKey'
                    ],
                    'ordenable': True,
                    'requerido': not field.blank if hasattr(field, 'blank') else False
                }
                
                # Agregar opciones para campos ForeignKey
                if field_type == 'ForeignKey':
                    try:
                        opciones = list(field.related_model.objects.values('id', 'name')[:100])
                        campo_info['opciones'] = opciones
                    except:
                        campo_info['opciones'] = []
                
                campos.append(campo_info)
        
        return Response(campos)

    @action(detail=True, methods=['get'])
    def valores_campo(self, request, pk=None):
        """
        Obtiene valores únicos de un campo específico
        """
        modulo = self.get_object()
        campo = request.query_params.get('campo')
        
        if not campo:
            return Response(
                {'error': 'Parámetro campo requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = modulo.get_queryset_base()
        if not queryset:
            return Response(
                {'error': 'Queryset no disponible'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            valores = list(
                queryset.values_list(campo, flat=True)
                .distinct()
                .order_by(campo)[:100]
            )
            # Filtrar nulos y convertir a string
            valores = [str(v) for v in valores if v is not None]
            
            return Response({'valores': valores})
        
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo valores: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """
        Estadísticas específicas del módulo
        """
        modulo = self.get_object()
        reportes = modulo.reportes_generados.all()
        
        estadisticas = {
            'total_reportes': reportes.count(),
            'reportes_completados': reportes.filter(estado='completado').count(),
            'reportes_error': reportes.filter(estado='error').count(),
            'reportes_pendientes': reportes.filter(estado__in=['pendiente', 'procesando']).count(),
            'total_descargas': sum(r.veces_descargado for r in reportes),
            'reporte_mas_descargado': reportes.order_by('-veces_descargado').first().titulo if reportes.exists() else None,
        }
        
        return Response(estadisticas)


class ReporteGeneradoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para reportes generados
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['titulo', 'descripcion']
    filterset_fields = ['estado', 'formato', 'modulo']
    ordering_fields = ['created_at', 'titulo', 'estado', 'veces_descargado']
    ordering = ['-created_at']

    def get_queryset(self):
        org = _user_organization(self.request.user)
        if not org:
            return ReporteGenerado.objects.none()
        return ReporteGenerado.objects.filter(
            organizacion=org
        ).select_related('modulo', 'generado_por')

    def get_serializer_class(self):
        if self.action == 'create':
            return ReporteGeneradoCreateSerializer
        elif self.action == 'list':
            return ReporteGeneradoListSerializer
        return ReporteGeneradoSerializer

    @action(detail=True, methods=['post'])
    def regenerar(self, request, pk=None):
        """
        Regenera un reporte existente
        """
        reporte = self.get_object()
        
        # Crear nuevo reporte basado en el existente
        org = _user_organization(request.user)
        nuevo_reporte = ReporteGenerado.objects.create(
            organizacion=org,
            modulo=reporte.modulo,
            titulo=f"{reporte.titulo} (Regenerado)",
            descripcion=reporte.descripcion,
            formato=reporte.formato,
            filtros_aplicados=reporte.filtros_aplicados,
            columnas_seleccionadas=reporte.columnas_seleccionadas,
            ordenamiento=reporte.ordenamiento,
            fecha_inicio=reporte.fecha_inicio,
            fecha_fin=reporte.fecha_fin,
            generado_por=request.user,
            estado='procesando'
        )
        
        try:
            # Procesar el nuevo reporte
            _procesar_reporte(nuevo_reporte)
            
            # Log de actividad
            LogReporte.objects.create(
                organizacion=org,
                usuario=request.user,
                accion='generar',
                modulo=reporte.modulo,
                reporte=nuevo_reporte,
                descripcion=f"Reporte regenerado desde '{reporte.titulo}'",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            serializer = self.get_serializer(nuevo_reporte)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            nuevo_reporte.marcar_error(str(e))
            return Response(
                {'error': f'Error regenerando reporte: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def progreso(self, request, pk=None):
        """
        Obtiene el progreso de generación del reporte
        """
        reporte = self.get_object()
        return Response({
            'estado': reporte.estado,
            'progreso': reporte.progreso,
            'mensaje_error': reporte.mensaje_error
        })

    @action(detail=True, methods=['post'])
    def marcar_favorito(self, request, pk=None):
        """
        Marca/desmarca un reporte como favorito del usuario
        """
        # Esta funcionalidad se podría implementar con un modelo adicional
        # de favoritos por usuario
        return Response({'message': 'Funcionalidad por implementar'})


class ConfiguracionReporteViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para configuraciones de reporte
    """
    serializer_class = ConfiguracionReporteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    filterset_fields = ['modulo', 'es_publica', 'es_favorita']
    ordering_fields = ['nombre', 'veces_usada', 'created_at']
    ordering = ['-es_favorita', '-veces_usada', 'nombre']

    def get_queryset(self):
        # Configuraciones propias + públicas de la organización
        org = _user_organization(self.request.user)
        if not org:
            return ConfiguracionReporte.objects.none()
        return ConfiguracionReporte.objects.filter(
            Q(organizacion=org) &
            (Q(created_by=self.request.user) | Q(es_publica=True))
        ).select_related('modulo', 'created_by')

    @action(detail=True, methods=['post'])
    def usar(self, request, pk=None):
        """
        Incrementa el contador de uso de una configuración
        """
        configuracion = self.get_object()
        configuracion.incrementar_uso()
        
        return Response({
            'message': 'Uso registrado',
            'veces_usada': configuracion.veces_usada
        })

    @action(detail=True, methods=['post'])
    def clonar(self, request, pk=None):
        """
        Clona una configuración para el usuario actual
        """
        configuracion_original = self.get_object()
        
        # Crear copia
        org = _user_organization(request.user)
        nueva_configuracion = ConfiguracionReporte.objects.create(
            organizacion=org,
            modulo=configuracion_original.modulo,
            nombre=f"{configuracion_original.nombre} (Copia)",
            descripcion=configuracion_original.descripcion,
            filtros=configuracion_original.filtros,
            columnas=configuracion_original.columnas,
            ordenamiento=configuracion_original.ordenamiento,
            formato_preferido=configuracion_original.formato_preferido,
            es_publica=False,
            created_by=request.user
        )
        
        serializer = self.get_serializer(nueva_configuracion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LogReporteViewSet(MultiTenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para logs de reportes
    """
    serializer_class = LogReporteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['descripcion']
    filterset_fields = ['accion', 'modulo', 'usuario']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        org = _user_organization(self.request.user)
        if not org:
            return LogReporte.objects.none()
        return LogReporte.objects.filter(
            organizacion=org
        ).select_related('usuario', 'modulo', 'reporte')


class EstadisticasReporteAPIView(APIView):
    """
    API para estadísticas generales del sistema de reportes
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        organization = request.user.profile.organizacion
        
        # Estadísticas básicas
        total_modulos = ModuloReporte.objects.filter(
            organizacion=organization, 
            activo=True
        ).count()
        
        reportes = ReporteGenerado.objects.filter(organizacion=organization)
        total_reportes = reportes.count()
        reportes_hoy = reportes.filter(created_at__date=timezone.now().date()).count()
        reportes_mes = reportes.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).count()
        
        reportes_completados = reportes.filter(estado='completado').count()
        reportes_error = reportes.filter(estado='error').count()
        reportes_pendientes = reportes.filter(estado__in=['pendiente', 'procesando']).count()
        
        # Estadísticas por formato
        reportes_por_formato = dict(
            reportes.values_list('formato').annotate(count=Count('id'))
        )
        
        # Estadísticas por módulo
        reportes_por_modulo = dict(
            reportes.select_related('modulo')
            .values_list('modulo__nombre')
            .annotate(count=Count('id'))
        )
        
        # Actividad reciente (últimos 10 logs)
        actividad_reciente = LogReporte.objects.filter(
            organizacion=organization
        ).select_related('usuario', 'modulo', 'reporte').order_by('-timestamp')[:10]
        
        # Reportes más descargados
        reportes_populares = reportes.filter(
            estado='completado'
        ).order_by('-veces_descargado')[:5]
        
        # Serializar datos
        estadisticas = {
            'total_modulos': total_modulos,
            'total_reportes': total_reportes,
            'reportes_hoy': reportes_hoy,
            'reportes_mes': reportes_mes,
            'reportes_completados': reportes_completados,
            'reportes_error': reportes_error,
            'reportes_pendientes': reportes_pendientes,
            'reportes_por_formato': reportes_por_formato,
            'reportes_por_modulo': reportes_por_modulo,
            'actividad_reciente': LogReporteSerializer(actividad_reciente, many=True).data,
            'reportes_populares': ReporteGeneradoListSerializer(reportes_populares, many=True).data,
        }
        
        return Response(estadisticas)


class GenerarReporteAPIView(APIView):
    """
    API para generar reportes
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GenerarReporteRequestSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        
        # Obtener módulo
        modulo = get_object_or_404(
            ModuloReporte,
            id=data['modulo_id'],
            organizacion=request.user.profile.organizacion,
            activo=True
        )
        
        # Crear reporte
        reporte = ReporteGenerado.objects.create(
            organizacion=request.user.profile.organizacion,
            modulo=modulo,
            titulo=data['titulo'],
            descripcion=data.get('descripcion', ''),
            formato=data['formato'],
            filtros_aplicados=data.get('filtros', {}),
            columnas_seleccionadas=data.get('columnas', []),
            ordenamiento=data.get('ordenamiento', []),
            fecha_inicio=data.get('fecha_inicio'),
            fecha_fin=data.get('fecha_fin'),
            generado_por=request.user,
            estado='procesando'
        )
        
        try:
            # Procesar reporte
            _procesar_reporte(reporte)
            
            # Log de actividad
            LogReporte.objects.create(
                organizacion=request.user.profile.organizacion,
                usuario=request.user,
                accion='generar',
                modulo=modulo,
                reporte=reporte,
                descripcion=f"Reporte '{data['titulo']}' generado via API",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            serializer = ReporteGeneradoSerializer(reporte)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            reporte.marcar_error(str(e))
            
            LogReporte.objects.create(
                organizacion=request.user.profile.organizacion,
                usuario=request.user,
                accion='error',
                modulo=modulo,
                reporte=reporte,
                descripcion=f"Error generando reporte: {str(e)}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return Response(
                {'error': f'Error generando reporte: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CamposModeloAPIView(APIView):
    """
    API para obtener campos de un modelo
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        modulo = get_object_or_404(
            ModuloReporte,
            id=pk,
            organizacion=request.user.profile.organizacion
        )
        
        model_class = modulo.get_model_class()
        if not model_class:
            return Response(
                {'error': 'Modelo no disponible'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campos = []
        for field in model_class._meta.get_fields():
            if hasattr(field, 'verbose_name'):
                campo_info = {
                    'nombre': field.name,
                    'label': str(field.verbose_name),
                    'tipo': type(field).__name__,
                    'filtrable': True,
                    'ordenable': True,
                    'requerido': not field.blank if hasattr(field, 'blank') else False
                }
                campos.append(campo_info)
        
        return Response(campos)


class ValoresCampoAPIView(APIView):
    """
    API para obtener valores únicos de un campo
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        modulo = get_object_or_404(
            ModuloReporte,
            id=pk,
            organizacion=request.user.profile.organizacion
        )
        
        campo = request.query_params.get('campo')
        if not campo:
            return Response(
                {'error': 'Parámetro campo requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = modulo.get_queryset_base()
        if not queryset:
            return Response(
                {'error': 'Queryset no disponible'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            valores = list(
                queryset.values_list(campo, flat=True)
                .distinct()
                .order_by(campo)[:100]
            )
            valores = [str(v) for v in valores if v is not None]
            
            return Response({'valores': valores})
        
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class DescargarReporteAPIView(APIView):
    """
    API para descargar reportes
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        reporte = get_object_or_404(
            ReporteGenerado,
            id=pk,
            organizacion=request.user.profile.organizacion
        )
        
        if not reporte.esta_disponible:
            raise Http404("Reporte no disponible")
        
        # Incrementar contador
        reporte.incrementar_descarga()
        
        # Log
        LogReporte.objects.create(
            organizacion=request.user.profile.organizacion,
            usuario=request.user,
            accion='descargar',
            modulo=reporte.modulo,
            reporte=reporte,
            descripcion=f"Descarga via API del reporte '{reporte.titulo}'",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Devolver información del archivo
        return Response({
            'nombre_archivo': reporte.nombre_archivo,
            'tamaño': reporte.tamaño_archivo,
            'formato': reporte.formato,
            'url_descarga': request.build_absolute_uri(reporte.get_download_url())
        })


class ProgresoReporteAPIView(APIView):
    """
    API para obtener el progreso de un reporte
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        reporte = get_object_or_404(
            ReporteGenerado,
            id=pk,
            organizacion=request.user.profile.organizacion
        )
        
        return Response({
            'id': str(reporte.id),
            'estado': reporte.estado,
            'progreso': reporte.progreso,
            'mensaje_error': reporte.mensaje_error,
            'esta_disponible': reporte.esta_disponible,
            'url_descarga': reporte.get_download_url() if reporte.esta_disponible else None
        })
