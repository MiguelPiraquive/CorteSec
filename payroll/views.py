from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.forms import inlineformset_factory
from django.core.paginator import Paginator
from .models import Empleado, Nomina, DetalleNomina, Cargo
from .forms import EmpleadoForm, NominaForm, DetalleNominaForm
from items.models import Item  # Importa el modelo Item

# CRUD Empleado
class EmpleadoListaView(ListView):
    model = Empleado
    template_name = "payroll/empleado_lista.html"
    context_object_name = "empleados"
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.GET.get('q', '')
        if query:
            queryset = queryset.filter(nombres__icontains=query) | queryset.filter(apellidos__icontains=query)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['query'] = self.request.GET.get('q', '')
        return context

class EmpleadoCrearView(CreateView):
    model = Empleado
    form_class = EmpleadoForm
    template_name = "payroll/empleado_formulario.html"
    success_url = reverse_lazy("payroll:empleado_lista")

    def form_valid(self, form):
        messages.success(self.request, "Empleado creado correctamente.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Por favor corrige los errores en el formulario.")
        return super().form_invalid(form)

class EmpleadoActualizarView(UpdateView):
    model = Empleado
    form_class = EmpleadoForm
    template_name = "payroll/empleado_formulario.html"
    success_url = reverse_lazy("payroll:empleado_lista")

    def form_valid(self, form):
        messages.success(self.request, "Empleado actualizado correctamente.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Por favor corrige los errores en el formulario.")
        return super().form_invalid(form)

class EmpleadoEliminarView(DeleteView):
    model = Empleado
    template_name = "payroll/empleado_confirmar_eliminar.html"
    success_url = reverse_lazy("payroll:empleado_lista")

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, "Empleado eliminado correctamente.")
        return super().delete(request, *args, **kwargs)

class EmpleadoDetalleView(DetailView):
    model = Empleado
    template_name = "payroll/empleado_detalle.html"
    context_object_name = "empleado"

# CRUD Nómina
def nomina_lista(request):
    query = request.GET.get('q', '')
    nominas = Nomina.objects.select_related('empleado').order_by('-periodo_fin')
    if query:
        nominas = nominas.filter(empleado__nombres__icontains=query) | nominas.filter(empleado__apellidos__icontains=query)
    paginator = Paginator(nominas, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    # Cambia 'page_obj' por 'nominas' en el contexto
    return render(request, 'payroll/nomina_lista.html', {'nominas': page_obj, 'query': query})

def nomina_detalle(request, pk):
    nomina = get_object_or_404(Nomina, pk=pk)
    return render(request, 'payroll/nomina_detalle.html', {'nomina': nomina})

def nomina_eliminar(request, pk):
    nomina = get_object_or_404(Nomina, pk=pk)
    if request.method == 'POST':
        nomina.delete()
        messages.success(request, "Nómina eliminada correctamente.")
        return redirect('payroll:nomina_lista')
    return render(request, 'payroll/nomina_confirmar_eliminar.html', {'nomina': nomina})

def nomina_agregar(request):
    DetalleNominaFormSet = inlineformset_factory(
        Nomina, DetalleNomina, form=DetalleNominaForm, extra=1, can_delete=True
    )
    if request.method == 'POST':
        form = NominaForm(request.POST)
        formset = DetalleNominaFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            nomina = form.save()
            formset.instance = nomina
            formset.save()
            messages.success(request, "Nómina creada correctamente.")
            return redirect('payroll:nomina_detalle', pk=nomina.pk)
        else:
            print("Form errors:", form.errors)
            print("Form non_field_errors:", form.non_field_errors())
            print("Formset errors:", formset.errors)
            print("Formset non_form_errors:", formset.non_form_errors())
            for i, f in enumerate(formset.forms):
                print(f"Formset form {i} errors:", f.errors)
                print(f"Formset form {i} non_field_errors:", f.non_field_errors())
            messages.error(request, "Por favor corrige los errores en el formulario.")
    else:
        form = NominaForm()
        formset = DetalleNominaFormSet()
    items = Item.objects.all()
    return render(request, 'payroll/nomina_formulario.html', {'form': form, 'formset': formset, 'items': items})

def nomina_editar(request, pk):
    nomina = get_object_or_404(Nomina, pk=pk)
    DetalleNominaFormSet = inlineformset_factory(
        Nomina, DetalleNomina, form=DetalleNominaForm, extra=1, can_delete=True
    )
    if request.method == 'POST':
        form = NominaForm(request.POST, instance=nomina)
        formset = DetalleNominaFormSet(request.POST, instance=nomina)
        if form.is_valid() and formset.is_valid():
            form.save()
            formset.save()
            messages.success(request, "Nómina actualizada correctamente.")
            return redirect('payroll:nomina_detalle', pk=nomina.pk)
        else:
            print("Form errors:", form.errors)
            print("Form non_field_errors:", form.non_field_errors())
            print("Formset errors:", formset.errors)
            print("Formset non_form_errors:", formset.non_form_errors())
            for i, f in enumerate(formset.forms):
                print(f"Formset form {i} errors:", f.errors)
                print(f"Formset form {i} non_field_errors:", f.non_field_errors())
            messages.error(request, "Por favor corrige los errores en el formulario.")
    else:
        form = NominaForm(instance=nomina)
        formset = DetalleNominaFormSet(instance=nomina)
    items = Item.objects.all()
    return render(request, 'payroll/nomina_formulario.html', {'form': form, 'formset': formset, 'object': nomina, 'items': items})

class CargoListView(ListView):
    model = Cargo
    template_name = 'payroll/cargo_list.html'
    context_object_name = 'cargos'

class CargoCreateView(CreateView):
    model = Cargo
    fields = ['nombre']
    template_name = 'payroll/cargo_form.html'
    success_url = reverse_lazy('cargo_list')

class CargoUpdateView(UpdateView):
    model = Cargo
    fields = ['nombre']
    template_name = 'payroll/cargo_form.html'
    success_url = reverse_lazy('cargo_list')

class CargoDeleteView(DeleteView):
    model = Cargo
    template_name = 'payroll/cargo_confirm_delete.html'
    success_url = reverse_lazy('cargo_list')

class CargoDetailView(DetailView):
    model = Cargo
    template_name = 'payroll/cargo_detail.html'
    context_object_name = 'cargo'