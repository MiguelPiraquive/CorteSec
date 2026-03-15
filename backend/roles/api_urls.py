from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    RolViewSet, TipoRolViewSet, AsignacionRolViewSet,
    EstadoAsignacionViewSet, HistorialAsignacionViewSet,
    AuditoriaRolViewSet,
    JerarquiaAPIView
)

router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'tipos', TipoRolViewSet, basename='tipo-rol')
router.register(r'asignaciones', AsignacionRolViewSet, basename='asignacion-rol')
router.register(r'estados', EstadoAsignacionViewSet, basename='estado-asignacion')
router.register(r'historial', HistorialAsignacionViewSet, basename='historial-asignacion')
router.register(r'auditoria', AuditoriaRolViewSet, basename='auditoria-rol')

urlpatterns = [
    path('roles/jerarquia/', JerarquiaAPIView.as_view(), name='jerarquia-api'),
    path('', include(router.urls)),
]
