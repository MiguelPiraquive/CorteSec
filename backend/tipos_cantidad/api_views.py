from rest_framework import viewsets
from .models import TipoCantidad
from .serializers import TipoCantidadSerializer
from core.mixins import MultiTenantViewSetMixin

class TiposCantidadViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    queryset = TipoCantidad.objects.all()
    serializer_class = TipoCantidadSerializer
    # Puedes agregar permisos, filtros, etc. aquí
