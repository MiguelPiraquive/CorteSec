from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import TipoCantidad
from .serializers import TipoCantidadSerializer
from core.mixins import MultiTenantViewSetMixin
import logging

logger = logging.getLogger(__name__)


class TiposCantidadViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    queryset = TipoCantidad.objects.all()
    serializer_class = TipoCantidadSerializer
    
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
