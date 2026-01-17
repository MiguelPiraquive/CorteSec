"""
API Views para el módulo de Configuración
=========================================

Views API REST para gestionar configuraciones del sistema.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

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

logger = logging.getLogger(__name__)


class ConfiguracionGeneralViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar configuración general del sistema (Singleton)"""
    serializer_class = ConfiguracionGeneralSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización (no delete ni create)
    
    def get_queryset(self):
        """Retorna todos los registros de configuración SIN filtros de tenant"""
        # ConfiguracionGeneral es global, NO es multi-tenant
        return ConfiguracionGeneral.objects.all()
    
    def list(self, request, *args, **kwargs):
        """Retorna la configuración actual (siempre un único objeto)"""
        logger.info("=" * 80)
        logger.info("LIST llamado - Obteniendo configuración")
        
        total_configs = ConfiguracionGeneral.objects.count()
        logger.info(f"Total de configuraciones en DB: {total_configs}")
        
        config = ConfiguracionGeneral.objects.first()
        logger.info(f"Configuración obtenida: {config}")
        
        if config:
            logger.info(f"Config ID: {config.id}")
            logger.info(f"Config Nombre: {config.nombre_empresa}")
            logger.info(f"Config NIT: {config.nit}")
        
        if not config:
            logger.warning("No existe configuración, retornando estructura vacía")
            return Response({
                'id': None,
                'nombre_empresa': '',
                'nit': '',
                'direccion': '',
                'telefono': '',
                'email': '',
                'sitio_web': '',
                'logo': None,
            })
        
        serializer = self.get_serializer(config)
        logger.info(f"Datos serializados: {serializer.data}")
        logger.info("=" * 80)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Obtiene la configuración (ignora el pk de la URL, siempre retorna el singleton)"""
        logger.info("=" * 80)
        logger.info("RETRIEVE llamado - Obteniendo configuración")
        logger.info(f"URL PK solicitado: {kwargs.get('pk', 'N/A')}")
        
        total_configs = ConfiguracionGeneral.objects.count()
        logger.info(f"Total de configuraciones en DB: {total_configs}")
        
        config = ConfiguracionGeneral.objects.first()
        logger.info(f"Configuración obtenida: {config}")
        
        if config:
            logger.info(f"Config ID: {config.id}")
            logger.info(f"Config Nombre: {config.nombre_empresa}")
            logger.info(f"Config NIT: {config.nit}")
        
        if not config:
            logger.warning("No existe configuración, retornando estructura vacía")
            return Response({
                'id': None,
                'nombre_empresa': '',
                'nit': '',
                'direccion': '',
                'telefono': '',
                'email': '',
                'sitio_web': '',
                'logo': None,
            })
        
        serializer = self.get_serializer(config)
        logger.info(f"Datos serializados: {serializer.data}")
        logger.info("=" * 80)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualiza la configuración general (ignora el pk de la URL)"""
        logger.info("=" * 80)
        logger.info("UPDATE llamado - Guardando configuración")
        logger.info(f"URL PK solicitado: {kwargs.get('pk', 'N/A')}")
        logger.info(f"Datos recibidos: {request.data}")
        
        # Obtener el registro real, sin importar el ID de la URL
        total_configs = ConfiguracionGeneral.objects.count()
        logger.info(f"Total de configuraciones ANTES de update: {total_configs}")
        
        config = ConfiguracionGeneral.objects.first()
        logger.info(f"Configuración existente: {config}")
        
        if not config:
            logger.info("No existe config, creando nueva...")
            # Si no existe, crear con los datos enviados por el usuario
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Crear nuevo registro con el usuario que modifica
                config = serializer.save(modificado_por=request.user)
                logger.info(f"✅ CREADA Config ID: {config.id}, Nombre: {config.nombre_empresa}")
                
                # Log de la acción
                LogConfiguracion.objects.create(
                    tipo_cambio='general',
                    nivel='success',
                    item_modificado='Configuración General',
                    descripcion='Configuración general creada',
                    usuario=request.user
                )
                
                logger.info("=" * 80)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"❌ Errores de validación: {serializer.errors}")
                logger.info("=" * 80)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            logger.info(f"Config existe (ID: {config.id}), actualizando...")
            # Si existe, actualizar
            serializer = self.get_serializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                # Actualizar registro existente
                config = serializer.save(modificado_por=request.user)
                logger.info(f"✅ ACTUALIZADA Config ID: {config.id}, Nombre: {config.nombre_empresa}")
                
                # Log de la acción
                LogConfiguracion.objects.create(
                    tipo_cambio='general',
                    nivel='success',
                    item_modificado='Configuración General',
                    descripcion='Configuración general actualizada',
                    usuario=request.user
                )
                
                # Verificar que se guardó
                config_verificacion = ConfiguracionGeneral.objects.get(pk=config.id)
                logger.info(f"🔍 VERIFICACIÓN - Nombre en DB: {config_verificacion.nombre_empresa}")
                
                logger.info("=" * 80)
                return Response(serializer.data)
            else:
                logger.error(f"❌ Errores de validación: {serializer.errors}")
                logger.info("=" * 80)
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
            
            send_mail(
                'Test de Configuración de Email',
                'Este es un correo de prueba desde CorteSec.',
                settings.DEFAULT_FROM_EMAIL,
                [destinatario],
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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ParametroSistema.objects.all()
        
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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ConfiguracionModulo.objects.all().order_by('orden_menu', 'modulo')
    
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
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización
    
    def get_queryset(self):
        return ConfiguracionSeguridad.objects.all()
    
    def get_object(self):
        # Obtiene o crea el singleton
        config, created = ConfiguracionSeguridad.objects.get_or_create(pk=1)
        if created:
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
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Solo lectura y actualización
    
    def get_queryset(self):
        return ConfiguracionEmail.objects.all()
    
    def get_object(self):
        # Obtiene o crea el singleton
        config, created = ConfiguracionEmail.objects.get_or_create(
            pk=1,
            defaults={
                'servidor_smtp': 'smtp.gmail.com',
                'puerto_smtp': 587,
                'usuario_smtp': '',
                'password_smtp': '',
                'email_remitente': 'noreply@empresa.com',
                'nombre_remitente': 'Sistema CorteSec',
            }
        )
        if created:
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
        
        try:
            # Configurar email temporalmente
            from django.core.mail import get_connection, EmailMessage
            
            connection = get_connection(
                host=config.servidor_smtp,
                port=config.puerto_smtp,
                username=config.usuario_smtp,
                password=config.password_smtp,
                use_tls=config.usar_tls,
                use_ssl=config.usar_ssl,
                fail_silently=False,
            )
            
            # Crear mensaje
            subject = 'Email de Prueba - Sistema CorteSec'
            message = f'''
            Este es un email de prueba desde el Sistema CorteSec.
            
            Configuración utilizada:
            - Servidor SMTP: {config.servidor_smtp}
            - Puerto: {config.puerto_smtp}
            - Usuario: {config.usuario_smtp}
            - Remitente: {config.nombre_remitente} <{config.email_remitente}>
            
            Si recibes este mensaje, la configuración de email está funcionando correctamente.
            '''
            
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=f"{config.nombre_remitente} <{config.email_remitente}>",
                to=[email_destino],
                connection=connection,
            )
            
            email.send()
            
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
        send_mail(
            subject='Email de Prueba - CorteSec',
            message=f'Este es un email de prueba desde el sistema CorteSec.\n\nEnviado el: {timezone.now()}',
            from_email=settings.DEFAULT_FROM_EMAIL,
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
@permission_classes([IsAuthenticated])
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
