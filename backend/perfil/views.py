from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import pandas as pd
from io import BytesIO
import logging

from .models import Perfil, ConfiguracionNotificaciones
from .serializers import (
    PerfilSerializer, PerfilCreateUpdateSerializer, PerfilPublicoSerializer,
    PerfilResumenSerializer, UserConPerfilSerializer, ConfiguracionNotificacionesSerializer,
    EstadisticasPerfilSerializer, UserBasicSerializer
)

logger = logging.getLogger(__name__)


class PerfilViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa de perfiles de usuario.
    
    Proporciona operaciones CRUD, búsqueda, estadísticas y exportación.
    """
    
    queryset = Perfil.objects.select_related('usuario').prefetch_related('config_notificaciones')
    serializer_class = PerfilSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'genero', 'estado_civil', 'ciudad_residencia', 'departamento_residencia',
        'profesion', 'nivel_educacion', 'perfil_completado', 'privacidad_publica'
    ]
    search_fields = [
        'usuario__username', 'usuario__first_name', 'usuario__last_name',
        'telefono', 'numero_cedula', 'profesion', 'habilidades'
    ]
    ordering_fields = [
        'fecha_creacion', 'ultima_actualizacion_perfil', 'usuario__first_name',
        'usuario__last_name', 'fecha_nacimiento'
    ]
    ordering = ['-fecha_creacion']

    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return PerfilCreateUpdateSerializer
        elif self.action == 'list':
            return PerfilResumenSerializer
        elif self.action == 'publico':
            return PerfilPublicoSerializer
        return PerfilSerializer

    def get_permissions(self):
        """Permisos específicos por acción"""
        if self.action in ['publico', 'list']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['mi_perfil', 'actualizar_mi_perfil']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='mi-perfil')
    def mi_perfil(self, request):
        """Obtiene el perfil del usuario autenticado, creándolo si no existe"""
        try:
            # Usar all_objects para buscar sin filtro de organización
            try:
                perfil = Perfil.all_objects.select_related('usuario').get(usuario=request.user)
                
                # Actualizar organización si es necesaria
                if hasattr(request.user, 'organization') and request.user.organization:
                    if not perfil.organization or perfil.organization != request.user.organization:
                        perfil.organization = request.user.organization
                        perfil.save()
                        
            except Perfil.DoesNotExist:
                # No existe, crearlo
                perfil = Perfil(usuario=request.user)
                
                # Asignar organización si el usuario la tiene
                if hasattr(request.user, 'organization') and request.user.organization:
                    perfil.organization = request.user.organization
                
                perfil.save()
                
                # Crear también la configuración de notificaciones
                ConfiguracionNotificaciones.objects.get_or_create(perfil=perfil)
            
            serializer = PerfilSerializer(perfil)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error obteniendo perfil del usuario {request.user.id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': 'Error al obtener el perfil'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['put', 'patch'], url_path='actualizar-mi-perfil')
    def actualizar_mi_perfil(self, request):
        """Actualiza el perfil del usuario autenticado, creándolo si no existe"""
        try:
            # Usar all_objects para buscar sin filtro de organización
            try:
                perfil = Perfil.all_objects.get(usuario=request.user)
            except Perfil.DoesNotExist:
                # No existe, crearlo
                perfil = Perfil(usuario=request.user)
                
                # Asignar organización si el usuario la tiene
                if hasattr(request.user, 'organization') and request.user.organization:
                    perfil.organization = request.user.organization
                
                perfil.save()
                
                # Crear también la configuración de notificaciones
                try:
                    ConfiguracionNotificaciones.objects.get_or_create(perfil=perfil)
                except Exception as e:
                    logger.warning(f"No se pudo crear configuración de notificaciones: {e}")
            
            serializer = PerfilCreateUpdateSerializer(
                perfil, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
            
            if serializer.is_valid():
                serializer.save()
                # Retornar el perfil completo actualizado
                response_serializer = PerfilSerializer(perfil)
                return Response(response_serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error actualizando perfil del usuario {request.user.id}: {e}")
            return Response(
                {'error': 'Error al actualizar el perfil'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def publico(self, request, pk=None):
        """Obtiene información pública del perfil"""
        perfil = self.get_object()
        
        if not perfil.privacidad_publica:
            return Response(
                {'error': 'Este perfil no es público'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = PerfilPublicoSerializer(perfil)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtiene estadísticas generales de perfiles"""
        try:
            total_perfiles = Perfil.objects.count()
            perfiles_completados = Perfil.objects.filter(perfil_completado=True).count()
            perfiles_incompletos = total_perfiles - perfiles_completados
            
            porcentaje_completitud = (
                (perfiles_completados / total_perfiles * 100) if total_perfiles > 0 else 0
            )
            
            # Estadísticas por categorías
            por_genero = dict(
                Perfil.objects.values('genero')
                .annotate(count=Count('id'))
                .values_list('genero', 'count')
            )
            
            por_estado_civil = dict(
                Perfil.objects.values('estado_civil')
                .annotate(count=Count('id'))
                .values_list('estado_civil', 'count')
            )
            
            por_profesion = dict(
                Perfil.objects.exclude(profesion__isnull=True)
                .exclude(profesion='')
                .values('profesion')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
                .values_list('profesion', 'count')
            )
            
            por_ciudad = dict(
                Perfil.objects.exclude(ciudad_residencia__isnull=True)
                .exclude(ciudad_residencia='')
                .values('ciudad_residencia')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
                .values_list('ciudad_residencia', 'count')
            )
            
            estadisticas = {
                'total_perfiles': total_perfiles,
                'perfiles_completados': perfiles_completados,
                'perfiles_incompletos': perfiles_incompletos,
                'porcentaje_completitud': round(porcentaje_completitud, 2),
                'por_genero': por_genero,
                'por_estado_civil': por_estado_civil,
                'por_profesion': por_profesion,
                'por_ciudad': por_ciudad,
            }
            
            serializer = EstadisticasPerfilSerializer(estadisticas)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error generando estadísticas de perfiles: {e}")
            return Response(
                {'error': 'Error al generar estadísticas'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exporta perfiles a Excel"""
        try:
            # Obtener queryset filtrado
            queryset = self.filter_queryset(self.get_queryset())
            
            # Preparar datos para Excel
            data = []
            for perfil in queryset:
                data.append({
                    'ID': perfil.id,
                    'Usuario': perfil.usuario.username,
                    'Nombre Completo': perfil.nombre_completo,
                    'Email': perfil.usuario.email,
                    'Teléfono': perfil.telefono,
                    'Cédula': perfil.numero_cedula,
                    'Género': perfil.get_genero_display(),
                    'Estado Civil': perfil.get_estado_civil_display(),
                    'Fecha Nacimiento': perfil.fecha_nacimiento,
                    'Edad': perfil.edad,
                    'Profesión': perfil.profesion,
                    'Nivel Educación': perfil.get_nivel_educacion_display(),
                    'Ciudad': perfil.ciudad_residencia,
                    'Departamento': perfil.departamento_residencia,
                    'Perfil Completado': 'Sí' if perfil.perfil_completado else 'No',
                    'Fecha Creación': perfil.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S'),
                })
            
            # Crear DataFrame y Excel
            df = pd.DataFrame(data)
            
            # Crear archivo Excel en memoria
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Perfiles', index=False)
                
                # Ajustar ancho de columnas
                worksheet = writer.sheets['Perfiles']
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
            
            # Crear respuesta HTTP
            response = HttpResponse(
                output.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="perfiles_export.xlsx"'
            
            logger.info(f"Exportación de perfiles realizada por usuario {request.user.id}")
            return response
            
        except Exception as e:
            logger.error(f"Error exportando perfiles: {e}")
            return Response(
                {'error': 'Error al exportar datos'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """Búsqueda avanzada de perfiles"""
        try:
            # Obtener parámetros de búsqueda
            query = request.query_params.get('q', '')
            genero = request.query_params.get('genero', '')
            ciudad = request.query_params.get('ciudad', '')
            profesion = request.query_params.get('profesion', '')
            completado = request.query_params.get('completado', '')
            
            # Construir queryset
            queryset = self.get_queryset()
            
            if query:
                queryset = queryset.filter(
                    Q(usuario__first_name__icontains=query) |
                    Q(usuario__last_name__icontains=query) |
                    Q(usuario__username__icontains=query) |
                    Q(telefono__icontains=query) |
                    Q(numero_cedula__icontains=query) |
                    Q(profesion__icontains=query) |
                    Q(habilidades__icontains=query)
                )
            
            if genero:
                queryset = queryset.filter(genero=genero)
            
            if ciudad:
                queryset = queryset.filter(ciudad_residencia__icontains=ciudad)
            
            if profesion:
                queryset = queryset.filter(profesion__icontains=profesion)
            
            if completado:
                queryset = queryset.filter(perfil_completado=completado.lower() == 'true')
            
            # Paginar resultados
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = PerfilResumenSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = PerfilResumenSerializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error en búsqueda de perfiles: {e}")
            return Response(
                {'error': 'Error en la búsqueda'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConfiguracionNotificacionesViewSet(viewsets.ModelViewSet):
    """ViewSet para configuración de notificaciones"""
    
    queryset = ConfiguracionNotificaciones.objects.select_related('perfil__usuario')
    serializer_class = ConfiguracionNotificacionesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filtrar por usuario si no es admin"""
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(perfil__usuario=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='mi-configuracion')
    def mi_configuracion(self, request):
        """Obtiene o actualiza la configuración del usuario autenticado"""
        try:
            perfil = get_object_or_404(Perfil, usuario=request.user)
            config, created = ConfiguracionNotificaciones.objects.get_or_create(
                perfil=perfil
            )
            
            if request.method == 'GET':
                serializer = ConfiguracionNotificacionesSerializer(config)
                return Response(serializer.data)
            
            else:  # PUT o PATCH
                serializer = ConfiguracionNotificacionesSerializer(
                    config,
                    data=request.data,
                    partial=request.method == 'PATCH'
                )
                
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error en configuración de notificaciones del usuario {request.user.id}: {e}")
            return Response(
                {'error': 'Error al gestionar configuración'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
