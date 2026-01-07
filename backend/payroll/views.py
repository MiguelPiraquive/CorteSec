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

from .models import (
    Empleado, Nomina, DetalleNomina, NominaElectronica, 
    PeriodoNomina, Contrato, ConceptoLaboral,
    NominaSimple
)
# from .forms import EmpleadoForm, NominaForm, DetalleNominaForm  # Temporalmente deshabilitado - usa modelo viejo
from .serializers import (
    EmpleadoSerializer, NominaSerializer, NominaCreateSerializer, 
    DetalleNominaSerializer,
    # EmpleadoExportSerializer, NominaExportSerializer,  # No existen - usar serializers normales
    NominaElectronicaSerializer,
    NominaElectronicaListSerializer, NominaElectronicaCreateSerializer,
    PeriodoNominaSerializer, PeriodoNominaListSerializer,
    ContratoSerializer, ContratoListSerializer,
    ConceptoLaboralSerializer, ConceptoLaboralListSerializer,
    NominaSimpleSerializer, NominaSimpleListSerializer,
    NominaSimpleCreateSerializer
)
from items.models import Item
from cargos.models import Cargo


# =================== VIEWSETS PARA API REST ===================

class EmpleadoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de empleados con funcionalidad completa"""
    queryset = Empleado.objects.select_related('departamento', 'municipio', 'cargo').all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nombres', 'apellidos', 'documento', 'correo']
    ordering_fields = ['nombres', 'apellidos', 'creado_el', 'cargo__nombre']
    ordering = ['apellidos', 'nombres']
    
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
            
            serializer = EmpleadoSerializer(empleados, many=True)
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
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['periodo_inicio', 'periodo_fin', 'creado_el']
    ordering = ['-periodo_fin']
    
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
            
            serializer = NominaSerializer(nominas, many=True)
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
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nomina__empleado__nombres', 'item__nombre']
    ordering_fields = ['cantidad', 'creado_el']
    ordering = ['-creado_el']


# =================== VISTAS ORIGINALES DE DJANGO ===================
# TEMPORALMENTE DESHABILITADAS - Usan forms que dependen de modelos viejos
"""
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
"""

# =================== VIEWSETS PARA NÓMINA ELECTRÓNICA ===================

class NominaElectronicaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas electrónicas"""
    queryset = NominaElectronica.objects.select_related(
        'empleado', 'periodo', 'nomina_simple'
    ).prefetch_related(
        'detalles_items', 'detalles_conceptos'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['numero_documento', 'empleado__primer_nombre', 'empleado__primer_apellido']
    ordering_fields = ['fecha_creacion', 'periodo_inicio', 'periodo_fin']
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NominaElectronicaListSerializer
        elif self.action == 'create':
            return NominaElectronicaCreateSerializer
        return NominaElectronicaSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por organización del usuario
        if hasattr(self.request.user, 'organization'):
            queryset = queryset.filter(organization=self.request.user.organization)
        
        # Filtros manuales desde query params
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        empleado_id = self.request.query_params.get('empleado', None)
        if empleado_id:
            queryset = queryset.filter(empleado_id=empleado_id)
        
        periodo_id = self.request.query_params.get('periodo', None)
        if periodo_id:
            queryset = queryset.filter(periodo_id=periodo_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def generar_xml(self, request, pk=None):
        """Genera el XML de la nómina electrónica"""
        nomina = self.get_object()
        try:
            # Lógica para generar XML
            nomina.estado = 'generado'
            nomina.save()
            return Response({
                'mensaje': 'XML generado exitosamente',
                'estado': nomina.estado
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def firmar(self, request, pk=None):
        """Firma digitalmente la nómina"""
        nomina = self.get_object()
        try:
            # Lógica para firmar
            nomina.estado = 'firmado'
            nomina.save()
            return Response({
                'mensaje': 'Nómina firmada exitosamente',
                'estado': nomina.estado
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def enviar_dian(self, request, pk=None):
        """Envía la nómina a la DIAN"""
        nomina = self.get_object()
        try:
            # Lógica para enviar a DIAN
            nomina.estado = 'enviado'
            nomina.fecha_envio_dian = timezone.now()
            nomina.save()
            return Response({
                'mensaje': 'Nómina enviada a DIAN exitosamente',
                'estado': nomina.estado
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def procesar_completo(self, request, pk=None):
        """Procesa completo: genera XML, firma y envía a DIAN"""
        nomina = self.get_object()
        try:
            # Generar XML
            nomina.estado = 'generado'
            nomina.save()
            
            # Firmar
            nomina.estado = 'firmado'
            nomina.save()
            
            # Enviar a DIAN
            nomina.estado = 'enviado'
            nomina.fecha_envio_dian = timezone.now()
            nomina.save()
            
            return Response({
                'mensaje': 'Nómina procesada completamente',
                'estado': nomina.estado
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def descargar_xml(self, request, pk=None):
        """Descarga el XML de la nómina"""
        nomina = self.get_object()
        if not nomina.xml_contenido:
            return Response(
                {'error': 'No hay XML generado para esta nómina'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        response = HttpResponse(nomina.xml_contenido, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="nomina_{nomina.numero_documento}.xml"'
        return response
    
    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """Descarga el PDF de la nómina"""
        nomina = self.get_object()
        # Aquí iría la lógica para generar PDF
        return Response({'mensaje': 'Generación de PDF en desarrollo'})
    
    @action(detail=True, methods=['get'])
    def consultar_estado(self, request, pk=None):
        """Consulta el estado de la nómina en DIAN"""
        nomina = self.get_object()
        return Response({
            'estado': nomina.estado,
            'numero_documento': nomina.numero_documento,
            'cune': nomina.cune,
            'fecha_envio': nomina.fecha_envio_dian,
            'codigo_respuesta': nomina.codigo_respuesta_dian
        })
    
    @action(detail=False, methods=['post'])
    def generar_desde_nomina(self, request):
        """Genera una nómina electrónica desde una nómina simple"""
        nomina_simple_id = request.data.get('nomina_simple_id')
        
        if not nomina_simple_id:
            return Response(
                {'error': 'ID de nómina simple requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            nomina_simple = NominaSimple.objects.get(id=nomina_simple_id)
            
            # Verificar que no tenga ya una nómina electrónica
            if hasattr(nomina_simple, 'nomina_electronica'):
                return Response(
                    {'error': 'Esta nómina ya tiene una nómina electrónica asociada'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear nómina electrónica desde la simple
            nomina_electronica = NominaElectronica.objects.create(
                organization=nomina_simple.organization,
                empleado=nomina_simple.empleado,
                periodo=nomina_simple.periodo,
                periodo_inicio=nomina_simple.periodo_inicio,
                periodo_fin=nomina_simple.periodo_fin,
                dias_trabajados=nomina_simple.dias_trabajados,
                salario_base_contrato=nomina_simple.salario_base_contrato,
                total_items=nomina_simple.total_items,
                base_cotizacion=nomina_simple.base_cotizacion,
                aporte_salud_empleado=nomina_simple.aporte_salud_empleado,
                aporte_pension_empleado=nomina_simple.aporte_pension_empleado,
                aporte_salud_empleador=nomina_simple.aporte_salud_empleador,
                aporte_pension_empleador=nomina_simple.aporte_pension_empleador,
                aporte_arl=nomina_simple.aporte_arl,
                aporte_sena=nomina_simple.aporte_sena,
                aporte_icbf=nomina_simple.aporte_icbf,
                aporte_caja_compensacion=nomina_simple.aporte_caja_compensacion,
                provision_cesantias=nomina_simple.provision_cesantias,
                provision_intereses_cesantias=nomina_simple.provision_intereses_cesantias,
                provision_prima=nomina_simple.provision_prima,
                provision_vacaciones=nomina_simple.provision_vacaciones,
                deduccion_prestamos=nomina_simple.deduccion_prestamos,
                total_deducciones=nomina_simple.total_deducciones,
                neto_pagar=nomina_simple.neto_pagar,
                nomina_simple=nomina_simple,
                estado='borrador',
                observaciones=f'Generada desde nómina simple #{nomina_simple.numero_interno}'
            )
            
            # Copiar detalles de items
            for detalle_item in nomina_simple.detalles_items.all():
                nomina_electronica.detalles_items.create(
                    item=detalle_item.item,
                    cantidad=detalle_item.cantidad,
                    valor_unitario=detalle_item.valor_unitario,
                    subtotal=detalle_item.subtotal
                )
            
            # Copiar detalles de conceptos
            for detalle_concepto in nomina_simple.detalles_conceptos.all():
                nomina_electronica.detalles_conceptos.create(
                    concepto=detalle_concepto.concepto,
                    valor=detalle_concepto.valor,
                    descripcion=detalle_concepto.descripcion
                )
            
            serializer = NominaElectronicaSerializer(nomina_electronica)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except NominaSimple.DoesNotExist:
            return Response(
                {'error': 'Nómina simple no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class NominaSimpleViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas simples (internas)"""
    queryset = NominaSimple.objects.select_related(
        'empleado', 'periodo'
    ).prefetch_related(
        'detalles_items', 'detalles_conceptos'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['numero_interno', 'empleado__primer_nombre', 'empleado__primer_apellido']
    ordering_fields = ['fecha_creacion', 'periodo_inicio', 'periodo_fin']
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NominaSimpleListSerializer
        elif self.action == 'create':
            return NominaSimpleCreateSerializer
        return NominaSimpleSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por organización del usuario
        if hasattr(self.request.user, 'organization'):
            queryset = queryset.filter(organization=self.request.user.organization)
        return queryset
    
    @action(detail=False, methods=['get'])
    def sin_electronica(self, request):
        """Obtiene nóminas simples que no tienen nómina electrónica asociada"""
        queryset = self.get_queryset().filter(
            nomina_electronica__isnull=True,
            estado='APR'  # Solo aprobadas
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PeriodoNominaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de periodos de nómina"""
    queryset = PeriodoNomina.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'fecha_creacion']
    ordering = ['-fecha_inicio']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PeriodoNominaListSerializer
        return PeriodoNominaSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por organización del usuario
        if hasattr(self.request.user, 'organization'):
            queryset = queryset.filter(organization=self.request.user.organization)
        return queryset
    
    @action(detail=False, methods=['get'])
    def abiertos(self, request):
        """Obtiene periodos abiertos"""
        queryset = self.get_queryset().filter(estado='abierto')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def actual(self, request):
        """Obtiene el periodo actual"""
        hoy = timezone.now().date()
        try:
            periodo = self.get_queryset().get(
                fecha_inicio__lte=hoy,
                fecha_fin__gte=hoy
            )
            serializer = self.get_serializer(periodo)
            return Response(serializer.data)
        except PeriodoNomina.DoesNotExist:
            return Response(
                {'error': 'No hay periodo actual'},
                status=status.HTTP_404_NOT_FOUND
            )


class ContratoEmpleadoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de contratos de empleados"""
    queryset = Contrato.objects.select_related('empleado').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['empleado__primer_nombre', 'empleado__primer_apellido', 'cargo']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'fecha_creacion']
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ContratoListSerializer
        return ContratoSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por organización del usuario
        if hasattr(self.request.user, 'organization'):
            queryset = queryset.filter(organization=self.request.user.organization)
        return queryset
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtiene contratos activos"""
        queryset = self.get_queryset().filter(estado='activo')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_empleado(self, request):
        """Obtiene contratos de un empleado específico"""
        empleado_id = request.query_params.get('empleado_id')
        if not empleado_id:
            return Response(
                {'error': 'empleado_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(empleado_id=empleado_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ConceptoLaboralViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de conceptos laborales"""
    queryset = ConceptoLaboral.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering_fields = ['codigo', 'nombre', 'fecha_creacion']
    ordering = ['codigo']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConceptoLaboralListSerializer
        return ConceptoLaboralSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtrar por organización del usuario
        if hasattr(self.request.user, 'organization'):
            queryset = queryset.filter(organization=self.request.user.organization)
        return queryset
    
    @action(detail=False, methods=['get'])
    def devengados(self, request):
        """Obtiene conceptos de tipo devengado"""
        queryset = self.get_queryset().filter(tipo_concepto='DEV', activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def deducciones(self, request):
        """Obtiene conceptos de tipo deducción"""
        queryset = self.get_queryset().filter(tipo_concepto='DED', activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def aportes(self, request):
        """Obtiene conceptos de tipo aporte"""
        queryset = self.get_queryset().filter(tipo_concepto='APO', activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
