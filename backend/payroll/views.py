from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.forms import inlineformset_factory
from django.core.paginator import Paginator
from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView
from django.http import HttpResponse, JsonResponse
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, date
import pandas as pd
import io

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Empleado, Nomina, DetalleNomina
from .forms import EmpleadoForm, NominaForm, DetalleNominaForm
from .serializers import (
    EmpleadoSerializer, NominaSerializer, NominaCreateSerializer, 
    DetalleNominaSerializer, EmpleadoExportSerializer,
    NominaExportSerializer
)
from items.models import Item
from cargos.models import Cargo


# =================== VIEWSETS PARA API REST ===================

class EmpleadoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de empleados con funcionalidad completa"""
    queryset = Empleado.objects.select_related('departamento', 'municipio', 'cargo').all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['nombres', 'apellidos', 'documento', 'correo']
    ordering_fields = ['nombres', 'apellidos', 'creado_el', 'cargo__nombre']
    ordering = ['apellidos', 'nombres']
    filterset_fields = ['cargo', 'genero', 'activo', 'departamento', 'municipio']
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtiene estadísticas de empleados"""
        total_empleados = Empleado.objects.filter(activo=True).count()
        
        stats = {
            'total_empleados': total_empleados,
            'empleados_activos': Empleado.objects.filter(activo=True).count(),
            'empleados_inactivos': Empleado.objects.filter(activo=False).count(),
            'por_genero': Empleado.objects.filter(activo=True).values('genero').annotate(
                total=Count('id')
            ),
            'por_cargo': Empleado.objects.filter(activo=True).values(
                'cargo__nombre'
            ).annotate(total=Count('id')),
            'por_departamento': Empleado.objects.filter(activo=True).values(
                'departamento__nombre'
            ).annotate(total=Count('id')),
            'empleados_recientes': Empleado.objects.filter(
                creado_el__gte=timezone.now().replace(day=1)
            ).count()
        }
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        """Exporta empleados a Excel"""
        try:
            empleados = Empleado.objects.select_related(
                'departamento', 'municipio', 'cargo'
            ).all()
            
            serializer = EmpleadoExportSerializer(empleados, many=True)
            df = pd.DataFrame(serializer.data)
            
            # Crear archivo Excel en memoria
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Empleados', index=False)
                
                # Obtener el worksheet para formatear
                worksheet = writer.sheets['Empleados']
                
                # Ajustar ancho de columnas
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            output.seek(0)
            
            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="empleados_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error al exportar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def importar_excel(self, request):
        """Importa empleados desde Excel"""
        try:
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {'error': 'No se encontró archivo'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Leer archivo Excel
            df = pd.read_excel(file)
            
            empleados_creados = 0
            errores = []
            
            for index, row in df.iterrows():
                try:
                    # Buscar relaciones
                    cargo = None
                    if pd.notna(row.get('cargo_nombre')):
                        cargo = Cargo.objects.filter(nombre=row['cargo_nombre']).first()
                    
                    if not cargo:
                        errores.append(f"Fila {index + 2}: Cargo no encontrado")
                        continue
                    
                    # Crear empleado
                    empleado_data = {
                        'nombres': row.get('nombres', ''),
                        'apellidos': row.get('apellidos', ''),
                        'documento': row.get('documento', ''),
                        'correo': row.get('correo', ''),
                        'telefono': row.get('telefono', ''),
                        'direccion': row.get('direccion', ''),
                        'genero': row.get('genero', 'M'),
                        'cargo': cargo,
                        'activo': row.get('activo', True),
                    }
                    
                    # Manejar fecha de nacimiento
                    if pd.notna(row.get('fecha_nacimiento')):
                        if isinstance(row['fecha_nacimiento'], str):
                            empleado_data['fecha_nacimiento'] = datetime.strptime(
                                row['fecha_nacimiento'], '%Y-%m-%d'
                            ).date()
                        else:
                            empleado_data['fecha_nacimiento'] = row['fecha_nacimiento']
                    
                    Empleado.objects.create(**empleado_data)
                    empleados_creados += 1
                    
                except Exception as e:
                    errores.append(f"Fila {index + 2}: {str(e)}")
            
            return Response({
                'mensaje': f'Importación completada. {empleados_creados} empleados creados.',
                'empleados_creados': empleados_creados,
                'errores': errores
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error al importar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def template_importacion(self, request):
        """Descarga template para importación de empleados"""
        try:
            # Crear DataFrame con columnas de ejemplo
            data = {
                'documento': ['12345678', '87654321'],
                'nombres': ['Juan Carlos', 'María Fernanda'],
                'apellidos': ['González López', 'Rodríguez Pérez'],
                'correo': ['juan@email.com', 'maria@email.com'],
                'telefono': ['3001234567', '3007654321'],
                'direccion': ['Calle 123 #45-67', 'Carrera 89 #12-34'],
                'fecha_nacimiento': ['1990-01-15', '1985-05-20'],
                'genero': ['M', 'F'],
                'cargo_nombre': ['Obrero', 'Supervisor'],
                'activo': [True, True]
            }
            
            df = pd.DataFrame(data)
            
            # Crear archivo Excel
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Empleados', index=False)
                
                # Agregar hoja de instrucciones
                instrucciones = pd.DataFrame({
                    'Campo': ['documento', 'nombres', 'apellidos', 'correo', 'telefono', 'direccion', 'fecha_nacimiento', 'genero', 'cargo_nombre', 'activo'],
                    'Descripción': [
                        'Número de documento único',
                        'Nombres del empleado',
                        'Apellidos del empleado',
                        'Correo electrónico',
                        'Número de teléfono',
                        'Dirección de residencia',
                        'Fecha de nacimiento (YYYY-MM-DD)',
                        'Género: M (Masculino), F (Femenino), O (Otro)',
                        'Nombre exacto del cargo (debe existir)',
                        'Estado activo: True o False'
                    ],
                    'Requerido': ['Sí', 'Sí', 'Sí', 'No', 'No', 'No', 'No', 'No', 'Sí', 'No']
                })
                instrucciones.to_excel(writer, sheet_name='Instrucciones', index=False)
            
            output.seek(0)
            
            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="template_empleados.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error al generar template: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas con funcionalidad completa"""
    queryset = Nomina.objects.select_related('empleado', 'empleado__cargo').prefetch_related('detallenomina_set__item').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['periodo_inicio', 'periodo_fin', 'creado_el']
    ordering = ['-periodo_fin']
    filterset_fields = ['empleado', 'empleado__cargo']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return NominaCreateSerializer
        return NominaSerializer
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtiene estadísticas de nóminas"""
        from django.db.models import Sum, Avg, Count
        
        nominas = Nomina.objects.all()
        
        stats = {
            'total_nominas': nominas.count(),
            'nominas_mes_actual': nominas.filter(
                periodo_fin__year=timezone.now().year,
                periodo_fin__month=timezone.now().month
            ).count(),
            'total_pagado': sum(nomina.total for nomina in nominas),
            'promedio_nomina': sum(nomina.total for nomina in nominas) / nominas.count() if nominas.count() > 0 else 0,
            'top_empleados': [
                {
                    'empleado': nomina.empleado.nombre_completo,
                    'total': nomina.total
                }
                for nomina in sorted(nominas, key=lambda x: x.total, reverse=True)[:5]
            ],
            'nominas_por_mes': {}
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        """Exporta nóminas a Excel"""
        try:
            nominas = Nomina.objects.select_related(
                'empleado', 'empleado__cargo'
            ).all()
            
            serializer = NominaExportSerializer(nominas, many=True)
            df = pd.DataFrame(serializer.data)
            
            # Crear archivo Excel en memoria
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Nominas', index=False)
                
                # Hoja de resumen
                resumen_data = {
                    'Métrica': ['Total Nóminas', 'Total Pagado', 'Promedio por Nómina'],
                    'Valor': [
                        len(nominas),
                        sum(nomina.total for nomina in nominas),
                        sum(nomina.total for nomina in nominas) / len(nominas) if nominas else 0
                    ]
                }
                resumen_df = pd.DataFrame(resumen_data)
                resumen_df.to_excel(writer, sheet_name='Resumen', index=False)
            
            output.seek(0)
            
            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="nominas_{timezone.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error al exportar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DetalleNominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de detalles de nómina"""
    queryset = DetalleNomina.objects.select_related('nomina', 'item').all()
    serializer_class = DetalleNominaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['nomina__empleado__nombres', 'item__nombre']
    ordering_fields = ['cantidad', 'creado_el']
    ordering = ['-creado_el']
    filterset_fields = ['nomina', 'item']


# =================== VISTAS ORIGINALES DE DJANGO ===================

# CRUD Empleado
class EmpleadoListaView(ListView):
    model = Empleado
    template_name = "payroll/empleado_lista.html"
    context_object_name = "empleados"
    paginate_by = 20

    def get_queryset(self):
        queryset = super().get_queryset().select_related('municipio__departamento')
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
            messages.error(request, "Por favor corrige los errores en el formulario.")
    else:
        form = NominaForm(instance=nomina)
        formset = DetalleNominaFormSet(instance=nomina)
    items = Item.objects.all()
    return render(request, 'payroll/nomina_formulario.html', {'form': form, 'formset': formset, 'object': nomina, 'items': items})
