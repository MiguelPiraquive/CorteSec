from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from .models import Item
from .forms import ItemForm

class ItemListView(ListView):
    model = Item
    template_name = "items/item_lista.html"
    context_object_name = "items"

class ItemCreateView(CreateView):
    model = Item
    form_class = ItemForm
    template_name = "items/item_formulario.html"
    success_url = reverse_lazy("items:item_lista")

class ItemUpdateView(UpdateView):
    model = Item
    form_class = ItemForm
    template_name = "items/item_formulario.html"
    success_url = reverse_lazy("items:item_lista")

class ItemDeleteView(DeleteView):
    model = Item
    template_name = "items/item_confirmar_eliminar.html"
    success_url = reverse_lazy("items:item_lista")

class ItemDetailView(DetailView):
    model = Item
    template_name = "items/item_detalle.html"