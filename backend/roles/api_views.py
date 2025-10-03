from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Rol
from .serializers import RolSerializer
from core.mixins import MultiTenantViewSetMixin

class RolViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet Multi-Tenant para gestión de roles empresariales.
    Filtra automáticamente por organización y valida permisos multi-tenant.
    """
    queryset = Rol.objects.select_related('organization').all()
    serializer_class = RolSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_rol', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        base_queryset = self.get_queryset()
        total = base_queryset.count()
        activos = base_queryset.filter(activo=True).count()
        inactivos = base_queryset.filter(activo=False).count()
        return Response({
            'total': total,
            'activos': activos,
            'inactivos': inactivos
        })
