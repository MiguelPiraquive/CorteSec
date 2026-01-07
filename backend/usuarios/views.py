"""
ASOGAN - Vistas de Usuarios
API REST para gestion de usuarios completa y profesional
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import GrupoUsuario, HistorialUsuario
from .serializers import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, UserPasswordChangeSerializer, UserProfileSerializer,
    UserStatsSerializer, UserBulkActionSerializer, UserBulkRoleAssignSerializer
)
from .filters import UserFilter
from .permissions import (
    CanViewUsers, CanCreateUsers, CanEditUsers, CanDeleteUsers,
    CanActivateUsers, CanChangeRoles, CanViewStats, CanExportUsers
)
# from apps.roles.models import Rol  # COMENTADO - CustomUser no tiene campo 'rol'
from apps.profiles.models import UserProfile
from ..auditing.decorators import audit_user_operation

User = get_user_model()
logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para gestión de usuarios
    
    Acciones disponibles:
    - list: Listar usuarios con paginación y filtros
    - retrieve: Ver detalle de un usuario
    - create: Crear nuevo usuario
    - update/partial_update: Actualizar usuario
    - destroy: Eliminar usuario (soft delete)
    - activate/deactivate: Activar/desactivar usuario
    - reset_password: Resetear contraseña
    - change_password: Cambiar contraseña (admin)
    - change_role: Cambiar rol del usuario
    - user_activity: Ver actividad del usuario
    """
    
    queryset = User.objects.all()  # Removido select_related('rol') porque el campo no existe
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = UserFilter
    search_fields = ['nombre', 'apellido', 'email', 'cedula']
    ordering_fields = ['fecha_creacion', 'nombre', 'apellido', 'email', 'last_login']
    ordering = ['-fecha_creacion']
    
    def get_serializer_class(self):
        """Seleccionar el serializer según la acción"""
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'change_password':
            return UserPasswordChangeSerializer
        return UserDetailSerializer
    
    def get_permissions(self):
        """Permisos según la acción"""
        if self.action == 'list' or self.action == 'retrieve':
            permission_classes = [IsAuthenticated, CanViewUsers]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated, CanCreateUsers]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated, CanEditUsers]
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated, CanDeleteUsers]
        elif self.action in ['activate', 'deactivate']:
            permission_classes = [IsAuthenticated, CanActivateUsers]
        elif self.action in ['change_role', 'change_password']:
            permission_classes = [IsAuthenticated, CanChangeRoles]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    @audit_user_operation('listar_usuarios')
    def list(self, request, *args, **kwargs):
        """Listar usuarios con filtros y paginación"""
        return super().list(request, *args, **kwargs)
    
    @audit_user_operation('ver_usuario')
    def retrieve(self, request, *args, **kwargs):
        """Ver detalle de un usuario"""
        return super().retrieve(request, *args, **kwargs)
    
    @audit_user_operation('crear_usuario')
    def create(self, request, *args, **kwargs):
        """Crear nuevo usuario"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        enviar_email = request.data.get('enviar_email_verificacion', True)
        user = serializer.save()
        
        # Enviar email de verificación si está activado
        if enviar_email:
            from apps.authentication.services import EmailVerificationService
            success, message = EmailVerificationService.send_verification_email(user, request)
            if not success:
                logger.warning(f"Error enviando email de verificación al crear usuario {user.email}: {message}")
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            UserDetailSerializer(user).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    @audit_user_operation('actualizar_usuario')
    def update(self, request, *args, **kwargs):
        """Actualizar usuario completo"""
        return super().update(request, *args, **kwargs)
    
    @audit_user_operation('actualizar_usuario_parcial')
    def partial_update(self, request, *args, **kwargs):
        """Actualización parcial de usuario"""
        return super().partial_update(request, *args, **kwargs)
    
    @audit_user_operation('eliminar_usuario')
    def destroy(self, request, *args, **kwargs):
        """Eliminar usuario (soft delete)"""
        instance = self.get_object()
        
        # No permitir auto-eliminación
        if instance.id == request.user.id:
            return Response(
                {'error': 'No puedes eliminarte a ti mismo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        instance.deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save()
        
        return Response(
            {'message': 'Usuario eliminado exitosamente.'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('activar_usuario')
    def activate(self, request, pk=None):
        """Activar usuario"""
        user = self.get_object()
        
        if user.id == request.user.id:
            return Response(
                {'error': 'No puedes modificar tu propio estado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = True
        user.save()
        
        return Response({
            'message': f'Usuario {user.email} activado exitosamente.',
            'user': UserDetailSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('desactivar_usuario')
    def deactivate(self, request, pk=None):
        """Desactivar usuario"""
        user = self.get_object()
        
        if user.id == request.user.id:
            return Response(
                {'error': 'No puedes desactivarte a ti mismo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save()
        
        return Response({
            'message': f'Usuario {user.email} desactivado exitosamente.',
            'user': UserDetailSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('cambiar_password_usuario')
    def change_password(self, request, pk=None):
        """Cambiar contraseña de un usuario (admin)"""
        user = self.get_object()
        serializer = UserPasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Cambiar contraseña
        user.set_password(serializer.validated_data['nueva_password'])
        user.save()
        
        # TODO: Enviar email si está activado
        if serializer.validated_data.get('enviar_email', True):
            # from apps.emails.services import enviar_email_cambio_password
            # enviar_email_cambio_password(user)
            pass
        
        return Response({
            'message': f'Contraseña cambiada exitosamente para {user.email}.'
        })
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('resetear_password_usuario')
    def reset_password(self, request, pk=None):
        """Generar y enviar token de reseteo de contraseña"""
        user = self.get_object()
        
        # TODO: Generar token y enviar email
        # from apps.emails.services import enviar_email_reset_password
        # token = user.generate_password_reset_token()
        # enviar_email_reset_password(user, token)
        
        return Response({
            'message': f'Email de reseteo enviado a {user.email}.'
        })
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('reenviar_email_verificacion')
    def resend_verification_email(self, request, pk=None):
        """Reenviar email de verificación"""
        user = self.get_object()
        
        # Verificar si el email ya está verificado
        if user.email_verified:
            return Response(
                {'error': 'El email ya está verificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Enviar email de verificación
        from apps.authentication.services import EmailVerificationService
        success, message = EmailVerificationService.send_verification_email(user, request)
        
        if success:
            return Response({
                'message': 'Email de verificación reenviado exitosamente.',
                'email': user.email
            })
        else:
            return Response(
                {'error': message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    @audit_user_operation('cambiar_rol_usuario')
    def change_role(self, request, pk=None):
        """Cambiar rol del usuario - DESHABILITADO (CustomUser no tiene campo 'rol')"""
        return Response(
            {'error': 'La funcionalidad de roles no está disponible actualmente.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
        # user = self.get_object()
        # rol_id = request.data.get('rol_id')
        # 
        # if not rol_id:
        #     return Response(
        #         {'error': 'Debe proporcionar un rol_id.'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )
        # 
        # try:
        #     rol = Rol.objects.get(id=rol_id)
        #     user.rol = rol
        #     user.save()
        #     
        #     return Response({
        #         'message': f'Rol cambiado exitosamente a {rol.nombre}.',
        #         'user': UserDetailSerializer(user).data
        #     })
        # except Rol.DoesNotExist:
        #     return Response(
        #         {'error': 'Rol no encontrado.'},
        #         status=status.HTTP_404_NOT_FOUND
        #     )
    
    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        """Ver actividad del usuario"""
        user = self.get_object()
        
        # Obtener historial de auditoría
        from apps.auditing.models import AuditLog
        logs = AuditLog.objects.filter(user=user).order_by('-timestamp')[:50]
        
        activity_data = [{
            'accion': log.action,
            'descripcion': log.description,
            'fecha': log.timestamp,
            'ip': log.ip_address
        } for log in logs]
        
        return Response({
            'usuario': UserDetailSerializer(user).data,
            'actividad_reciente': activity_data
        })


class UserStatsViewSet(viewsets.ViewSet):
    """ViewSet para estadísticas de usuarios"""
    
    permission_classes = [IsAuthenticated, CanViewStats]
    
    @action(detail=False, methods=['get'])
    @audit_user_operation('ver_estadisticas_usuarios')
    def general(self, request):
        """Estadísticas generales de usuarios"""
        
        # Contar usuarios
        total_usuarios = User.objects.count()
        usuarios_activos = User.objects.filter(is_active=True).count()
        usuarios_inactivos = User.objects.filter(is_active=False).count()
        usuarios_verificados = User.objects.filter(email_verified=True).count()
        usuarios_sin_verificar = User.objects.filter(email_verified=False).count()
        usuarios_staff = User.objects.filter(is_staff=True).count()
        
        # Usuarios por rol - COMENTADO porque CustomUser no tiene campo 'rol'
        usuarios_por_rol = {}
        # roles_stats = User.objects.values('rol__nombre').annotate(
        #     total=Count('id')
        # ).order_by('-total')
        # 
        # for stat in roles_stats:
        #     rol_nombre = stat['rol__nombre'] or 'Sin rol'
        #     usuarios_por_rol[rol_nombre] = stat['total']
        
        # Usuarios recientes (últimos 7 días)
        hace_7_dias = timezone.now() - timedelta(days=7)
        usuarios_recientes = User.objects.filter(
            fecha_creacion__gte=hace_7_dias
        ).order_by('-fecha_creacion')[:10]
        
        usuarios_recientes_data = [{
            'id': u.id,
            'nombre_completo': f"{u.nombre} {u.apellido}",
            'email': u.email,
            'fecha_registro': u.fecha_creacion,
            # 'rol': u.rol.nombre if u.rol else None  # COMENTADO
        } for u in usuarios_recientes]
        
        # Serializar
        stats = {
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': usuarios_inactivos,
            'usuarios_verificados': usuarios_verificados,
            'usuarios_sin_verificar': usuarios_sin_verificar,
            'usuarios_staff': usuarios_staff,
            'usuarios_por_rol': usuarios_por_rol,
            'usuarios_recientes': usuarios_recientes_data
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active_users(self, request):
        """Usuarios activos"""
        usuarios = User.objects.filter(is_active=True)
        serializer = UserListSerializer(usuarios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def users_by_role(self, request):
        """Distribución de usuarios por rol - DESHABILITADO (CustomUser no tiene campo 'rol')"""
        return Response({
            'error': 'La funcionalidad de roles no está disponible actualmente.',
            'distribución': []
        }, status=status.HTTP_501_NOT_IMPLEMENTED)
        # stats = User.objects.values('rol__nombre', 'rol__id').annotate(
        #     total=Count('id')
        # ).order_by('-total')
        # 
        # return Response({
        #     'distribución': [{
        #         'rol_id': s['rol__id'],
        #         'rol_nombre': s['rol__nombre'] or 'Sin rol',
        #         'total_usuarios': s['total']
        #     } for s in stats]
        # })
    
    @action(detail=False, methods=['get'])
    def recent_registrations(self, request):
        """Registros recientes"""
        dias = int(request.query_params.get('dias', 30))
        fecha_desde = timezone.now() - timedelta(days=dias)
        
        usuarios = User.objects.filter(
            fecha_creacion__gte=fecha_desde
        ).order_by('-fecha_creacion')
        
        serializer = UserListSerializer(usuarios, many=True)
        return Response({
            'dias': dias,
            'total': usuarios.count(),
            'usuarios': serializer.data
        })


class UserBulkActionsViewSet(viewsets.ViewSet):
    """ViewSet para acciones masivas sobre usuarios"""
    
    permission_classes = [IsAuthenticated, CanEditUsers]
    
    @action(detail=False, methods=['post'])
    @audit_user_operation('activar_usuarios_masivo')
    def bulk_activate(self, request):
        """Activar múltiples usuarios"""
        serializer = UserBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        
        # No permitir modificar el usuario actual
        if request.user.id in user_ids:
            user_ids.remove(request.user.id)
        
        usuarios = User.objects.filter(id__in=user_ids)
        count = usuarios.update(is_active=True)
        
        return Response({
            'message': f'{count} usuario(s) activado(s) exitosamente.',
            'usuarios_modificados': count
        })
    
    @action(detail=False, methods=['post'])
    @audit_user_operation('desactivar_usuarios_masivo')
    def bulk_deactivate(self, request):
        """Desactivar múltiples usuarios"""
        serializer = UserBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        
        # No permitir modificar el usuario actual
        if request.user.id in user_ids:
            user_ids.remove(request.user.id)
        
        usuarios = User.objects.filter(id__in=user_ids)
        count = usuarios.update(is_active=False)
        
        return Response({
            'message': f'{count} usuario(s) desactivado(s) exitosamente.',
            'usuarios_modificados': count
        })
    
    @action(detail=False, methods=['post'])
    @audit_user_operation('asignar_rol_masivo')
    def bulk_assign_role(self, request):
        """Asignar rol a múltiples usuarios - DESHABILITADO (CustomUser no tiene campo 'rol')"""
        return Response(
            {'error': 'La funcionalidad de roles no está disponible actualmente.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
        # serializer = UserBulkRoleAssignSerializer(data=request.data)
        # serializer.is_valid(raise_exception=True)
        # 
        # user_ids = serializer.validated_data['user_ids']
        # rol_id = serializer.validated_data['rol_id']
        # 
        # try:
        #     rol = Rol.objects.get(id=rol_id)
        #     usuarios = User.objects.filter(id__in=user_ids)
        #     count = usuarios.update(rol=rol)
        #     
        #     return Response({
        #         'message': f'{count} usuario(s) asignado(s) al rol {rol.nombre}.',
        #         'usuarios_modificados': count,
        #         'rol_asignado': rol.nombre
        #     })
        # except Rol.DoesNotExist:
        #     return Response(
        #         {'error': 'Rol no encontrado.'},
        #         status=status.HTTP_404_NOT_FOUND
        #     )
    
    @action(detail=False, methods=['post'])
    @audit_user_operation('eliminar_usuarios_masivo')
    def bulk_delete(self, request):
        """Eliminar múltiples usuarios (soft delete)"""
        serializer = UserBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        
        # No permitir eliminar el usuario actual
        if request.user.id in user_ids:
            user_ids.remove(request.user.id)
        
        usuarios = User.objects.filter(id__in=user_ids)
        count = usuarios.update(
            deleted=True,
            deleted_at=timezone.now(),
            deleted_by=request.user
        )
        
        return Response({
            'message': f'{count} usuario(s) eliminado(s) exitosamente.',
            'usuarios_modificados': count
        })


# ViewSets existentes (mantener compatibilidad)
class GrupoUsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para grupos de usuarios"""
    
    queryset = GrupoUsuario.objects.all()
    permission_classes = [IsAuthenticated]


class HistorialUsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para historial de usuarios"""
    
    queryset = HistorialUsuario.objects.all()
    permission_classes = [IsAuthenticated]


