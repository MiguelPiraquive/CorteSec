from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PerfilViewSet, ConfiguracionNotificacionesViewSet

router = DefaultRouter()
router.register(r'perfiles', PerfilViewSet, basename='perfil')
router.register(r'notificaciones', ConfiguracionNotificacionesViewSet, basename='configuracion-notificaciones')

urlpatterns = [
    path('', include(router.urls)),
]
