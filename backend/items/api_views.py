from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Item
from .serializers import ItemSerializer
from core.mixins import TenantAwareModel
from core.mixins import MultiTenantViewSetMixin

class ItemViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """API multi-tenant para Items"""
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_cantidad', 'activo', 'codigo']
    search_fields = ['nombre', 'descripcion', 'codigo']
    ordering_fields = ['nombre', 'precio_unitario', 'created_at']
    ordering = ['nombre']

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'organization') and user.organizacion:
            return Item.objects.filter(organizacion=user.organizacion)
        return Item.objects.none()

    def perform_create(self, serializer):
        serializer.save(organizacion=self.request.user.organizacion)
