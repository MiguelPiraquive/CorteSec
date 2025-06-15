from django.urls import path
from . import views

app_name = "dashboard"

urlpatterns = [
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
]