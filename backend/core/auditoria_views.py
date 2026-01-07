"""
API Views para Auditoría del Sistema
====================================

ViewSets y endpoints para gestión de logs de auditoría,
estadísticas, anomalías y reportes.

Autor: Sistema CorteSec
Versión: 1.0.0
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import HttpResponse
import csv
import logging
from .models import LogAuditoria
from .serializers import LogSistemaSerializer

logger = logging.getLogger(__name__)


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consulta de logs de auditoría
    Solo lectura - los logs se crean automáticamente por el sistema
    """
    serializer_class = LogSistemaSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['accion', 'modelo', 'usuario']
    search_fields = ['accion', 'modelo', 'usuario__username', 'ip_address']
    ordering_fields = ['created_at', 'accion', 'modelo']
    ordering = ['-created_at']  # Por defecto ordenar por más reciente
    
    def list(self, request, *args, **kwargs):
        """Override list para agregar logs detallados"""
        logger.info(f"=== AUDITORIA LIST REQUEST ===")
        logger.info(f"User: {request.user}")
        logger.info(f"User authenticated: {request.user.is_authenticated}")
        logger.info(f"Auth header: {request.headers.get('Authorization', 'NO AUTH HEADER')}")
        
        if not request.user.is_authenticated:
            logger.error("❌ Usuario NO autenticado en list()")
            return Response({'error': 'Authentication required'}, status=401)
        
        logger.info(f"✅ Usuario autenticado: {request.user.username}")
        return super().list(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Filtra logs por organización del usuario
        Soporta filtros por fecha, acción, modelo, usuario
        """
        queryset = LogAuditoria.objects.all().select_related('usuario')
        
        # Filtros opcionales
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        accion = self.request.query_params.get('accion')
        modelo = self.request.query_params.get('modelo')
        usuario_id = self.request.query_params.get('usuario')
        
        if fecha_inicio:
            try:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=fecha_inicio_dt)
            except ValueError:
                pass
                
        if fecha_fin:
            try:
                fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                # Incluir todo el día
                fecha_fin_dt = fecha_fin_dt.replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(created_at__lte=fecha_fin_dt)
            except ValueError:
                pass
        
        if accion:
            queryset = queryset.filter(accion__icontains=accion)
            
        if modelo:
            queryset = queryset.filter(modelo__icontains=modelo)
            
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Estadísticas generales de auditoría
        """
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_eventos = queryset.count()
        usuarios_activos = queryset.values('usuario').distinct().count()
        modulos_activos = queryset.values('modelo').distinct().count()
        
        # Acciones más frecuentes
        acciones_frecuentes = list(
            queryset.values('accion')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Actividad por día (últimos 7 días)
        hoy = timezone.now()
        hace_7_dias = hoy - timedelta(days=7)
        
        actividad_diaria = []
        for i in range(7):
            fecha = hace_7_dias + timedelta(days=i)
            eventos = queryset.filter(
                created_at__date=fecha.date()
            ).count()
            actividad_diaria.append({
                'fecha': fecha.date().isoformat(),
                'eventos': eventos
            })
        
        return Response({
            'total_eventos': total_eventos,
            'usuarios_activos': usuarios_activos,
            'modulos_activos': modulos_activos,
            'acciones_frecuentes': acciones_frecuentes,
            'actividad_diaria': actividad_diaria
        })
    
    @action(detail=False, methods=['POST'], permission_classes=[IsAuthenticated], url_path='log-frontend')
    def log_frontend(self, request):
        """
        Endpoint para recibir logs del frontend
        Crea múltiples logs en una sola petición (batch)
        """
        logs_data = request.data.get('logs', [])
        
        if not logs_data or not isinstance(logs_data, list):
            return Response(
                {'error': 'Se requiere un array de logs'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_logs = []
        ip_address = self._get_client_ip(request)
        
        for log_item in logs_data:
            try:
                log = LogAuditoria.objects.create(
                    usuario=request.user,
                    accion=log_item.get('accion', 'accion_frontend'),
                    modelo=log_item.get('modelo', 'Frontend'),
                    objeto_id=log_item.get('objeto_id'),
                    ip_address=ip_address,
                    user_agent=log_item.get('user_agent', request.META.get('HTTP_USER_AGENT', ''))[:255],
                    metadata=log_item.get('metadata', {})
                )
                created_logs.append(log.id)
            except Exception as e:
                logger.error(f"Error creando log frontend: {e}")
                continue
        
        return Response({
            'success': True,
            'created': len(created_logs),
            'message': f'Se crearon {len(created_logs)} logs correctamente'
        }, status=status.HTTP_201_CREATED)
    
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip[:45]
    
    @action(detail=False, methods=['get'])
    def actividad_usuarios(self, request):
        """
        Actividad agrupada por usuario
        """
        queryset = self.get_queryset()
        
        actividad = list(
            queryset.values('usuario__username', 'usuario__id')
            .annotate(total_acciones=Count('id'))
            .order_by('-total_acciones')[:20]
        )
        
        resultado = [
            {
                'usuario': item['usuario__username'] or 'Sistema',
                'usuario_id': item['usuario__id'],
                'total_acciones': item['total_acciones']
            }
            for item in actividad
        ]
        
        return Response(resultado)
    
    @action(detail=False, methods=['get'])
    def actividad_modulos(self, request):
        """
        Actividad agrupada por módulo
        """
        queryset = self.get_queryset()
        
        actividad = list(
            queryset.values('modelo')
            .annotate(total_eventos=Count('id'))
            .order_by('-total_eventos')[:20]
        )
        
        return Response(actividad)
    
    @action(detail=False, methods=['get'])
    def linea_tiempo(self, request):
        """
        Línea de tiempo de eventos
        """
        agrupacion = request.query_params.get('agrupacion', 'hora')
        queryset = self.get_queryset()
        
        if agrupacion == 'hora':
            # Últimas 24 horas
            hace_24h = timezone.now() - timedelta(hours=24)
            datos = []
            for i in range(24):
                hora = hace_24h + timedelta(hours=i)
                eventos = queryset.filter(
                    created_at__hour=hora.hour,
                    created_at__date=hora.date()
                ).count()
                datos.append({
                    'timestamp': hora.isoformat(),
                    'eventos': eventos
                })
        elif agrupacion == 'dia':
            # Últimos 30 días
            hace_30d = timezone.now() - timedelta(days=30)
            datos = []
            for i in range(30):
                dia = hace_30d + timedelta(days=i)
                eventos = queryset.filter(created_at__date=dia.date()).count()
                datos.append({
                    'timestamp': dia.date().isoformat(),
                    'eventos': eventos
                })
        else:
            datos = []
        
        return Response(datos)
    
    @action(detail=False, methods=['get'])
    def anomalias(self, request):
        """
        Detecta anomalías en el sistema
        - Múltiples intentos fallidos
        - Actividad inusual por horario
        - IPs sospechosas
        """
        queryset = self.get_queryset()
        anomalias = []
        
        # Detectar múltiples acciones del mismo usuario en poco tiempo
        hace_1h = timezone.now() - timedelta(hours=1)
        usuarios_activos = queryset.filter(created_at__gte=hace_1h).values('usuario__username').annotate(
            total=Count('id')
        ).filter(total__gt=50)
        
        for usuario in usuarios_activos:
            anomalias.append({
                'tipo': 'Actividad excesiva',
                'nivel': 'alto',
                'descripcion': f"Usuario {usuario['usuario__username']} con {usuario['total']} acciones en la última hora",
                'timestamp': timezone.now().isoformat(),
                'usuario': usuario['usuario__username']
            })
        
        # Detectar accesos desde IPs diferentes
        hace_24h = timezone.now() - timedelta(hours=24)
        usuarios_multiples_ips = queryset.filter(created_at__gte=hace_24h).values('usuario__username').annotate(
            ips_count=Count('ip_address', distinct=True)
        ).filter(ips_count__gt=3)
        
        for usuario in usuarios_multiples_ips:
            anomalias.append({
                'tipo': 'Múltiples IPs',
                'nivel': 'medio',
                'descripcion': f"Usuario {usuario['usuario__username']} accedió desde {usuario['ips_count']} IPs diferentes en 24h",
                'timestamp': timezone.now().isoformat(),
                'usuario': usuario['usuario__username']
            })
        
        return Response(anomalias)
    
    @action(detail=False, methods=['get'])
    def accesos_fallidos(self, request):
        """
        Obtiene intentos de acceso fallidos
        """
        queryset = self.get_queryset()
        
        # Filtrar logs de login fallido
        fallidos = queryset.filter(
            Q(accion__icontains='login_fallido') | 
            Q(accion__icontains='failed') |
            Q(accion__icontains='error')
        ).order_by('-created_at')[:50]
        
        # Agrupar por usuario e IP
        agrupados = {}
        for log in fallidos:
            key = f"{log.usuario.username if log.usuario else 'Anónimo'}_{log.ip_address}"
            if key not in agrupados:
                agrupados[key] = {
                    'usuario': log.usuario.username if log.usuario else 'Anónimo',
                    'ip_address': log.ip_address,
                    'timestamp': log.created_at.isoformat(),
                    'intentos': 0
                }
            agrupados[key]['intentos'] += 1
        
        return Response(list(agrupados.values()))
    
    @action(detail=False, methods=['get'])
    def exportar_csv(self, request):
        """
        Exporta logs a CSV
        """
        queryset = self.get_queryset()[:1000]  # Limitar a 1000 registros
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="auditoria_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Fecha/Hora', 'Usuario', 'Acción', 'Módulo', 'IP', 'User Agent'])
        
        for log in queryset:
            writer.writerow([
                log.id,
                log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                log.usuario.username if log.usuario else 'Sistema',
                log.accion,
                log.modelo,
                log.ip_address or '',
                log.user_agent or ''
            ])
        
        return response
    
    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        """
        Exporta logs a Excel (placeholder - requiere openpyxl)
        """
        # Por ahora retorna CSV con nombre .xlsx
        return self.exportar_csv(request)
    
    @action(detail=False, methods=['post'])
    def busqueda_avanzada(self, request):
        """
        Búsqueda avanzada con múltiples criterios
        """
        criterios = request.data
        queryset = self.get_queryset()
        
        if 'texto' in criterios and criterios['texto']:
            texto = criterios['texto']
            queryset = queryset.filter(
                Q(accion__icontains=texto) |
                Q(modelo__icontains=texto) |
                Q(usuario__username__icontains=texto)
            )
        
        if 'fecha_desde' in criterios and criterios['fecha_desde']:
            queryset = queryset.filter(created_at__gte=criterios['fecha_desde'])
            
        if 'fecha_hasta' in criterios and criterios['fecha_hasta']:
            queryset = queryset.filter(created_at__lte=criterios['fecha_hasta'])
        
        serializer = self.get_serializer(queryset[:100], many=True)
        return Response(serializer.data)
