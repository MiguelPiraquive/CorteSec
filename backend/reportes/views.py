"""
Vistas del Sistema de Reportes Multi-Módulo
==========================================

Vistas para generar reportes de CUALQUIER módulo del sistema con filtros 
dinámicos y descarga en múltiples formatos.

Funcionalidades:
- Vista principal con lista de módulos disponibles
- Configurador de reportes con filtros dinámicos
- Generación y descarga de reportes
- Gestión de configuraciones guardadas
- Vista de historial de reportes

Autor: Sistema CorteSec
"""

from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q, Count, Sum
from django.core.paginator import Paginator
from django.utils import timezone
from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings
import json
import pandas as pd
import io
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from .models import ModuloReporte, ReporteGenerado, ConfiguracionReporte, LogReporte
from .forms import ReporteConfigForm, ConfiguracionReporteForm
from core.models import Organizacion


class ModulosReporteListView(LoginRequiredMixin, ListView):
    """
    Vista principal - Lista de módulos disponibles para reportes
    """
    model = ModuloReporte
    template_name = 'reportes/modulos_list.html'
    context_object_name = 'modulos'
    paginate_by = 12

    def get_queryset(self):
        queryset = ModuloReporte.objects.filter(
            organizacion=self.request.user.profile.organizacion,
            activo=True
        ).order_by('orden', 'nombre')
        
        # Buscar por nombre si se proporciona
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) | 
                Q(descripcion__icontains=search) |
                Q(codigo__icontains=search)
            )
        
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Estadísticas generales
        organization = self.request.user.profile.organizacion
        context['total_modulos'] = ModuloReporte.objects.filter(
            organizacion=organization,
            activo=True
        ).count()
        
        context['reportes_generados_hoy'] = ReporteGenerado.objects.filter(
            organizacion=organization,
            created_at__date=timezone.now().date()
        ).count()
        
        context['reportes_pendientes'] = ReporteGenerado.objects.filter(
            organizacion=organization,
            estado__in=['pendiente', 'procesando']
        ).count()
        
        return context


class ConfiguradorReporteView(LoginRequiredMixin, DetailView):
    """
    Vista del configurador de reportes para un módulo específico
    """
    model = ModuloReporte
    template_name = 'reportes/configurador.html'
    context_object_name = 'modulo'

    def get_queryset(self):
        return ModuloReporte.objects.filter(
            organizacion=self.request.user.profile.organizacion,
            activo=True
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        modulo = self.get_object()
        
        # Obtener configuraciones guardadas del usuario
        context['configuraciones_guardadas'] = ConfiguracionReporte.objects.filter(
            modulo=modulo,
            created_by=self.request.user
        ).order_by('-es_favorita', '-veces_usada', 'nombre')
        
        # Configuraciones públicas
        context['configuraciones_publicas'] = ConfiguracionReporte.objects.filter(
            modulo=modulo,
            es_publica=True
        ).exclude(created_by=self.request.user).order_by('-veces_usada', 'nombre')
        
        # Obtener campos disponibles del modelo
        model_class = modulo.get_model_class()
        if model_class:
            context['campos_modelo'] = self._get_campos_modelo(model_class)
            context['total_registros'] = modulo.get_queryset_base().count()
        else:
            context['campos_modelo'] = {}
            context['total_registros'] = 0
        
        return context
    
    def _get_campos_modelo(self, model_class):
        """Extrae información de los campos del modelo"""
        campos = {}
        
        for field in model_class._meta.get_fields():
            if hasattr(field, 'verbose_name'):
                field_type = type(field).__name__
                
                campos[field.name] = {
                    'label': str(field.verbose_name),
                    'type': field_type,
                    'filtrable': field_type in ['CharField', 'DateField', 'DateTimeField', 
                                              'BooleanField', 'IntegerField', 'DecimalField',
                                              'ForeignKey'],
                    'ordenable': True
                }
        
        return campos


@login_required
def generar_reporte_ajax(request):
    """
    Genera un reporte via AJAX
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        modulo_id = data.get('modulo_id')
        titulo = data.get('titulo', 'Reporte sin título')
        formato = data.get('formato', 'excel')
        filtros = data.get('filtros', {})
        columnas = data.get('columnas', [])
        ordenamiento = data.get('ordenamiento', [])
        
        # Validar módulo
        modulo = get_object_or_404(
            ModuloReporte,
            id=modulo_id,
            organizacion=request.user.profile.organizacion,
            activo=True
        )
        
        # Crear registro del reporte
        reporte = ReporteGenerado.objects.create(
            organizacion=request.user.profile.organizacion,
            modulo=modulo,
            titulo=titulo,
            formato=formato,
            filtros_aplicados=filtros,
            columnas_seleccionadas=columnas,
            ordenamiento=ordenamiento,
            generado_por=request.user,
            estado='procesando'
        )
        
        # Procesar el reporte en segundo plano (o sincrónicamente para demo)
        try:
            _procesar_reporte(reporte)
            
            # Log de actividad
            LogReporte.objects.create(
                organizacion=request.user.profile.organizacion,
                usuario=request.user,
                accion='generar',
                modulo=modulo,
                reporte=reporte,
                descripcion=f"Reporte '{titulo}' generado exitosamente",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return JsonResponse({
                'success': True,
                'reporte_id': str(reporte.id),
                'message': 'Reporte generado exitosamente',
                'download_url': reporte.get_download_url()
            })
            
        except Exception as e:
            reporte.marcar_error(str(e))
            
            LogReporte.objects.create(
                organizacion=request.user.profile.organizacion,
                usuario=request.user,
                accion='error',
                modulo=modulo,
                reporte=reporte,
                descripcion=f"Error al generar reporte: {str(e)}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return JsonResponse({
                'success': False,
                'error': f'Error al generar reporte: {str(e)}'
            }, status=500)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error en la solicitud: {str(e)}'
        }, status=400)


def _procesar_reporte(reporte):
    """
    Procesa y genera el archivo del reporte
    """
    import time
    start_time = time.time()
    
    # Obtener datos del módulo
    modulo = reporte.modulo
    model_class = modulo.get_model_class()
    
    if not model_class:
        raise Exception(f"No se puede acceder al modelo {modulo.model_name}")
    
    # Aplicar filtros
    queryset = modulo.get_queryset_base()
    queryset = _aplicar_filtros(queryset, reporte.filtros_aplicados)
    
    # Aplicar ordenamiento
    if reporte.ordenamiento:
        order_fields = []
        for campo in reporte.ordenamiento:
            if campo.get('direccion') == 'desc':
                order_fields.append(f"-{campo['campo']}")
            else:
                order_fields.append(campo['campo'])
        queryset = queryset.order_by(*order_fields)
    
    # Obtener datos
    if reporte.columnas_seleccionadas:
        # Solo campos seleccionados
        values = list(queryset.values(*reporte.columnas_seleccionadas))
    else:
        # Todos los campos por defecto
        values = list(queryset.values())
    
    reporte.total_registros = len(values)
    
    # Generar archivo según formato
    if reporte.formato == 'excel':
        archivo_path = _generar_excel(reporte, values)
    elif reporte.formato == 'csv':
        archivo_path = _generar_csv(reporte, values)
    elif reporte.formato == 'pdf':
        archivo_path = _generar_pdf(reporte, values)
    elif reporte.formato == 'json':
        archivo_path = _generar_json(reporte, values)
    else:
        raise Exception(f"Formato no soportado: {reporte.formato}")
    
    # Calcular tiempo de generación
    tiempo_generacion = time.time() - start_time
    
    # Marcar como completado
    reporte.marcar_completado(
        archivo_path=archivo_path,
        total_registros=reporte.total_registros,
        tiempo=tiempo_generacion
    )


def _aplicar_filtros(queryset, filtros):
    """
    Aplica filtros dinámicos al queryset
    """
    for campo, valor in filtros.items():
        if not valor:
            continue
            
        if isinstance(valor, dict):
            # Filtros complejos (rangos, comparaciones)
            if 'desde' in valor and valor['desde']:
                queryset = queryset.filter(**{f"{campo}__gte": valor['desde']})
            if 'hasta' in valor and valor['hasta']:
                queryset = queryset.filter(**{f"{campo}__lte": valor['hasta']})
            if 'contiene' in valor and valor['contiene']:
                queryset = queryset.filter(**{f"{campo}__icontains": valor['contiene']})
        else:
            # Filtros simples
            if isinstance(valor, list):
                queryset = queryset.filter(**{f"{campo}__in": valor})
            else:
                queryset = queryset.filter(**{campo: valor})
    
    return queryset


def _generar_excel(reporte, datos):
    """
    Genera archivo Excel
    """
    # Crear DataFrame
    df = pd.DataFrame(datos)
    
    # Crear archivo en memoria
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Datos', index=False)
        
        # Agregar información del reporte
        info_data = [
            ['Título', reporte.titulo],
            ['Módulo', reporte.modulo.nombre],
            ['Generado por', reporte.generado_por.get_full_name()],
            ['Fecha generación', reporte.created_at.strftime('%d/%m/%Y %H:%M')],
            ['Total registros', reporte.total_registros],
        ]
        
        info_df = pd.DataFrame(info_data, columns=['Campo', 'Valor'])
        info_df.to_excel(writer, sheet_name='Info', index=False)
    
    # Guardar archivo
    output.seek(0)
    filename = f"reportes/{reporte.id}.xlsx"
    
    # Aquí se debería guardar en el storage configurado
    # Por simplicidad, guardo en memoria
    reporte.nombre_archivo = f"{reporte.titulo}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    reporte.tamaño_archivo = len(output.getvalue())
    
    return filename


def _generar_csv(reporte, datos):
    """
    Genera archivo CSV
    """
    df = pd.DataFrame(datos)
    
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8')
    
    filename = f"reportes/{reporte.id}.csv"
    reporte.nombre_archivo = f"{reporte.titulo}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
    reporte.tamaño_archivo = len(output.getvalue().encode('utf-8'))
    
    return filename


def _generar_pdf(reporte, datos):
    """
    Genera archivo PDF
    """
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
    )
    
    # Contenido
    story = []
    
    # Título
    story.append(Paragraph(reporte.titulo, title_style))
    story.append(Spacer(1, 12))
    
    # Información del reporte
    info_text = f"""
    <b>Módulo:</b> {reporte.modulo.nombre}<br/>
    <b>Generado por:</b> {reporte.generado_por.get_full_name()}<br/>
    <b>Fecha:</b> {reporte.created_at.strftime('%d/%m/%Y %H:%M')}<br/>
    <b>Total registros:</b> {reporte.total_registros}
    """
    story.append(Paragraph(info_text, styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Tabla de datos (limitada para PDF)
    if datos:
        # Tomar solo primeros 100 registros para PDF
        datos_pdf = datos[:100]
        
        if datos_pdf:
            # Encabezados
            headers = list(datos_pdf[0].keys())
            table_data = [headers]
            
            # Datos
            for row in datos_pdf:
                table_data.append([str(row.get(col, '')) for col in headers])
            
            # Crear tabla
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
    
    # Generar PDF
    doc.build(story)
    
    filename = f"reportes/{reporte.id}.pdf"
    reporte.nombre_archivo = f"{reporte.titulo}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    reporte.tamaño_archivo = len(output.getvalue())
    
    return filename


def _generar_json(reporte, datos):
    """
    Genera archivo JSON
    """
    output_data = {
        'reporte': {
            'titulo': reporte.titulo,
            'modulo': reporte.modulo.nombre,
            'generado_por': reporte.generado_por.get_full_name(),
            'fecha_generacion': reporte.created_at.isoformat(),
            'total_registros': reporte.total_registros,
            'filtros_aplicados': reporte.filtros_aplicados,
        },
        'datos': datos
    }
    
    json_content = json.dumps(output_data, cls=DjangoJSONEncoder, indent=2, ensure_ascii=False)
    
    filename = f"reportes/{reporte.id}.json"
    reporte.nombre_archivo = f"{reporte.titulo}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"
    reporte.tamaño_archivo = len(json_content.encode('utf-8'))
    
    return filename


@login_required
def descargar_reporte(request, pk):
    """
    Descarga un reporte generado
    """
    reporte = get_object_or_404(
        ReporteGenerado,
        id=pk,
        organizacion=request.user.profile.organizacion
    )
    
    if not reporte.esta_disponible:
        raise Http404("Reporte no disponible")
    
    # Incrementar contador de descarga
    reporte.incrementar_descarga()
    
    # Log de descarga
    LogReporte.objects.create(
        organizacion=request.user.profile.organizacion,
        usuario=request.user,
        accion='descargar',
        modulo=reporte.modulo,
        reporte=reporte,
        descripcion=f"Descarga del reporte '{reporte.titulo}'",
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    # Para esta demo, generar contenido dinámicamente
    if reporte.formato == 'excel':
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{reporte.nombre_archivo}"'
        # Aquí iría el contenido real del archivo
        response.write(b"Contenido del archivo Excel")
    
    elif reporte.formato == 'pdf':
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{reporte.nombre_archivo}"'
        response.write(b"Contenido del archivo PDF")
    
    elif reporte.formato == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{reporte.nombre_archivo}"'
        response.write("Contenido del archivo CSV")
    
    else:  # json
        response = HttpResponse(content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{reporte.nombre_archivo}"'
        response.write('{"mensaje": "Contenido del archivo JSON"}')
    
    return response


class ReportesHistorialView(LoginRequiredMixin, ListView):
    """
    Historial de reportes generados
    """
    model = ReporteGenerado
    template_name = 'reportes/historial.html'
    context_object_name = 'reportes'
    paginate_by = 20

    def get_queryset(self):
        queryset = ReporteGenerado.objects.filter(
            organizacion=self.request.user.profile.organizacion
        ).select_related('modulo', 'generado_por').order_by('-created_at')
        
        # Filtros
        estado = self.request.GET.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        modulo_id = self.request.GET.get('modulo')
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Para filtros del template
        context['modulos'] = ModuloReporte.objects.filter(
            organizacion=self.request.user.profile.organizacion,
            activo=True
        ).order_by('nombre')
        
        context['estados'] = ReporteGenerado.ESTADO_CHOICES
        
        return context


@login_required
def guardar_configuracion_ajax(request):
    """
    Guarda una configuración de reporte
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        configuracion = ConfiguracionReporte.objects.create(
            organizacion=request.user.profile.organizacion,
            modulo_id=data['modulo_id'],
            nombre=data['nombre'],
            descripcion=data.get('descripcion', ''),
            filtros=data.get('filtros', {}),
            columnas=data.get('columnas', []),
            ordenamiento=data.get('ordenamiento', []),
            formato_preferido=data.get('formato', 'excel'),
            es_publica=data.get('es_publica', False),
            created_by=request.user
        )
        
        return JsonResponse({
            'success': True,
            'configuracion_id': str(configuracion.id),
            'message': 'Configuración guardada exitosamente'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
def cargar_configuracion_ajax(request, pk):
    """
    Carga una configuración guardada
    """
    configuracion = get_object_or_404(
        ConfiguracionReporte,
        id=pk,
        organizacion=request.user.profile.organizacion
    )
    
    # Incrementar uso
    configuracion.incrementar_uso()
    
    return JsonResponse({
        'success': True,
        'configuracion': {
            'nombre': configuracion.nombre,
            'filtros': configuracion.filtros,
            'columnas': configuracion.columnas,
            'ordenamiento': configuracion.ordenamiento,
            'formato_preferido': configuracion.formato_preferido
        }
    })


@login_required
def obtener_valores_campo_ajax(request):
    """
    Obtiene valores únicos de un campo para filtros dinámicos
    """
    modulo_id = request.GET.get('modulo_id')
    campo = request.GET.get('campo')
    
    if not modulo_id or not campo:
        return JsonResponse({'error': 'Parámetros requeridos'}, status=400)
    
    try:
        modulo = get_object_or_404(
            ModuloReporte,
            id=modulo_id,
            organizacion=request.user.profile.organizacion
        )
        
        queryset = modulo.get_queryset_base()
        valores = list(
            queryset.values_list(campo, flat=True)
            .distinct()
            .order_by(campo)[:100]  # Limitar a 100 valores
        )
        
        # Filtrar valores nulos y convertir a string
        valores = [str(v) for v in valores if v is not None]
        
        return JsonResponse({
            'success': True,
            'valores': valores
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
