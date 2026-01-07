"""
URLs del Módulo de Usuarios - CorteSec
=====================================

Configuración de rutas para la API de usuarios.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2026-01-01
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_new import UsuarioViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

app_name = 'usuarios'

urlpatterns = [
    path('', include(router.urls)),
]
