# payroll/api_views.py
"""
API VIEWS DE EMPLEADOS Y NÓMINA - APP PAYROLL
==============================================

ViewSets REST para gestión de empleados, contratos, periodos y nómina.
Compatible con React Frontend.
Incluye soporte para nómina dual (simple + electrónica).
"""

from rest_framework import viewsets, filters, status, serializers
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from core.mixins import MultiTenantViewSetMixin
from .models import (
    TipoDocumento, TipoTrabajador, TipoContrato,
    Empleado, Contrato, PeriodoNomina,
    ConceptoLaboral,
    NominaSimple, NominaElectronica,
    DetalleItemNominaSimple, DetalleItemNominaElectronica,
    DetalleConceptoNominaSimple, DetalleConceptoNominaElectronica,
    ConfiguracionNominaElectronica, WebhookConfig, WebhookLog
)

# Alias para compatibilidad
Nomina = NominaSimple
DetalleNomina = DetalleItemNominaSimple

from .serializers import (
    TipoDocumentoSerializer, TipoTrabajadorSerializer, TipoContratoSerializer,
    ConceptoLaboralSerializer, ConceptoLaboralListSerializer,
    EmpleadoSerializer, ContratoSerializer, ContratoListSerializer,
    PeriodoNominaSerializer, PeriodoNominaListSerializer,
    NominaSerializer, NominaListSerializer, NominaSimpleCreateSerializer,
    DetalleNominaSerializer,
    DetalleItemNominaSimpleSerializer, DetalleConceptoNominaSimpleSerializer,
    NominaElectronicaSerializer, NominaElectronicaListSerializer, NominaElectronicaCreateSerializer,
    DetalleItemNominaElectronicaSerializer, DetalleConceptoNominaElectronicaSerializer,
    ConfiguracionNominaElectronicaSerializer,
    WebhookConfigSerializer, WebhookLogSerializer
)

import logging

logger = logging.getLogger(__name__)


# ============================================
# VIEWSETS PARA CATÁLOGOS
# ============================================

class TipoDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para tipos de documento"""
    queryset = TipoDocumento.objects.filter(activo=True)
    serializer_class = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class TipoTrabajadorViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para tipos de trabajador"""
    queryset = TipoTrabajador.objects.filter(activo=True)
    serializer_class = TipoTrabajadorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class TipoContratoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para tipos de contrato"""
    queryset = TipoContrato.objects.filter(activo=True)
    serializer_class = TipoContratoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


# ============================================
# VIEWSET PARA CONCEPTOS LABORALES
# ============================================

class ConceptoLaboralViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gestión de conceptos laborales (devengados/deducciones).
    Soporta CRUD completo con filtrado por tipo y búsqueda.
    """
    serializer_class = ConceptoLaboralSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['codigo', 'nombre', 'descripcion']
    ordering_fields = ['tipo_concepto', 'orden', 'nombre', 'codigo']
    ordering = ['tipo_concepto', 'orden']
    pagination_class = None
    
    def get_queryset(self):
        """Filtrar conceptos activos por defecto"""
        queryset = ConceptoLaboral.objects.all()
        
        # Filtro: solo activos (por defecto)
        solo_activos = self.request.query_params.get('solo_activos', 'true')
        if solo_activos.lower() == 'true':
            queryset = queryset.filter(activo=True)
        
        return queryset
    
    def get_serializer_class(self):
        """Usar serializer compacto para listados"""
        if self.action == 'list':
            return ConceptoLaboralListSerializer
        return ConceptoLaboralSerializer
    
    @action(detail=False, methods=['get'])
    def devengados(self, request):
        """Obtener solo conceptos de tipo devengado"""
        conceptos = self.get_queryset().filter(tipo_concepto='DEV')
        serializer = ConceptoLaboralListSerializer(conceptos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def deducciones(self, request):
        """Obtener solo conceptos de tipo deducción"""
        conceptos = self.get_queryset().filter(tipo_concepto='DED')
        serializer = ConceptoLaboralListSerializer(conceptos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def salariales(self, request):
        """Obtener solo conceptos salariales"""
        conceptos = self.get_queryset().filter(es_salarial=True, activo=True)
        serializer = ConceptoLaboralListSerializer(conceptos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """Activar/desactivar un concepto"""
        concepto = self.get_object()
        concepto.activo = not concepto.activo
        concepto.save()
        
        return Response({
            'success': True,
            'activo': concepto.activo,
            'message': f'Concepto {"activado" if concepto.activo else "desactivado"} exitosamente'
        })


# ============================================
# VIEWSET PARA EMPLEADOS
# ============================================


class EmpleadoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de empleados con soporte multi-tenant"""
    
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'activo', 'genero', 'cargo', 'departamento', 'municipio',
        'tipo_documento', 'tipo_vinculacion'
    ]
    search_fields = ['nombres', 'apellidos', 'documento', 'correo']
    ordering_fields = ['nombres', 'apellidos', 'documento', 'fecha_ingreso', 'creado_el']
    ordering = ['apellidos', 'nombres']
    pagination_class = None  # Sin paginación para mostrar todos
    
    def get_queryset(self):
        """Filtrar empleados con relaciones optimizadas"""
        queryset = Empleado.objects.select_related(
            'departamento', 'municipio', 'cargo',
            'tipo_documento', 'tipo_vinculacion'
        )
        
        # Solo mostrar empleados activos por defecto
        if not self.request.query_params.get('incluir_inactivos'):
            queryset = queryset.filter(activo=True)
        
        # Filtro adicional por tipo de vinculación
        tipo_vinculacion = self.request.query_params.get('tipo_vinculacion_codigo')
        if tipo_vinculacion:
            queryset = queryset.filter(tipo_vinculacion__codigo=tipo_vinculacion)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def subcontratistas(self, request):
        """Endpoint específico para obtener solo subcontratistas"""
        subcontratistas = self.get_queryset().filter(
            tipo_vinculacion__codigo='SUB',
            activo=True
        )
        serializer = self.get_serializer(subcontratistas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Endpoint para obtener solo empleados activos"""
        empleados_activos = self.get_queryset().filter(activo=True)
        serializer = self.get_serializer(empleados_activos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dependientes(self, request):
        """Endpoint específico para obtener solo empleados dependientes"""
        dependientes = self.get_queryset().filter(
            tipo_vinculacion__codigo='DEP',
            activo=True
        )
        serializer = self.get_serializer(dependientes, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Crear empleado con logging"""
        logger.info("=== CREAR EMPLEADO ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"Organización: {request.user.organization}")
        logger.info(f"Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Asignar automáticamente la organización del usuario
            empleado = serializer.save(organization=request.user.organization)
            logger.info(f"Empleado creado exitosamente: {empleado}")
            logger.info(f"Organización asignada: {empleado.organization}")
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
            # Mantener la organización original (no permitir cambiarla)
            empleado = serializer.save(organization=instance.organization)
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


# ============================================
# VIEWSET PARA CONTRATOS
# ============================================

class ContratoViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de contratos laborales"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'salario_base', 'creado_el']
    ordering = ['-fecha_inicio']
    
    def get_serializer_class(self):
        """Usar serializer simplificado para listados"""
        if self.action == 'list':
            return ContratoListSerializer
        return ContratoSerializer
    
    def get_queryset(self):
        """Filtrar contratos con relaciones optimizadas"""
        queryset = Contrato.objects.select_related(
            'empleado', 'tipo_contrato'
        )
        
        # Filtro por estado
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtro por contratos activos
        solo_activos = self.request.query_params.get('solo_activos')
        if solo_activos:
            queryset = queryset.filter(estado='ACT')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Endpoint para obtener solo contratos activos"""
        contratos_activos = self.get_queryset().filter(estado='ACT')
        serializer = self.get_serializer(contratos_activos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def terminar(self, request, pk=None):
        """Terminar un contrato"""
        contrato = self.get_object()
        
        motivo = request.data.get('motivo_terminacion', '')
        fecha_terminacion = request.data.get('fecha_terminacion_real')
        
        if not fecha_terminacion:
            return Response(
                {'error': 'Se requiere fecha_terminacion_real'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        contrato.estado = 'TER'
        contrato.motivo_terminacion = motivo
        contrato.fecha_terminacion_real = fecha_terminacion
        contrato.save()
        
        serializer = self.get_serializer(contrato)
        return Response(serializer.data)


# ============================================
# VIEWSET PARA PERIODOS DE NÓMINA
# ============================================

class PeriodoNominaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de periodos de nómina"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'observaciones']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'fecha_pago', 'creado_el']
    ordering = ['-fecha_inicio']
    
    def get_serializer_class(self):
        """Usar serializer simplificado para listados"""
        if self.action == 'list':
            return PeriodoNominaListSerializer
        return PeriodoNominaSerializer
    
    def get_queryset(self):
        """Filtrar periodos con relaciones optimizadas"""
        queryset = PeriodoNomina.objects.prefetch_related('nomina_set')
        
        # Filtro por estado
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtro por tipo
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def abiertos(self, request):
        """Endpoint para obtener solo periodos abiertos"""
        periodos_abiertos = self.get_queryset().filter(estado='ABI')
        serializer = self.get_serializer(periodos_abiertos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Cerrar un periodo de nómina"""
        from django.utils import timezone
        
        periodo = self.get_object()
        
        if periodo.estado != 'ABI':
            return Response(
                {'error': 'Solo se pueden cerrar periodos abiertos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        periodo.estado = 'CER'
        periodo.cerrado_por = request.user
        periodo.fecha_cierre = timezone.now()
        periodo.save()
        
        serializer = self.get_serializer(periodo)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar un periodo de nómina cerrado"""
        periodo = self.get_object()
        
        if periodo.estado != 'CER':
            return Response(
                {'error': 'Solo se pueden aprobar periodos cerrados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        periodo.estado = 'APR'
        periodo.save()
        
        serializer = self.get_serializer(periodo)
        return Response(serializer.data)


# ============================================
# VIEWSET PARA NÓMINA
# ============================================

class NominaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas con soporte para IBC y excedente"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['empleado__nombres', 'empleado__apellidos', 'empleado__documento']
    ordering_fields = ['periodo_inicio', 'periodo_fin', 'ingreso_real_periodo', 'creado_el']
    ordering = ['-periodo_fin']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return NominaSimpleCreateSerializer
        if self.action == 'list':
            return NominaListSerializer
        return NominaSerializer
    
    def get_queryset(self):
        """Filtrar nóminas con relaciones optimizadas"""
        queryset = Nomina.objects.select_related(
            'empleado', 'periodo', 'creado_por'
        ).prefetch_related('detalles_items', 'detalles_conceptos')
        
        # Filtro por tipo de vinculación
        tipo_vinculacion = self.request.query_params.get('tipo_vinculacion')
        if tipo_vinculacion:
            queryset = queryset.filter(empleado__tipo_vinculacion__codigo=tipo_vinculacion)
        
        # Filtro por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_desde:
            queryset = queryset.filter(periodo_inicio__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(periodo_fin__lte=fecha_hasta)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Crear nómina con detalles y cálculo automático"""
        logger.info("=== CREAR NÓMINA ===")
        logger.info(f"Usuario: {request.user.email}")
        logger.info(f"Datos recibidos: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            nomina = serializer.save(organization=request.user.organization)
            logger.info(f"Nómina creada exitosamente: {nomina}")
            logger.info(f"Ingreso real: ${nomina.ingreso_real_periodo}, IBC: ${nomina.ibc_cotizacion}, Excedente: ${nomina.excedente_no_salarial}")
            
            # Retornar con serializer de lectura
            return Response(
                NominaSerializer(nomina).data,
                status=status.HTTP_201_CREATED
            )
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Actualizar nómina con detalles"""
        logger.info("=== ACTUALIZAR NÓMINA ===")
        logger.info(f"ID Nómina: {kwargs.get('pk')}")
        logger.info(f"Datos recibidos: {request.data}")
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            nomina = serializer.save(organization=instance.organization)
            logger.info(f"Nómina actualizada exitosamente: {nomina}")
            # Retornar con serializer de lectura
            return Response(NominaSerializer(nomina).data)
        else:
            logger.error(f"Errores de validación: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def calcular_automatico(self, request, pk=None):
        """
        Recalcular automáticamente todos los valores de la nómina
        Aplica lógica de IBC para subcontratistas
        """
        nomina = self.get_object()
        
        try:
            resultado = nomina.calcular_automatico()
            nomina.save()
            
            logger.info(f"Nómina #{nomina.id} recalculada automáticamente")
            logger.info(f"Resultado: {resultado}")
            
            return Response({
                'success': True,
                'message': 'Nómina recalculada exitosamente',
                'resultado': resultado,
                'nomina': NominaSerializer(nomina).data
            })
        except Exception as e:
            logger.error(f"Error al recalcular nómina #{nomina.id}: {str(e)}")
            return Response(
                {'error': f'Error al recalcular: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def recalcular_periodo(self, request):
        """
        Recalcular automáticamente todas las nóminas de un periodo
        """
        periodo_id = request.data.get('periodo_id')
        
        if not periodo_id:
            return Response(
                {'error': 'Se requiere periodo_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        nominas = self.get_queryset().filter(periodo_id=periodo_id)
        count = 0
        errores = []
        
        for nomina in nominas:
            try:
                nomina.calcular_automatico()
                nomina.save()
                count += 1
            except Exception as e:
                errores.append({
                    'nomina_id': nomina.id,
                    'empleado': nomina.empleado.nombre_completo,
                    'error': str(e)
                })
        
        return Response({
            'success': True,
            'recalculadas': count,
            'total': nominas.count(),
            'errores': errores
        })
    
    @action(detail=False, methods=['get'])
    def subcontratistas(self, request):
        """Endpoint específico para nóminas de subcontratistas"""
        nominas_sub = self.get_queryset().filter(
            empleado__tipo_vinculacion__codigo='SUB'
        )
        
        # Aplicar filtros de fecha si existen
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            nominas_sub = nominas_sub.filter(periodo_inicio__gte=fecha_desde)
        if fecha_hasta:
            nominas_sub = nominas_sub.filter(periodo_fin__lte=fecha_hasta)
        
        serializer = NominaListSerializer(nominas_sub, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def desprendible(self, request, pk=None):
        """Generar desprendible de nómina en PDF"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            from django.http import HttpResponse
            import io
            from datetime import datetime
            
            nomina = self.get_object()
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
            story = []
            styles = getSampleStyleSheet()
            
            # Estilos personalizados
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=18,
                textColor=colors.HexColor('#1e3a8a'),
                alignment=TA_CENTER,
                spaceAfter=10
            )
            
            subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Normal'],
                fontSize=12,
                textColor=colors.HexColor('#64748b'),
                alignment=TA_CENTER,
                spaceAfter=20
            )
            
            header_style = ParagraphStyle(
                'Header',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.HexColor('#0f172a'),
                spaceAfter=12,
                spaceBefore=12
            )
            
            # Título principal
            title = Paragraph(f"<b>DESPRENDIBLE DE NÓMINA</b>", title_style)
            story.append(title)
            
            subtitle = Paragraph(
                f"Período: {nomina.periodo_inicio.strftime('%d/%m/%Y')} al {nomina.periodo_fin.strftime('%d/%m/%Y')}",
                subtitle_style
            )
            story.append(subtitle)
            story.append(Spacer(1, 0.3*inch))
            
            # Información del empleado
            empleado_data = [
                ['<b>INFORMACIÓN DEL EMPLEADO</b>', ''],
            ]
            
            emp_info_data = [
                ['Nombres:', nomina.empleado.nombre_completo],
                ['Documento:', nomina.empleado.documento],
                ['Cargo:', nomina.empleado.cargo.nombre if nomina.empleado.cargo else 'N/A'],
                ['Email:', nomina.empleado.correo or 'N/A'],
            ]
            
            empleado_table = Table([empleado_data[0]] + emp_info_data, colWidths=[2*inch, 4.5*inch])
            empleado_table.setStyle(TableStyle([
                # Header
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('SPAN', (0, 0), (-1, 0)),
                # Body
                ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#e2e8f0')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(empleado_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Detalle de producción
            story.append(Paragraph("<b>DETALLE DE PRODUCCIÓN</b>", header_style))
            
            detalle_data = [['Item', 'Cantidad', 'Precio Unit.', 'Total']]
            for detalle in nomina.detallenomina_set.all():
                detalle_data.append([
                    detalle.item.nombre,
                    f"{detalle.cantidad:,.2f}",
                    f"${detalle.item.precio_unitario:,.2f}",
                    f"${detalle.total:,.2f}"
                ])
            
            detalle_table = Table(detalle_data, colWidths=[3*inch, 1*inch, 1.25*inch, 1.25*inch])
            detalle_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fdfa')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#99f6e4')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            story.append(detalle_table)
            story.append(Spacer(1, 0.2*inch))
            
            # Resumen financiero
            resumen_data = [
                ['<b>RESUMEN FINANCIERO</b>', ''],
            ]
            
            financiero_data = [
                ['Subtotal Producción:', f"${nomina.produccion:,.2f}"],
                ['(-) Seguridad Social:', f"${nomina.seguridad:,.2f}"],
                ['(-) Descuento Préstamos:', f"${nomina.prestamos:,.2f}"],
                ['(-) Descuento Restaurante:', f"${nomina.restaurante:,.2f}"],
                ['<b>TOTAL A PAGAR:</b>', f"<b>${nomina.total:,.2f}</b>"],
            ]
            
            resumen_table = Table([resumen_data[0]] + financiero_data, colWidths=[4*inch, 2.5*inch])
            resumen_table.setStyle(TableStyle([
                # Header
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('SPAN', (0, 0), (-1, 0)),
                # Body
                ('BACKGROUND', (0, 1), (0, -2), colors.HexColor('#f8fafc')),
                ('ALIGN', (0, 1), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 10),
                # Total row
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#22c55e')),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(resumen_table)
            story.append(Spacer(1, 0.4*inch))
            
            # Pie de página
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#64748b'),
                alignment=TA_CENTER
            )
            
            footer = Paragraph(
                f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} | Sistema de Nómina CorteSec",
                footer_style
            )
            story.append(footer)
            
            # Construir PDF
            doc.build(story)
            
            buffer.seek(0)
            response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
            filename = f"desprendible_{nomina.empleado.documento}_{nomina.periodo_inicio.strftime('%Y%m')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except ImportError as e:
            logger.error(f"Error de importación: {str(e)}")
            return Response(
                {'error': 'ReportLab no está instalado. No se puede generar el desprendible.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error generando desprendible: {str(e)}")
            return Response(
                {'error': f'Error generando desprendible: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exportar nóminas a Excel"""
        try:
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            queryset = self.filter_queryset(self.get_queryset())
            
            data = []
            for nomina in queryset:
                data.append({
                    'Período Inicio': nomina.periodo_inicio.strftime('%Y-%m-%d'),
                    'Período Fin': nomina.periodo_fin.strftime('%Y-%m-%d'),
                    'Empleado': nomina.empleado.nombre_completo,
                    'Documento': nomina.empleado.documento,
                    'Cargo': nomina.empleado.cargo.nombre if nomina.empleado.cargo else '',
                    'Producción': float(nomina.produccion),
                    'Seguridad': float(nomina.seguridad),
                    'Préstamos': float(nomina.prestamos),
                    'Restaurante': float(nomina.restaurante),
                    'Total': float(nomina.total),
                })
            
            df = pd.DataFrame(data)
            output = io.BytesIO()
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Nóminas', index=False)
            
            output.seek(0)
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="nominas.xlsx"'
            
            return response
            
        except ImportError:
            return Response(
                {'error': 'Pandas no está instalado'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error exportando: {str(e)}")
            return Response(
                {'error': 'Error exportando'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de nóminas"""
        from django.db.models import Sum, Avg, Count
        queryset = self.get_queryset()
        
        stats = {
            'total_nominas': queryset.count(),
            'total_produccion': queryset.aggregate(total=Sum('detalles_items__cantidad'))['total'] or 0,
            'total_pagado': queryset.aggregate(total=Sum('neto_pagar'))['total'] or 0,
            'promedio_por_nomina': queryset.aggregate(promedio=Avg('neto_pagar'))['promedio'] or 0,
            'empleados_con_nomina': queryset.values('empleado').distinct().count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def sin_electronica(self, request):
        """
        Obtener nóminas simples que NO tienen nómina electrónica asociada
        Útil para el modal de generación de nómina electrónica desde existente
        """
        queryset = self.get_queryset().filter(
            nomina_electronica__isnull=True
        ).order_by('-periodo_fin')
        
        # Filtro opcional por periodo
        periodo_id = request.query_params.get('periodo_id')
        if periodo_id:
            queryset = queryset.filter(periodo_id=periodo_id)
        
        # Filtro opcional por empleado
        empleado_id = request.query_params.get('empleado_id')
        if empleado_id:
            queryset = queryset.filter(empleado_id=empleado_id)
        
        serializer = NominaListSerializer(queryset, many=True)
        return Response(serializer.data)


class DetalleNominaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de detalles de nómina"""
    
    serializer_class = DetalleNominaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['creado_el']
    ordering = ['item__nombre']
    
    def get_queryset(self):
        """Filtrar detalles de nómina"""
        return DetalleNomina.objects.select_related('nomina', 'item')


# ============================================
# VIEWSETS PARA FASE 2A - INTEGRACIONES
# ============================================
# COMENTADO TEMPORALMENTE - Modelos eliminados en refactorización v3.0
# Se reimplementarán con la nueva arquitectura basada en NominaBase

# FIN DE VIEWSETS COMENTADOS (TipoDeduccion, DetalleDeduccion, ComprobanteContableNomina, HistorialNomina)


# ============================================
# VIEWSETS PARA FASE 2B - NÓMINA ELECTRÓNICA
# ============================================


class NominaElectronicaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de nóminas electrónicas"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['numero_documento', 'cune', 'empleado__primer_nombre', 'empleado__primer_apellido']
    ordering_fields = ['fecha_creacion', 'fecha_envio_dian', 'numero_documento']
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return NominaElectronicaCreateSerializer
        elif self.action == 'list':
            return NominaElectronicaListSerializer
        return NominaElectronicaSerializer
    
    def get_queryset(self):
        """Filtrar nóminas electrónicas con información relacionada"""
        return NominaElectronica.objects.select_related(
            'empleado',
            'periodo',
            'nomina_simple',
            'creado_por'
        ).prefetch_related('detalles_items', 'detalles_conceptos')
    
    def create(self, request, *args, **kwargs):
        """Crear nómina electrónica con detalles anidados"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Guardar con contexto de usuario
        nomina_electronica = serializer.save(
            creado_por=request.user,
            organization=request.user.organization
        )
        
        logger.info(f"Nómina electrónica creada: {nomina_electronica.numero_documento}")
        
        # Devolver con serializer de lectura
        output_serializer = NominaElectronicaSerializer(nomina_electronica)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def generar_xml(self, request, pk=None):
        """Generar XML de nómina electrónica"""
        nomina_electronica = self.get_object()
        
        if nomina_electronica.estado not in ['borrador', 'error']:
            return Response(
                {'error': 'Solo se puede generar XML en estado borrador o error'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Actualizar estado
            nomina_electronica.estado = 'generando'
            nomina_electronica.save(update_fields=['estado'])
            
            # Generar XML (implementar lógica de generación)
            from .xml_generator import NominaElectronicaXMLGenerator
            generator = NominaElectronicaXMLGenerator(nomina_electronica)
            xml_contenido = generator.generar()
            
            # Guardar XML
            nomina_electronica.xml_contenido = xml_contenido
            nomina_electronica.estado = 'generado'
            nomina_electronica.save(update_fields=['xml_contenido', 'estado'])
            
            serializer = self.get_serializer(nomina_electronica)
            return Response(serializer.data)
            
        except Exception as e:
            nomina_electronica.estado = 'error'
            nomina_electronica.errores = {'error': str(e)}
            nomina_electronica.save(update_fields=['estado', 'errores'])
            
            logger.error(f"Error generando XML: {str(e)}")
            return Response(
                {'error': f'Error generando XML: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def firmar(self, request, pk=None):
        """Firmar digitalmente la nómina electrónica"""
        nomina_electronica = self.get_object()
        
        if nomina_electronica.estado != 'generado':
            return Response(
                {'error': 'Solo se puede firmar en estado generado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not nomina_electronica.xml_contenido:
            return Response(
                {'error': 'No hay XML generado para firmar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Actualizar estado
            nomina_electronica.estado = 'firmando'
            nomina_electronica.save(update_fields=['estado'])
            
            # Firmar XML (implementar lógica de firma)
            from .firma_digital import FirmaDigitalNomina
            firmador = FirmaDigitalNomina()
            xml_firmado = firmador.firmar(nomina_electronica.xml_contenido, nomina_electronica.organization)
            
            # Generar CUNE
            nomina_electronica.xml_firmado = xml_firmado
            nomina_electronica.generar_cune()
            nomina_electronica.estado = 'firmado'
            nomina_electronica.save(update_fields=['xml_firmado', 'cune', 'estado'])
            
            serializer = self.get_serializer(nomina_electronica)
            return Response(serializer.data)
            
        except Exception as e:
            nomina_electronica.estado = 'error'
            nomina_electronica.errores = {'error': str(e)}
            nomina_electronica.save(update_fields=['estado', 'errores'])
            
            logger.error(f"Error firmando XML: {str(e)}")
            return Response(
                {'error': f'Error firmando XML: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def enviar_dian(self, request, pk=None):
        """Enviar nómina electrónica a DIAN"""
        nomina_electronica = self.get_object()
        
        if not nomina_electronica.puede_enviar:
            return Response(
                {'error': 'La nómina no está lista para enviar. Debe estar firmada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            
            # Actualizar estado
            nomina_electronica.estado = 'enviando'
            nomina_electronica.intentos_envio += 1
            nomina_electronica.ultimo_intento = datetime.now()
            nomina_electronica.save(update_fields=['estado', 'intentos_envio', 'ultimo_intento'])
            
            # Enviar a DIAN (implementar integración)
            from .dian_client import DIANClient
            client = DIANClient(nomina_electronica.organization)
            respuesta = client.enviar_nomina(nomina_electronica)
            
            # Procesar respuesta
            nomina_electronica.track_id = respuesta.get('track_id', '')
            nomina_electronica.codigo_respuesta = respuesta.get('codigo', '')
            nomina_electronica.mensaje_respuesta = respuesta.get('mensaje', '')
            nomina_electronica.fecha_envio = datetime.now()
            
            if respuesta.get('exitoso'):
                nomina_electronica.estado = 'aceptado'
                nomina_electronica.fecha_validacion_dian = datetime.now()
            else:
                nomina_electronica.estado = 'rechazado'
                nomina_electronica.errores = respuesta.get('errores', {})
            
            nomina_electronica.save()
            
            serializer = self.get_serializer(nomina_electronica)
            return Response(serializer.data)
            
        except Exception as e:
            nomina_electronica.estado = 'error'
            nomina_electronica.errores = {'error': str(e)}
            nomina_electronica.save(update_fields=['estado', 'errores'])
            
            logger.error(f"Error enviando a DIAN: {str(e)}")
            return Response(
                {'error': f'Error enviando a DIAN: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def procesar_completo(self, request, pk=None):
        """Procesar nómina completa: generar XML, firmar y enviar a DIAN"""
        nomina_electronica = self.get_object()
        
        if nomina_electronica.estado not in ['borrador', 'error']:
            return Response(
                {'error': 'Solo se puede procesar en estado borrador o error'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 1. Generar XML
            nomina_electronica.estado = 'generando'
            nomina_electronica.save(update_fields=['estado'])
            
            from .xml_generator import NominaElectronicaXMLGenerator
            generator = NominaElectronicaXMLGenerator(nomina_electronica)
            xml_contenido = generator.generar()
            
            nomina_electronica.xml_contenido = xml_contenido
            nomina_electronica.estado = 'generado'
            nomina_electronica.save(update_fields=['xml_contenido', 'estado'])
            
            # 2. Firmar
            nomina_electronica.estado = 'firmando'
            nomina_electronica.save(update_fields=['estado'])
            
            from .firma_digital import FirmaDigitalNomina
            firmador = FirmaDigitalNomina()
            xml_firmado = firmador.firmar(xml_contenido, nomina_electronica.organization)
            
            nomina_electronica.xml_firmado = xml_firmado
            nomina_electronica.generar_cune()
            nomina_electronica.estado = 'firmado'
            nomina_electronica.save(update_fields=['xml_firmado', 'cune', 'estado'])
            
            # 3. Enviar a DIAN
            from datetime import datetime
            nomina_electronica.estado = 'enviando'
            nomina_electronica.intentos_envio += 1
            nomina_electronica.ultimo_intento = datetime.now()
            nomina_electronica.save(update_fields=['estado', 'intentos_envio', 'ultimo_intento'])
            
            from .dian_client import DIANClient
            client = DIANClient(nomina_electronica.organization)
            respuesta = client.enviar_nomina(nomina_electronica)
            
            nomina_electronica.track_id = respuesta.get('track_id', '')
            nomina_electronica.codigo_respuesta = respuesta.get('codigo', '')
            nomina_electronica.mensaje_respuesta = respuesta.get('mensaje', '')
            nomina_electronica.fecha_envio = datetime.now()
            
            if respuesta.get('exitoso'):
                nomina_electronica.estado = 'aceptado'
                nomina_electronica.fecha_validacion_dian = datetime.now()
            else:
                nomina_electronica.estado = 'rechazado'
                nomina_electronica.errores = respuesta.get('errores', {})
            
            nomina_electronica.save()
            
            serializer = self.get_serializer(nomina_electronica)
            return Response({
                'mensaje': 'Procesamiento completado exitosamente',
                'data': serializer.data
            })
            
        except Exception as e:
            nomina_electronica.estado = 'error'
            nomina_electronica.errores = {'error': str(e)}
            nomina_electronica.save(update_fields=['estado', 'errores'])
            
            logger.error(f"Error procesando nómina completa: {str(e)}")
            return Response(
                {'error': f'Error procesando: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def descargar_xml(self, request, pk=None):
        """Descargar XML firmado"""
        from django.http import HttpResponse
        
        nomina_electronica = self.get_object()
        
        if not nomina_electronica.xml_firmado:
            return Response(
                {'error': 'No hay XML firmado disponible'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = HttpResponse(nomina_electronica.xml_firmado, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{nomina_electronica.numero_documento}.xml"'
        return response
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de nóminas electrónicas"""
        from django.db.models import Count, Sum
        
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'por_estado': dict(
                queryset.values_list('estado').annotate(Count('id'))
            ),
            'aceptadas': queryset.filter(estado='aceptado').count(),
            'rechazadas': queryset.filter(estado='rechazado').count(),
            'pendientes': queryset.filter(estado__in=['borrador', 'generado', 'firmado']).count(),
        }
        
        return Response(stats)
    
    """
    # ACTION COMENTADO: usa DevengadoNominaElectronica y DeduccionNominaElectronica (eliminados)
    # En la nueva arquitectura, los items de nómina se manejan con DetalleItemNominaElectronica
    
    @action(detail=False, methods=['post'])
    def generar_desde_nomina(self, request):
        '''Generar nómina electrónica automáticamente desde nómina simple'''
        nomina_id = request.data.get('nomina_id')
        
        if not nomina_id:
            return Response(
                {'error': 'nomina_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            nomina = Nomina.objects.get(id=nomina_id, organization=request.user.organization)
            
            # Verificar si ya existe nómina electrónica
            if hasattr(nomina, 'nomina_electronica'):
                return Response(
                    {'error': 'Esta nómina ya tiene un documento electrónico asociado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear nómina electrónica
            nomina_electronica = NominaElectronica.objects.create(
                organization=request.user.organization,
                nomina=nomina,
                generado_por=request.user,
                fecha_emision=nomina.periodo_fin
            )
            
            # Generar número de documento
            nomina_electronica.generar_numero_documento()
            nomina_electronica.save()
            
            # Crear devengados automáticamente
            DevengadoNominaElectronica.objects.create(
                organization=request.user.organization,
                nomina_electronica=nomina_electronica,
                tipo='basico',
                concepto='Ingreso del periodo',
                valor_total=nomina.ingreso_real_periodo,
                es_salarial=True
            )
            
            # Crear deducciones automáticamente
            if nomina.deduccion_salud > 0:
                DeduccionNominaElectronica.objects.create(
                    organization=request.user.organization,
                    nomina_electronica=nomina_electronica,
                    tipo='salud',
                    concepto='Aporte Salud 4%',
                    porcentaje=4,
                    valor=nomina.deduccion_salud
                )
            
            if nomina.deduccion_pension > 0:
                DeduccionNominaElectronica.objects.create(
                    organization=request.user.organization,
                    nomina_electronica=nomina_electronica,
                    tipo='pension',
                    concepto='Aporte Pensión 4%',
                    porcentaje=4,
                    valor=nomina.deduccion_pension
                )
            
            serializer = self.get_serializer(nomina_electronica)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Nomina.DoesNotExist:
            return Response(
                {'error': 'Nómina no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error generando nómina electrónica: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    """


class ConfiguracionNominaElectronicaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para configuración de nómina electrónica"""
    
    serializer_class = ConfiguracionNominaElectronicaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    filter_backends = []
    def get_queryset(self):
        """Filtrar configuraciones por organización"""
        return ConfiguracionNominaElectronica.objects.filter(
            organization=self.request.user.organization
        )
    
    @action(detail=False, methods=['get'])
    def activa(self, request):
        """Obtener configuración activa"""
        config = ConfiguracionNominaElectronica.objects.filter(
            organization=request.user.organization,
            activa=True
        ).first()
        
        if not config:
            return Response(
                {'error': 'No hay configuración activa'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activar esta configuración"""
        config = self.get_object()
        config.activa = True
        config.save()
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def probar_conexion(self, request, pk=None):
        """Probar conexión con DIAN"""
        config = self.get_object()
        
        try:
            from .dian_client import DIANClient
            client = DIANClient(config.organization)
            resultado = client.probar_conexion()
            
            return Response({
                'exitoso': resultado['exitoso'],
                'mensaje': resultado['mensaje']
            })
            
        except Exception as e:
            return Response(
                {'exitoso': False, 'mensaje': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# FASE 3: WEBHOOKS CONFIGURATION
# ============================================

class WebhookConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuración de webhooks"""
    class Meta:
        model = WebhookConfig
        fields = [
            'id', 'nombre', 'url', 'secret', 'activo', 'eventos',
            'reintentos_maximos', 'timeout_segundos',
            'total_disparos', 'total_exitosos', 'total_fallidos',
            'ultimo_disparo', 'ultimo_estado',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = [
            'total_disparos', 'total_exitosos', 'total_fallidos',
            'ultimo_disparo', 'ultimo_estado',
            'fecha_creacion', 'fecha_modificacion'
        ]


class WebhookConfigViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet para configuración de webhooks
    
    Endpoints:
    - GET /api/payroll/webhooks/ - Listar webhooks
    - POST /api/payroll/webhooks/ - Crear webhook
    - GET /api/payroll/webhooks/{id}/ - Detalle
    - PUT/PATCH /api/payroll/webhooks/{id}/ - Actualizar
    - DELETE /api/payroll/webhooks/{id}/ - Eliminar
    - POST /api/payroll/webhooks/{id}/probar/ - Probar webhook
    - GET /api/payroll/webhooks/{id}/logs/ - Ver logs
    """
    
    queryset = WebhookConfig.objects.all()
    serializer_class = WebhookConfigSerializer
    
    @action(detail=True, methods=['post'])
    def probar(self, request, pk=None):
        """
        Prueba un webhook con datos de ejemplo
        
        POST /api/payroll/webhooks/{id}/probar/
        """
        webhook = self.get_object()
        
        from payroll.notifications import WebhookNotifier
        import time
        
        # Datos de prueba
        datos_prueba = {
            'test': True,
            'webhook_id': webhook.id,
            'timestamp': timezone.now().isoformat(),
            'mensaje': 'Este es un webhook de prueba'
        }
        
        inicio = time.time()
        
        try:
            WebhookNotifier._enviar_webhook(
                url=webhook.url,
                evento='test',
                datos=datos_prueba,
                secret=webhook.secret
            )
            
            tiempo_respuesta = time.time() - inicio
            
            # Registrar resultado
            webhook.registrar_disparo(exitoso=True)
            
            return Response({
                'exitoso': True,
                'mensaje': 'Webhook probado exitosamente',
                'tiempo_respuesta': round(tiempo_respuesta, 3)
            })
            
        except Exception as e:
            webhook.registrar_disparo(exitoso=False)
            
            return Response(
                {
                    'exitoso': False,
                    'error': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """
        Obtiene logs del webhook
        
        GET /api/payroll/webhooks/{id}/logs/
        """
        webhook = self.get_object()
        
        # Últimos 100 logs
        logs = webhook.logs.all()[:100]
        
        data = [
            {
                'id': log.id,
                'evento': log.evento,
                'exitoso': log.exitoso,
                'codigo_respuesta': log.codigo_respuesta,
                'error': log.error,
                'tiempo_respuesta': log.tiempo_respuesta,
                'fecha_disparo': log.fecha_disparo
            }
            for log in logs
        ]
        
        return Response(data)


class PortalEmpleadoViewSet(viewsets.GenericViewSet):
    """
    ViewSet para portal de empleado - Consulta de nóminas propias
    Solo permite a empleados ver sus propias nóminas
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]  # CRÍTICO: Agregar autenticación por token
    queryset = Empleado.objects.none()  # Requerido para GenericViewSet
    
    def get_empleado(self):
        """Obtener empleado asociado al usuario actual por email"""
        logger.info(f"🔍 get_empleado called for user: {self.request.user.email}")
        try:
            empleado = Empleado.objects.get(
                correo=self.request.user.email,
                organization=self.request.user.organization
            )
            logger.info(f"✅ Empleado found: {empleado.id} - {empleado.nombres}")
            return empleado
        except Empleado.DoesNotExist:
            logger.warning(f"❌ No empleado found for {self.request.user.email}")
            return None
    
    @action(detail=False, methods=['get'])
    def mis_nominas(self, request):
        """
        Obtener nóminas del empleado autenticado
        GET /api/payroll/portal-empleado/mis_nominas/?año=2026&mes=1
        """
        logger.info(f"📥 mis_nominas called by user: {request.user.email}")
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'Usuario no tiene empleado asociado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        queryset = NominaSimple.objects.filter(
            empleado=empleado,
            organization=request.user.organization
        ).select_related('periodo', 'empleado').order_by('-fecha_creacion')
        
        # Filtros opcionales
        año = request.query_params.get('año')
        mes = request.query_params.get('mes')
        
        if año:
            queryset = queryset.filter(periodo_inicio__year=año)
        if mes:
            queryset = queryset.filter(periodo_inicio__month=mes)
        
        serializer = NominaListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtener estadísticas de nóminas del empleado
        GET /api/payroll/portal-empleado/estadisticas/
        """
        logger.info(f"📥 estadisticas called by user: {request.user.email}")
        from django.db.models import Sum, Count, Avg
        
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'Usuario no tiene empleado asociado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        nominas = NominaSimple.objects.filter(
            empleado=empleado,
            organization=request.user.organization
        )
        
        # Contar nóminas por estado
        por_estado = {
            'pendiente': nominas.filter(estado='PENDIENTE').count(),
            'aprobada': nominas.filter(estado='APROBADA').count(),
            'pagada': nominas.filter(estado='PAGADA').count(),
            'rechazada': nominas.filter(estado='RECHAZADA').count(),
        }
        
        stats = {
            'total_nominas': nominas.count(),
            'total_pagado_año': nominas.filter(
                periodo_inicio__year=2026
            ).aggregate(total=Sum('neto_pagar'))['total'] or 0,
            'promedio_mensual': nominas.aggregate(
                promedio=Avg('neto_pagar')
            )['promedio'] or 0,
            'por_estado': por_estado,
            'ultima_nomina': None
        }
        
        ultima = nominas.first()
        if ultima:
            stats['ultima_nomina'] = {
                'id': ultima.id,
                'periodo': f"{ultima.periodo_inicio} - {ultima.periodo_fin}",
                'neto_pagar': float(ultima.neto_pagar),
                'estado': ultima.estado
            }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def historial_pagos(self, request):
        """
        GET /api/payroll/portal-empleado/historial_pagos/?año=2026
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response([], status=status.HTTP_200_OK)
        
        nominas = NominaSimple.objects.filter(
            empleado=empleado,
            organization=request.user.organization,
            estado='APROBADA'
        ).order_by('-fecha_pago')
        
        año = request.query_params.get('año')
        if año:
            nominas = nominas.filter(fecha_pago__year=año)
        
        data = [{
            'id': n.id,
            'fecha_pago': n.fecha_pago,
            'periodo': f"{n.periodo_inicio} - {n.periodo_fin}",
            'neto_pagar': float(n.neto_pagar),
            'comprobante': n.comprobante_pago
        } for n in nominas[:50]]
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def resumen_mensual(self, request):
        """
        GET /api/payroll/portal-empleado/resumen_mensual/?año=2026&mes=1
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response({}, status=status.HTTP_200_OK)
        
        año = request.query_params.get('año', 2026)
        mes = request.query_params.get('mes', 1)
        
        nomina = NominaSimple.objects.filter(
            empleado=empleado,
            organization=request.user.organization,
            periodo_inicio__year=año,
            periodo_inicio__month=mes
        ).first()
        
        if not nomina:
            return Response({'mensaje': 'No hay nómina para este periodo'})
        
        return Response(NominaSerializer(nomina).data)
    
    @action(detail=False, methods=['get'])
    def certificado_ingresos(self, request):
        """
        GET /api/payroll/portal-empleado/certificado_ingresos/?año=2026
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'Empleado no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        año = request.query_params.get('año', 2026)
        
        nominas = NominaSimple.objects.filter(
            empleado=empleado,
            organization=request.user.organization,
            periodo_inicio__year=año,
            estado='APROBADA'
        )
        
        from django.db.models import Sum
        
        resumen = {
            'empleado': {
                'nombres': f"{empleado.primer_nombre} {empleado.segundo_nombre or ''}",
                'apellidos': f"{empleado.primer_apellido} {empleado.segundo_apellido or ''}",
                'documento': empleado.numero_documento,
                'cargo': empleado.cargo.nombre if empleado.cargo else 'N/A'
            },
            'año': año,
            'ingresos': {
                'total_devengado': nominas.aggregate(
                    total=Sum('total_items')
                )['total'] or 0,
                'total_deducciones': nominas.aggregate(
                    total=Sum('total_deducciones')
                )['total'] or 0,
                'neto_pagado': nominas.aggregate(
                    total=Sum('neto_pagar')
                )['total'] or 0,
            },
            'meses': nominas.count()
        }
        
        return Response(resumen)
    
    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """
        GET /api/payroll/portal-empleado/{id}/descargar_pdf/
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'No autorizado'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        nomina = NominaSimple.objects.filter(
            id=pk,
            empleado=empleado,
            organization=request.user.organization
        ).first()
        
        if not nomina:
            return Response(
                {'error': 'Nómina no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # TODO: Implementar generación de PDF
        return Response({'mensaje': 'Función de PDF en desarrollo'})
    
    @action(detail=True, methods=['get'])
    def descargar_xml(self, request, pk=None):
        """
        GET /api/payroll/portal-empleado/{id}/descargar_xml/
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'No autorizado'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Buscar nómina electrónica asociada
        nomina_electronica = NominaElectronica.objects.filter(
            nomina_simple_id=pk,
            empleado=empleado,
            organization=request.user.organization
        ).first()
        
        if not nomina_electronica:
            return Response(
                {'error': 'Nómina electrónica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # TODO: Retornar XML
        return Response({'mensaje': 'Función de XML en desarrollo'})
    
    @action(detail=True, methods=['get'])
    def verificar_autenticidad(self, request, pk=None):
        """
        GET /api/payroll/portal-empleado/{id}/verificar_autenticidad/
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response({'valido': False, 'mensaje': 'No autorizado'})
        
        nomina_electronica = NominaElectronica.objects.filter(
            nomina_simple_id=pk,
            empleado=empleado,
            organization=request.user.organization
        ).first()
        
        if not nomina_electronica:
            return Response({
                'valido': False,
                'mensaje': 'Nómina electrónica no encontrada'
            })
        
        # Verificar CUNE
        return Response({
            'valido': bool(nomina_electronica.cune),
            'cune': nomina_electronica.cune,
            'fecha_envio': nomina_electronica.fecha_envio_dian,
            'estado': nomina_electronica.estado
        })
    
    @action(detail=True, methods=['post'])
    def reportar_inconsistencia(self, request, pk=None):
        """
        POST /api/payroll/portal-empleado/{id}/reportar_inconsistencia/
        Body: { "descripcion": "..." }
        """
        empleado = self.get_empleado()
        if not empleado:
            return Response(
                {'error': 'No autorizado'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        nomina = NominaSimple.objects.filter(
            id=pk,
            empleado=empleado,
            organization=request.user.organization
        ).first()
        
        if not nomina:
            return Response(
                {'error': 'Nómina no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        descripcion = request.data.get('descripcion', '')
        
        # TODO: Implementar sistema de tickets/reportes
        # Por ahora solo log
        logger.info(
            f"Inconsistencia reportada en nómina {pk} por empleado {empleado.id}: {descripcion}"
        )
        
        return Response({
            'mensaje': 'Inconsistencia reportada exitosamente',
            'ticket_id': f"TICKET-{pk}-{empleado.id}"
        })


class AnalyticsViewSet(viewsets.GenericViewSet):
    """
    ViewSet para Analytics y Reportes
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    
    @action(detail=False, methods=['get'])
    def dashboard_general(self, request):
        """
        GET /api/payroll/analytics/dashboard_general/?dias=30
        """
        from django.db.models import Sum, Avg, Count
        from datetime import datetime, timedelta
        
        dias = int(request.query_params.get('dias', 30))
        fecha_desde = datetime.now() - timedelta(days=dias)
        
        nominas = NominaSimple.objects.filter(
            organization=request.user.organization,
            fecha_creacion__gte=fecha_desde
        )
        
        data = {
            'periodo': {
                'dias': dias,
                'desde': fecha_desde.date(),
                'hasta': datetime.now().date()
            },
            'resumen': {
                'total_nominas': nominas.count(),
                'total_empleados': nominas.values('empleado').distinct().count(),
                'total_pagado': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0),
                'promedio_nomina': float(nominas.aggregate(promedio=Avg('neto_pagar'))['promedio'] or 0)
            },
            'por_estado': {
                'pendiente': nominas.filter(estado='PENDIENTE').count(),
                'aprobada': nominas.filter(estado='APROBADA').count(),
                'pagada': nominas.filter(estado='PAGADA').count(),
                'rechazada': nominas.filter(estado='RECHAZADA').count()
            },
            'tendencia': []  # TODO: Implementar tendencia por día/semana
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def metricas_dian(self, request):
        """
        GET /api/payroll/analytics/metricas_dian/
        """
        nominas_electronicas = NominaElectronica.objects.filter(
            organization=request.user.organization
        )
        
        data = {
            'total_enviadas': nominas_electronicas.count(),
            'exitosas': nominas_electronicas.filter(estado='ACEPTADA').count(),
            'rechazadas': nominas_electronicas.filter(estado='RECHAZADA').count(),
            'pendientes': nominas_electronicas.filter(estado='PENDIENTE').count(),
            'tasa_exito': 0,
            'tiempo_promedio_respuesta': 0  # TODO: Calcular tiempo promedio
        }
        
        if data['total_enviadas'] > 0:
            data['tasa_exito'] = round((data['exitosas'] / data['total_enviadas']) * 100, 2)
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """
        GET /api/payroll/analytics/alertas/
        """
        from datetime import datetime, timedelta
        
        alertas = []
        
        # Nóminas pendientes de aprobación
        pendientes = NominaSimple.objects.filter(
            organization=request.user.organization,
            estado='PENDIENTE'
        ).count()
        
        if pendientes > 0:
            alertas.append({
                'tipo': 'warning',
                'titulo': 'Nóminas pendientes',
                'mensaje': f'Tienes {pendientes} nómina(s) pendiente(s) de aprobación',
                'fecha': datetime.now().isoformat()
            })
        
        # Nóminas rechazadas por DIAN
        rechazadas = NominaElectronica.objects.filter(
            organization=request.user.organization,
            estado='RECHAZADA'
        ).count()
        
        if rechazadas > 0:
            alertas.append({
                'tipo': 'error',
                'titulo': 'Nóminas rechazadas por DIAN',
                'mensaje': f'{rechazadas} nómina(s) electrónica(s) rechazada(s) por la DIAN',
                'fecha': datetime.now().isoformat()
            })
        
        # Empleados sin nómina este mes
        # TODO: Implementar lógica más sofisticada
        
        return Response(alertas)
    
    @action(detail=False, methods=['get'])
    def analisis_costos(self, request):
        """
        GET /api/payroll/analytics/analisis_costos/
        """
        from django.db.models import Sum, Count
        
        nominas = NominaSimple.objects.filter(
            organization=request.user.organization
        )
        
        # Análisis por conceptos laborales
        conceptos_data = []
        conceptos = ConceptoLaboral.objects.filter(organization=request.user.organization)
        
        for concepto in conceptos:
            total = DetalleConceptoNominaSimple.objects.filter(
                nomina__organization=request.user.organization,
                concepto=concepto
            ).aggregate(total=Sum('valor_total'))['total'] or 0
            
            conceptos_data.append({
                'nombre': concepto.nombre,
                'tipo': concepto.tipo_concepto,
                'total': float(total),
                'promedio': float(total / nominas.count()) if nominas.count() > 0 else 0
            })
        
        # Costos por empleado
        empleados_data = []
        empleados = Empleado.objects.filter(organization=request.user.organization)[:10]  # Top 10
        
        for empleado in empleados:
            total = nominas.filter(empleado=empleado).aggregate(total=Sum('neto_pagar'))['total'] or 0
            empleados_data.append({
                'id': str(empleado.pk),
                'nombre': f"{empleado.nombres} {empleado.apellidos}",
                'total_pagado': float(total),
                'nominas_count': nominas.filter(empleado=empleado).count()
            })
        
        data = {
            'resumen': {
                'total_costos': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0),
                'total_items': float(nominas.aggregate(total=Sum('total_items'))['total'] or 0),
                'total_deducciones': float(nominas.aggregate(total=Sum('total_deducciones'))['total'] or 0),
                'promedio_por_nomina': float(nominas.aggregate(promedio=Sum('neto_pagar'))['promedio'] or 0) / nominas.count() if nominas.count() > 0 else 0
            },
            'por_concepto': conceptos_data,
            'top_empleados': sorted(empleados_data, key=lambda x: x['total_pagado'], reverse=True)
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def comparativa_periodos(self, request):
        """
        GET /api/payroll/analytics/comparativa_periodos/?periodo1=2026-01&periodo2=2025-12
        """
        from django.db.models import Sum, Count
        from datetime import datetime
        
        periodo1 = request.query_params.get('periodo1')  # YYYY-MM
        periodo2 = request.query_params.get('periodo2')  # YYYY-MM
        
        if not periodo1 or not periodo2:
            return Response(
                {'error': 'Se requieren periodo1 y periodo2 en formato YYYY-MM'},
                status=400
            )
        
        # Parsear periodos
        try:
            año1, mes1 = map(int, periodo1.split('-'))
            año2, mes2 = map(int, periodo2.split('-'))
        except:
            return Response({'error': 'Formato de periodo inválido'}, status=400)
        
        # Crear fechas de inicio para filtrar periodos
        from datetime import datetime
        fecha_p1_inicio = datetime(año1, mes1, 1).date()
        fecha_p2_inicio = datetime(año2, mes2, 1).date()
        
        # Obtener nóminas de cada periodo
        nominas_p1 = NominaSimple.objects.filter(
            organization=request.user.organization,
            periodo__fecha_inicio__year=año1,
            periodo__fecha_inicio__month=mes1
        )
        
        nominas_p2 = NominaSimple.objects.filter(
            organization=request.user.organization,
            periodo__fecha_inicio__year=año2,
            periodo__fecha_inicio__month=mes2
        )
        
        def get_stats(nominas):
            return {
                'total_nominas': nominas.count(),
                'total_empleados': nominas.values('empleado').distinct().count(),
                'total_pagado': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0),
                'total_items': float(nominas.aggregate(total=Sum('total_items'))['total'] or 0),
                'total_deducciones': float(nominas.aggregate(total=Sum('total_deducciones'))['total'] or 0),
                'promedio_por_empleado': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0) / nominas.values('empleado').distinct().count() if nominas.values('empleado').distinct().count() > 0 else 0
            }
        
        p1_stats = get_stats(nominas_p1)
        p2_stats = get_stats(nominas_p2)
        
        # Calcular variaciones
        variaciones = {}
        for key in ['total_nominas', 'total_empleados', 'total_pagado', 'promedio_por_empleado']:
            if p2_stats[key] > 0:
                variacion = ((p1_stats[key] - p2_stats[key]) / p2_stats[key]) * 100
                variaciones[key] = round(variacion, 2)
            else:
                variaciones[key] = 0
        
        data = {
            'periodo1': {
                'periodo': periodo1,
                'stats': p1_stats
            },
            'periodo2': {
                'periodo': periodo2,
                'stats': p2_stats
            },
            'variaciones': variaciones
        }
        
        return Response(data)


class ReportesViewSet(viewsets.ViewSet):
    """
    ViewSet para generar reportes descargables
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    
    @action(detail=False, methods=['get'])
    def reporte_anual(self, request):
        """
        GET /api/payroll/reportes/reporte_anual/?anio=2026
        Genera reporte anual en formato JSON (luego se puede convertir a PDF/Excel)
        """
        from django.db.models import Sum, Count, Avg
        
        anio = request.query_params.get('anio')
        if not anio:
            return Response({'error': 'Se requiere el parámetro anio'}, status=400)
        
        try:
            anio = int(anio)
        except:
            return Response({'error': 'Año inválido'}, status=400)
        
        # Obtener todas las nóminas del año
        nominas = NominaSimple.objects.filter(
            organization=request.user.organization,
            periodo__fecha_inicio__year=anio
        )
        
        # Resumen general
        resumen = {
            'anio': anio,
            'total_nominas': nominas.count(),
            'total_empleados': nominas.values('empleado').distinct().count(),
            'total_pagado': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0),
            'total_items': float(nominas.aggregate(total=Sum('total_items'))['total'] or 0),
            'total_deducciones': float(nominas.aggregate(total=Sum('total_deducciones'))['total'] or 0),
            'promedio_mensual': float(nominas.aggregate(total=Sum('neto_pagar'))['total'] or 0) / 12
        }
        
        # Desglose por mes
        por_mes = []
        for mes in range(1, 13):
            nominas_mes = nominas.filter(periodo__fecha_inicio__month=mes)
            por_mes.append({
                'mes': mes,
                'nombre_mes': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes-1],
                'total_nominas': nominas_mes.count(),
                'total_pagado': float(nominas_mes.aggregate(total=Sum('neto_pagar'))['total'] or 0),
                'empleados': nominas_mes.values('empleado').distinct().count()
            })
        
        # Top 10 empleados más pagados del año
        top_empleados = []
        empleados = Empleado.objects.filter(organization=request.user.organization)
        
        for empleado in empleados:
            total = nominas.filter(empleado=empleado).aggregate(total=Sum('neto_pagar'))['total'] or 0
            if total > 0:
                top_empleados.append({
                    'id': str(empleado.pk),
                    'nombre': f"{empleado.nombres} {empleado.apellidos}",
                    'documento': empleado.numero_documento,
                    'total_anual': float(total),
                    'nominas_count': nominas.filter(empleado=empleado).count()
                })
        
        top_empleados = sorted(top_empleados, key=lambda x: x['total_anual'], reverse=True)[:10]
        
        # Desglose por conceptos
        conceptos_data = []
        conceptos = ConceptoLaboral.objects.filter(organization=request.user.organization)
        
        for concepto in conceptos:
            total = DetalleConceptoNominaSimple.objects.filter(
                nomina__organization=request.user.organization,
                nomina__periodo__fecha_inicio__year=anio,
                concepto=concepto
            ).aggregate(total=Sum('valor_total'))['total'] or 0
            
            if total > 0:
                conceptos_data.append({
                    'nombre': concepto.nombre,
                    'tipo': concepto.tipo_concepto,
                    'total': float(total)
                })
        
        data = {
            'resumen': resumen,
            'por_mes': por_mes,
            'top_empleados': top_empleados,
            'por_concepto': sorted(conceptos_data, key=lambda x: x['total'], reverse=True)
        }
        
        return Response(data)


