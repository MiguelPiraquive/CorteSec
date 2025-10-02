from rest_framework import viewsets
from .models import Documento
from .serializers import DocumentacionSerializer
from core.mixins import MultiTenantViewSetMixin

class DocumentacionViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentacionSerializer
    # Puedes agregar permisos, filtros, etc. aquí
