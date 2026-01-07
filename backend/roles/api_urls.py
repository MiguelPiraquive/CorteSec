"""
URLs del Sistema de Roles
==========================

Configuración de rutas para la API REST del sistema de roles.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import TipoRolViewSet, RolViewSet, AsignacionRolViewSet

router = DefaultRouter()
router.register(r'tipos-rol', TipoRolViewSet, basename='tipo-rol')
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'asignaciones', AsignacionRolViewSet, basename='asignacion-rol')

urlpatterns = [
    path('', include(router.urls)),
]
