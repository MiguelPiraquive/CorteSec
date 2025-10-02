from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from django.db.models import Q
from django.http import JsonResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Item
from .forms import ItemForm
from .serializers import (
    ItemSerializer, ItemSimpleSerializer, ItemTrabajoSerializer,
    BusquedaItemsSerializer, ActualizarPreciosSerializer, ReporteItemsSerializer
)


# Vistas tradicionales de Django (para templates)
class ItemListView(ListView):
    """Vista de lista de items de trabajo"""
    model = Item
    template_name = "items/item_lista.html"
    context_object_name = "items"
    paginate_by = 20
    
    def get_queryset(self):
        queryset = Item.objects.filter(activo=True)
        
        # Filtros de búsqueda
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(descripcion__icontains=search) |
                Q(codigo__icontains=search)
            )
        
        tipo_cantidad = self.request.GET.get('tipo_cantidad')
        if tipo_cantidad:
            queryset = queryset.filter(tipo_cantidad=tipo_cantidad)
        
        return queryset.order_by('nombre')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['tipos_cantidad'] = Item.TIPO_CANTIDAD_CHOICES
        context['search_query'] = self.request.GET.get('search', '')
        context['selected_tipo'] = self.request.GET.get('tipo_cantidad', '')
        return context


class ItemCreateView(CreateView):
    """Vista para crear nuevos items de trabajo"""
    model = Item
    form_class = ItemForm
    template_name = "items/item_formulario.html"
    success_url = reverse_lazy("items:item_lista")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Crear Item de Trabajo'
        return context


class ItemUpdateView(UpdateView):
    """Vista para editar items de trabajo"""
    model = Item
    form_class = ItemForm
    template_name = "items/item_formulario.html"
    success_url = reverse_lazy("items:item_lista")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Editar Item de Trabajo'
        return context


class ItemDeleteView(DeleteView):
    """Vista para eliminar items de trabajo"""
    model = Item
    template_name = "items/item_confirmar_eliminar.html"
    success_url = reverse_lazy("items:item_lista")


class ItemDetailView(DetailView):
    """Vista de detalle de item de trabajo"""
    model = Item
    template_name = "items/item_detalle.html"
    context_object_name = "item"


# ViewSets para API REST
class ItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de items de trabajo/servicios de construcción
    
    Proporciona operaciones CRUD y funcionalidades adicionales:
    - Búsqueda por nombre, descripción o código
    - Filtrado por tipo de cantidad
    - Actualización masiva de precios
    - Reportes de items
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_cantidad', 'activo']
    search_fields = ['nombre', 'descripcion', 'codigo']
    ordering_fields = ['nombre', 'precio_unitario', 'created_at']
    ordering = ['nombre']
    
    def get_queryset(self):
        """Filtrar por organización del usuario"""
        if hasattr(self.request.user, 'organization'):
            return Item.objects.filter(organizacion=self.request.user.organizacion)
        return Item.objects.none()
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return ItemSimpleSerializer
        elif self.action in ['cotizacion', 'trabajo']:
            return ItemTrabajoSerializer
        return ItemSerializer
    
    def perform_create(self, serializer):
        """Asignar organización al crear"""
        if hasattr(self.request.user, 'organization'):
            serializer.save(organizacion=self.request.user.organizacion)
    
    @action(detail=False, methods=['post'])
    def buscar(self, request):
        """Búsqueda avanzada de items"""
        serializer = BusquedaItemsSerializer(data=request.data)
        if serializer.is_valid():
            queryset = self.get_queryset()
            
            # Aplicar filtros
            query = serializer.validated_data.get('query')
            if query:
                queryset = queryset.filter(
                    Q(nombre__icontains=query) |
                    Q(descripcion__icontains=query) |
                    Q(codigo__icontains=query)
                )
            
            tipo_cantidad = serializer.validated_data.get('tipo_cantidad')
            if tipo_cantidad:
                queryset = queryset.filter(tipo_cantidad=tipo_cantidad)
            
            precio_min = serializer.validated_data.get('precio_min')
            if precio_min:
                queryset = queryset.filter(precio_unitario__gte=precio_min)
            
            precio_max = serializer.validated_data.get('precio_max')
            if precio_max:
                queryset = queryset.filter(precio_unitario__lte=precio_max)
            
            if serializer.validated_data.get('solo_activos', True):
                queryset = queryset.filter(activo=True)
            
            # Serializar resultados
            items_serializer = ItemSimpleSerializer(queryset, many=True)
            return Response(items_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def actualizar_precios(self, request):
        """Actualización masiva de precios"""
        serializer = ActualizarPreciosSerializer(data=request.data)
        if serializer.is_valid():
            items_ids = serializer.validated_data['items']
            tipo_actualizacion = serializer.validated_data['tipo_actualizacion']
            valor = serializer.validated_data['valor']
            
            items = self.get_queryset().filter(id__in=items_ids)
            actualizados = 0
            
            for item in items:
                precio_actual = item.precio_unitario
                
                if tipo_actualizacion == 'porcentaje':
                    nuevo_precio = precio_actual * (1 + valor / 100)
                elif tipo_actualizacion == 'valor_fijo':
                    nuevo_precio = precio_actual + valor
                else:  # precio_nuevo
                    nuevo_precio = valor
                
                if nuevo_precio >= 0:
                    item.precio_unitario = nuevo_precio
                    item.save()
                    actualizados += 1
            
            return Response({
                'message': f'Se actualizaron {actualizados} items exitosamente',
                'items_actualizados': actualizados
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de items"""
        queryset = self.get_queryset()
        
        total_items = queryset.count()
        items_activos = queryset.filter(activo=True).count()
        
        # Estadísticas por tipo de cantidad
        stats_por_tipo = {}
        for tipo_code, tipo_name in Item.TIPO_CANTIDAD_CHOICES:
            count = queryset.filter(tipo_cantidad=tipo_code, activo=True).count()
            stats_por_tipo[tipo_code] = {
                'nombre': tipo_name,
                'cantidad': count
            }
        
        # Precio promedio
        precios = queryset.filter(activo=True).values_list('precio_unitario', flat=True)
        precio_promedio = sum(precios) / len(precios) if precios else 0
        
        return Response({
            'total_items': total_items,
            'items_activos': items_activos,
            'items_inactivos': total_items - items_activos,
            'estadisticas_por_tipo': stats_por_tipo,
            'precio_promedio': round(precio_promedio, 2)
        })
    
    @action(detail=False, methods=['post'])
    def reporte(self, request):
        """Generar reporte de items"""
        serializer = ReporteItemsSerializer(data=request.data)
        if serializer.is_valid():
            queryset = self.get_queryset()
            
            # Aplicar filtros
            tipo_cantidad = serializer.validated_data.get('tipo_cantidad')
            if tipo_cantidad:
                queryset = queryset.filter(tipo_cantidad=tipo_cantidad)
            
            if serializer.validated_data.get('solo_activos', True):
                queryset = queryset.filter(activo=True)
            
            # Por ahora devolver JSON, se puede extender para PDF/Excel
            items_data = ItemSerializer(queryset, many=True).data
            
            return Response({
                'total_items': queryset.count(),
                'items': items_data,
                'filtros_aplicados': serializer.validated_data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)