# payroll/api_views.py
"""
API VIEWS DE EMPLEADOS - APP PAYROLL
====================================

ViewSets REST para gestión de empleados.
Compatible con React Frontend.
"""

from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from core.mixins import MultiTenantViewSetMixin
from .models import Empleado, Nomina, DetalleNomina
from .serializers import (
    EmpleadoSerializer,
    NominaSerializer,
    DetalleNominaSerializer
)
import logging

logger = logging.getLogger(__name__)


class EmpleadoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de empleados"""
    
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo', 'genero', 'cargo', 'departamento', 'municipio']
    search_fields = ['nombres', 'apellidos', 'documento', 'correo']
    ordering_fields = ['nombres', 'apellidos', 'documento', 'creado_el']
    ordering = ['apellidos', 'nombres']
    pagination_class = None  # Sin paginación para mostrar todos
    
    def get_queryset(self):
        """Filtrar empleados activos por defecto"""
        queryset = Empleado.objects.select_related('departamento', 'municipio', 'cargo')
        
        # Solo mostrar empleados activos por defecto
        if not self.request.query_params.get('incluir_inactivos'):
            queryset = queryset.filter(activo=True)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Crear empleado con logging"""
        logger.info("=== CREAR EMPLEADO ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            empleado = serializer.save()
            logger.info(f"Empleado creado exitosamente: {empleado}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Actualizar empleado con logging"""
        logger.info("=== ACTUALIZAR EMPLEADO ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"ID Empleado: {kwargs.get('pk')}")
        logger.info(f"Datos recibidos: {request.data}")
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            empleado = serializer.save()
            logger.info(f"Empleado actualizado exitosamente: {empleado}")
            return Response(serializer.data)
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """Activar/Desactivar empleado (soft delete)"""
        empleado = self.get_object()
        empleado.activo = not empleado.activo
        empleado.save()
        
        estado = "activado" if empleado.activo else "desactivado"
        logger.info(f"Empleado {empleado} {estado} por {request.user.email}")
        
        return Response({
            'message': f'Empleado {estado} exitosamente',
            'activo': empleado.activo
        })
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de empleados"""
        queryset = self.get_queryset()
        
        stats = {
            'total_activos': queryset.filter(activo=True).count(),
            'total_inactivos': queryset.filter(activo=False).count(),
            'por_genero': {
                'masculino': queryset.filter(genero='M', activo=True).count(),
                'femenino': queryset.filter(genero='F', activo=True).count(),
                'otro': queryset.filter(genero='O', activo=True).count(),
            },
            'por_cargo': list(
                queryset.filter(activo=True)
                .values('cargo__nombre')
                .annotate(cantidad=Count('id'))
                .order_by('-cantidad')
            )
        }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exportar empleados a Excel"""
        try:
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            # Obtener empleados con filtros aplicados
            queryset = self.filter_queryset(self.get_queryset())
            
            # Preparar datos para Excel
            data = []
            for empleado in queryset:
                data.append({
                    'Documento': empleado.documento,
                    'Nombres': empleado.nombres,
                    'Apellidos': empleado.apellidos,
                    'Email': empleado.correo or '',
                    'Teléfono': empleado.telefono or '',
                    'Género': empleado.get_genero_display(),
                    'Fecha Nacimiento': empleado.fecha_nacimiento or '',
                    'Cargo': empleado.cargo.nombre if empleado.cargo else '',
                    'Departamento': empleado.departamento.nombre if empleado.departamento else '',
                    'Municipio': empleado.municipio.nombre if empleado.municipio else '',
                    'Dirección': empleado.direccion or '',
                    'Estado': 'Activo' if empleado.activo else 'Inactivo',
                    'Fecha Registro': empleado.creado_el.strftime('%Y-%m-%d %H:%M:%S'),
                })
            
            # Crear DataFrame y Excel
            df = pd.DataFrame(data)
            
            # Crear buffer de memoria
            output = io.BytesIO()
            
            # Escribir a Excel
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Empleados', index=False)
            
            output.seek(0)
            
            # Preparar respuesta
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="empleados.xlsx"'
            
            return response
            
        except ImportError:
            return Response(
                {'error': 'Pandas no está instalado. No se puede exportar a Excel.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error exportando a Excel: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor al exportar'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Exportar empleados a PDF"""
        try:
            from reportlab.lib.pagesizes import letter, landscape
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from django.http import HttpResponse
            import io
            from datetime import datetime
            
            # Obtener empleados con filtros aplicados
            queryset = self.filter_queryset(self.get_queryset())
            
            # Crear buffer de memoria
            buffer = io.BytesIO()
            
            # Crear documento PDF
            doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
            story = []
            
            # Estilos
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                alignment=1,  # Center
                spaceAfter=20
            )
            
            # Título
            title = Paragraph("Listado de Empleados", title_style)
            story.append(title)
            story.append(Spacer(1, 12))
            
            # Preparar datos para la tabla
            data = [['Doc.', 'Nombres', 'Apellidos', 'Email', 'Teléfono', 'Cargo', 'Estado']]
            
            for empleado in queryset:
                data.append([
                    empleado.documento,
                    empleado.nombres[:15] + '...' if len(empleado.nombres) > 15 else empleado.nombres,
                    empleado.apellidos[:15] + '...' if len(empleado.apellidos) > 15 else empleado.apellidos,
                    (empleado.correo[:20] + '...') if empleado.correo and len(empleado.correo) > 20 else (empleado.correo or ''),
                    empleado.telefono or '',
                    (empleado.cargo.nombre[:15] + '...') if empleado.cargo and len(empleado.cargo.nombre) > 15 else (empleado.cargo.nombre if empleado.cargo else ''),
                    'Activo' if empleado.activo else 'Inactivo'
                ])
            
            # Crear tabla
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
            
            # Información adicional
            story.append(Spacer(1, 20))
            info = Paragraph(
                f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} | Total empleados: {len(data)-1}",
                styles['Normal']
            )
            story.append(info)
            
            # Construir PDF
            doc.build(story)
            
            # Preparar respuesta
            buffer.seek(0)
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="empleados.pdf"'
            
            return response
            
        except ImportError:
            return Response(
                {'error': 'ReportLab no está instalado. No se puede exportar a PDF.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error exportando a PDF: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor al exportar'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NominaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas"""
    
    serializer_class = NominaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['empleado', 'periodo_inicio', 'periodo_fin']
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['periodo_inicio', 'periodo_fin', 'creado_el']
    ordering = ['-periodo_fin']
    
    def get_queryset(self):
        """Filtrar nóminas por empleados activos"""
        return Nomina.objects.select_related('empleado').filter(empleado__activo=True)


class DetalleNominaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de detalles de nómina"""
    
    serializer_class = DetalleNominaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['nomina', 'item']
    ordering_fields = ['creado_el']
    ordering = ['item__nombre']
    
    def get_queryset(self):
        """Filtrar detalles de nómina"""
        return DetalleNomina.objects.select_related('nomina', 'item')
