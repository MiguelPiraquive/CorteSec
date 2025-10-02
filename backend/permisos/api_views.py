"""
APIs RESTful para el Sistema de Gestión de Permisos
===================================================

Interfaz API específica para permisos directos con funcionalidades avanzadas.
Incluye evaluación, estadísticas, auditoría y gestión completa.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
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
from core.models import Organizacion
from core.mixins import MultiTenantViewSetMixin
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


class OrganizacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para organizaciones"""
    
    queryset = Organizacion.objects.filter(activa=True)
    serializer_class = UserBasicSerializer  # Usar serializer básico si no hay OrganizacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['activa']
    search_fields = ['nombre', 'codigo']


class ModuloSistemaViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de módulos del sistema"""
    
    queryset = ModuloSistema.objects.all().select_related('padre').prefetch_related('hijos')
    serializer_class = ModuloSistemaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
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
        queryset = self.queryset.filter(padre__isnull=True, activo=True)
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


class TipoPermisoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de tipos de permiso"""
    
    queryset = TipoPermiso.objects.all()
    serializer_class = TipoPermisoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['categoria', 'es_critico', 'requiere_auditoria', 'activo']
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering = ['categoria', 'nombre']
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action == 'list':
            return TipoPermisoBasicSerializer
        return TipoPermisoSerializer
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Obtiene tipos agrupados por categoría"""
        tipos = self.queryset.filter(activo=True).values(
            'categoria', 'id', 'nombre', 'codigo', 'icono', 'color'
        )
        
        categorias = {}
        for tipo in tipos:
            cat = tipo['categoria']
            if cat not in categorias:
                categorias[cat] = []
            categorias[cat].append(tipo)
        
        return Response(categorias)


class CondicionPermisoViewSet(PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de condiciones de permiso"""
    
    queryset = CondicionPermiso.objects.all()
    serializer_class = CondicionPermisoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tipo', 'cacheable', 'activa']
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering = ['tipo', 'nombre']
    
    def get_serializer_class(self):
        """Selecciona el serializer según la acción"""
        if self.action == 'list':
            return CondicionPermisoBasicSerializer
        return CondicionPermisoSerializer
    
    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Evalúa una condición específica"""
        condicion = self.get_object()
        serializer = CondicionPermisoEvaluationSerializer(data=request.data)
        
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


class PermisoViewSet(MultiTenantViewSetMixin, PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de permisos"""
    
    queryset = Permiso.objects.select_related(
        'modulo', 'tipo_permiso', 'organizacion', 'content_type'
    ).prefetch_related('condiciones')
    serializer_class = PermisoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'activo', 'es_sistema', 'ambito', 'es_heredable', 'es_revocable',
        'modulo', 'tipo_permiso', 'organizacion'
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
            permisos = self.queryset.filter(modulo_id=modulo_id, activo=True)
        else:
            permisos = self.queryset.filter(activo=True)
        
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


class PermisoDirectoViewSet(MultiTenantViewSetMixin, PermissionRequiredMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de permisos directos"""
    
    queryset = PermisoDirecto.objects.select_related(
        'usuario', 'permiso', 'asignado_por'
    )
    serializer_class = PermisoDirectoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tipo', 'activo', 'usuario', 'permiso', 'asignado_por']
    search_fields = ['usuario__username', 'permiso__nombre', 'motivo']
    ordering = ['-created_at']
    
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
            permisos_directos = self.queryset.filter(usuario=usuario, activo=True)
            
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


class AuditoriaPermisosViewSet(MultiTenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para auditoría de permisos"""
    
    queryset = AuditoriaPermisos.objects.select_related('usuario', 'permiso')
    serializer_class = AuditoriaPermisosSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
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
            'total_eventos': self.queryset.count(),
            'eventos_semana': self.queryset.filter(fecha__gte=last_week).count(),
            'eventos_mes': self.queryset.filter(fecha__gte=last_month).count(),
            'por_accion': dict(
                self.queryset.values('accion').annotate(
                    count=Count('id')
                ).values_list('accion', 'count')
            ),
            'usuarios_mas_activos': list(
                self.queryset.values('usuario__username').annotate(
                    count=Count('id')
                ).order_by('-count')[:10]
            )
        }
        
        return Response(stats)


# ==================== VISTAS DE ESTADÍSTICAS ====================

class EstadisticasViewSet(viewsets.ViewSet):
    """ViewSet para estadísticas del sistema de permisos"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def general(self, request):
        """Estadísticas generales del sistema"""
        stats = {
            'total_usuarios': User.objects.count(),
            'total_permisos': Permiso.objects.count(),
            'permisos_activos': Permiso.objects.filter(activo=True).count(),
            'tipos_permiso': TipoPermiso.objects.count(),
            'organizaciones': Organizacion.objects.count(),
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
        """Limpia el cache del sistema"""
        serializer = CacheLimpiezaSerializer(data=request.data)
        
        if serializer.is_valid():
            tipo = serializer.validated_data['tipo']
            usuario_id = serializer.validated_data.get('usuario_id')
            
            if tipo == 'all':
                cache.clear()
                message = 'Todo el cache ha sido limpiado'
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
