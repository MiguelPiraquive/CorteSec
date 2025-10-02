# locations/api_urls.py
"""
API URLS DE UBICACIONES - APP LOCATIONS
========================================

URLs para API REST de departamentos y municipios.
Compatible con React Frontend.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import DepartamentoViewSet, MunicipioViewSet, ImportLocationsExcelAPI

# Router para ViewSets
router = DefaultRouter()
router.register(r'departamentos', DepartamentoViewSet, basename='departamento')
router.register(r'municipios', MunicipioViewSet, basename='municipio')

app_name = 'locations_api'

urlpatterns = [
    # ViewSets con router
    path('', include(router.urls)),
    path('import-excel/', ImportLocationsExcelAPI.as_view(), name='import_excel'),
]
