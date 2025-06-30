from django.shortcuts import render, redirect, get_object_or_404
from .models import Departamento, Municipio
from .forms import DepartamentoForm, MunicipioForm, ImportarExcelForm
from django.contrib import messages
import pandas as pd
from django.db.models import Q
from django.http import JsonResponse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

# ------------------- MUNICIPIOS AJAX -------------------

def municipios_por_departamento(request):
    departamento_id = request.GET.get('departamento_id')
    municipios = []
    if departamento_id:
        municipios = list(Municipio.objects.filter(departamento_id=departamento_id).values('id', 'nombre'))
    return JsonResponse(municipios, safe=False)

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
    municipios_qs = Municipio.objects.all().select_related('departamento')
    if q:
        municipios_qs = municipios_qs.filter(
            Q(codigo__icontains=q) |
            Q(nombre__icontains=q) |
            Q(departamento__nombre__icontains=q)
        )
    municipios_qs = municipios_qs.order_by('departamento__nombre', 'nombre')

    # Paginación
    page = request.GET.get('page', 1)
    paginator = Paginator(municipios_qs, 20)  # 20 por página
    try:
        municipios = paginator.page(page)
    except PageNotAnInteger:
        municipios = paginator.page(1)
    except EmptyPage:
        municipios = paginator.page(paginator.num_pages)

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

# ------------------- IMPORTAR EXCEL -------------------

def importar_excel(request):
    if request.method == 'POST':
        form = ImportarExcelForm(request.POST, request.FILES)
        if form.is_valid():
            excel_file = form.cleaned_data['excel']

            if excel_file.size > 5 * 1024 * 1024:
                messages.error(request, "El archivo es demasiado grande. Máximo 5MB.")
                return redirect('locations:importar_excel')

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
                    messages.error(request, f"Falta la columna obligatoria: '{col}' en el archivo Excel.")
                    return redirect('locations:importar_excel')

            # Pre-cargar departamentos por código y por nombre
            departamentos_existentes_codigo = {
                d.codigo: d for d in Departamento.objects.all()
            }
            departamentos_existentes_nombre = {
                d.nombre.lower(): d for d in Departamento.objects.all()
            }

            nombres_municipios = df['nombre_municipio'].dropna().astype(str).str.strip().unique()
            municipios_existentes = {
                (m.nombre.lower(), m.departamento.codigo): m
                for m in Municipio.objects.filter(nombre__in=nombres_municipios)
            }

            nuevos_municipios = []
            municipios_a_actualizar = []
            errores = []
            nuevos = 0

            for index, row in df.iterrows():
                try:
                    codigo_departamento = str(row['codigo_departamento']).strip() if pd.notna(row['codigo_departamento']) else None
                    nombre_departamento = str(row['nombre_departamento']).strip() if pd.notna(row['nombre_departamento']) else None
                    codigo_municipio = str(row['codigo_municipio']).strip() if pd.notna(row['codigo_municipio']) else None
                    nombre_municipio = str(row['nombre_municipio']).strip() if pd.notna(row['nombre_municipio']) else None

                    if not codigo_departamento or not nombre_departamento:
                        errores.append(f"Fila {index + 2}: Departamento con datos incompletos, se omitió.")
                        continue

                    if not codigo_municipio or not nombre_municipio:
                        errores.append(f"Fila {index + 2}: Municipio con datos incompletos, se omitió.")
                        continue

                    # Buscar o asignar departamento existente
                    if codigo_departamento in departamentos_existentes_codigo:
                        dep = departamentos_existentes_codigo[codigo_departamento]
                    elif nombre_departamento.lower() in departamentos_existentes_nombre:
                        dep = departamentos_existentes_nombre[nombre_departamento.lower()]
                        departamentos_existentes_codigo[codigo_departamento] = dep
                    else:
                        dep = Departamento.objects.create(codigo=codigo_departamento, nombre=nombre_departamento)
                        departamentos_existentes_codigo[codigo_departamento] = dep
                        departamentos_existentes_nombre[nombre_departamento.lower()] = dep

                    key = (nombre_municipio.lower(), dep.codigo)
                    municipio = municipios_existentes.get(key)

                    if not municipio:
                        municipio = Municipio(
                            nombre=nombre_municipio,
                            codigo=codigo_municipio,
                            departamento=dep
                        )
                        nuevos_municipios.append(municipio)
                        municipios_existentes[key] = municipio
                        nuevos += 1
                    else:
                        if not municipio.codigo and codigo_municipio:
                            municipio.codigo = codigo_municipio
                            municipios_a_actualizar.append(municipio)

                except Exception as e:
                    errores.append(f"Error en la fila {index + 2}: {e}")

            if nuevos_municipios:
                Municipio.objects.bulk_create(nuevos_municipios)

            if municipios_a_actualizar:
                Municipio.objects.bulk_update(municipios_a_actualizar, ['codigo'])

            if nuevos > 0:
                messages.success(request, f"Importación completada. Municipios nuevos creados: {nuevos}")
            else:
                messages.info(request, "No se crearon nuevos municipios. Todos ya existían o hubo errores.")

            if errores:
                for error in errores:
                    messages.warning(request, error)

            return redirect('locations:municipio_lista')

        else:
            messages.error(request, "Por favor selecciona un archivo Excel válido.")
    else:
        form = ImportarExcelForm()

    return render(request, 'locations/importar_excel.html', {'form': form})