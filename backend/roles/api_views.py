"""
API Views para el Sistema de Roles
==================================

API REST completa para la gestión de roles, asignaciones y auditoría.
Incluye todas las funcionalidades del sistema de roles empresarial.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import generics, viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Q, Count, Prefetch
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from django.core.exceptions import ValidationError
import logging

from .models import (
    Rol, AsignacionRol, TipoRol, EstadoAsignacion, PlantillaRol,
    MetaRol, RolCondicional, AuditoriaRol, ConfiguracionRol, HistorialAsignacion
)
from .serializers import RolSerializer, AsignacionRolSerializer, TipoRolSerializer, HistorialAsignacionSerializer, AuditoriaRolSerializer
from .policies import (
    RolesAccessPolicy, TipoRolAccessPolicy, AsignacionRolAccessPolicy,
    HistorialAsignacionPolicy, AuditoriaRolPolicy,
)
from core.pagination import StandardResultsSetPagination

User = get_user_model()
logger = logging.getLogger(__name__)


class RolViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para gestionar Roles.
    
    Funcionalidades:
    - CRUD completo de roles
    - Búsqueda y filtrado avanzado
    - Gestión de jerarquía
    - Estadísticas
    - Exportación
    """
    
    queryset = Rol.objects.select_related('tipo_rol').prefetch_related('roles_hijo')
    serializer_class = RolSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'codigo', 'descripcion', 'categoria']
    ordering_fields = ['nombre', 'codigo', 'nivel_jerarquico', 'prioridad', 'fecha_creacion']
    ordering = ['nivel_jerarquico', 'nombre']
    permission_classes = [RolesAccessPolicy]
    
    def get_queryset(self):
        """Optimiza queryset según la acción y filtra por tenant"""
        queryset = self.queryset

        # Tenant filtering
        user = self.request.user
        if not user.is_superuser:
            org_id = str(user.organization_id) if user.organization_id else None
            if not org_id:
                return queryset.none()
            queryset = queryset.filter(tenant_id=org_id)

        if self.action == 'list':
            # Para lista, cargar solo datos necesarios
            queryset = queryset.select_related('tipo_rol').only(
                'id', 'uuid', 'nombre', 'codigo', 'descripcion', 'activo',
                'nivel_jerarquico', 'prioridad', 'fecha_creacion', 'tipo_rol__nombre'
            )
        elif self.action == 'retrieve':
            # Para detalle, cargar todo incluyendo relaciones
            queryset = queryset.prefetch_related(
                'asignaciones__usuario',
                'configuracion_dinamica'
            )

        return queryset
    
    def perform_create(self, serializer):
        """Personaliza la creación de roles"""
        serializer.save(creado_por=self.request.user)

        # Invalidar cache
        cache.delete_many(['roles_activos', 'roles_publicos'])

    def perform_destroy(self, instance):
        """Protege roles del sistema contra eliminación"""
        if instance.es_sistema:
            raise serializers.ValidationError(
                {'detail': 'Los roles del sistema no pueden ser eliminados.'}
            )

        # Verificar que no haya asignaciones activas
        if AsignacionRol.objects.filter(rol=instance, activa=True).exists():
            raise serializers.ValidationError(
                {'detail': 'No se puede eliminar un rol con asignaciones activas. Desactive las asignaciones primero.'}
            )

        # Auditar eliminación
        AuditoriaRol.objects.create(
            rol=instance,
            accion='eliminar_rol',
            usuario_ejecutor=self.request.user,
            detalles_anterior={'nombre': instance.nombre, 'codigo': instance.codigo}
        )

        instance.delete()
        cache.delete_many(['roles_activos', 'roles_publicos'])
    
    def perform_update(self, serializer):
        """Personaliza la actualización de roles"""
        instance = self.get_object()

        # Proteger roles del sistema
        if instance.es_sistema:
            raise serializers.ValidationError(
                {'detail': 'Los roles del sistema no pueden ser modificados.'}
            )

        instance = serializer.save(modificado_por=self.request.user)
        
        # Preparar datos serializables para auditoría
        detalles_serializables = {}
        for key, value in serializer.validated_data.items():
            if hasattr(value, 'id'):
                # Para objetos relacionados, guardar solo el ID
                detalles_serializables[key] = {
                    'id': value.id,
                    'nombre': getattr(value, 'nombre', str(value))
                }
            elif hasattr(value, '__dict__'):
                # Para otros objetos complejos, convertir a string
                detalles_serializables[key] = str(value)
            else:
                # Para tipos básicos, guardar tal como está
                detalles_serializables[key] = value
        
        # Crear auditoría
        AuditoriaRol.objects.create(
            rol=instance,
            accion='modificar_rol',
            usuario_ejecutor=self.request.user,
            detalles_nuevo=detalles_serializables
        )
        
        # Invalidar cache
        instance.invalidar_cache()
    
    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """Activa/desactiva un rol"""
        rol = self.get_object()

        # Proteger roles del sistema
        if rol.es_sistema:
            return Response(
                {'error': 'Los roles del sistema no pueden ser desactivados.'},
                status=status.HTTP_403_FORBIDDEN
            )

        rol.activo = not rol.activo
        rol.modificado_por = request.user
        rol.save()
        
        # Crear auditoría
        AuditoriaRol.objects.create(
            rol=rol,
            accion='activar_rol' if rol.activo else 'desactivar_rol',
            usuario_ejecutor=request.user
        )
        
        return Response({
            'message': f'Rol {"activado" if rol.activo else "desactivado"} exitosamente',
            'activo': rol.activo
        })
    
    @action(detail=True, methods=['get'])
    def jerarquia(self, request, pk=None):
        """Obtiene la jerarquía completa del rol"""
        rol = self.get_object()
        jerarquia = rol.get_jerarquia_completa()
        
        serializer = RolSerializer(jerarquia, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def descendientes(self, request, pk=None):
        """Obtiene todos los roles descendientes"""
        rol = self.get_object()
        descendientes = rol.get_roles_descendientes()
        
        serializer = RolSerializer(descendientes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def usuarios(self, request, pk=None):
        """Obtiene usuarios asignados al rol"""
        from .serializers import UsuarioSimpleSerializer

        rol = self.get_object()
        asignaciones = AsignacionRol.objects.filter(
            rol=rol,
            activa=True,
            usuario__organization=request.user.organization
        ).select_related('usuario')

        usuarios = [asig.usuario for asig in asignaciones]
        return Response(UsuarioSimpleSerializer(usuarios, many=True).data)
    
    @action(detail=True, methods=['post'])
    def asignar_usuario(self, request, pk=None):
        """Asigna un usuario al rol"""
        rol = self.get_object()
        usuario_id = request.data.get('usuario_id')

        if not usuario_id:
            return Response({
                'error': 'ID de usuario es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = User.objects.get(id=usuario_id, organization=request.user.organization)
        except User.DoesNotExist:
            return Response({
                'error': 'Usuario no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)

        # Hierarchy check: un usuario no puede asignar roles de nivel igual o superior al suyo
        if not request.user.is_superuser:
            asignaciones_admin = AsignacionRol.objects.filter(
                usuario=request.user, activa=True
            ).select_related('rol')
            nivel_max_admin = max(
                (a.rol.nivel_jerarquico for a in asignaciones_admin if a.esta_vigente()),
                default=999
            )
            if rol.nivel_jerarquico <= nivel_max_admin:
                return Response({
                    'error': 'No tiene permisos para asignar un rol de nivel igual o superior al suyo.'
                }, status=status.HTTP_403_FORBIDDEN)

        # Verificar que no exista asignación activa
        asignacion_existente = AsignacionRol.objects.filter(
            usuario=usuario,
            rol=rol,
            activa=True
        ).exists()
        
        if asignacion_existente:
            return Response({
                'error': 'El usuario ya tiene este rol asignado'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear asignación
        asignacion = AsignacionRol.objects.create(
            usuario=usuario,
            rol=rol,
            asignado_por=request.user,
            fecha_inicio=request.data.get('fecha_inicio'),
            fecha_fin=request.data.get('fecha_fin'),
            justificacion=request.data.get('justificacion', '')
        )
        
        return Response({
            'message': 'Usuario asignado exitosamente',
            'asignacion_id': asignacion.id
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtiene estadísticas de roles"""
        organization = request.user.organization
        cache_key = f'roles_estadisticas_{organization.id}'
        stats = cache.get(cache_key)

        if stats is None:
            qs = self.get_queryset()
            asignaciones_org = AsignacionRol.objects.filter(
                usuario__organization=organization
            )
            stats = {
                'total_roles': qs.count(),
                'roles_activos': qs.filter(activo=True).count(),
                'roles_inactivos': qs.filter(activo=False).count(),
                'roles_sistema': qs.filter(es_sistema=True).count(),
                'tipos_rol': TipoRol.objects.count(),
                'total_asignaciones': asignaciones_org.count(),
                'asignaciones_activas': asignaciones_org.filter(activa=True).count(),
                'usuarios_con_roles': asignaciones_org.filter(
                    activa=True
                ).values('usuario').distinct().count(),
                'por_tipo': list(
                    TipoRol.objects.annotate(
                        cantidad=Count('rol', filter=Q(rol__in=qs))
                    ).values('nombre', 'cantidad')
                ),
                'por_nivel': list(
                    qs.values('nivel_jerarquico').annotate(
                        cantidad=Count('id')
                    ).order_by('nivel_jerarquico')
                )
            }

            cache.set(cache_key, stats, 300)  # Cache por 5 minutos

        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def modulos(self, request):
        """Obtiene módulos del sistema para roles"""
        from permisos.models import ModuloSistema
        from permisos.serializers import ModuloSistemaBasicSerializer
        
        modulos = ModuloSistema.objects.filter(activo=True).order_by('nivel', 'orden')
        serializer = ModuloSistemaBasicSerializer(modulos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def permisos(self, request):
        """Obtiene permisos disponibles para asignar a roles"""
        from permisos.models import Permiso
        from permisos.serializers import PermisoBasicSerializer
        
        permisos = Permiso.objects.filter(activo=True).select_related('modulo', 'tipo_permiso')
        serializer = PermisoBasicSerializer(permisos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def publicos(self, request):
        """Obtiene roles públicos que los usuarios pueden solicitar"""
        roles_publicos = self.get_queryset().filter(
            es_publico=True,
            activo=True
        ).select_related('tipo_rol')
        
        serializer = RolSerializer(roles_publicos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def validar_codigo(self, request):
        """Valida si un código de rol está disponible"""
        codigo = request.data.get('codigo', '').strip()
        if not codigo:
            return Response({
                'valido': False,
                'mensaje': 'El código es requerido'
            })
        
        existe = self.get_queryset().filter(codigo=codigo).exists()
        return Response({
            'valido': not existe,
            'mensaje': 'Código disponible' if not existe else 'Código ya existe'
        })
    
    @action(detail=True, methods=['get'])
    def permisos_rol(self, request, pk=None):
        """Obtiene los permisos de un rol específico"""
        from .permisos_service import RolPermisosService
        
        rol = self.get_object()
        incluir_heredados = request.query_params.get('incluir_heredados', 'true').lower() == 'true'
        agrupar_por_modulo = request.query_params.get('agrupar_por_modulo', 'true').lower() == 'true'
        
        permisos = RolPermisosService.obtener_permisos_rol(
            rol, incluir_heredados, agrupar_por_modulo
        )
        
        estadisticas = RolPermisosService.obtener_estadisticas_permisos(rol)
        
        return Response({
            'rol': {
                'id': str(rol.id),
                'nombre': rol.nombre,
                'codigo': rol.codigo
            },
            'permisos': permisos,
            'estadisticas': estadisticas
        })
    
    @action(detail=True, methods=['post'])
    def asignar_permisos(self, request, pk=None):
        """Asigna permisos a un rol"""
        from .permisos_service import RolPermisosService
        
        rol = self.get_object()
        permisos_ids = request.data.get('permisos_ids', [])
        motivo = request.data.get('motivo', '')
        
        if not permisos_ids:
            return Response({
                'error': 'Debe proporcionar al menos un permiso'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resultado = RolPermisosService.asignar_permisos(
                rol, permisos_ids, request.user, motivo
            )
            return Response(resultado)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def revocar_permisos(self, request, pk=None):
        """Revoca permisos de un rol"""
        from .permisos_service import RolPermisosService
        
        rol = self.get_object()
        permisos_ids = request.data.get('permisos_ids', [])
        motivo = request.data.get('motivo', '')
        
        if not permisos_ids:
            return Response({
                'error': 'Debe proporcionar al menos un permiso'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resultado = RolPermisosService.revocar_permisos(
                rol, permisos_ids, request.user, motivo
            )
            return Response(resultado)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def sincronizar_permisos(self, request, pk=None):
        """Sincroniza todos los permisos de un rol"""
        from .permisos_service import RolPermisosService
        
        rol = self.get_object()
        permisos_ids = request.data.get('permisos_ids', [])
        motivo = request.data.get('motivo', 'Sincronización de permisos')
        
        try:
            resultado = RolPermisosService.sincronizar_permisos(
                rol, permisos_ids, request.user, motivo
            )
            return Response(resultado)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def copiar_permisos(self, request, pk=None):
        """Copia permisos desde otro rol"""
        from .permisos_service import RolPermisosService
        
        rol_destino = self.get_object()
        rol_origen_id = request.data.get('rol_origen_id')
        motivo = request.data.get('motivo', 'Copia de permisos')
        
        if not rol_origen_id:
            return Response({
                'error': 'Debe proporcionar el ID del rol origen'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rol_origen = self.get_queryset().get(id=rol_origen_id)
            resultado = RolPermisosService.copiar_permisos_entre_roles(
                rol_origen, rol_destino, request.user, motivo
            )
            return Response(resultado)
        except Rol.DoesNotExist:
            return Response({
                'error': 'Rol origen no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def permisos_disponibles(self, request):
        """Obtiene todos los permisos disponibles agrupados por módulo"""
        from .permisos_service import RolPermisosService
        
        agrupar_por_modulo = request.query_params.get('agrupar_por_modulo', 'true').lower() == 'true'
        
        permisos = RolPermisosService.obtener_permisos_disponibles(agrupar_por_modulo)
        
        return Response({
            'permisos': permisos,
            'total': sum(len(modulo['permisos']) for modulo in permisos) if agrupar_por_modulo else len(permisos)
        })
    
    @action(detail=False, methods=['post'])
    def comparar_roles(self, request):
        """Compara permisos entre dos roles"""
        from .permisos_service import RolPermisosService
        
        rol1_id = request.data.get('rol1_id')
        rol2_id = request.data.get('rol2_id')
        
        if not rol1_id or not rol2_id:
            return Response({
                'error': 'Debe proporcionar ambos IDs de roles'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rol1 = self.get_queryset().get(id=rol1_id)
            rol2 = self.get_queryset().get(id=rol2_id)
            
            comparacion = RolPermisosService.comparar_permisos_roles(rol1, rol2)
            
            return Response({
                'rol1': {'id': str(rol1.id), 'nombre': rol1.nombre},
                'rol2': {'id': str(rol2.id), 'nombre': rol2.nombre},
                'comparacion': comparacion
            })
        except Rol.DoesNotExist:
            return Response({
                'error': 'Uno o ambos roles no encontrados'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AsignacionRolViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Asignaciones de Rol.
    """
    
    queryset = AsignacionRol.objects.select_related('usuario', 'rol')
    serializer_class = AsignacionRolSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [AsignacionRolAccessPolicy]

    def get_queryset(self):
        """Filter assignments by tenant to prevent cross-tenant access"""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        org_id = str(user.organization_id) if user.organization_id else None
        if not org_id:
            return qs.none()
        return qs.filter(tenant_id=org_id)

    def get_serializer_class(self):
        """Usa diferentes serializers según la acción"""
        if self.action == 'create':
            from .serializers import AsignacionRolCreateSerializer
            return AsignacionRolCreateSerializer
        return AsignacionRolSerializer

    def create(self, request, *args, **kwargs):
        """Crear una nueva asignación con logging detallado"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=== INICIO CREACIÓN DE ASIGNACIÓN ===")
        logger.info(f"Usuario que hace la petición: {request.user}")
        logger.info(f"Datos recibidos: {request.data}")
        
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"Asignación creada exitosamente: {response.data}")
            return response
        except Exception as e:
            logger.error(f"Error al crear asignación: {str(e)}")
            logger.error(f"Tipo de error: {type(e)}")
            
            # Si es un error de validación, mostrar detalles
            if hasattr(e, 'detail'):
                logger.error(f"Detalles del error: {e.detail}")
            
            # Re-lanzar la excepción para que DRF la maneje
            raise
    
    def perform_create(self, serializer):
        """Asigna automáticamente el usuario que crea la asignación"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"perform_create - Datos validados: {serializer.validated_data}")
        
        try:
            instance = serializer.save(asignado_por=self.request.user)
            logger.info(f"Asignación guardada con ID: {instance.id}")
        except Exception as e:
            logger.error(f"Error en perform_create: {str(e)}")
            raise
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprueba una asignación pendiente"""
        asignacion = self.get_object()
        
        try:
            asignacion.aprobar(request.user)
            return Response({
                'message': 'Asignación aprobada exitosamente'
            })
        except ValidationError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def revocar(self, request, pk=None):
        """Revoca una asignación activa"""
        asignacion = self.get_object()
        razon = request.data.get('razon', '')
        
        try:
            asignacion.revocar(request.user, razon)
            return Response({
                'message': 'Asignación revocada exitosamente'
            })
        except ValidationError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def usuarios_disponibles(self, request):
        """Lista usuarios que pueden recibir asignaciones de rol"""
        search = request.query_params.get('search', '')
        queryset = User.objects.filter(
            is_active=True,
            organization=request.user.organization
        ).order_by('first_name', 'last_name', 'email')
        
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search)
            )
        
        usuarios = queryset[:50]  # Limitar resultados
        data = [
            {
                'id': u.id,
                'email': u.email,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'nombre_completo': f"{u.first_name} {u.last_name}".strip() or u.email,
            }
            for u in usuarios
        ]
        return Response(data)


class TipoRolViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Tipos de Rol"""

    queryset = TipoRol.objects.all()
    serializer_class = TipoRolSerializer
    permission_classes = [TipoRolAccessPolicy]
    ordering = ['orden', 'nombre']

    def get_queryset(self):
        """Limitar tipos de rol: solo staff/superuser pueden gestionar"""
        qs = super().get_queryset()
        if not self.request.user.is_staff and not self.request.user.is_superuser:
            return qs.filter(activo=True)
        return qs


class EstadoAsignacionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Estados de Asignación"""

    queryset = EstadoAsignacion.objects.all()
    serializer_class = serializers.Serializer  # Placeholder temporal
    permission_classes = [RolesAccessPolicy]

    def list(self, request):
        """Lista todos los estados de asignación"""
        estados = [
            {'id': 1, 'nombre': 'ACTIVA', 'descripcion': 'Asignación activa', 'color': '#10b981'},
            {'id': 2, 'nombre': 'PENDIENTE', 'descripcion': 'Pendiente de aprobación', 'color': '#f59e0b'},
            {'id': 3, 'nombre': 'REVOCADA', 'descripcion': 'Asignación revocada', 'color': '#ef4444'},
            {'id': 4, 'nombre': 'EXPIRADA', 'descripcion': 'Asignación expirada', 'color': '#6b7280'},
            {'id': 5, 'nombre': 'SUSPENDIDA', 'descripcion': 'Temporalmente suspendida', 'color': '#f97316'},
        ]
        return Response(estados)


class HistorialAsignacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para historial de asignaciones"""

    queryset = HistorialAsignacion.objects.select_related(
        'asignacion__usuario',
        'asignacion__rol',
        'usuario'
    ).order_by('-fecha')
    serializer_class = HistorialAsignacionSerializer
    permission_classes = [HistorialAsignacionPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['asignacion__usuario__email', 'asignacion__rol__nombre', 'accion']
    ordering_fields = ['fecha', 'accion']
    ordering = ['-fecha']

    def get_queryset(self):
        """Filter history by tenant via assignment relationship"""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        org_id = str(user.organization_id) if user.organization_id else None
        if not org_id:
            return qs.none()
        return qs.filter(asignacion__tenant_id=org_id)


class AuditoriaRolViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para auditoría de roles"""

    queryset = AuditoriaRol.objects.select_related(
        'rol',
        'usuario_ejecutor',
        'usuario_afectado'
    ).order_by('-timestamp')
    serializer_class = AuditoriaRolSerializer
    permission_classes = [AuditoriaRolPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['rol', 'accion', 'usuario_ejecutor', 'usuario_afectado']
    search_fields = ['rol__nombre', 'accion', 'usuario_ejecutor__email', 'justificacion']
    ordering_fields = ['timestamp', 'accion']
    ordering = ['-timestamp']

    def get_queryset(self):
        """Filter audit records by tenant via role relationship"""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        org_id = str(user.organization_id) if user.organization_id else None
        if not org_id:
            return qs.none()
        return qs.filter(rol__tenant_id=org_id)


class DashboardStatsAPIView(generics.GenericAPIView):
    """API para estadísticas del dashboard"""
    
    permission_classes = [RolesAccessPolicy]
    
    def get(self, request):
        """Obtiene estadísticas para el dashboard"""
        organization = request.user.organization
        org_roles = Rol.objects.filter(tenant_id=organization.id)
        org_asignaciones = AsignacionRol.objects.filter(
            usuario__organization=organization
        )
        stats = {
            'roles': {
                'total': org_roles.count(),
                'activos': org_roles.filter(activo=True).count(),
                'publicos': 0,  # Temporalmente 0 hasta que se sincronice la BD
                'con_restriccion_horario': 0,  # Temporalmente 0 hasta que se sincronice la BD
            },
            'asignaciones': {
                'total': org_asignaciones.count(),
                'activas': org_asignaciones.filter(activa=True).count(),
                'pendientes': org_asignaciones.filter(estado__nombre='PENDIENTE').count(),
                'expiradas': org_asignaciones.filter(
                    fecha_fin__lt=timezone.now(),
                    activa=True
                ).count(),
            },
            'usuarios': {
                'total': User.objects.filter(organization=organization).count(),
                'con_roles': org_asignaciones.filter(
                    activa=True
                ).values('usuario').distinct().count(),
            },
            'auditoria': {
                'total_eventos': AuditoriaRol.objects.filter(
                    rol__tenant_id=organization.id
                ).count(),
                'eventos_hoy': AuditoriaRol.objects.filter(
                    rol__tenant_id=organization.id,
                    timestamp__date=timezone.now().date()
                ).count(),
            }
        }

        return Response(stats)


class JerarquiaAPIView(generics.GenericAPIView):
    """API para obtener la jerarquía de roles reales"""
    
    permission_classes = [RolesAccessPolicy]
    
    def get(self, request):
        """Obtiene la jerarquía de roles basada en datos reales de la BD"""
        try:
            organization = request.user.organization
            # Obtener todos los roles ordenados por nivel jerárquico
            roles = Rol.objects.filter(
                activo=True,
                tenant_id=organization.id
            ).order_by('nivel_jerarquico', 'nombre')
            
            jerarquia = []
            roles_mapeados = {}
            
            # Crear estructura de jerarquía
            for rol in roles:
                rol_data = {
                    'id': rol.id,
                    'nombre': rol.nombre,
                    'codigo': rol.codigo,
                    'descripcion': rol.descripcion,
                    'nivel': rol.nivel_jerarquico,
                    'color': rol.color or '#6366f1',
                    'icono': rol.icono or '👤',
                    'activo': rol.activo,
                    'es_sistema': rol.es_sistema,
                    'roles_hijo': [],
                    'permisos_count': 0,  # Se puede calcular si hay relación con permisos
                }
                
                roles_mapeados[rol.id] = rol_data
                
                # Si no tiene padre (es raíz), agregarlo directamente
                if not rol.rol_padre:
                    jerarquia.append(rol_data)
                else:
                    # Si tiene padre, agregarlo como hijo
                    if rol.rol_padre.id in roles_mapeados:
                        roles_mapeados[rol.rol_padre.id]['roles_hijo'].append(rol_data)
            
            return Response(jerarquia)
            
        except Exception as e:
            logger.error(f"Error generando jerarquía: {e}")
            return Response(
                {'error': 'Error al cargar jerarquía de roles'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PlantillasAPIView(generics.GenericAPIView):
    """API para obtener plantillas de roles"""
    
    permission_classes = [RolesAccessPolicy]
    
    def get(self, request):
        """Obtiene plantillas de roles basadas en datos reales"""
        try:
            organization = request.user.organization
            # Obtener plantillas reales si existen
            # PlantillaRol no tiene campo organization/tenant_id,
            # se filtra a través del creador o se muestran las de sistema
            plantillas = PlantillaRol.objects.filter(
                Q(activa=True, creado_por__organization=organization) |
                Q(activa=True, es_sistema=True)
            )
            
            plantillas_data = []
            for plantilla in plantillas:
                plantillas_data.append({
                    'id': plantilla.id,
                    'nombre': plantilla.nombre,
                    'descripcion': plantilla.descripcion,
                    'categoria': plantilla.categoria,
                    'configuracion': plantilla.configuracion,
                })
            
            # Si no hay plantillas reales, devolver array vacío
            return Response(plantillas_data)
            
        except Exception as e:
            logger.error(f"Error cargando plantillas: {e}")
            return Response(
                {'error': 'Error al cargar plantillas'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
