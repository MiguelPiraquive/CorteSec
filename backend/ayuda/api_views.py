"""
API Views para el Sistema de Ayuda
==================================

ViewSets REST para gestión completa del centro de ayuda.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-07-29
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, F
from django.utils import timezone

from .models import (
    TipoAyuda, CategoriaAyuda, ArticuloAyuda, FAQ, 
    SolicitudSoporte, RespuestaSoporte, Tutorial, 
    PasoTutorial, ProgresoTutorial, RecursoAyuda
)
from .serializers import (
    TipoAyudaSerializer, CategoriaAyudaSerializer, ArticuloAyudaSerializer,
    FAQSerializer, SolicitudSoporteSerializer, RespuestaSoporteSerializer,
    TutorialSerializer, PasoTutorialSerializer, ProgresoTutorialSerializer,
    RecursoAyudaSerializer
)
from core.mixins import MultiTenantViewSetMixin


class AyudaPagination(PageNumberPagination):
    """Paginación personalizada para ayuda"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class TipoAyudaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para tipos de ayuda"""
    queryset = TipoAyuda.objects.all()
    serializer_class = TipoAyudaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['orden', 'nombre', 'fecha_creacion']
    ordering = ['orden', 'nombre']

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo tipos activos"""
        tipos = self.queryset.filter(activo=True).order_by('orden', 'nombre')
        serializer = self.get_serializer(tipos, many=True)
        return Response(serializer.data)


class CategoriaAyudaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para categorías de ayuda"""
    queryset = CategoriaAyuda.objects.all()
    serializer_class = CategoriaAyudaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activa']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['orden', 'nombre', 'fecha_creacion']
    ordering = ['orden', 'nombre']

    @action(detail=False, methods=['get'])
    def activas(self, request):
        """Obtener solo categorías activas"""
        categorias = self.queryset.filter(activa=True).order_by('orden', 'nombre')
        serializer = self.get_serializer(categorias, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def articulos(self, request, pk=None):
        """Obtener artículos de una categoría"""
        categoria = self.get_object()
        articulos = categoria.articulos.filter(activo=True, publicado=True)
        
        # Aplicar filtros de búsqueda si existen
        search = request.query_params.get('search', None)
        if search:
            articulos = articulos.filter(
                Q(titulo__icontains=search) | 
                Q(contenido__icontains=search) |
                Q(tags__icontains=search)
            )
        
        page = self.paginate_queryset(articulos)
        if page is not None:
            serializer = ArticuloAyudaSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = ArticuloAyudaSerializer(articulos, many=True)
        return Response(serializer.data)


class ArticuloAyudaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para artículos de ayuda"""
    queryset = ArticuloAyuda.objects.select_related('categoria', 'autor').prefetch_related('recursos')
    serializer_class = ArticuloAyudaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'es_faq', 'publicado', 'activo']
    search_fields = ['titulo', 'contenido', 'tags']
    ordering_fields = ['orden', 'titulo', 'fecha_creacion', 'vistas']
    ordering = ['orden', '-fecha_creacion']

    def get_queryset(self):
        """Filtrar artículos según permisos"""
        if self.action in ['list', 'retrieve']:
            return self.queryset.filter(activo=True, publicado=True)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        """Incrementar vistas al ver un artículo"""
        instance = self.get_object()
        # Incrementar contador de vistas
        ArticuloAyuda.objects.filter(id=instance.id).update(vistas=F('vistas') + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def populares(self, request):
        """Obtener artículos más populares"""
        articulos = self.get_queryset().order_by('-vistas')[:10]
        serializer = self.get_serializer(articulos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recientes(self, request):
        """Obtener artículos más recientes"""
        articulos = self.get_queryset().order_by('-fecha_creacion')[:10]
        serializer = self.get_serializer(articulos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """Búsqueda avanzada de artículos"""
        query = request.query_params.get('q', '')
        categoria_id = request.query_params.get('categoria', None)
        
        articulos = self.get_queryset()
        
        if query:
            articulos = articulos.filter(
                Q(titulo__icontains=query) | 
                Q(contenido__icontains=query) |
                Q(tags__icontains=query)
            )
        
        if categoria_id:
            articulos = articulos.filter(categoria_id=categoria_id)
        
        page = self.paginate_queryset(articulos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(articulos, many=True)
        return Response(serializer.data)


class FAQViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para FAQs"""
    queryset = FAQ.objects.select_related('categoria')
    serializer_class = FAQSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'activo']
    search_fields = ['pregunta', 'respuesta', 'tags']
    ordering_fields = ['orden', 'fecha_creacion']
    ordering = ['orden', '-fecha_creacion']

    def get_queryset(self):
        """Filtrar FAQs activos"""
        if self.action in ['list', 'retrieve']:
            return self.queryset.filter(activo=True)
        return self.queryset


class SolicitudSoporteViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para solicitudes de soporte"""
    queryset = SolicitudSoporte.objects.select_related('usuario').prefetch_related('respuestas')
    serializer_class = SolicitudSoporteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'prioridad', 'categoria']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'fecha_actualizacion', 'prioridad']
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        """Filtrar solicitudes según usuario"""
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(usuario=user)

    def perform_create(self, serializer):
        """Asignar usuario actual al crear solicitud"""
        serializer.save(usuario=self.request.user)

    @action(detail=True, methods=['post'])
    def responder(self, request, pk=None):
        """Agregar respuesta a solicitud"""
        solicitud = self.get_object()
        contenido = request.data.get('contenido', '')
        
        if not contenido:
            return Response(
                {'error': 'El contenido de la respuesta es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        respuesta = RespuestaSoporte.objects.create(
            solicitud=solicitud,
            usuario=request.user,
            contenido=contenido
        )
        
        # Actualizar estado de la solicitud
        solicitud.estado = 'respondido'
        solicitud.fecha_actualizacion = timezone.now()
        solicitud.save()
        
        serializer = RespuestaSoporteSerializer(respuesta)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de solicitud"""
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado', '')
        
        if nuevo_estado not in dict(SolicitudSoporte.ESTADOS):
            return Response(
                {'error': 'Estado inválido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        solicitud.estado = nuevo_estado
        solicitud.fecha_actualizacion = timezone.now()
        solicitud.save()
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data)


class TutorialViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para tutoriales"""
    queryset = Tutorial.objects.select_related('categoria').prefetch_related('pasos')
    serializer_class = TutorialSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'nivel', 'activo']
    search_fields = ['titulo', 'descripcion', 'tags']
    ordering_fields = ['orden', 'titulo', 'fecha_creacion']
    ordering = ['orden', '-fecha_creacion']

    def get_queryset(self):
        """Filtrar tutoriales activos"""
        if self.action in ['list', 'retrieve']:
            return self.queryset.filter(activo=True)
        return self.queryset

    @action(detail=True, methods=['get'])
    def progreso(self, request, pk=None):
        """Obtener progreso del usuario en el tutorial"""
        tutorial = self.get_object()
        progreso, created = ProgresoTutorial.objects.get_or_create(
            tutorial=tutorial,
            usuario=request.user
        )
        serializer = ProgresoTutorialSerializer(progreso)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_completado(self, request, pk=None):
        """Marcar tutorial como completado"""
        tutorial = self.get_object()
        progreso, created = ProgresoTutorial.objects.get_or_create(
            tutorial=tutorial,
            usuario=request.user
        )
        progreso.completado = True
        progreso.fecha_completado = timezone.now()
        progreso.save()
        
        serializer = ProgresoTutorialSerializer(progreso)
        return Response(serializer.data)


class RecursoAyudaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API ViewSet para recursos de ayuda"""
    queryset = RecursoAyuda.objects.all()
    serializer_class = RecursoAyudaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AyudaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'formato']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['fecha_creacion', 'descargas', 'nombre']
    ordering = ['-fecha_creacion']

    @action(detail=True, methods=['post'])
    def descargar(self, request, pk=None):
        """Incrementar contador de descargas"""
        recurso = self.get_object()
        RecursoAyuda.objects.filter(id=recurso.id).update(descargas=F('descargas') + 1)
        
        return Response({
            'message': 'Descarga registrada',
            'url': recurso.url if recurso.url else request.build_absolute_uri(recurso.archivo.url) if recurso.archivo else None
        })


# === VISTAS ADICIONALES ===

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def estadisticas_ayuda(request):
    """Estadísticas generales del centro de ayuda"""
    stats = {
        'total_articulos': ArticuloAyuda.objects.filter(activo=True, publicado=True).count(),
        'total_faqs': FAQ.objects.filter(activo=True).count(),
        'total_tutoriales': Tutorial.objects.filter(activo=True).count(),
        'solicitudes_abiertas': SolicitudSoporte.objects.filter(estado__in=['abierto', 'en_proceso']).count(),
        'total_recursos': RecursoAyuda.objects.count(),
        'articulos_populares': ArticuloAyuda.objects.filter(
            activo=True, publicado=True
        ).order_by('-vistas')[:5].values('id', 'titulo', 'vistas'),
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def busqueda_global(request):
    """Búsqueda global en todo el centro de ayuda"""
    query = request.GET.get('q', '')
    if not query:
        return Response({'error': 'Parámetro de búsqueda requerido'}, status=400)
    
    # Buscar en artículos
    articulos = ArticuloAyuda.objects.filter(
        Q(titulo__icontains=query) | Q(contenido__icontains=query) | Q(tags__icontains=query),
        activo=True, publicado=True
    )[:10]
    
    # Buscar en FAQs
    faqs = FAQ.objects.filter(
        Q(pregunta__icontains=query) | Q(respuesta__icontains=query) | Q(tags__icontains=query),
        activo=True
    )[:10]
    
    # Buscar en tutoriales
    tutoriales = Tutorial.objects.filter(
        Q(titulo__icontains=query) | Q(descripcion__icontains=query) | Q(tags__icontains=query),
        activo=True
    )[:10]
    
    return Response({
        'query': query,
        'articulos': ArticuloAyudaSerializer(articulos, many=True).data,
        'faqs': FAQSerializer(faqs, many=True).data,
        'tutoriales': TutorialSerializer(tutoriales, many=True).data,
    })
