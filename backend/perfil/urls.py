from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PerfilViewSet, ConfiguracionNotificacionesViewSet

# Crear router para las APIs REST
router = DefaultRouter()
router.register(r'perfiles', PerfilViewSet)
router.register(r'configuracion-notificaciones', ConfiguracionNotificacionesViewSet)

app_name = 'perfil'

urlpatterns = [
    # APIs REST
    path('api/', include(router.urls)),
]
