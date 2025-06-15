from django.shortcuts import render, redirect, get_object_or_404
from .models import Departamento, Municipio
from .forms import DepartamentoForm, MunicipioForm
from django.contrib import messages
import pandas as pd
from django.db.models import Q
# ------------------- DEPARTAMENTO -------------------

def departamento_lista(request):
    departamentos = Departamento.objects.all()
    return render(request, 'locations/departamento_lista.html', {'departamentos': departamentos})

def departamento_crear(request):
    if request.method == 'POST':
        form = DepartamentoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('locations:departamento_lista')
    else:
        form = DepartamentoForm()
    return render(request, 'locations/departamento_formulario.html', {'form': form})

def departamento_detalle(request, pk):
    departamento = get_object_or_404(Departamento, pk=pk)
    return render(request, 'locations/departamento_detalle.html', {'object': departamento})

def departamento_editar(request, pk):
    departamento = get_object_or_404(Departamento, pk=pk)
    if request.method == 'POST':
        form = DepartamentoForm(request.POST, instance=departamento)
        if form.is_valid():
            form.save()
            return redirect('locations:departamento_lista')
    else:
        form = DepartamentoForm(instance=departamento)
    return render(request, 'locations/departamento_formulario.html', {'form': form})

def departamento_eliminar(request, pk):
    departamento = get_object_or_404(Departamento, pk=pk)
    if request.method == 'POST':
        departamento.delete()
        return redirect('locations:departamento_lista')
    return render(request, 'locations/departamento_confirmar_eliminar.html', {'object': departamento})

# ------------------- MUNICIPIO -------------------

def municipio_lista(request):
    q = request.GET.get('q', '').strip()
    municipios = Municipio.objects.all().select_related('departamento')
    if q:
        municipios = municipios.filter(
            Q(codigo__icontains=q) |
            Q(nombre__icontains=q) |
            Q(departamento__nombre__icontains=q)
        )
    municipios = municipios.order_by('departamento__nombre', 'nombre')
    return render(request, 'locations/municipio_lista.html', {'municipios': municipios})

def municipio_crear(request):
    if request.method == 'POST':
        form = MunicipioForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('locations:municipio_lista')
    else:
        form = MunicipioForm()
    return render(request, 'locations/municipio_formulario.html', {'form': form})

def municipio_detalle(request, pk):
    municipio = get_object_or_404(Municipio, pk=pk)
    return render(request, 'locations/municipio_detalle.html', {'object': municipio})

def municipio_editar(request, pk):
    municipio = get_object_or_404(Municipio, pk=pk)
    if request.method == 'POST':
        form = MunicipioForm(request.POST, instance=municipio)
        if form.is_valid():
            form.save()
            return redirect('locations:municipio_lista')
    else:
        form = MunicipioForm(instance=municipio)
    return render(request, 'locations/municipio_formulario.html', {'form': form})

def municipio_eliminar(request, pk):
    municipio = get_object_or_404(Municipio, pk=pk)
    if request.method == 'POST':
        municipio.delete()
        return redirect('locations:municipio_lista')
    return render(request, 'locations/municipio_confirmar_eliminar.html', {'object': municipio})

def importar_excel(request):
    if request.method == 'POST' and request.FILES.get('excel'):
        excel_file = request.FILES['excel']
        try:
            df = pd.read_excel(excel_file, engine='openpyxl')
        except Exception as e:
            messages.error(request, f"Error leyendo el archivo: {e}")
            return redirect('locations:importar_excel')

        columnas_requeridas = [
            'codigo_departamento', 'nombre_departamento',
            'codigo_municipio', 'nombre_municipio'
        ]
        for col in columnas_requeridas:
            if col not in df.columns:
                messages.error(request, f"Falta la columna '{col}' en el archivo Excel.")
                return redirect('locations:importar_excel')

        nuevos = 0
        for _, row in df.iterrows():
            dep, _ = Departamento.objects.get_or_create(
                codigo=row['codigo_departamento'],
                defaults={'nombre': row['nombre_departamento']}
            )
            municipio, creado = Municipio.objects.get_or_create(
                codigo=row['codigo_municipio'],
                nombre=row['nombre_municipio'],
                defaults={'departamento': dep}
            )
            if creado:
                nuevos += 1

        messages.success(request, f"Importación completada. Municipios nuevos creados: {nuevos}")
        return redirect('locations:municipio_lista')
    return render(request, 'locations/importar_excel.html')