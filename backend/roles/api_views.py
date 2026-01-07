"""
ViewSets del Sistema de Roles
==============================

ViewSets completos para la API REST del sistema de roles.
Incluye endpoints avanzados, acciones personalizadas y filtros.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count
from login.models import CustomUser
from .models import TipoRol, Rol, AsignacionRol
from .serializers import (
    TipoRolSerializer,
    RolSerializer, RolListSerializer, RolDetailSerializer, RolJerarquiaSerializer,
    AsignacionRolSerializer, AsignacionRolListSerializer
)
from core.mixins import MultiTenantViewSetMixin
from core.models import LogAuditoria
from core.decorators import get_client_ip


# ============================================================================
# VIEWSET PARA TIPO DE ROL
# ============================================================================

class TipoRolViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de tipos de rol"""
    
    queryset = TipoRol.objects.all()
    serializer_class = TipoRolSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'orden', 'fecha_creacion']
    ordering = ['orden', 'nombre']
    
    def get_queryset(self):
        """Filtrar por organización"""
        return self.queryset.filter(organization=self.request.user.organization)
    
    def perform_create(self, serializer):
        """Asignar organización al crear"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo tipos activos"""
        queryset = self.get_queryset().filter(activo=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ============================================================================
# VIEWSET PARA ROL
# ============================================================================

class RolViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet Multi-Tenant para gestión completa de roles empresariales.
    
    Incluye:
    - CRUD completo
    - Gestión de jerarquía
    - Activación/Desactivación
    - Duplicación
    - Asignación a usuarios
    - Estadísticas
    """
    
    queryset = Rol.objects.select_related('organization', 'tipo_rol', 'rol_padre').all()
    serializer_class = RolSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_rol', 'activo', 'es_sistema', 'es_publico', 'categoria', 'nivel_jerarquico']
    search_fields = ['nombre', 'codigo', 'descripcion', 'categoria']
    ordering_fields = ['nombre', 'codigo', 'nivel_jerarquico', 'prioridad', 'fecha_creacion']
    ordering = ['nivel_jerarquico', 'prioridad', 'nombre']
    
    def get_queryset(self):
        """Filtrar por organización"""
        queryset = self.queryset.filter(organization=self.request.user.organization)
        
        # Filtros adicionales por query params
        rol_padre_id = self.request.query_params.get('rol_padre')
        if rol_padre_id:
            if rol_padre_id == 'null':
                queryset = queryset.filter(rol_padre__isnull=True)
            else:
                queryset = queryset.filter(rol_padre_id=rol_padre_id)
        
        return queryset
    
    def get_serializer_class(self):
        """Usar serializador apropiado según la acción"""
        if self.action == 'list':
            return RolListSerializer
        elif self.action == 'retrieve':
            return RolDetailSerializer
        elif self.action == 'jerarquia':
            return RolJerarquiaSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Asignar organización y usuario al crear"""
        rol = serializer.save(
            organization=self.request.user.organization,
            tenant_id=str(self.request.user.organization.id),
            creado_por=self.request.user
        )
        
        # LOG DE AUDITORÍA
        LogAuditoria.objects.create(
            usuario=self.request.user,
            accion='crear_rol',
            modelo='Rol',
            objeto_id=rol.id,
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255],
            datos_despues={'nombre': rol.nombre, 'codigo': rol.codigo},
            metadata={'tipo_rol': rol.tipo_rol.nombre if rol.tipo_rol else None}
        )
    
    def perform_update(self, serializer):
        """Asignar usuario al actualizar"""
        rol = serializer.save(modificado_por=self.request.user)
        
        # LOG DE AUDITORÍA
        LogAuditoria.objects.create(
            usuario=self.request.user,
            accion='modificar_rol',
            modelo='Rol',
            objeto_id=rol.id,
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255],
            datos_despues={'nombre': rol.nombre, 'codigo': rol.codigo, 'activo': rol.activo},
            metadata={'tipo_rol': rol.tipo_rol.nombre if rol.tipo_rol else None}
        )
    
    def perform_destroy(self, instance):
        """Validar antes de eliminar"""
        if instance.es_sistema:
            return Response(
                {'error': 'No se pueden eliminar roles del sistema'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if instance.asignaciones_activas > 0:
            return Response(
                {'error': f'El rol tiene {instance.asignaciones_activas} asignaciones activas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # LOG DE AUDITORÍA ANTES DE ELIMINAR
        LogAuditoria.objects.create(
            usuario=self.request.user,
            accion='eliminar_rol',
            modelo='Rol',
            objeto_id=instance.id,
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255],
            datos_antes={'nombre': instance.nombre, 'codigo': instance.codigo},
            metadata={'tipo_rol': instance.tipo_rol.nombre if instance.tipo_rol else None}
        )
        
        instance.delete()
    
    # ========================================================================
    # ENDPOINTS DE ESTADÍSTICAS
    # ========================================================================
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas generales de roles"""
        queryset = self.get_queryset()
        
        total = queryset.count()
        activos = queryset.filter(activo=True).count()
        inactivos = queryset.filter(activo=False).count()
        sistema = queryset.filter(es_sistema=True).count()
        publicos = queryset.filter(es_publico=True).count()
        con_restriccion_horario = queryset.filter(tiene_restriccion_horario=True).count()
        
        # Por tipo
        por_tipo = queryset.values('tipo_rol__nombre').annotate(
            total=Count('id')
        ).order_by('-total')
        
        # Por nivel jerárquico
        por_nivel = queryset.values('nivel_jerarquico').annotate(
            total=Count('id')
        ).order_by('nivel_jerarquico')
        
        return Response({
            'total': total,
            'activos': activos,
            'inactivos': inactivos,
            'sistema': sistema,
            'publicos': publicos,
            'con_restriccion_horario': con_restriccion_horario,
            'por_tipo': list(por_tipo),
            'por_nivel': list(por_nivel)
        })
    
    # ========================================================================
    # ENDPOINTS DE JERARQUÍA
    # ========================================================================
    
    @action(detail=False, methods=['get'])
    def jerarquia(self, request):
        """Obtener árbol jerárquico completo de roles"""
        # Obtener solo roles raíz (sin padre)
        roles_raiz = self.get_queryset().filter(rol_padre__isnull=True).order_by('prioridad', 'nombre')
        serializer = RolJerarquiaSerializer(roles_raiz, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def jerarquia_completa(self, request, pk=None):
        """Obtener la jerarquía completa de un rol específico"""
        rol = self.get_object()
        jerarquia = rol.get_jerarquia_completa()
        
        data = [{
            'id': str(r.id),
            'uuid': str(r.uuid),
            'codigo': r.codigo,
            'nombre': r.nombre,
            'nivel_jerarquico': r.nivel_jerarquico
        } for r in jerarquia]
        
        return Response(data)
    
    @action(detail=True, methods=['get'])
    def descendientes(self, request, pk=None):
        """Obtener todos los roles descendientes"""
        rol = self.get_object()
        descendientes = rol.get_roles_descendientes()
        serializer = RolListSerializer(descendientes, many=True)
        return Response(serializer.data)
    
    # ========================================================================
    # ENDPOINTS DE ACTIVACIÓN/DESACTIVACIÓN
    # ========================================================================
    
    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        """Activar un rol"""
        rol = self.get_object()
        
        if rol.activo:
            return Response(
                {'message': 'El rol ya está activo'},
                status=status.HTTP_200_OK
            )
        
        rol.activo = True
        rol.modificado_por = request.user
        rol.save()
        
        serializer = self.get_serializer(rol)
        return Response({
            'message': 'Rol activado exitosamente',
            'rol': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        """Desactivar un rol"""
        rol = self.get_object()
        
        if rol.es_sistema:
            return Response(
                {'error': 'No se pueden desactivar roles del sistema'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not rol.activo:
            return Response(
                {'message': 'El rol ya está inactivo'},
                status=status.HTTP_200_OK
            )
        
        rol.activo = False
        rol.modificado_por = request.user
        rol.save()
        
        serializer = self.get_serializer(rol)
        return Response({
            'message': 'Rol desactivado exitosamente',
            'rol': serializer.data
        })
    
    # ========================================================================
    # ENDPOINTS DE DUPLICACIÓN
    # ========================================================================
    
    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        """Duplicar un rol con nuevo código y nombre"""
        rol_original = self.get_object()
        nuevo_codigo = request.data.get('codigo')
        nuevo_nombre = request.data.get('nombre')
        
        if not nuevo_codigo or not nuevo_nombre:
            return Response(
                {'error': 'Se requiere código y nombre para el nuevo rol'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que no exista el código
        if Rol.objects.filter(
            codigo=nuevo_codigo,
            organization=request.user.organization
        ).exists():
            return Response(
                {'error': f'Ya existe un rol con el código {nuevo_codigo}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear copia
        rol_nuevo = Rol.objects.create(
            organization=request.user.organization,
            tenant_id=str(request.user.organization.id),
            codigo=nuevo_codigo,
            nombre=nuevo_nombre,
            descripcion=rol_original.descripcion,
            rol_padre=rol_original.rol_padre,
            hereda_permisos=rol_original.hereda_permisos,
            tipo_rol=rol_original.tipo_rol,
            categoria=rol_original.categoria,
            activo=True,
            es_sistema=False,  # Las copias nunca son de sistema
            es_publico=rol_original.es_publico,
            requiere_aprobacion=rol_original.requiere_aprobacion,
            tiene_restriccion_horario=rol_original.tiene_restriccion_horario,
            hora_inicio=rol_original.hora_inicio,
            hora_fin=rol_original.hora_fin,
            dias_semana=rol_original.dias_semana,
            fecha_inicio_vigencia=rol_original.fecha_inicio_vigencia,
            fecha_fin_vigencia=rol_original.fecha_fin_vigencia,
            prioridad=rol_original.prioridad,
            peso=rol_original.peso,
            color=rol_original.color,
            icono=rol_original.icono,
            metadatos=rol_original.metadatos.copy() if rol_original.metadatos else {},
            configuracion=rol_original.configuracion.copy() if rol_original.configuracion else {},
            creado_por=request.user
        )
        
        serializer = self.get_serializer(rol_nuevo)
        return Response({
            'message': 'Rol duplicado exitosamente',
            'rol': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    # ========================================================================
    # ENDPOINTS DE ASIGNACIONES
    # ========================================================================
    
    @action(detail=True, methods=['get'])
    def asignaciones(self, request, pk=None):
        """Obtener todas las asignaciones de un rol"""
        rol = self.get_object()
        asignaciones = rol.asignaciones.select_related('usuario', 'estado', 'asignado_por').all()
        
        # Filtrar por estado activo si se especifica
        solo_activas = request.query_params.get('activas', 'false').lower() == 'true'
        if solo_activas:
            asignaciones = asignaciones.filter(activa=True)
        
        serializer = AsignacionRolListSerializer(asignaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def asignar_usuario(self, request, pk=None):
        """Asignar rol a un usuario"""
        rol = self.get_object()
        usuario_id = request.data.get('usuario_id')
        
        if not usuario_id:
            return Response(
                {'error': 'Se requiere el ID del usuario'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el rol esté activo
        if not rol.activo:
            return Response(
                {'error': 'No se puede asignar un rol inactivo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear asignación
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            usuario = User.objects.get(id=usuario_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya tiene el rol asignado
        asignacion_existente = AsignacionRol.objects.filter(
            usuario=usuario,
            rol=rol,
            activa=True
        ).first()
        
        if asignacion_existente:
            return Response(
                {'error': 'El usuario ya tiene este rol asignado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear asignación
        from .models import EstadoAsignacion
        estado_activo = EstadoAsignacion.objects.filter(nombre='ACTIVA').first()
        
        asignacion = AsignacionRol.objects.create(
            organization=request.user.organization,
            tenant_id=str(request.user.organization.id),
            usuario=usuario,
            rol=rol,
            estado=estado_activo,
            activa=True,
            justificacion=request.data.get('justificacion', ''),
            observaciones=request.data.get('observaciones', ''),
            fecha_inicio=request.data.get('fecha_inicio'),
            fecha_fin=request.data.get('fecha_fin'),
            prioridad=request.data.get('prioridad', 0),
            asignado_por=request.user
        )
        
        # Actualizar estadísticas del rol
        rol.actualizar_estadisticas()
        
        serializer = AsignacionRolSerializer(asignacion)
        return Response({
            'message': 'Rol asignado exitosamente',
            'asignacion': serializer.data
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# VIEWSET PARA ASIGNACIÓN DE ROL
# ============================================================================

class AsignacionRolViewSet(MultiTenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet para gestión de asignaciones de roles"""
    
    queryset = AsignacionRol.objects.select_related(
        'usuario', 'rol', 'estado', 'asignado_por', 'aprobado_por', 'revocado_por'
    ).all()
    serializer_class = AsignacionRolSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['usuario', 'rol', 'estado', 'activa']
    search_fields = ['justificacion', 'observaciones']
    ordering_fields = ['fecha_asignacion', 'fecha_inicio', 'fecha_fin', 'prioridad']
    ordering = ['-fecha_asignacion']
    
    def get_queryset(self):
        """Filtrar por organización"""
        return self.queryset.filter(organization=self.request.user.organization)
    
    def get_serializer_class(self):
        """Usar serializador apropiado"""
        if self.action == 'list':
            return AsignacionRolListSerializer
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Asignar organización y usuario al crear"""
        from .models import EstadoAsignacion
        import logging
        logger = logging.getLogger(__name__)
        
        # Determinar el estado inicial según si el rol requiere aprobación
        rol = serializer.validated_data['rol']
        
        if rol.requiere_aprobacion:
            # Si requiere aprobación, crear como PENDIENTE
            estado = EstadoAsignacion._base_manager.filter(nombre='PENDIENTE').first()
            logger.info(f"✅ Rol requiere aprobación, estado: PENDIENTE")
        else:
            # Si NO requiere aprobación, crear como ACTIVA directamente
            estado = EstadoAsignacion._base_manager.filter(nombre='ACTIVA').first()
            logger.info(f"✅ Rol NO requiere aprobación, estado: ACTIVA (auto-aprobado)")
        
        # Fallback si no se encuentra el estado
        if not estado:
            estado = EstadoAsignacion._base_manager.filter(activo=True).first()
            logger.warning(f"⚠️ Estado específico no encontrado, usando primer activo: {estado.nombre if estado else None}")
        
        # Guardar la asignación
        asignacion = serializer.save(
            organization=self.request.user.organization,
            tenant_id=str(self.request.user.organization.id),
            asignado_por=self.request.user,
            estado=estado,
            activa=(not rol.requiere_aprobacion)  # Activa si no requiere aprobación
        )
        
        # Si no requiere aprobación, marcar como auto-aprobada
        if not rol.requiere_aprobacion:
            asignacion.fecha_aprobacion = timezone.now()
            asignacion.aprobado_por = self.request.user
            asignacion.save(update_fields=['fecha_aprobacion', 'aprobado_por'])
            logger.info(f"✅ Asignación auto-aprobada")
        
        logger.info(f"📝 Asignación guardada con estado: {asignacion.estado.nombre} (ID={asignacion.estado.id})")
        
        # Actualizar estadísticas del rol
        rol.actualizar_estadisticas()
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar una asignación"""
        from .models import EstadoAsignacion
        
        asignacion = self.get_object()
        
        if asignacion.fecha_aprobacion:
            return Response(
                {'error': 'Esta asignación ya fue aprobada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado a ACTIVA
        estado_activa = EstadoAsignacion._base_manager.filter(nombre='ACTIVA').first()
        
        asignacion.fecha_aprobacion = timezone.now()
        asignacion.aprobado_por = request.user
        asignacion.activa = True
        asignacion.estado = estado_activa
        asignacion.save()
        
        serializer = self.get_serializer(asignacion)
        return Response({
            'message': 'Asignación aprobada exitosamente',
            'asignacion': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def revocar(self, request, pk=None):
        """Revocar una asignación"""
        from .models import EstadoAsignacion
        
        asignacion = self.get_object()
        
        if not asignacion.puede_ser_revocada():
            return Response(
                {'error': 'Esta asignación no puede ser revocada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado a REVOCADA
        estado_revocada = EstadoAsignacion._base_manager.filter(nombre='REVOCADA').first()
        
        asignacion.fecha_revocacion = timezone.now()
        asignacion.revocado_por = request.user
        asignacion.activa = False
        asignacion.estado = estado_revocada
        asignacion.observaciones = f"{asignacion.observaciones}\n\nRevocada: {request.data.get('motivo', 'Sin motivo especificado')}"
        asignacion.save()
        
        # Actualizar estadísticas del rol
        asignacion.rol.actualizar_estadisticas()
        
        serializer = self.get_serializer(asignacion)
        return Response({
            'message': 'Asignación revocada exitosamente',
            'asignacion': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar una asignación pendiente"""
        from .models import EstadoAsignacion
        
        asignacion = self.get_object()
        
        if asignacion.estado.nombre != 'PENDIENTE':
            return Response(
                {'error': 'Solo se pueden rechazar asignaciones pendientes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado a RECHAZADA
        estado_rechazada = EstadoAsignacion._base_manager.filter(nombre='RECHAZADA').first()
        
        asignacion.activa = False
        asignacion.estado = estado_rechazada
        asignacion.observaciones = f"{asignacion.observaciones}\n\nRechazada: {request.data.get('motivo', 'Sin motivo especificado')}"
        asignacion.save()
        
        # Actualizar estadísticas del rol
        asignacion.rol.actualizar_estadisticas()
        
        serializer = self.get_serializer(asignacion)
        return Response({
            'message': 'Asignación rechazada',
            'asignacion': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def renovar(self, request, pk=None):
        """Renovar una asignación (extender fecha de fin)"""
        asignacion = self.get_object()
        nueva_fecha_fin = request.data.get('nueva_fecha_fin')
        
        if not nueva_fecha_fin:
            return Response(
                {'error': 'Se requiere la nueva fecha de fin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        asignacion.fecha_fin = nueva_fecha_fin
        asignacion.observaciones = f"{asignacion.observaciones}\n\nRenovada hasta: {nueva_fecha_fin}"
        asignacion.save()
        
        serializer = self.get_serializer(asignacion)
        return Response({
            'message': 'Asignación renovada exitosamente',
            'asignacion': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def usuarios_disponibles(self, request):
        """List users available for role assignment"""
        org = request.user.organization
        users = CustomUser.objects.filter(
            organization=org,
            is_active=True
        ).values('id', 'username', 'first_name', 'last_name', 'email')
        
        # Add nombre_completo
        result = []
        for user in users:
            result.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'nombre_completo': f"{user['first_name']} {user['last_name']}".strip() if user['first_name'] else user['username']
            })
        
        return Response(result)
