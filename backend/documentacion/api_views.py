from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Documento
from .serializers import DocumentacionSerializer
from core.mixins import MultiTenantViewSetMixin

class DocumentacionViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentacionSerializer
    permission_classes = [IsAuthenticated]
