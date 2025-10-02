"""
URLs del módulo Core - API Endpoints
====================================

Endpoints de API para funcionalidades core del sistema:
- Organizaciones
- Notificaciones
- Logs del sistema
- Configuraciones

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-08-17
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .organization_views import OrganizationViewSet
from .test_views import test_auth

# Router para ViewSets
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')

# Patterns URL
urlpatterns = [
    # Test endpoint
    path('test-auth/', test_auth, name='test_auth'),
    
    # ViewSets automáticos
    path('', include(router.urls)),
]
