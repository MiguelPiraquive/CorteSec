"""
API Views para el módulo de Configuración
=========================================

Views API REST para gestionar configuraciones del sistema.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from core.email_service import send_system_email
from django.core.cache import cache
from django.conf import settings
from django.db.models import Q
import requests

import logging

from .models import (
    ConfiguracionGeneral,
    ParametroSistema,
    ConfiguracionModulo,
    LogConfiguracion,
    ConfiguracionSeguridad,
    ConfiguracionEmail
)
from .serializers import (
    ConfiguracionGeneralSerializer,
    ParametroSistemaSerializer,
    ConfiguracionModuloSerializer,
    LogConfiguracionSerializer,
    ConfiguracionSeguridadSerializer,
    ConfiguracionEmailSerializer,
    TestEmailSerializer
)
from core.mixins import MultiTenantViewSetMixin
from .policies import (
    ConfiguracionAccessPolicy,
    ParametrosAccessPolicy,
    ModulosAccessPolicy,
    SeguridadConfigAccessPolicy,
    EmailConfigAccessPolicy,
    LogsConfigAccessPolicy,
)

logger = logging.getLogger(__name__)


class ConfiguracionGeneralViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar configuración general del sistema (Singleton)"""
    serializer_class = ConfiguracionGeneralSerializer
    permission_classes = [ConfiguracionAccessPolicy]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización (no delete ni create)
    
    def get_queryset(self):
        """Retorna todos los registros de configuración SIN filtros de tenant"""
        # ConfiguracionGeneral es global, NO es multi-tenant
        return ConfiguracionGeneral.objects.all()
    
    def list(self, request, *args, **kwargs):
        """Retorna la configuración actual (siempre un único objeto)"""
        config = ConfiguracionGeneral.objects.first()
        
        if not config:
            return Response({
                'id': None,
                'nombre_empresa': '',
                'nit': '',
                'direccion': '',
                'telefono': '',
                'email': '',
                'sitio_web': '',
                'logo': None,
                'moneda': 'COP',
                'simbolo_moneda': '$',
                'zona_horaria': 'America/Bogota',
                'formato_fecha': '%d/%m/%Y',
                'dia_pago_nomina': 30,
                'periodo_nomina': 'mensual',
                'cuenta_efectivo_defecto': '',
                'cuenta_nomina_defecto': '',
                'cuenta_prestamos_defecto': '',
                'cuenta_intereses_prestamo_defecto': '',
                'cuenta_mora_prestamo_defecto': '',
                'cuenta_otras_deducciones_defecto': '',
            })
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Obtiene la configuración (ignora el pk de la URL, siempre retorna el singleton)"""
        config = ConfiguracionGeneral.objects.first()
        
        if not config:
            return Response({
                'id': None,
                'nombre_empresa': '',
                'nit': '',
                'direccion': '',
                'telefono': '',
                'email': '',
                'sitio_web': '',
                'logo': None,
                'moneda': 'COP',
                'simbolo_moneda': '$',
                'zona_horaria': 'America/Bogota',
                'formato_fecha': '%d/%m/%Y',
                'dia_pago_nomina': 30,
                'periodo_nomina': 'mensual',
                'cuenta_efectivo_defecto': '',
                'cuenta_nomina_defecto': '',
                'cuenta_prestamos_defecto': '',
                'cuenta_intereses_prestamo_defecto': '',
                'cuenta_mora_prestamo_defecto': '',
                'cuenta_otras_deducciones_defecto': '',
            })
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualiza la configuración general (ignora el pk de la URL)"""
        config = ConfiguracionGeneral.objects.first()
        
        if not config:
            # Si no existe, crear con los datos enviados por el usuario
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                config = serializer.save(modificado_por=request.user)
                LogConfiguracion.objects.create(
                    tipo_cambio='general',
                    nivel='success',
                    item_modificado='Configuración General',
                    descripcion='Configuración general creada',
                    usuario=request.user
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Si existe, actualizar
            serializer = self.get_serializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                config = serializer.save(modificado_por=request.user)
                LogConfiguracion.objects.create(
                    tipo_cambio='general',
                    nivel='success',
                    item_modificado='Configuración General',
                    descripcion='Configuración general actualizada',
                    usuario=request.user
                )
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def test_email(self, request):
        """Probar configuración de email"""
        try:
            destinatario = request.data.get('email')
            if not destinatario:
                return Response(
                    {'error': 'Email destinatario requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            send_system_email(
                subject='Test de Configuración de Email',
                message='Este es un correo de prueba desde CorteSec.',
                recipient_list=[destinatario],
                fail_silently=False,
            )
            
            return Response({'success': True, 'message': 'Email de prueba enviado exitosamente'})
        except Exception as e:
            logger.error(f"Error al enviar email de prueba: {e}")
            return Response(
                {'error': f'Error al enviar email: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ParametroSistemaViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar parámetros del sistema"""
    queryset = ParametroSistema.objects.all()
    serializer_class = ParametroSistemaSerializer
    permission_classes = [ParametrosAccessPolicy]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros
        search = self.request.query_params.get('search', None)
        tipo = self.request.query_params.get('tipo', None)
        activo = self.request.query_params.get('activo', None)
        categoria = self.request.query_params.get('categoria', None)
        
        if search:
            queryset = queryset.filter(
                Q(codigo__icontains=search) |
                Q(nombre__icontains=search) |
                Q(descripcion__icontains=search) |
                Q(valor__icontains=search)
            )
        
        if tipo == 'sistema':
            queryset = queryset.filter(es_sistema=True)
        elif tipo == 'usuario':
            queryset = queryset.filter(es_sistema=False)
        
        if activo == 'true':
            queryset = queryset.filter(activo=True)
        elif activo == 'false':
            queryset = queryset.filter(activo=False)
        
        if categoria:
            queryset = queryset.filter(nombre__icontains=categoria)
        
        return queryset.order_by('codigo')


class ConfiguracionModuloViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestionar módulos del sistema"""
    queryset = ConfiguracionModulo.objects.all()
    serializer_class = ConfiguracionModuloSerializer
    permission_classes = [ModulosAccessPolicy]
    
    def get_queryset(self):
        return super().get_queryset().order_by('orden_menu', 'modulo')
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Activar/desactivar módulo"""
        modulo = self.get_object()
        modulo.activo = not modulo.activo
        modulo.save()
        
        # Log de la acción
        LogConfiguracion.objects.create(
            usuario=request.user,
            accion='toggle_modulo',
            descripcion=f"Módulo {modulo.modulo} {'activado' if modulo.activo else 'desactivado'}",
            nivel='info'
        )
        
        return Response({'status': 'success', 'activo': modulo.activo})


class ConfiguracionSeguridadViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar configuración de seguridad del sistema (Singleton)"""
    serializer_class = ConfiguracionSeguridadSerializer
    permission_classes = [SeguridadConfigAccessPolicy]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización
    
    def get_queryset(self):
        # Configuración de Seguridad es global, no multi-tenant
        return ConfiguracionSeguridad.objects.all_tenants()
    
    def get_object(self):
        # Obtiene o crea el singleton (bypass tenant filter)
        try:
            config = ConfiguracionSeguridad.objects.all_tenants().get(pk=1)
        except ConfiguracionSeguridad.DoesNotExist:
            config = ConfiguracionSeguridad(pk=1)
            if hasattr(self.request.user, 'organization') and self.request.user.organization:
                config.organization = self.request.user.organization
            config.save()
            logger.info("ConfiguracionSeguridad creada automáticamente")
        return config
    
    def list(self, request):
        """Retorna la configuración de seguridad (singleton)"""
        config = self.get_object()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualizar configuración de seguridad"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Guardar usuario que modifica
        if request.user:
            request.data['modificado_por'] = request.user.id
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log de la acción
        try:
            LogConfiguracion.objects.create(
                tipo_cambio='sistema',
                nivel='info',
                item_modificado='Configuración de Seguridad',
                descripcion='Configuración de seguridad actualizada',
                usuario=request.user
            )
        except Exception as e:
            logger.warning(f"No se pudo crear log: {e}")
        
        return Response(serializer.data)


class ConfiguracionEmailViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar configuración de email del sistema (Singleton)"""
    serializer_class = ConfiguracionEmailSerializer
    permission_classes = [EmailConfigAccessPolicy]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización
    
    def get_queryset(self):
        # Configuración de Email es global, no multi-tenant
        return ConfiguracionEmail.objects.all_tenants()
    
    def get_object(self):
        # Obtiene o crea el singleton (bypass tenant filter)
        try:
            config = ConfiguracionEmail.objects.all_tenants().get(pk=1)
        except ConfiguracionEmail.DoesNotExist:
            config = ConfiguracionEmail(
                pk=1,
                servidor_smtp='smtp.gmail.com',
                puerto_smtp=587,
                usuario_smtp='',
                password_smtp='',
                email_remitente='noreply@empresa.com',
                nombre_remitente='Sistema CorteSec',
            )
            # Asignar organización del usuario
            if hasattr(self.request.user, 'organization') and self.request.user.organization:
                config.organization = self.request.user.organization
            config.save()
            logger.info("ConfiguracionEmail creada automáticamente")
        return config
    
    def list(self, request):
        """Retorna la configuración de email (singleton)"""
        config = self.get_object()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualizar configuración de email"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Guardar usuario que modifica
        if request.user:
            request.data['modificado_por'] = request.user.id
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log de la acción
        try:
            LogConfiguracion.objects.create(
                tipo_cambio='sistema',
                nivel='info',
                item_modificado='Configuración de Email',
                descripcion='Configuración de email actualizada',
                usuario=request.user
            )
        except Exception as e:
            logger.warning(f"No se pudo crear log: {e}")
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def test_email(self, request):
        """Envía un email de prueba con la configuración actual"""
        config = self.get_object()
        serializer = TestEmailSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email_destino = serializer.validated_data['email_destino']
        
        # Verificar si el servicio de email está activo
        if not config.servicio_activo:
            return Response({
                'status': 'error',
                'message': 'El servicio de email está desactivado. Actívelo antes de enviar emails de prueba.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from core.email_service import send_system_email
            
            # Crear mensaje de prueba
            subject = 'Email de Prueba - Sistema CorteSec'
            message = (
                f'Este es un email de prueba desde el Sistema CorteSec.\n\n'
                f'Configuración utilizada:\n'
                f'- Servidor SMTP: {config.servidor_smtp}\n'
                f'- Puerto: {config.puerto_smtp}\n'
                f'- Usuario: {config.usuario_smtp}\n'
                f'- Remitente: {config.nombre_remitente} <{config.email_remitente}>\n'
                f'- TLS: {"Sí" if config.usar_tls else "No"}\n'
                f'- SSL: {"Sí" if config.usar_ssl else "No"}\n\n'
                f'Si recibes este mensaje, la configuración de email está funcionando correctamente.'
            )
            
            # Crear versión HTML con plantillas header/footer si existen
            html_message = None
            header = config.plantilla_header or ''
            footer = config.plantilla_footer or ''
            if header or footer:
                html_body = (
                    f'<h2>Email de Prueba - CorteSec</h2>'
                    f'<p>Este es un email de prueba desde el Sistema CorteSec.</p>'
                    f'<h3>Configuración utilizada:</h3>'
                    f'<ul>'
                    f'<li><strong>Servidor SMTP:</strong> {config.servidor_smtp}</li>'
                    f'<li><strong>Puerto:</strong> {config.puerto_smtp}</li>'
                    f'<li><strong>Usuario:</strong> {config.usuario_smtp}</li>'
                    f'<li><strong>Remitente:</strong> {config.nombre_remitente} &lt;{config.email_remitente}&gt;</li>'
                    f'<li><strong>TLS:</strong> {"Sí" if config.usar_tls else "No"}</li>'
                    f'<li><strong>SSL:</strong> {"Sí" if config.usar_ssl else "No"}</li>'
                    f'</ul>'
                    f'<p style="color:green;"><strong>✓ Si recibes este mensaje, la configuración de email está funcionando correctamente.</strong></p>'
                )
                html_message = f'{header}\n{html_body}\n{footer}'
            
            # Enviar usando el servicio centralizado
            result = send_system_email(
                subject=subject,
                message=message,
                recipient_list=[email_destino],
                html_message=html_message,
                fail_silently=False,
            )
            
            if result:
                # Log del envío
                LogConfiguracion.objects.create(
                    tipo_cambio='sistema',
                    nivel='success',
                    item_modificado='Test Email',
                    descripcion=f'Email de prueba enviado a {email_destino}',
                    usuario=request.user
                )
                
                return Response({
                    'status': 'success',
                    'message': f'Email de prueba enviado exitosamente a {email_destino}'
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'El email no pudo ser enviado. Verifique la configuración.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Error al enviar email de prueba: {str(e)}")
            
            # Log del error
            LogConfiguracion.objects.create(
                tipo_cambio='sistema',
                nivel='error',
                item_modificado='Test Email',
                descripcion=f'Error al enviar email de prueba: {str(e)}',
                usuario=request.user
            )
            
            return Response({
                'status': 'error',
                'message': f'Error al enviar email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([ConfiguracionAccessPolicy])
def dashboard_api_view(request):
    """API para obtener datos del dashboard de configuración"""
    try:
        # Obtener configuración general
        config_general = ConfiguracionGeneral.get_config()
        
        # Estadísticas de parámetros
        total_parametros = ParametroSistema.objects.count()
        parametros_activos = ParametroSistema.objects.filter(activo=True).count()
        parametros_sistema = ParametroSistema.objects.filter(es_sistema=True).count()
        
        # Estadísticas de módulos
        total_modulos = ConfiguracionModulo.objects.count()
        modulos_activos = ConfiguracionModulo.objects.filter(activo=True).count()
        modulos_inactivos = total_modulos - modulos_activos
        
        # Estadísticas de logs
        logs_hoy = LogConfiguracion.objects.filter(
            fecha_creacion__date=timezone.now().date()
        ).count()
        total_logs = LogConfiguracion.objects.count()
        logs_errores = LogConfiguracion.objects.filter(nivel='error').count()
        logs_warnings = LogConfiguracion.objects.filter(nivel='warning').count()
        
        # Logs recientes
        logs_recientes = LogConfiguracion.objects.select_related('usuario').order_by('-fecha_creacion')[:5]
        logs_recientes_data = LogConfiguracionSerializer(logs_recientes, many=True).data
        
        # Módulos con sus estados
        modulos = ConfiguracionModulo.objects.all().order_by('orden_menu', 'modulo')
        modulos_data = ConfiguracionModuloSerializer(modulos, many=True).data
        
        data = {
            'config_general': ConfiguracionGeneralSerializer(config_general).data if config_general else None,
            'stats': {
                'total_parametros': total_parametros,
                'parametros_activos': parametros_activos,
                'parametros_sistema': parametros_sistema,
                'total_modulos': total_modulos,
                'modulos_activos': modulos_activos,
                'modulos_inactivos': modulos_inactivos,
                'logs_hoy': logs_hoy,
                'total_logs': total_logs,
                'logs_errores': logs_errores,
                'logs_warnings': logs_warnings,
            },
            'logs_recientes': logs_recientes_data,
            'modulos': modulos_data,
        }
        
        return Response(data)
        
    except Exception as e:
        logger.error(f"Error en dashboard_api_view: {e}")
        return Response(
            {'error': 'Error al obtener datos del dashboard'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([ConfiguracionAccessPolicy])
def configuracion_general_api(request):
    """API para gestionar configuración general"""
    try:
        config = ConfiguracionGeneral.get_config()
        
        if request.method == 'GET':
            serializer = ConfiguracionGeneralSerializer(config)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = ConfiguracionGeneralSerializer(
                config, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                
                # Log de la acción
                LogConfiguracion.objects.create(
                    usuario=request.user,
                    accion='actualizar_config_general',
                    descripcion="Configuración general actualizada",
                    nivel='info'
                )
                
                return Response(serializer.data)
            else:
                return Response(
                    serializer.errors, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
    except Exception as e:
        logger.error(f"Error en configuracion_general_api: {e}")
        return Response(
            {'error': 'Error al procesar configuración general'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([ConfiguracionAccessPolicy])
def test_email_api(request):
    """API para probar configuración de email"""
    try:
        config = ConfiguracionGeneral.get_config()
        
        if not config or not config.email:
            return Response(
                {'error': 'No hay email configurado'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Enviar email de prueba
        send_system_email(
            subject='Email de Prueba - CorteSec',
            message=f'Este es un email de prueba desde el sistema CorteSec.\n\nEnviado el: {timezone.now()}',
            recipient_list=[config.email],
            fail_silently=False,
        )
        
        # Log de la acción
        LogConfiguracion.objects.create(
            usuario=request.user,
            accion='test_email',
            descripcion=f"Email de prueba enviado a {config.email}",
            nivel='info'
        )
        
        return Response({'message': 'Email de prueba enviado correctamente'})
        
    except Exception as e:
        logger.error(f"Error al enviar email de prueba: {e}")
        
        # Log del error
        LogConfiguracion.objects.create(
            usuario=request.user,
            accion='test_email_error',
            descripcion=f"Error al enviar email de prueba: {str(e)}",
            nivel='error'
        )
        
        return Response(
            {'error': 'Error al enviar email de prueba'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([LogsConfigAccessPolicy])
def logs_api_view(request):
    """API para obtener logs del sistema"""
    try:
        # Filtros
        nivel = request.query_params.get('nivel', None)
        fecha_desde = request.query_params.get('fecha_desde', None)
        fecha_hasta = request.query_params.get('fecha_hasta', None)
        usuario_id = request.query_params.get('usuario', None)
        search = request.query_params.get('search', None)
        
        # Base queryset
        queryset = LogConfiguracion.objects.select_related('usuario').order_by('-fecha_creacion')
        
        # Aplicar filtros
        if nivel:
            queryset = queryset.filter(nivel=nivel)
        
        if fecha_desde:
            queryset = queryset.filter(fecha_creacion__date__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(fecha_creacion__date__lte=fecha_hasta)
        
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        
        if search:
            queryset = queryset.filter(
                Q(descripcion__icontains=search) |
                Q(accion__icontains=search)
            )
        
        # Paginación
        from django.core.paginator import Paginator
        
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        
        serializer = LogConfiguracionSerializer(page_obj.object_list, many=True)
        
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        })
        
    except Exception as e:
        logger.error(f"Error en logs_api_view: {e}")
        return Response(
            {'error': 'Error al obtener logs'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@login_required
def logs_clear_api(request):
    """API para limpiar logs"""
    if request.method == 'POST':
        try:
            # Solo mantener logs de los últimos 30 días
            fecha_limite = timezone.now() - timezone.timedelta(days=30)
            logs_eliminados = LogConfiguracion.objects.filter(
                fecha_creacion__lt=fecha_limite
            ).count()
            
            LogConfiguracion.objects.filter(
                fecha_creacion__lt=fecha_limite
            ).delete()
            
            # Log de la acción
            LogConfiguracion.objects.create(
                usuario=request.user,
                accion='limpiar_logs',
                descripcion=f"Se eliminaron {logs_eliminados} logs antiguos",
                nivel='info'
            )
            
            return JsonResponse({
                'success': True,
                'message': f'Se eliminaron {logs_eliminados} logs antiguos'
            })
            
        except Exception as e:
            logger.error(f"Error al limpiar logs: {e}")
            return JsonResponse({
                'success': False,
                'error': 'Error al limpiar logs'
            }, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


# ============================================
# FIXER.IO - TASAS DE CAMBIO
# ============================================
FIXER_CACHE_KEY = 'fixer_exchange_rates'
FIXER_CACHE_TTL = 60 * 60 * 6  # 6 horas (plan free = 100 req/mes)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exchange_rates_view(request):
    """
    Retorna tasas de cambio desde Fixer.io con cache agresivo.
    Plan Free: solo EUR como base, se recalculan cross-rates.
    
    Query params:
      ?base=COP         - moneda base para mostrar tasas (default: config del sistema)
      ?symbols=USD,EUR   - monedas específicas (opcional, default: populares)
    """
    api_key = getattr(settings, 'FIXER_API_KEY', '')
    if not api_key:
        return Response(
            {'error': 'API key de Fixer.io no configurada. Agrega FIXER_API_KEY en variables de entorno.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Obtener rates desde cache o Fixer
    cached = cache.get(FIXER_CACHE_KEY)
    if cached:
        eur_rates = cached
    else:
        try:
            resp = requests.get(
                'http://data.fixer.io/api/latest',
                params={'access_key': api_key},
                timeout=10
            )
            data = resp.json()
            if not data.get('success'):
                error_info = data.get('error', {})
                return Response(
                    {'error': f"Fixer API error: {error_info.get('info', 'Error desconocido')}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            eur_rates = data['rates']
            cache.set(FIXER_CACHE_KEY, eur_rates, FIXER_CACHE_TTL)
        except requests.RequestException as e:
            logger.error(f"Error al conectar con Fixer.io: {e}")
            return Response(
                {'error': 'No se pudo conectar con el servicio de tasas de cambio'},
                status=status.HTTP_502_BAD_GATEWAY
            )

    # Determinar moneda base del usuario
    base_currency = request.query_params.get('base', '').upper()
    if not base_currency:
        try:
            config = ConfiguracionGeneral.objects.first()
            base_currency = config.moneda if config and config.moneda else 'COP'
        except Exception:
            base_currency = 'COP'

    # Monedas a retornar
    symbols_param = request.query_params.get('symbols', '')
    if symbols_param:
        target_symbols = [s.strip().upper() for s in symbols_param.split(',') if s.strip()]
    else:
        # Monedas populares por defecto
        target_symbols = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN', 'JPY', 'CAD', 'CHF', 'CNY']

    # Quitar la base de los targets
    target_symbols = [s for s in target_symbols if s != base_currency]

    # Cross-calculate: convertir de EUR base a base_currency base
    # rate_base = EUR → base_currency
    if base_currency == 'EUR':
        base_rate = 1.0
    else:
        base_rate = eur_rates.get(base_currency)
        if not base_rate:
            return Response(
                {'error': f'Moneda base {base_currency} no soportada por Fixer.io'},
                status=status.HTTP_400_BAD_REQUEST
            )

    converted_rates = {}
    for symbol in target_symbols:
        if symbol == 'EUR':
            target_rate = 1.0
        else:
            target_rate = eur_rates.get(symbol)
            if target_rate is None:
                continue
        # 1 base_currency = target_rate / base_rate
        converted_rates[symbol] = round(target_rate / base_rate, 6)

    return Response({
        'success': True,
        'base': base_currency,
        'date': data.get('date', str(timezone.now().date())) if not cached else str(timezone.now().date()),
        'rates': converted_rates,
        'cached': bool(cached),
    })
