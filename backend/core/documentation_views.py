"""
🔧 Vistas personalizadas para documentación API sin autenticación
===============================================================
"""

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import AllowAny
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


@method_decorator(csrf_exempt, name='dispatch')
class PublicSpectacularAPIView(SpectacularAPIView):
    """Schema JSON/YAML público sin autenticación"""
    permission_classes = [AllowAny]
    authentication_classes = []


@method_decorator(csrf_exempt, name='dispatch')  
class PublicSpectacularSwaggerView(SpectacularSwaggerView):
    """Swagger UI público sin autenticación"""
    permission_classes = [AllowAny]
    authentication_classes = []


@method_decorator(csrf_exempt, name='dispatch')
class PublicSpectacularRedocView(SpectacularRedocView):
    """ReDoc UI público sin autenticación"""
    permission_classes = [AllowAny]
    authentication_classes = []