"""
Analytics y Dashboard para Nómina Electrónica
Métricas, KPIs, reportes visuales y estadísticas avanzadas
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q, F, Min, Max
from django.db.models.functions import TruncDay, TruncMonth
from datetime import timedelta
from core.mixins import MultiTenantViewSetMixin

from payroll.models import (
    NominaElectronica, Nomina,
    DevengadoNominaElectronica, DeduccionNominaElectronica,
    ConfiguracionNominaElectronica
)


class AnalyticsViewSet(MultiTenantViewSetMixin, viewsets.ViewSet):
    """
    ViewSet para analytics y métricas de nómina electrónica
    Accesible por usuarios autenticados con organización
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard_general(self, request):
        """
        Dashboard general con KPIs principales
        
        GET /api/payroll/analytics/dashboard_general/
        """
        organization = request.user.organization
        
        # Rango de fechas (últimos 30 días por default)
        dias = int(request.query_params.get('dias', 30))
        fecha_desde = timezone.now() - timedelta(days=dias)
        
        # Total de nóminas
        nominas = NominaElectronica.objects.filter(
            organization=organization,
            fecha_generacion__gte=fecha_desde
        )
        
        total_nominas = nominas.count()
        
        # Por estado
        por_estado = nominas.values('estado').annotate(
            cantidad=Count('id')
        ).order_by('-cantidad')
        
        # Tasa de aceptación
        aceptadas = nominas.filter(estado='aceptado').count()
        tasa_aceptacion = (aceptadas / total_nominas * 100) if total_nominas > 0 else 0
        
        # Total pagado
        total_pagado = Nomina.objects.filter(
            organization=organization,
            creado_el__gte=fecha_desde,
            nomina_electronica__isnull=False
        ).aggregate(
            total=Sum('ingreso_real_periodo')
        )['total'] or 0
        
        # Tiempo promedio de procesamiento
        tiempo_promedio = nominas.filter(
            estado='aceptado',
            fecha_validacion_dian__isnull=False
        ).annotate(
            tiempo_procesamiento=F('fecha_validacion_dian') - F('fecha_generacion')
        ).aggregate(
            promedio=Avg('tiempo_procesamiento')
        )['promedio']
        
        # Nóminas por día (últimos 30 días)
        por_dia = nominas.annotate(
            dia=TruncDay('fecha_generacion')
        ).values('dia').annotate(
            cantidad=Count('id')
        ).order_by('dia')
        
        data = {
            'periodo': {
                'desde': fecha_desde,
                'hasta': timezone.now(),
                'dias': dias
            },
            'kpis': {
                'total_nominas': total_nominas,
                'total_aceptadas': aceptadas,
                'tasa_aceptacion': round(tasa_aceptacion, 2),
                'total_pagado': float(total_pagado),
                'tiempo_promedio_procesamiento': str(tiempo_promedio) if tiempo_promedio else 'N/A'
            },
            'por_estado': [
                {'estado': item['estado'], 'cantidad': item['cantidad']}
                for item in por_estado
            ],
            'tendencia': [
                {
                    'fecha': item['dia'].date().isoformat(),
                    'cantidad': item['cantidad']
                }
                for item in por_dia
            ]
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def metricas_dian(self, request):
        """
        Métricas específicas de integración con DIAN
        
        GET /api/payroll/analytics/metricas_dian/
        """
        organization = request.user.organization
        
        # Últimos 90 días
        fecha_desde = timezone.now() - timedelta(days=90)
        
        nominas = NominaElectronica.objects.filter(
            organization=organization,
            fecha_generacion__gte=fecha_desde
        )
        
        # Estadísticas por código de respuesta
        por_codigo = nominas.exclude(
            codigo_respuesta=''
        ).values('codigo_respuesta', 'mensaje_respuesta').annotate(
            cantidad=Count('id')
        ).order_by('-cantidad')[:10]
        
        # Intentos de envío
        total_intentos = nominas.aggregate(
            total=Sum('intentos_envio')
        )['total'] or 0
        
        intentos_promedio = nominas.filter(
            intentos_envio__gt=0
        ).aggregate(
            promedio=Avg('intentos_envio')
        )['promedio'] or 0
        
        # Rechazos por error
        rechazadas = nominas.filter(estado='rechazado')
        errores_comunes = []
        
        for nomina in rechazadas:
            if nomina.errores:
                for key, value in nomina.errores.items():
                    errores_comunes.append({
                        'tipo_error': key,
                        'descripcion': value
                    })
        
        # Tiempo de respuesta DIAN
        tiempos_respuesta = nominas.filter(
            fecha_envio__isnull=False,
            fecha_validacion_dian__isnull=False
        ).annotate(
            tiempo=F('fecha_validacion_dian') - F('fecha_envio')
        ).aggregate(
            promedio=Avg('tiempo'),
            minimo=Min('tiempo'),
            maximo=Max('tiempo')
        )
        
        data = {
            'periodo': '90 días',
            'total_enviadas': nominas.exclude(estado__in=['borrador', 'generado', 'firmado']).count(),
            'total_intentos': total_intentos,
            'intentos_promedio': round(float(intentos_promedio), 2),
            'tiempo_respuesta_dian': {
                'promedio': str(tiempos_respuesta['promedio']) if tiempos_respuesta['promedio'] else 'N/A',
                'minimo': str(tiempos_respuesta['minimo']) if tiempos_respuesta['minimo'] else 'N/A',
                'maximo': str(tiempos_respuesta['maximo']) if tiempos_respuesta['maximo'] else 'N/A'
            },
            'codigos_respuesta': [
                {
                    'codigo': item['codigo_respuesta'],
                    'mensaje': item['mensaje_respuesta'],
                    'cantidad': item['cantidad']
                }
                for item in por_codigo
            ],
            'errores_frecuentes': errores_comunes[:10]
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def analisis_costos(self, request):
        """
        Análisis de costos de nómina
        
        GET /api/payroll/analytics/analisis_costos/
        
        Query params:
        - anio: Año de análisis (default: año actual)
        - mes: Mes específico (opcional)
        """
        organization = request.user.organization
        anio = int(request.query_params.get('anio', timezone.now().year))
        mes = request.query_params.get('mes')
        
        # Filtro base
        filtro = Q(
            organization=organization,
            periodo_inicio__year=anio
        )
        
        if mes:
            filtro &= Q(periodo_inicio__month=int(mes))
        
        nominas = Nomina.objects.filter(filtro)
        
        # Totales
        totales = nominas.aggregate(
            total_devengado=Sum('ingreso_real_periodo'),
            total_deducciones=Sum('otras_deducciones'),
            total_neto=Sum('ingreso_real_periodo'),
            total_salud=Sum('deduccion_salud'),
            total_pension=Sum('deduccion_pension')
        )
        
        # Por mes
        por_mes = nominas.annotate(
            mes=TruncMonth('periodo_inicio')
        ).values('mes').annotate(
            total_devengado=Sum('ingreso_real_periodo'),
            total_deducciones=Sum('otras_deducciones'),
            total_neto=Sum('ingreso_real_periodo'),
            cantidad_empleados=Count('empleado', distinct=True)
        ).order_by('mes')
        
        # Desglose de devengados
        devengados_detalle = DevengadoNominaElectronica.objects.filter(
            nomina_electronica__organization=organization,
            nomina_electronica__fecha_emision__year=anio
        ).values('tipo').annotate(
            total=Sum('valor_total'),
            cantidad=Count('id')
        ).order_by('-total')
        
        # Desglose de deducciones
        deducciones_detalle = DeduccionNominaElectronica.objects.filter(
            nomina_electronica__organization=organization,
            nomina_electronica__fecha_emision__year=anio
        ).values('tipo').annotate(
            total=Sum('valor'),
            cantidad=Count('id')
        ).order_by('-total')
        
        data = {
            'anio': anio,
            'mes': mes,
            'totales': {
                'devengado': float(totales['total_devengado'] or 0),
                'deducciones': float(totales['total_deducciones'] or 0),
                'neto': float(totales['total_neto'] or 0),
                'salud': float(totales['total_salud'] or 0),
                'pension': float(totales['total_pension'] or 0)
            },
            'por_mes': [
                {
                    'mes': item['mes'].strftime('%Y-%m'),
                    'devengado': float(item['total_devengado']),
                    'deducciones': float(item['total_deducciones']),
                    'neto': float(item['total_neto']),
                    'empleados': item['cantidad_empleados']
                }
                for item in por_mes
            ],
            'devengados': [
                {
                    'tipo': item['tipo'],
                    'total': float(item['total']),
                    'cantidad': item['cantidad']
                }
                for item in devengados_detalle
            ],
            'deducciones': [
                {
                    'tipo': item['tipo'],
                    'total': float(item['total']),
                    'cantidad': item['cantidad']
                }
                for item in deducciones_detalle
            ]
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def top_empleados(self, request):
        """
        Top empleados por diferentes métricas
        
        GET /api/payroll/analytics/top_empleados/
        
        Query params:
        - metrica: devengado|deducciones|neto (default: neto)
        - limit: Cantidad de registros (default: 10)
        - periodo: mes|trimestre|anio (default: mes)
        """
        organization = request.user.organization
        metrica = request.query_params.get('metrica', 'neto')
        limit = int(request.query_params.get('limit', 10))
        periodo = request.query_params.get('periodo', 'mes')
        
        # Calcular fecha desde según periodo
        ahora = timezone.now()
        if periodo == 'mes':
            fecha_desde = ahora.replace(day=1)
        elif periodo == 'trimestre':
            fecha_desde = ahora - timedelta(days=90)
        else:  # anio
            fecha_desde = ahora.replace(month=1, day=1)
        
        # Campo a ordenar
        campo_orden = {
            'devengado': 'total_devengado',
            'deducciones': 'total_deducciones',
            'neto': 'neto_pagar'
        }.get(metrica, 'neto_pagar')
        
        # Query
        nominas = Nomina.objects.filter(
            organization=organization,
            creado_el__gte=fecha_desde
        ).values(
            'empleado__id',
            'empleado__nombres',
            'empleado__apellidos',
            'empleado__cargo__nombre'
        ).annotate(
            total=Sum(campo_orden)
        ).order_by('-total')[:limit]
        
        data = [
            {
                'empleado_id': item['empleado__id'],
                'nombre_completo': f"{item['empleado__nombres']} {item['empleado__apellidos']}",
                'cargo': item['empleado__cargo__nombre'] or 'N/A',
                'total': float(item['total'] or 0)
            }
            for item in top
        ]
        
        return Response({
            'metrica': metrica,
            'periodo': periodo,
            'top_empleados': data
        })
    
    @action(detail=False, methods=['get'])
    def comparativa_periodos(self, request):
        """
        Comparación entre periodos
        
        GET /api/payroll/analytics/comparativa_periodos/
        
        Query params:
        - periodo1: YYYY-MM
        - periodo2: YYYY-MM
        """
        organization = request.user.organization
        periodo1 = request.query_params.get('periodo1')
        periodo2 = request.query_params.get('periodo2')
        
        if not periodo1 or not periodo2:
            return Response(
                {'error': 'Se requieren periodo1 y periodo2 (formato YYYY-MM)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            anio1, mes1 = map(int, periodo1.split('-'))
            anio2, mes2 = map(int, periodo2.split('-'))
        except:
            return Response(
                {'error': 'Formato de periodo inválido. Usar YYYY-MM'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        def obtener_stats_periodo(anio, mes):
            nominas = Nomina.objects.filter(
                organization=organization,
                periodo_inicio__year=anio,
                periodo_inicio__month=mes
            )
            
            return nominas.aggregate(
                total_devengado=Sum('ingreso_real_periodo'),
                total_deducciones=Sum('otras_deducciones'),
                total_neto=Sum('ingreso_real_periodo') - Sum('otras_deducciones'),
                cantidad_empleados=Count('empleado', distinct=True),
                cantidad_nominas=Count('id')
            )
        
        stats1 = obtener_stats_periodo(anio1, mes1)
        stats2 = obtener_stats_periodo(anio2, mes2)
        
        # Calcular variaciones
        def calcular_variacion(val1, val2):
            if val2 == 0:
                return 0
            return ((val1 - val2) / val2) * 100
        
        data = {
            'periodo1': {
                'fecha': periodo1,
                'devengado': float(stats1['total_devengado'] or 0),
                'deducciones': float(stats1['total_deducciones'] or 0),
                'neto': float(stats1['total_neto'] or 0),
                'empleados': stats1['cantidad_empleados'],
                'nominas': stats1['cantidad_nominas']
            },
            'periodo2': {
                'fecha': periodo2,
                'devengado': float(stats2['total_devengado'] or 0),
                'deducciones': float(stats2['total_deducciones'] or 0),
                'neto': float(stats2['total_neto'] or 0),
                'empleados': stats2['cantidad_empleados'],
                'nominas': stats2['cantidad_nominas']
            },
            'variacion': {
                'devengado': round(
                    calcular_variacion(
                        float(stats1['total_devengado'] or 0),
                        float(stats2['total_devengado'] or 0)
                    ), 2
                ),
                'deducciones': round(
                    calcular_variacion(
                        float(stats1['total_deducciones'] or 0),
                        float(stats2['total_deducciones'] or 0)
                    ), 2
                ),
                'neto': round(
                    calcular_variacion(
                        float(stats1['total_neto'] or 0),
                        float(stats2['total_neto'] or 0)
                    ), 2
                ),
                'empleados': stats1['cantidad_empleados'] - stats2['cantidad_empleados']
            }
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """
        Alertas y notificaciones del sistema
        
        GET /api/payroll/analytics/alertas/
        """
        organization = request.user.organization
        alertas = []
        
        # Nóminas rechazadas recientes
        rechazadas = NominaElectronica.objects.filter(
            organization=organization,
            estado='rechazado',
            fecha_envio__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        if rechazadas > 0:
            alertas.append({
                'tipo': 'error',
                'titulo': 'Nóminas Rechazadas',
                'mensaje': f'{rechazadas} nómina(s) rechazadas en los últimos 7 días',
                'cantidad': rechazadas
            })
        
        # Nóminas pendientes de envío
        pendientes = NominaElectronica.objects.filter(
            organization=organization,
            estado='firmado',
            fecha_generacion__lte=timezone.now() - timedelta(hours=24)
        ).count()
        
        if pendientes > 0:
            alertas.append({
                'tipo': 'warning',
                'titulo': 'Nóminas Pendientes',
                'mensaje': f'{pendientes} nómina(s) firmadas sin enviar hace más de 24 horas',
                'cantidad': pendientes
            })
        
        # Certificado próximo a vencer
        config = ConfiguracionNominaElectronica.objects.filter(
            organization=organization,
            activa=True
        ).first()
        
        if config and config.fecha_vigencia_hasta:
            dias_restantes = (config.fecha_vigencia_hasta - timezone.now().date()).days
            if dias_restantes < 30:
                alertas.append({
                    'tipo': 'warning',
                    'titulo': 'Numeración por Vencer',
                    'mensaje': f'La numeración autorizada vence en {dias_restantes} días',
                    'dias': dias_restantes
                })
        
        # Tasa de rechazo alta
        ultimas_100 = NominaElectronica.objects.filter(
            organization=organization
        ).order_by('-fecha_generacion')[:100]
        
        if ultimas_100.count() >= 50:
            rechazos = ultimas_100.filter(estado='rechazado').count()
            tasa_rechazo = (rechazos / ultimas_100.count()) * 100
            
            if tasa_rechazo > 10:
                alertas.append({
                    'tipo': 'error',
                    'titulo': 'Alta Tasa de Rechazo',
                    'mensaje': f'Tasa de rechazo: {tasa_rechazo:.1f}% en las últimas 100 nóminas',
                    'tasa': round(tasa_rechazo, 1)
                })
        
        return Response({
            'alertas': alertas,
            'total': len(alertas)
        })
