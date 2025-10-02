from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'', api_views.CargoViewSet, basename='cargo')  # Cambiar 'cargos' por '' para evitar duplicación

# URLs de la API
urlpatterns = [
    # Include router URLs - esto incluye automáticamente las @action definidas
    path('', include(router.urls)),
    
    # Historial como recurso separado - Comentado temporalmente
    # path('historial/', api_views.HistorialCargoViewSet.as_view({'get': 'list'}), name='historial-list'),
    # path('historial/<int:pk>/', api_views.HistorialCargoViewSet.as_view({'get': 'retrieve'}), name='historial-detail'),
]
