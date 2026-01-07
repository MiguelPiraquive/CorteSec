"""
ASOGAN - URLs de Usuarios
Configuracion de rutas para la API de usuarios
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, UserStatsViewSet, UserBulkActionsViewSet,
    GrupoUsuarioViewSet, HistorialUsuarioViewSet
)

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='user')
router.register(r'stats', UserStatsViewSet, basename='user-stats')
router.register(r'bulk', UserBulkActionsViewSet, basename='user-bulk')
router.register(r'grupos', GrupoUsuarioViewSet, basename='grupousuario')
router.register(r'historial', HistorialUsuarioViewSet, basename='historialusuario')

app_name = 'usuarios'

urlpatterns = [
    path('', include(router.urls)),
]


