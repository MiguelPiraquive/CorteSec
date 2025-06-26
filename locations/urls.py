from django.urls import path
from . import views

app_name = 'locations'

urlpatterns = [
    # Departamentos
    path('departamentos/', views.departamento_lista, name='departamento_lista'),
    path('departamentos/nuevo/', views.departamento_crear, name='departamento_agregar'),
    path('departamentos/<int:pk>/', views.departamento_detalle, name='departamento_detalle'),
    path('departamentos/<int:pk>/editar/', views.departamento_editar, name='departamento_editar'),
    path('departamentos/<int:pk>/eliminar/', views.departamento_eliminar, name='departamento_eliminar'),

    # Municipios
    path('municipios/', views.municipio_lista, name='municipio_lista'),
    path('municipios/nuevo/', views.municipio_crear, name='municipio_agregar'),
    path('municipios/<int:pk>/', views.municipio_detalle, name='municipio_detalle'),
    path('municipios/<int:pk>/editar/', views.municipio_editar, name='municipio_editar'),
    path('municipios/<int:pk>/eliminar/', views.municipio_eliminar, name='municipio_eliminar'),

    # Importar Excel
    path('importar-excel/', views.importar_excel, name='importar_excel'),

    path('municipios-por-departamento/', views.municipios_por_departamento, name='municipios_por_departamento'),
    
]