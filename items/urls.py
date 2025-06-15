from django.urls import path
from . import views

app_name = "items"

urlpatterns = [
    path("", views.ItemListView.as_view(), name="item_lista"),
    path("agregar/", views.ItemCreateView.as_view(), name="item_agregar"),
    path("<int:pk>/", views.ItemDetailView.as_view(), name="item_detalle"),
    path("<int:pk>/editar/", views.ItemUpdateView.as_view(), name="item_editar"),
    path("<int:pk>/eliminar/", views.ItemDeleteView.as_view(), name="item_eliminar"),
]