from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Item
from .serializers import ItemSerializer
from core.mixins import TenantAwareModel
from core.mixins import MultiTenantViewSetMixin
from .policies import ItemsAccessPolicy
import logging

logger = logging.getLogger(__name__)


class ItemViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API multi-tenant para Items"""
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [ItemsAccessPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_cantidad', 'activo', 'codigo']
    search_fields = ['nombre', 'descripcion', 'codigo']
    ordering_fields = ['nombre', 'precio_unitario', 'created_at']
    ordering = ['nombre']

    def get_queryset(self):
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        """Crear item con logging"""
        logger.info("=== CREAR ITEM ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"Organización: {request.user.organization}")
        logger.info(f"Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save(organization=request.user.organization)
            logger.info(f"Item creado exitosamente: {item}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """Activar/desactivar un item"""
        item = self.get_object()
        item.activo = not item.activo
        item.save(update_fields=['activo'])
        serializer = self.get_serializer(item)
        return Response(serializer.data)
