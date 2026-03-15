"""
Vistas de Invitaciones - CorteSec
==================================

ViewSet para gestionar invitaciones y vistas públicas para validar/aceptar.
"""

import logging
from datetime import timedelta

from django.conf import settings
from core.email_service import send_system_email
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from core.policies import InvitacionesAccessPolicy

from rest_framework_simplejwt.tokens import RefreshToken

from .models import Invitacion, Organizacion
from .serializers import (
    InvitacionSerializer,
    InvitacionCreateSerializer,
    InvitacionPublicSerializer,
    AcceptInvitacionSerializer,
)

logger = logging.getLogger(__name__)


class InvitacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar invitaciones — protegido por RBAC granular.
    """
    serializer_class = InvitacionSerializer
    permission_classes = [InvitacionesAccessPolicy]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'organization') or not user.organization:
            return Invitacion.objects.none()
        return Invitacion.objects.filter(
            organization=user.organization
        ).select_related('invited_by', 'accepted_by', 'organization')

    def create(self, request, *args, **kwargs):
        user = request.user
        if not hasattr(user, 'organization') or not user.organization:
            return Response(
                {'error': 'No perteneces a ninguna organización.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        organization = user.organization

        serializer = InvitacionCreateSerializer(
            data=request.data,
            context={'organization': organization}
        )
        serializer.is_valid(raise_exception=True)

        # Crear la invitación
        invitacion = Invitacion.objects.create(
            organization=organization,
            email=serializer.validated_data['email'],
            role=serializer.validated_data['role'],
            rbac_rol_id=serializer.validated_data.get('rbac_rol_id'),
            mensaje=serializer.validated_data.get('mensaje', ''),
            invited_by=user,
        )

        # Enviar email
        self._send_invitation_email(invitacion)

        # Retornar la invitación creada
        response_serializer = InvitacionSerializer(invitacion)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Reenviar invitación y resetear expiración"""
        invitacion = self.get_object()
        if invitacion.estado != 'PENDING':
            return Response(
                {'error': 'Solo se pueden reenviar invitaciones pendientes.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitacion.expires_at = timezone.now() + timedelta(days=7)
        invitacion.save(update_fields=['expires_at', 'updated_at'])

        self._send_invitation_email(invitacion)

        return Response({'message': 'Invitación reenviada exitosamente.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar invitación pendiente"""
        invitacion = self.get_object()
        if invitacion.estado != 'PENDING':
            return Response(
                {'error': 'Solo se pueden cancelar invitaciones pendientes.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitacion.cancel()
        return Response({'message': 'Invitación cancelada exitosamente.'})

    def _send_invitation_email(self, invitacion):
        """Enviar email de invitación"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invitation_link = f"{frontend_url}/invitacion/{invitacion.token}"

        subject = f"Invitación a {invitacion.organization.nombre} - CorteSec"

        message = (
            f"Has sido invitado a unirte a {invitacion.organization.nombre} en CorteSec.\n\n"
            f"Rol asignado: {invitacion.get_role_display()}\n"
        )
        if invitacion.mensaje:
            message += f"Mensaje: {invitacion.mensaje}\n"
        message += (
            f"\nPara aceptar la invitación, haz clic en el siguiente enlace:\n"
            f"{invitation_link}\n\n"
            f"Esta invitación expira el {invitacion.expires_at.strftime('%d/%m/%Y %H:%M')}.\n\n"
            f"Si no esperabas esta invitación, puedes ignorar este correo."
        )

        try:
            send_system_email(
                subject=subject,
                message=message,
                recipient_list=[invitacion.email],
                fail_silently=False,
            )
            logger.info(f"Email de invitación enviado a {invitacion.email}")
        except Exception as e:
            logger.error(f"Error enviando email de invitación a {invitacion.email}: {e}")


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_invitation(request, token):
    """
    Validar un token de invitación (público).
    Retorna info mínima para que el frontend muestre el formulario.
    """
    try:
        invitacion = Invitacion.objects.select_related(
            'organization', 'invited_by'
        ).get(token=token)
    except Invitacion.DoesNotExist:
        return Response(
            {'error': 'Invitación no encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Marcar expirada si ya pasó la fecha
    if invitacion.estado == 'PENDING' and invitacion.is_expired:
        invitacion.estado = 'EXPIRED'
        invitacion.save(update_fields=['estado', 'updated_at'])

    serializer = InvitacionPublicSerializer(invitacion)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invitation(request):
    """
    Aceptar una invitación: crear usuario o asignar a org existente.
    Retorna JWT tokens para auto-login.
    """
    serializer = AcceptInvitacionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    token = data['token']

    try:
        invitacion = Invitacion.objects.select_related('organization').get(token=token)
    except Invitacion.DoesNotExist:
        return Response(
            {'error': 'Invitación no encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not invitacion.is_valid:
        return Response(
            {'error': 'Esta invitación ya no es válida.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    from login.models import CustomUser

    with transaction.atomic():
        # Verificar si ya existe un usuario con ese email
        existing_user = CustomUser.objects.filter(email=invitacion.email).first()

        if existing_user:
            # ── SEGURIDAD: No permitir secuestro de usuarios ──
            # Si el usuario ya pertenece a una organización, no se puede reasignar
            if existing_user.organization and existing_user.organization != invitacion.organization:
                return Response(
                    {'error': 'Este email ya está asociado a otra organización. '
                              'El usuario debe abandonar su organización actual antes de aceptar esta invitación.'},
                    status=status.HTTP_409_CONFLICT
                )
            # Si el usuario ya está en la misma org, simplemente actualizar rol
            existing_user.organization = invitacion.organization
            existing_user.organization_role = invitacion.role
            existing_user.save(update_fields=['organization', 'organization_role'])
            user = existing_user
        else:
            # Crear nuevo usuario
            user = CustomUser.objects.create_user(
                username=data['username'],
                email=invitacion.email,
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                phone=data.get('phone', ''),
                organization=invitacion.organization,
                organization_role=invitacion.role,
                email_verified=False,  # Requiere verificación de email
                is_active=True,
            )

        # Asignar rol RBAC si se especificó en la invitación
        if invitacion.rbac_rol_id:
            try:
                from roles.models import Rol, AsignacionRol
                rol = Rol.objects.get(id=invitacion.rbac_rol_id, activo=True)
                asignador = invitacion.invited_by or user
                AsignacionRol.objects.get_or_create(
                    usuario=user,
                    rol=rol,
                    defaults={
                        'asignado_por': asignador,
                        'justificacion': f'Asignado automáticamente al aceptar invitación a {invitacion.organization.nombre}',
                        'activa': True,
                    }
                )
                logger.info(f"Rol RBAC '{rol.nombre}' asignado a {user.username} via invitación")
            except Exception as e:
                logger.warning(f"No se pudo asignar rol RBAC {invitacion.rbac_rol_id}: {e}")

        # Marcar invitación como aceptada
        invitacion.accept(user)

    # Generar JWT tokens
    refresh = RefreshToken.for_user(user)

    # Agregar claims personalizados
    refresh['organization_id'] = str(invitacion.organization.id)
    refresh['organization_code'] = invitacion.organization.codigo
    refresh['organization_role'] = invitacion.role

    response = Response({
        'success': True,
        'message': f'Bienvenido a {invitacion.organization.nombre}',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
        'organization': {
            'id': str(invitacion.organization.id),
            'nombre': invitacion.organization.nombre,
            'codigo': invitacion.organization.codigo,
            'slug': invitacion.organization.slug,
            'role': invitacion.role,
        },
    }, status=status.HTTP_200_OK)

    # Set tokens as httpOnly cookies
    from login.cookie_auth import set_auth_cookies
    set_auth_cookies(response, str(refresh.access_token), str(refresh))

    return response
