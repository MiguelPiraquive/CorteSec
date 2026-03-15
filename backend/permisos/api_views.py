"""
APIs RESTful para el Sistema de Gestión de Permisos
===================================================

Interfaz API específica para permisos directos con funcionalidades avanzadas.
Incluye evaluación, estadísticas, auditoría y gestión completa.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import Http404
import json

from .models import (
    ModuloSistema, TipoPermiso, CondicionPermiso, Permiso, 
    PermisoDirecto, AuditoriaPermisos, PermisoI18N, ConfiguracionEntorno
)
# from core.mixins import BaseViewSetMixin  # Not found
from core.pagination import StandardResultsSetPagination
from .serializers import (
    ModuloSistemaSerializer, ModuloSistemaTreeSerializer, ModuloSistemaBasicSerializer,
    TipoPermisoSerializer, TipoPermisoBasicSerializer,
    CondicionPermisoSerializer, CondicionPermisoBasicSerializer, CondicionPermisoEvaluationSerializer,
    PermisoSerializer, PermisoBasicSerializer, PermisoCreateUpdateSerializer, PermisoEvaluationSerializer,
    PermisoDirectoSerializer, PermisoDirectoCreateSerializer,
    AuditoriaPermisosSerializer, PermisoI18NSerializer, ConfiguracionEntornoSerializer,
    EstadisticasPermisosSerializer, UsuarioPermisosSerializer,
    VerificacionPermisoSerializer, ResultadoVerificacionSerializer,
    CacheLimpiezaSerializer, UserBasicSerializer
)
from .services import DirectPermissionService
from .policies import (
    PermisosAdminAccessPolicy,
    PermisosDirectosPolicy,
    ModulosSistemaPolicy,
    CondicionesPermisoPolicy,
    AuditoriaPermisosPolicy,
)

User = get_user_model()


class PermissionRequiredMixin:
    """Mixin para verificar permisos específicos en ViewSets"""
    
    def check_object_permissions(self, request, obj):
        """Verifica permisos específicos del objeto"""
        super().check_object_permissions(request, obj)
        
        # Verificar permisos adicionales si es necesario
        if hasattr(self, 'required_permission'):
            if not self.has_permission(request.user, self.required_permission):
                self.permission_denied(request)
    
    def has_permission(self, user, permission_code):
        """Verifica si el usuario tiene un permiso específico"""
        service = DirectPermissionService()
        return service.verificar_permiso_directo(user, permission_code)


class ModuloSistemaViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de módulos del sistema"""
    
    queryset = ModuloSistema.objects.all().select_related('padre').prefetch_related('hijos')
    serializer_class = ModuloSistemaSerializer
    permission_classes = [ModulosSistemaPolicy]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['activo', 'es_sistema', 'padre', 'nivel']
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering = ['nivel', 'orden', 'nombre']
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action == 'list':
            return ModuloSistemaBasicSerializer
        elif self.action == 'tree':
            return ModuloSistemaTreeSerializer
        return ModuloSistemaSerializer
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Obtiene la estructura jerárquica de módulos"""
        queryset = self.get_queryset().filter(padre__isnull=True, activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Activa/desactiva un módulo"""
        modulo = self.get_object()
        modulo.activo = not modulo.activo
        modulo.save(update_fields=['activo'])
        
        return Response({
            'success': True,
            'activo': modulo.activo,
            'message': f'Módulo {"activado" if modulo.activo else "desactivado"}'
        })


class CondicionPermisoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de condiciones de permiso"""
    
    queryset = CondicionPermiso.objects.all()
    serializer_class = CondicionPermisoSerializer
    permission_classes = [CondicionesPermisoPolicy]
    pagination_class = StandardResultsSetPagination  # Habilitar paginación
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'cacheable', 'activa']
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering_fields = ['nombre', 'codigo', 'tipo', 'fecha_creacion', 'fecha_modificacion']
    ordering = ['tipo', 'nombre']
    
    def get_queryset(self):
        """Personaliza el queryset con anotaciones"""
        return super().get_queryset().annotate(
            permisos_count=models.Count('permisos', distinct=True)
        ).select_related(
            'created_by', 'updated_by'
        )
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action == 'list':
            return CondicionPermisoBasicSerializer
        return CondicionPermisoSerializer
    
    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Evalúa una condición específica"""
        condicion = self.get_object()

        # Si no se envía usuario_id, usar el usuario autenticado
        data = request.data.copy() if request.data else {}
        if not data.get('usuario_id'):
            data['usuario_id'] = str(request.user.id)

        serializer = CondicionPermisoEvaluationSerializer(data=data)
        
        if serializer.is_valid():
            usuario = User.objects.get(id=serializer.validated_data['usuario_id'])
            contexto = serializer.validated_data.get('contexto', {})
            
            try:
                resultado = condicion.evaluar(usuario, contexto)
                return Response({
                    'success': True,
                    'resultado': resultado,
                    'evaluado_en': timezone.now(),
                    'contexto': contexto
                })
            except Exception as e:
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def clear_cache(self, request, pk=None):
        """Limpia el cache de una condición"""
        condicion = self.get_object()
        if condicion.cacheable:
            cache_key = f"condicion_{condicion.id}_*"
            cache.delete_pattern(cache_key)
            return Response({'success': True, 'message': 'Cache limpiado'})
        
        return Response({'success': False, 'message': 'La condición no usa cache'})


class PermisoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de permisos"""
    
    queryset = Permiso.objects.select_related(
        'modulo', 'tipo_permiso', 'content_type'
    ).prefetch_related('condiciones')
    serializer_class = PermisoSerializer
    permission_classes = [PermisosAdminAccessPolicy]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = [
        'activo', 'es_sistema', 'ambito', 'es_heredable', 'es_revocable',
        'modulo', 'tipo_permiso'
    ]
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering = ['modulo__nombre', 'tipo_permiso__nombre', 'nombre']
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return PermisoCreateUpdateSerializer
        elif self.action == 'list':
            return PermisoBasicSerializer
        return PermisoSerializer
    
    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Evalúa un permiso para un usuario específico"""
        permiso = self.get_object()
        serializer = PermisoEvaluationSerializer(data=request.data)
        
        if serializer.is_valid():
            usuario = User.objects.get(id=serializer.validated_data['usuario_id'])
            accion = serializer.validated_data.get('accion')
            recurso = serializer.validated_data.get('recurso')
            contexto = serializer.validated_data.get('contexto', {})
            
            service = DirectPermissionService()
            resultado = service.verificar_permiso_directo(
                usuario, permiso.codigo, contexto
            )
            
            return Response({
                'tiene_permiso': resultado,
                'permiso': PermisoBasicSerializer(permiso).data,
                'usuario': UserBasicSerializer(usuario).data,
                'evaluado_en': timezone.now(),
                'contexto': contexto
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verifica un permiso por código"""
        serializer = VerificacionPermisoSerializer(data=request.data)
        
        if serializer.is_valid():
            usuario = User.objects.get(id=serializer.validated_data['usuario_id'])
            codigo_permiso = serializer.validated_data['codigo_permiso']
            contexto = serializer.validated_data.get('contexto', {})
            
            service = DirectPermissionService()
            resultado = service.verificar_permiso_directo(usuario, codigo_permiso, contexto)
            
            try:
                permiso = Permiso.objects.get(codigo=codigo_permiso, activo=True)
                permiso_info = PermisoBasicSerializer(permiso).data
            except Permiso.DoesNotExist:
                permiso_info = None
            
            response_data = {
                'tiene_permiso': resultado,
                'motivo': 'Permiso directo encontrado' if resultado else 'Sin permiso directo',
                'permiso_info': permiso_info,
                'evaluado_en': timezone.now(),
                'cache_usado': False
            }
            
            return Response(response_data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_module(self, request):
        """Obtiene permisos agrupados por módulo"""
        modulo_id = request.query_params.get('modulo_id')
        
        if modulo_id:
            permisos = self.get_queryset().filter(modulo_id=modulo_id, activo=True)
        else:
            permisos = self.get_queryset().filter(activo=True)
        
        # Agrupar por módulo
        modulos = {}
        for permiso in permisos:
            mod_id = permiso.modulo.id
            if mod_id not in modulos:
                modulos[mod_id] = {
                    'modulo': ModuloSistemaBasicSerializer(permiso.modulo).data,
                    'permisos': []
                }
            modulos[mod_id]['permisos'].append(PermisoBasicSerializer(permiso).data)
        
        return Response(list(modulos.values()))


class PermisoDirectoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de permisos directos"""

    queryset = PermisoDirecto.objects.select_related(
        'usuario', 'permiso', 'asignado_por'
    )
    serializer_class = PermisoDirectoSerializer
    permission_classes = [PermisosDirectosPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'activo', 'usuario', 'permiso', 'asignado_por']
    search_fields = ['usuario__username', 'permiso__nombre', 'motivo']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filtrar permisos directos por organización del usuario"""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        # Solo mostrar permisos de usuarios de la misma organización
        if hasattr(user, 'organization') and user.organization:
            return qs.filter(usuario__organization=user.organization)
        return qs.none()
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return PermisoDirectoCreateSerializer
        return PermisoDirectoSerializer
    
    def perform_create(self, serializer):
        """Asigna el usuario que crea el permiso directo"""
        serializer.save(asignado_por=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """Obtiene permisos directos de un usuario específico"""
        usuario_id = request.query_params.get('usuario_id')
        
        if not usuario_id:
            return Response(
                {'error': 'Se requiere el parámetro usuario_id'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario = User.objects.get(id=usuario_id)
            permisos_directos = self.get_queryset().filter(usuario=usuario, activo=True)
            
            data = {
                'usuario': UserBasicSerializer(usuario).data,
                'permisos_directos': PermisoDirectoSerializer(permisos_directos, many=True).data,
                'total_permisos': permisos_directos.count(),
                'permisos_vigentes': permisos_directos.filter(
                    fecha_inicio__lte=timezone.now(),
                    fecha_fin__gte=timezone.now()
                ).count() if permisos_directos.filter(fecha_fin__isnull=False).exists() else permisos_directos.count()
            }
            
            return Response(data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoca un permiso directo"""
        permiso_directo = self.get_object()
        permiso_directo.activo = False
        permiso_directo.save(update_fields=['activo'])
        
        # Crear registro de auditoría
        AuditoriaPermisos.objects.create(
            accion='revoke_direct',
            permiso=permiso_directo.permiso,
            usuario=permiso_directo.usuario,
            detalles={
                'revocado_por': request.user.id,
                'motivo': request.data.get('motivo', 'Revocación manual'),
                'fecha_revocacion': timezone.now().isoformat()
            }
        )
        
        return Response({
            'success': True,
            'message': 'Permiso directo revocado'
        })


class AuditoriaPermisosViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para auditoría de permisos"""
    
    queryset = AuditoriaPermisos.objects.select_related('usuario', 'permiso')
    serializer_class = AuditoriaPermisosSerializer
    permission_classes = [AuditoriaPermisosPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['accion', 'usuario', 'permiso']
    search_fields = ['usuario__username', 'accion', 'permiso__nombre']
    ordering = ['-fecha']
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtiene estadísticas de auditoría"""
        from django.db.models import Count
        from datetime import timedelta
        
        now = timezone.now()
        last_week = now - timedelta(days=7)
        last_month = now - timedelta(days=30)
        
        stats = {
            'total_eventos': self.get_queryset().count(),
            'eventos_semana': self.get_queryset().filter(fecha__gte=last_week).count(),
            'eventos_mes': self.get_queryset().filter(fecha__gte=last_month).count(),
            'por_accion': dict(
                self.get_queryset().values('accion').annotate(
                    count=Count('id')
                ).values_list('accion', 'count')
            ),
            'usuarios_mas_activos': list(
                self.get_queryset().values('usuario__username').annotate(
                    count=Count('id')
                ).order_by('-count')[:10]
            )
        }
        
        return Response(stats)


# ==================== VISTAS DE ESTADÍSTICAS ====================

class DashboardViewSet(viewsets.ViewSet):
    """ViewSet para el dashboard de permisos"""
    
    permission_classes = [PermisosAdminAccessPolicy]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas para el dashboard de permisos"""
        from django.db.models import Count
        
        # Estadísticas básicas
        total_permisos = Permiso.objects.count()
        permisos_activos = Permiso.objects.filter(activo=True).count()
        total_modulos = ModuloSistema.objects.count()
        modulos_activos = ModuloSistema.objects.filter(activo=True).count()
        total_tipos = TipoPermiso.objects.count()
        condiciones_activas = CondicionPermiso.objects.filter(activa=True).count()
        total_permisos_directos = PermisoDirecto.objects.filter(activo=True).count()
        usuarios_con_permisos = PermisoDirecto.objects.filter(activo=True).values('usuario').distinct().count()
        
        # Permisos vigentes (considerando fechas)
        now = timezone.now()
        permisos_vigentes = PermisoDirecto.objects.filter(
            activo=True,
            fecha_inicio__lte=now
        ).filter(
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=now)
        ).count()
        
        # Distribución por categorías
        tipos_por_categoria = list(
            TipoPermiso.objects.values('categoria').annotate(
                cantidad=Count('permiso', filter=Q(permiso__activo=True))
            ).filter(cantidad__gt=0)
        )
        
        stats = {
            'permisos': {
                'total': total_permisos,
                'activos': permisos_activos,
                'vigentes': permisos_vigentes
            },
            'modulos': {
                'total': total_modulos,
                'activos': modulos_activos
            },
            'tipos_permiso': {
                'total': total_tipos,
                'por_categoria': tipos_por_categoria
            },
            'condiciones': {
                'activas': condiciones_activas
            },
            'permisos_directos': {
                'total': total_permisos_directos,
                'usuarios_con_permisos': usuarios_con_permisos
            }
        }
        
        return Response(stats)


class EstadisticasViewSet(viewsets.ViewSet):
    """ViewSet para estadísticas del sistema de permisos"""
    
    permission_classes = [PermisosAdminAccessPolicy]
    
    @action(detail=False, methods=['get'])
    def general(self, request):
        """Estadísticas generales del sistema"""
        stats = {
            'total_usuarios': User.objects.count(),
            'total_permisos': Permiso.objects.count(),
            'permisos_activos': Permiso.objects.filter(activo=True).count(),
            'tipos_permiso': TipoPermiso.objects.count(),
            'modulos': ModuloSistema.objects.count(),
            'condiciones': CondicionPermiso.objects.count(),
            'permisos_directos': PermisoDirecto.objects.filter(activo=True).count(),
            'permisos_por_tipo': dict(
                Permiso.objects.filter(activo=True).values('tipo_permiso__nombre').annotate(
                    count=Count('id')
                ).values_list('tipo_permiso__nombre', 'count')
            ),
            'permisos_por_modulo': dict(
                Permiso.objects.filter(activo=True).values('modulo__nombre').annotate(
                    count=Count('id')
                ).values_list('modulo__nombre', 'count')
            ),
            'usuarios_con_permisos_directos': PermisoDirecto.objects.filter(
                activo=True
            ).values('usuario').distinct().count()
        }
        
        serializer = EstadisticasPermisosSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def clear_cache(self, request):
        """Limpia el cache del sistema - solo superusuarios"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Solo superusuarios pueden limpiar el cache global.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CacheLimpiezaSerializer(data=request.data)

        if serializer.is_valid():
            tipo = serializer.validated_data['tipo']
            usuario_id = serializer.validated_data.get('usuario_id')

            if tipo == 'all':
                cache.clear()
                message = 'Todo el cache ha sido limpiado'
                logger.warning(f"Cache global limpiado por {request.user.username}")
            elif tipo == 'user' and usuario_id:
                cache.delete_pattern(f"*user_{usuario_id}_*")
                message = f'Cache del usuario {usuario_id} limpiado'
            elif tipo == 'permissions':
                cache.delete_pattern("*permission_*")
                message = 'Cache de permisos limpiado'
            elif tipo == 'conditions':
                cache.delete_pattern("*condition_*")
                message = 'Cache de condiciones limpiado'
            
            return Response({
                'success': True,
                'message': message,
                'timestamp': timezone.now()
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TipoPermisoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de tipos de permiso
    """
    queryset = TipoPermiso.objects.all().order_by('categoria', 'nombre')
    serializer_class = TipoPermisoSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [PermisosAdminAccessPolicy]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'codigo', 'descripcion']
    filterset_fields = ['categoria', 'activo', 'es_critico', 'requiere_auditoria']
    ordering_fields = ['nombre', 'codigo', 'categoria', 'fecha_creacion']
    ordering = ['categoria', 'nombre']

    def get_serializer_class(self):
        """Utilizar serializer básico para acciones de lista"""
        if self.action == 'list':
            return TipoPermisoBasicSerializer
        return TipoPermisoSerializer

    @action(detail=False, methods=['get'])
    def categorias(self, request):
        """Obtener lista de categorías disponibles"""
        categorias = TipoPermiso.CATEGORIA_CHOICES
        data = [{'value': choice[0], 'label': choice[1]} for choice in categorias]
        return Response(data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de tipos de permiso"""
        stats = {
            'total': self.get_queryset().count(),
            'activos': self.get_queryset().filter(activo=True).count(),
            'criticos': self.get_queryset().filter(es_critico=True).count(),
            'con_auditoria': self.get_queryset().filter(requiere_auditoria=True).count(),
            'por_categoria': dict(
                self.get_queryset().values('categoria').annotate(
                    count=Count('categoria')
                ).values_list('categoria', 'count')
            )
        }
        return Response(stats)

    def perform_create(self, serializer):
        """Guardar tipo de permiso con usuario creador"""
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        """Actualizar tipo de permiso con usuario modificador"""
        serializer.save(updated_by=self.request.user)


class PermissionCheckViewSet(viewsets.ViewSet):
    """
    ViewSet para verificar permisos del usuario autenticado.

    Endpoints:
    - GET  /api/permisos/check/me/           → permisos del usuario actual
    - POST /api/permisos/check/              → verificar un permiso puntual
    - POST /api/permisos/check/clear-cache/  → limpiar cache de permisos
    """

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Retorna TODOS los permisos del usuario autenticado.

        Flujo:
        1. Obtener roles activos del usuario via AsignacionRol
        2. Para cada rol, obtener permisos (ManyToMany + heredados)
        3. Obtener permisos directos (PermisoDirecto grant)
        4. Restar permisos denegados (PermisoDirecto deny)
        5. Retornar codigos unicos
        """
        from roles.models import AsignacionRol

        usuario = request.user

        # Si es superusuario, devolver TODOS los permisos activos
        if usuario.is_superuser:
            todos = Permiso.objects.filter(activo=True).values_list(
                'codigo', flat=True
            )
            codigos = list(set(todos))
            recursos = list(set(c.split('.')[0] for c in codigos if '.' in c))
            acciones = list(set(c.split('.')[1] for c in codigos if '.' in c))
            return Response({
                'permissions': codigos,
                'ui_elements': [],
                'resources': recursos,
                'actions': acciones,
                'is_superuser': True,
            })

        # 1. Roles activos del usuario
        ahora = timezone.now()
        asignaciones = AsignacionRol.objects.filter(
            usuario=usuario,
            activa=True,
        ).select_related('rol')

        # Filtrar por vigencia temporal
        asignaciones_vigentes = []
        for asig in asignaciones:
            if asig.fecha_inicio and ahora < asig.fecha_inicio:
                continue
            if asig.fecha_fin and ahora > asig.fecha_fin:
                continue
            asignaciones_vigentes.append(asig)

        # 2. Recopilar permisos de roles
        permisos_codigos = set()
        for asig in asignaciones_vigentes:
            rol = asig.rol
            if not rol.activo:
                continue
            # Permisos directos del rol (ManyToMany)
            codigos_rol = rol.permisos.filter(
                activo=True
            ).values_list('codigo', flat=True)
            permisos_codigos.update(codigos_rol)

            # Permisos heredados de roles padre
            if rol.hereda_permisos and rol.rol_padre:
                heredados = rol.get_permisos_heredados()
                for p in heredados:
                    if p.activo:
                        permisos_codigos.add(p.codigo)

        # 3. Permisos directos concedidos
        directos_grant = PermisoDirecto.objects.filter(
            usuario=usuario,
            activo=True,
            tipo__in=['grant', 'temporary'],
            fecha_inicio__lte=ahora,
        ).filter(
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=ahora)
        ).select_related('permiso').values_list(
            'permiso__codigo', flat=True
        )
        permisos_codigos.update(directos_grant)

        # 4. Permisos directos denegados (restar)
        directos_deny = PermisoDirecto.objects.filter(
            usuario=usuario,
            activo=True,
            tipo='deny',
            fecha_inicio__lte=ahora,
        ).filter(
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=ahora)
        ).values_list('permiso__codigo', flat=True)
        permisos_codigos -= set(directos_deny)

        codigos = list(permisos_codigos)
        recursos = list(set(
            c.split('.')[0] for c in codigos if '.' in c
        ))
        acciones = list(set(
            c.split('.')[1] for c in codigos if '.' in c
        ))

        return Response({
            'permissions': codigos,
            'ui_elements': [],
            'resources': recursos,
            'actions': acciones,
            'is_superuser': False,
        })

    def create(self, request):
        """
        POST /api/permisos/check/
        Verifica si el usuario tiene un permiso especifico.
        Body: { "permission": "empleados.view", "context": {} }
        """
        from roles.models import AsignacionRol

        permiso_codigo = request.data.get('permission', '')
        if not permiso_codigo:
            return Response(
                {'has_permission': False, 'detail': 'permission requerido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = request.user

        if usuario.is_superuser:
            return Response({'has_permission': True})

        # Verificar en roles activos
        ahora = timezone.now()
        roles_ids = AsignacionRol.objects.filter(
            usuario=usuario,
            activa=True,
        ).filter(
            Q(fecha_inicio__isnull=True) | Q(fecha_inicio__lte=ahora),
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=ahora),
        ).values_list('rol_id', flat=True)

        from roles.models import Rol
        tiene = Permiso.objects.filter(
            codigo=permiso_codigo,
            activo=True,
            roles_asignados__id__in=roles_ids,
            roles_asignados__activo=True,
        ).exists()

        if not tiene:
            # Verificar permisos directos
            tiene = PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso__codigo=permiso_codigo,
                activo=True,
                tipo__in=['grant', 'temporary'],
                fecha_inicio__lte=ahora,
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=ahora)
            ).exists()

        # Verificar deny
        if tiene:
            denegado = PermisoDirecto.objects.filter(
                usuario=usuario,
                permiso__codigo=permiso_codigo,
                activo=True,
                tipo='deny',
                fecha_inicio__lte=ahora,
            ).filter(
                Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=ahora)
            ).exists()
            if denegado:
                tiene = False

        return Response({'has_permission': tiene})

    @action(detail=False, methods=['post'], url_path='clear-cache')
    def clear_cache(self, request):
        """
        POST /api/permisos/check/clear-cache/
        Limpia el cache de permisos del usuario.
        """
        usuario = request.user
        cache.delete_many([
            f'usuario_{usuario.id}_roles',
            f'usuario_{usuario.id}_permisos',
            f'usuario_{usuario.id}_roles_jerarquia',
        ])
        return Response({
            'success': True,
            'message': 'Cache de permisos limpiado',
        })
