from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'parametros', api_views.ParametroSistemaViewSet)
router.register(r'modulos', api_views.ConfiguracionModuloViewSet)

urlpatterns = [
    # ViewSets rutas
    path('', include(router.urls)),
    
    # API endpoints adicionales
    path('dashboard/', api_views.dashboard_api_view, name='configuracion-dashboard'),
    path('general/', api_views.configuracion_general_api, name='configuracion-general'),
    path('test-email/', api_views.test_email_api, name='test-email'),
]