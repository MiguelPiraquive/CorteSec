from django.urls import path
from . import views

app_name = "dashboard"

urlpatterns = [
    # Dashboard principal
    path("", views.dashboard_principal, name="principal"),
    path("enterprise/", views.dashboard_principal, name="principal_enterprise"),  # Alias para el mismo dashboard
    path("api/metricas/", views.dashboard_api_metricas, name="api_metricas"),
    path("api/filtros/", views.dashboard_api_filtros, name="api_filtros"),
    path("api/busqueda/", views.dashboard_busqueda_inteligente, name="api_busqueda"),
    
    # APIs específicas para filtros del dashboard
    path("api/departamentos/", views.dashboard_api_departamentos, name="api_departamentos"),
    path("api/ubicaciones/", views.dashboard_api_ubicaciones, name="api_ubicaciones"),
    path("api/cargos/", views.dashboard_api_cargos, name="api_cargos"),
    path("api/empleados/", views.dashboard_api_empleados, name="api_empleados"),
    
    # APIs del sistema
    path("api/sistema/", views.dashboard_api_sistema, name="api_sistema"),
    path("api/sistema/simple/", views.dashboard_api_sistema_simple, name="api_sistema_simple"),
    path("api/graficos/", views.dashboard_api_graficos, name="api_graficos"),
    
    # Contratistas
    path("contratistas/", views.ContractorListView.as_view(), name="contratista_lista"),
    path("contratistas/agregar/", views.ContractorCreateView.as_view(), name="contratista_agregar"),
    path("contratistas/<int:pk>/", views.ContractorDetailView.as_view(), name="contratista_detalle"),
    path("contratistas/<int:pk>/editar/", views.ContractorUpdateView.as_view(), name="contratista_editar"),
    path("contratistas/<int:pk>/eliminar/", views.ContractorDeleteView.as_view(), name="contratista_eliminar"),
    
    # Proyectos
    path("proyectos/", views.ProjectListView.as_view(), name="proyecto_lista"),
    path("proyectos/agregar/", views.ProjectCreateView.as_view(), name="proyecto_agregar"),
    path("proyectos/<int:pk>/", views.ProjectDetailView.as_view(), name="proyecto_detalle"),
    path("proyectos/<int:pk>/editar/", views.ProjectUpdateView.as_view(), name="proyecto_editar"),
    path("proyectos/<int:pk>/eliminar/", views.ProjectDeleteView.as_view(), name="proyecto_eliminar"),
    
    # Pagos
    path("pagos/", views.PaymentListView.as_view(), name="pago_lista"),
    path("pagos/agregar/", views.PaymentCreateView.as_view(), name="pago_agregar"),
    path("pagos/<int:pk>/", views.PaymentDetailView.as_view(), name="pago_detalle"),
    path("pagos/<int:pk>/editar/", views.PaymentUpdateView.as_view(), name="pago_editar"),
    path("pagos/<int:pk>/eliminar/", views.PaymentDeleteView.as_view(), name="pago_eliminar"),
    
    # Vista de prueba para gráficos
    path("test-charts/", views.test_charts_view, name="test_charts"),
]