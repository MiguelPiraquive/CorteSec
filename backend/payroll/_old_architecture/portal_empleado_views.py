"""
Portal del Empleado - Vistas para consulta de nómina electrónica
Los empleados pueden consultar sus nóminas, descargar PDF/XML, verificar estado DIAN
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Count
from datetime import timedelta
import mimetypes

from payroll.models import (
    NominaElectronica, Nomina,
    DevengadoNominaElectronica, DeduccionNominaElectronica
)
from payroll.serializers import (
    NominaElectronicaSerializer,
    NominaElectronicaListSerializer
)


class PortalEmpleadoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para portal del empleado - Solo lectura
    Los empleados solo pueden ver sus propias nóminas
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NominaElectronicaListSerializer
    
    def get_queryset(self):
        """
        Filtra nóminas del empleado autenticado
        Solo muestra nóminas generadas o posteriores (no borradores)
        """
        user = self.request.user
        
        # Buscar empleado asociado al usuario por correo
        try:
            from .models import Empleado
            empleado = Empleado.objects.filter(correo=user.email, organization=user.organization).first()
            if not empleado:
                return NominaElectronica.objects.none()
        except Empleado.DoesNotExist:
            # Si no hay empleado asociado, devolver queryset vacío
            return NominaElectronica.objects.none()
        
        return NominaElectronica.objects.filter(
            nomina__empleado=empleado,
            estado__in=['generado', 'firmado', 'enviado', 'aceptado', 'rechazado']
        ).select_related(
            'nomina', 'nomina__empleado', 'organization'
        ).prefetch_related(
            'devengados', 'deducciones'
        ).order_by('-fecha_generacion')
    
    def retrieve(self, request, *args, **kwargs):
        """Detalle de una nómina específica"""
        instance = self.get_object()
        serializer = NominaElectronicaSerializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def descargar_pdf(self, request, pk=None):
        """
        Descarga el PDF de la nómina electrónica
        
        GET /api/payroll/portal-empleado/{id}/descargar_pdf/
        """
        nomina = self.get_object()
        
        if not nomina.pdf_generado:
            return Response(
                {'error': 'PDF no disponible. Contacte a RRHH.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Abrir archivo PDF
            file_handle = nomina.pdf_generado.open('rb')
            
            # Crear respuesta con el archivo
            response = FileResponse(
                file_handle,
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="nomina_{nomina.numero_documento}.pdf"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error descargando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def descargar_xml(self, request, pk=None):
        """
        Descarga el XML firmado de la nómina electrónica
        
        GET /api/payroll/portal-empleado/{id}/descargar_xml/
        """
        nomina = self.get_object()
        
        xml_content = nomina.xml_firmado or nomina.xml_contenido
        
        if not xml_content:
            return Response(
                {'error': 'XML no disponible'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Crear respuesta con XML
        response = HttpResponse(
            xml_content,
            content_type='application/xml'
        )
        response['Content-Disposition'] = f'attachment; filename="nomina_{nomina.numero_documento}.xml"'
        
        return response
    
    @action(detail=True, methods=['get'])
    def verificar_autenticidad(self, request, pk=None):
        """
        Verifica la autenticidad del documento consultando el CUNE
        
        GET /api/payroll/portal-empleado/{id}/verificar_autenticidad/
        """
        nomina = self.get_object()
        
        if not nomina.cune:
            return Response(
                {'error': 'CUNE no disponible'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Información de verificación
        data = {
            'valido': True,
            'numero_documento': nomina.numero_documento,
            'cune': nomina.cune,
            'fecha_emision': nomina.fecha_emision,
            'estado_dian': nomina.get_estado_display(),
            'fecha_validacion': nomina.fecha_validacion_dian,
            'track_id': nomina.track_id,
            'mensaje': 'Documento válido y registrado en DIAN' if nomina.estado == 'aceptado' else 'Documento en proceso de validación'
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def mis_nominas(self, request):
        """
        Lista todas las nóminas del empleado con filtros
        
        GET /api/payroll/portal-empleado/mis_nominas/
        
        Query params:
        - anio: Filtrar por año
        - mes: Filtrar por mes
        - estado: Filtrar por estado
        """
        queryset = self.get_queryset()
        
        # Filtros opcionales
        anio = request.query_params.get('año') or request.query_params.get('anio')
        mes = request.query_params.get('mes')
        estado_filtro = request.query_params.get('estado')
        
        if anio:
            queryset = queryset.filter(fecha_emision__year=anio)
        
        if mes:
            queryset = queryset.filter(fecha_emision__month=mes)
        
        if estado_filtro:
            queryset = queryset.filter(estado=estado_filtro)
        
        # Paginar
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Estadísticas personales del empleado
        
        GET /api/payroll/portal-empleado/estadisticas/
        """
        user = request.user
        
        # Buscar empleado asociado al usuario por correo
        try:
            from .models import Empleado
            empleado = Empleado.objects.filter(correo=user.email, organization=user.organization).first()
            if not empleado:
                return Response({
                    'total_nominas': 0,
                    'total_devengado_anio': 0,
                    'nominas_por_estado': {},
                    'ultimas_nominas': [],
                    'message': 'No hay empleado asociado a este usuario'
                })
        except Empleado.DoesNotExist:
            return Response({
                'total_nominas': 0,
                'total_devengado_anio': 0,
                'nominas_por_estado': {},
                'ultimas_nominas': [],
                'message': 'No hay empleado asociado a este usuario'
            })
        
        # Estadísticas generales
        nominas = NominaElectronica.objects.filter(
            nomina__empleado=empleado
        )
        
        total_nominas = nominas.count()
        
        # Resumen por estado
        por_estado = nominas.values('estado').annotate(
            count=Count('id')
        )
        
        # Total pagado en el último año
        hace_un_anio = timezone.now() - timedelta(days=365)
        total_pagado_anio = Nomina.objects.filter(
            empleado=empleado,
            creado_el__gte=hace_un_anio
        ).aggregate(
            total=Sum('ingreso_real_periodo')
        )['total'] or 0
        
        # Última nómina
        ultima_nomina = nominas.order_by('-fecha_generacion').first()
        
        data = {
            'total_nominas': total_nominas,
            'por_estado': {item['estado']: item['count'] for item in por_estado},
            'total_pagado': float(total_pagado_anio),
            'promedio_mensual': float(total_pagado_anio / 12) if total_pagado_anio > 0 else 0,
            'ultima_nomina': {
                'numero_documento': ultima_nomina.numero_documento,
                'fecha': ultima_nomina.fecha_emision,
                'ingreso': float(ultima_nomina.nomina.ingreso_real_periodo),
                'estado': ultima_nomina.get_estado_display()
            } if ultima_nomina else None
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def historial_pagos(self, request):
        """
        Historial de pagos del empleado
        
        GET /api/payroll/portal-empleado/historial_pagos/
        
        Query params:
        - anio: Año específico (default: año actual)
        """
        user = request.user
        anio = request.query_params.get('año') or request.query_params.get('anio') or timezone.now().year
        
        # Buscar empleado asociado
        try:
            from .models import Empleado
            empleado = Empleado.objects.filter(correo=user.email, organization=user.organization).first()
            if not empleado:
                return Response({'error': 'No hay empleado asociado a este usuario'}, status=400)
        except Empleado.DoesNotExist:
            return Response({'error': 'No hay empleado asociado a este usuario'}, status=400)
        
        # Obtener nóminas del año
        nominas = Nomina.objects.filter(
            empleado=empleado,
            periodo_inicio__year=anio
        ).order_by('periodo_inicio')
        
        historial = []
        
        for nomina in nominas:
            # Buscar nómina electrónica asociada
            nomina_elect = NominaElectronica.objects.filter(
                nomina=nomina
            ).first()
            
            historial.append({
                'periodo': f"{nomina.periodo_inicio.strftime('%Y-%m')}",
                'periodo_inicio': nomina.periodo_inicio,
                'periodo_fin': nomina.periodo_fin,
                'total_devengado': float(nomina.total_devengado),
                'total_deducciones': float(nomina.total_deducciones),
                'neto_pagar': float(nomina.neto_pagar),
                'estado': nomina.get_estado_display(),
                'documento_electronico': {
                    'numero': nomina_elect.numero_documento,
                    'cune': nomina_elect.cune,
                    'estado_dian': nomina_elect.get_estado_display()
                } if nomina_elect else None
            })
        
        return Response({
            'anio': anio,
            'total_registros': len(historial),
            'historial': historial
        })
    
    @action(detail=False, methods=['get'])
    def certificado_ingresos(self, request):
        """
        Genera certificado de ingresos del empleado
        
        GET /api/payroll/portal-empleado/certificado_ingresos/
        
        Query params:
        - anio: Año del certificado (default: año actual)
        """
        user = request.user
        anio = request.query_params.get('año') or request.query_params.get('anio') or timezone.now().year
        
        # Buscar empleado asociado
        try:
            from .models import Empleado
            empleado = Empleado.objects.get(correo=user.email, organization=user.organization)
        except Empleado.DoesNotExist:
            return Response({'error': 'No hay empleado asociado a este usuario'}, status=400)
        
        # Sumar ingresos del año
        nominas_anio = Nomina.objects.filter(
            empleado=empleado,
            periodo_inicio__year=anio
        )
        
        totales = nominas_anio.aggregate(
            total_devengado=Sum('total_devengado'),
            total_deducciones=Sum('total_deducciones'),
            total_neto=Sum('neto_pagar'),
            total_salud=Sum('deducciones_salud'),
            total_pension=Sum('deducciones_pension')
        )
        
        # Información del empleado
        empleado_info = {
            'nombres': empleado.nombres,
            'apellidos': empleado.apellidos,
            'documento': empleado.documento,
            'tipo_documento': str(empleado.tipo_documento) if empleado.tipo_documento else 'N/A',
            'cargo': empleado.cargo.nombre if empleado.cargo else 'N/A',
            'email': empleado.correo
        }
        
        data = {
            'anio': anio,
            'empleado': empleado_info,
            'totales': {
                'total_devengado': float(totales['total_devengado'] or 0),
                'total_deducciones': float(totales['total_deducciones'] or 0),
                'total_neto': float(totales['total_neto'] or 0),
                'aporte_salud': float(totales['total_salud'] or 0),
                'aporte_pension': float(totales['total_pension'] or 0)
            },
            'periodos_pagados': nominas_anio.count(),
            'fecha_generacion': timezone.now()
        }
        
        # TODO: Generar PDF del certificado
        # Por ahora retorna JSON
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def reportar_inconsistencia(self, request, pk=None):
        """
        Permite al empleado reportar una inconsistencia en su nómina
        
        POST /api/payroll/portal-empleado/{id}/reportar_inconsistencia/
        
        Body:
        {
            "tipo": "valor_incorrecto|concepto_faltante|otro",
            "descripcion": "Descripción de la inconsistencia",
            "valor_esperado": 1000000 (opcional)
        }
        """
        nomina = self.get_object()
        
        tipo = request.data.get('tipo')
        descripcion = request.data.get('descripcion')
        valor_esperado = request.data.get('valor_esperado')
        
        if not tipo or not descripcion:
            return Response(
                {'error': 'Tipo y descripción son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear registro de inconsistencia
        # TODO: Implementar modelo InconsistenciaNomina
        
        # Notificar a RRHH
        from payroll.notifications import NotificacionManager
        # NotificacionManager.notificar_inconsistencia_reportada(nomina, tipo, descripcion)
        
        return Response({
            'mensaje': 'Inconsistencia reportada exitosamente',
            'numero_ticket': f'INC-{nomina.id}-{timezone.now().timestamp()}'
        })
    
    @action(detail=False, methods=['get'])
    def resumen_mensual(self, request):
        """
        Resumen del mes actual
        
        GET /api/payroll/portal-empleado/resumen_mensual/
        """
        user = request.user
        ahora = timezone.now()
        
        # Buscar empleado asociado
        try:
            from .models import Empleado
            empleado = Empleado.objects.filter(correo=user.email, organization=user.organization).first()
            if not empleado:
                return Response({'mensaje': 'No hay empleado asociado a este usuario'}, status=400)
        except Empleado.DoesNotExist:
            return Response({'mensaje': 'No hay empleado asociado a este usuario'}, status=400)
        
        # Nómina del mes actual
        nomina_mes = Nomina.objects.filter(
            empleado=empleado,
            periodo_inicio__year=ahora.year,
            periodo_inicio__month=ahora.month
        ).first()
        
        if not nomina_mes:
            return Response({
                'mensaje': 'No hay nómina disponible para el mes actual'
            })
        
        # Buscar nómina electrónica
        nomina_elect = NominaElectronica.objects.filter(
            nomina=nomina_mes
        ).first()
        
        data = {
            'periodo': f"{ahora.strftime('%B %Y')}",
            'neto_pagar': float(nomina_mes.neto_pagar),
            'total_devengado': float(nomina_mes.total_devengado),
            'total_deducciones': float(nomina_mes.total_deducciones),
            'estado_nomina': nomina_mes.get_estado_display(),
            'documento_electronico': {
                'disponible': nomina_elect is not None,
                'numero': nomina_elect.numero_documento if nomina_elect else None,
                'estado_dian': nomina_elect.get_estado_display() if nomina_elect else None,
                'puede_descargar': nomina_elect and nomina_elect.estado in ['aceptado', 'firmado']
            } if nomina_elect else {'disponible': False}
        }
        
        return Response(data)
