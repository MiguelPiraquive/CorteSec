from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para API REST
router = DefaultRouter()
router.register(r'departamentos', views.DepartamentoViewSet)
router.register(r'municipios', views.MunicipioViewSet)

# URLs tradicionales para templates
urlpatterns = [
    # URLs de API REST
    path('api/', include(router.urls)),
    
    # URLs tradicionales para departamentos
    path('departamentos/', views.DepartamentoListView.as_view(), name='departamento_lista'),
    path('departamentos/crear/', views.DepartamentoCreateView.as_view(), name='departamento_crear'),
    path('departamentos/<uuid:pk>/', views.DepartamentoDetailView.as_view(), name='departamento_detalle'),
    path('departamentos/<uuid:pk>/editar/', views.DepartamentoUpdateView.as_view(), name='departamento_editar'),
    path('departamentos/<uuid:pk>/eliminar/', views.DepartamentoDeleteView.as_view(), name='departamento_eliminar'),
    
    # URLs tradicionales para municipios
    path('municipios/', views.MunicipioListView.as_view(), name='municipio_lista'),
    path('municipios/crear/', views.MunicipioCreateView.as_view(), name='municipio_crear'),
    path('municipios/<uuid:pk>/', views.MunicipioDetailView.as_view(), name='municipio_detalle'),
    path('municipios/<uuid:pk>/editar/', views.MunicipioUpdateView.as_view(), name='municipio_editar'),
    path('municipios/<uuid:pk>/eliminar/', views.MunicipioDeleteView.as_view(), name='municipio_eliminar'),
    
    # API AJAX
    path('ajax/municipios/<uuid:departamento_id>/', views.get_municipios_by_departamento, name='municipios_by_departamento'),
]

# Nota: Los endpoints de importación/exportación están disponibles en:
# /api/departamentos/importar_excel/
# /api/departamentos/exportar_excel/
# /api/departamentos/template_importacion/
# /api/municipios/importar_excel/
# /api/municipios/exportar_excel/
# /api/municipios/template_importacion/

app_name = 'locations'
