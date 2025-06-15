from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from .models import Contractor, Project, Payment
from .forms import ContractorForm, ProjectForm, PaymentForm

# Contractor CRUD
class ContractorListView(ListView):
    model = Contractor
    template_name = "dashboard/contratista_lista.html"
    context_object_name = "contratistas"

class ContractorCreateView(CreateView):
    model = Contractor
    form_class = ContractorForm
    template_name = "dashboard/contratista_formulario.html"
    success_url = reverse_lazy("dashboard:contratista_lista")

class ContractorUpdateView(UpdateView):
    model = Contractor
    form_class = ContractorForm
    template_name = "dashboard/contratista_formulario.html"
    success_url = reverse_lazy("dashboard:contratista_lista")

class ContractorDeleteView(DeleteView):
    model = Contractor
    template_name = "dashboard/contratista_confirmar_eliminar.html"
    success_url = reverse_lazy("dashboard:contratista_lista")

class ContractorDetailView(DetailView):
    model = Contractor
    template_name = "dashboard/contratista_detalle.html"

# Project CRUD
class ProjectListView(ListView):
    model = Project
    template_name = "dashboard/proyecto_lista.html"
    context_object_name = "proyectos"

class ProjectCreateView(CreateView):
    model = Project
    form_class = ProjectForm
    template_name = "dashboard/proyecto_formulario.html"
    success_url = reverse_lazy("dashboard:proyecto_lista")

class ProjectUpdateView(UpdateView):
    model = Project
    form_class = ProjectForm
    template_name = "dashboard/proyecto_formulario.html"
    success_url = reverse_lazy("dashboard:proyecto_lista")

class ProjectDeleteView(DeleteView):
    model = Project
    template_name = "dashboard/proyecto_confirmar_eliminar.html"
    success_url = reverse_lazy("dashboard:proyecto_lista")

class ProjectDetailView(DetailView):
    model = Project
    template_name = "dashboard/proyecto_detalle.html"

# Payment CRUD
class PaymentListView(ListView):
    model = Payment
    template_name = "dashboard/pago_lista.html"
    context_object_name = "pagos"

class PaymentCreateView(CreateView):
    model = Payment
    form_class = PaymentForm
    template_name = "dashboard/pago_formulario.html"
    success_url = reverse_lazy("dashboard:pago_lista")

class PaymentUpdateView(UpdateView):
    model = Payment
    form_class = PaymentForm
    template_name = "dashboard/pago_formulario.html"
    success_url = reverse_lazy("dashboard:pago_lista")

class PaymentDeleteView(DeleteView):
    model = Payment
    template_name = "dashboard/pago_confirmar_eliminar.html"
    success_url = reverse_lazy("dashboard:pago_lista")

class PaymentDetailView(DetailView):
    model = Payment
    template_name = "dashboard/pago_detalle.html"