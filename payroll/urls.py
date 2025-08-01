from django.urls import path
from . import views

app_name = "payroll"

urlpatterns = [
    # Empleados
    path('empleados/', views.EmpleadoListaView.as_view(), name='empleado_lista'),
    path('empleados/agregar/', views.EmpleadoCrearView.as_view(), name='empleado_crear'),
    path('empleados/<int:pk>/editar/', views.EmpleadoActualizarView.as_view(), name='empleado_actualizar'),
    path('empleados/<int:pk>/eliminar/', views.EmpleadoEliminarView.as_view(), name='empleado_eliminar'),
    path('empleados/<int:pk>/', views.EmpleadoDetalleView.as_view(), name='empleado_detalle'),

    # Nóminas
    path('nominas/', views.nomina_lista, name='nomina_lista'),
    path('nominas/agregar/', views.nomina_agregar, name='nomina_agregar'),
    path('nominas/<int:pk>/editar/', views.nomina_editar, name='nomina_editar'),
    path('nominas/<int:pk>/eliminar/', views.nomina_eliminar, name='nomina_eliminar'),
    path('nominas/<int:pk>/', views.nomina_detalle, name='nomina_detalle'),

    # Cargos
    path('cargos/', views.CargoListView.as_view(), name='cargo_list'),
    path('cargos/nuevo/', views.CargoCreateView.as_view(), name='cargo_create'),
    path('cargos/<int:pk>/editar/', views.CargoUpdateView.as_view(), name='cargo_update'),
    path('cargos/<int:pk>/eliminar/', views.CargoDeleteView.as_view(), name='cargo_delete'),
    path('cargos/<int:pk>/', views.CargoDetailView.as_view(), name='cargo_detail'),

    # Exportar nóminas a CSV (opcional, si implementaste la función)
    # path('nominas/exportar/', views.exportar_nominas_csv, name='exportar_nominas_csv'),
]