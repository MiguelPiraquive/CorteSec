from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import TipoCantidad
from .serializers import TipoCantidadSerializer
from core.mixins import MultiTenantViewSetMixin
from items.policies import ItemsAccessPolicy
import logging

logger = logging.getLogger(__name__)


class TiposCantidadViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    queryset = TipoCantidad.objects.all()
    serializer_class = TipoCantidadSerializer
    permission_classes = [ItemsAccessPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'es_sistema']
    search_fields = ['codigo', 'descripcion']
    ordering_fields = ['orden', 'codigo', 'descripcion']
    ordering = ['orden', 'codigo']
    
    def create(self, request, *args, **kwargs):
        """Crear tipo de cantidad con logging"""
        logger.info("=== CREAR TIPO CANTIDAD ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"Organización: {request.user.organization}")
        logger.info(f"Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            tipo = serializer.save(organization=request.user.organization)
            logger.info(f"Tipo creado exitosamente: {tipo}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def toggle_activo(self, request, pk=None):
        """Activar/desactivar un tipo de cantidad"""
        tipo = self.get_object()
        tipo.activo = not tipo.activo
        tipo.save(update_fields=['activo'])
        serializer = self.get_serializer(tipo)
        return Response(serializer.data)
