from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.utils import timezone
import logging

from core.email_service import send_system_email
from .models import CustomUser, PasswordHistory
from .serializers import (
    UserSerializer, LoginSerializer, RegisterSerializer,
    PasswordChangeSerializer, ProfileUpdateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .auth_security import (
    AuthSecurityManager, SecurityAuditLogger, LoginRateThrottle
)
from .jwt_serializers import get_tokens_for_user
from core.models import LogAuditoria
from core.decorators import get_client_ip
from .policies import LoginAccessPolicy

logger = logging.getLogger('security')


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def auth_api_index(request):
    """Índice de la API de Autenticación - Lista todos los endpoints disponibles"""
    return Response({
        'message': 'API de Autenticación CorteSec',
        'version': '2.0.0',
        'endpoints': {
            'authentication': {
                'login': {
                    'url': '/api/auth/login/',
                    'method': 'POST',
                    'description': 'Iniciar sesión con email y contraseña',
                    'body': {
                        'email': '<your-email>',
                        'password': '<your-password>'
                    }
                },
                'logout': {
                    'url': '/api/auth/logout/',
                    'method': 'POST',
                    'description': 'Cerrar sesión (requiere token)'
                },
                'register': {
                    'url': '/api/auth/register/',
                    'method': 'POST',
                    'description': 'Registrar nuevo usuario'
                }
            },
            'profile': {
                'get_profile': {
                    'url': '/api/auth/profile/',
                    'method': 'GET',
                    'description': 'Obtener perfil del usuario actual'
                },
                'update_profile': {
                    'url': '/api/auth/profile/update/',
                    'method': 'PUT',
                    'description': 'Actualizar perfil del usuario'
                },
                'change_password': {
                    'url': '/api/auth/change-password/',
                    'method': 'POST',
                    'description': 'Cambiar contraseña del usuario'
                }
            },
            'recovery': {
                'password_reset': {
                    'url': '/api/auth/password-reset/',
                    'method': 'POST',
                    'description': 'Solicitar recuperación de contraseña'
                },
                'password_reset_confirm': {
                    'url': '/api/auth/password-reset/confirm/',
                    'method': 'POST',
                    'description': 'Confirmar nueva contraseña'
                },
                'verify_email': {
                    'url': '/api/auth/verify-email/',
                    'method': 'POST',
                    'description': 'Verificar email del usuario'
                }
            }
        },
        'usage': {
            'authentication': 'Incluir access token en header: Authorization: Bearer <your-access-token>',
            'content_type': 'application/json',
        },
        'status': 'active',
        'server_time': request.META.get('HTTP_HOST', 'localhost'),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def login_api(request):
    """API endpoint para login - auto-detecta organización del usuario"""
    try:
        ip_address = AuthSecurityManager.get_client_ip(request)

        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            SecurityAuditLogger.log_login_attempt(
                request.data.get('email', 'unknown'),
                ip_address,
                False,
                'Invalid data format'
            )
            return Response({
                'success': False,
                'message': 'Datos inválidos.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Usar autenticación segura
        user, error_info = AuthSecurityManager.secure_authenticate(request, email, password)

        if not user:
            SecurityAuditLogger.log_login_attempt(email, ip_address, False, error_info.get('error'))

            response_data = {
                'success': False,
                'message': error_info.get('error', 'Error de autenticación.')
            }

            if error_info.get('locked_out'):
                response_data['locked_out'] = True
                response_data['retry_after'] = error_info.get('lockout_duration', AuthSecurityManager.LOCKOUT_DURATION)
            elif error_info.get('account_disabled'):
                response_data['account_disabled'] = True

            return Response(response_data, status=status.HTTP_401_UNAUTHORIZED)

        # Auto-detectar organización del usuario
        organization = getattr(user, 'organization', None)
        if not organization:
            SecurityAuditLogger.log_login_attempt(email, ip_address, False, 'No organization')
            return Response({
                'success': False,
                'message': 'No se puede iniciar sesión. Contacta al administrador.'
            }, status=status.HTTP_403_FORBIDDEN)

        if not organization.activa:
            SecurityAuditLogger.log_login_attempt(email, ip_address, False, 'Organization inactive')
            return Response({
                'success': False,
                'message': 'No se puede iniciar sesión. Contacta al administrador.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Generar JWT tokens
        tokens = get_tokens_for_user(user)

        # ── Enforce: no permitir múltiples sesiones simultáneas ──
        try:
            from login.auth_security import _get_security_config
            sec_config = _get_security_config()
            if not sec_config.get('permitir_multiples_sesiones', False):
                # Blacklist todos los tokens anteriores del usuario
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                old_tokens = OutstandingToken.objects.filter(user=user)
                for ot in old_tokens:
                    BlacklistedToken.objects.get_or_create(token=ot)
                # Re-generar tokens frescos después del blacklist
                tokens = get_tokens_for_user(user)
        except Exception as e:
            logger.warning(f"Error checking multiple sessions config: {e}")

        # ── Enforce: verificar expiración de contraseña ──
        password_expired = False
        try:
            from login.password_validators import PasswordExpiryValidator
            password_expired = PasswordExpiryValidator.is_password_expired(user)
        except Exception as e:
            logger.warning(f"Error checking password expiry: {e}")

        # Log del login exitoso
        SecurityAuditLogger.log_login_attempt(email, ip_address, True)
        SecurityAuditLogger.log_token_activity(user, "CREATED", f"JWT from IP {ip_address}")

        # Log de auditoría
        LogAuditoria.objects.create(
            usuario=user,
            accion='login',
            modelo='User',
            objeto_id=user.id,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            metadata={
                'organization': organization.nombre,
                'organization_code': organization.codigo,
                'success': True
            }
        )

        # Serializar datos del usuario
        user_serializer = UserSerializer(user)

        # Datos de organización para el frontend
        organization_data = {
            'id': str(organization.id),
            'nombre': organization.nombre,
            'codigo': organization.codigo,
            'slug': organization.slug or '',
            'logo': organization.logo.url if organization.logo else None,
            'primary_color': organization.primary_color,
        }

        response = Response({
            'success': True,
            'message': f'Bienvenido, {user.display_name}!',
            'user': user_serializer.data,
            'organization': organization_data,
            'password_expired': password_expired,
        }, status=status.HTTP_200_OK)

        # Establecer tokens en httpOnly cookies (no en body)
        from .cookie_auth import set_auth_cookies
        set_auth_cookies(response, tokens['access'], tokens['refresh'])

        return response

    except Exception as e:
        logger.error(f"Unexpected error in login_api: {e}")
        SecurityAuditLogger.log_security_event(
            "LOGIN_SYSTEM_ERROR",
            request.data.get('email', 'unknown'),
            AuthSecurityManager.get_client_ip(request),
            str(e)
        )
        return Response({
            'success': False,
            'message': 'Error interno del servidor.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([LoginAccessPolicy])
def logout_api(request):
    """API endpoint para logout con seguridad avanzada"""
    try:
        user = request.user
        ip_address = AuthSecurityManager.get_client_ip(request)
        
        # CREAR LOG DE AUDITORÍA ANTES DE ELIMINAR TOKEN
        LogAuditoria.objects.create(
            usuario=user,
            accion='logout',
            modelo='User',
            objeto_id=user.id,
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            metadata={'success': True}
        )
        
        # Blacklist all outstanding refresh tokens for this user
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        outstanding_tokens = OutstandingToken.objects.filter(user=user)
        for ot in outstanding_tokens:
            BlacklistedToken.objects.get_or_create(token=ot)
        
        # Log del logout
        SecurityAuditLogger.log_token_activity(user, "DELETED", f"logout from IP {ip_address}")
        logger.info(f"Usuario {user.email} cerró sesión via API desde IP {ip_address}")

        response = Response({
            'success': True,
            'message': 'Sesión cerrada correctamente'
        }, status=status.HTTP_200_OK)

        # Limpiar cookies httpOnly
        from .cookie_auth import clear_auth_cookies
        clear_auth_cookies(response)

        return response
    
    except Exception as e:
        logger.error(f"Error en logout API: {e}")
        return Response({
            'success': False,
            'message': 'Error al cerrar sesión'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def cookie_token_refresh(request):
    """Refresca el access token leyendo el refresh token desde la cookie httpOnly."""
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.exceptions import TokenError
    from .cookie_auth import REFRESH_COOKIE, set_auth_cookies

    refresh_token = request.COOKIES.get(REFRESH_COOKIE)
    if not refresh_token:
        return Response(
            {'success': False, 'message': 'No refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        token = RefreshToken(refresh_token)
        new_access = str(token.access_token)

        # Rotar refresh si está configurado
        new_refresh = None
        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
            if settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION', False):
                try:
                    token.blacklist()
                except AttributeError:
                    pass
            token.set_jti()
            token.set_exp()
            token.set_iat()
            new_refresh = str(token)

        response = Response({'success': True}, status=status.HTTP_200_OK)
        set_auth_cookies(response, new_access, new_refresh)
        return response

    except TokenError:
        from .cookie_auth import clear_auth_cookies
        response = Response(
            {'success': False, 'message': 'Token expirado o inválido'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        clear_auth_cookies(response)
        return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def auth_check(request):
    """Verifica si el usuario está autenticado (para validar cookies)."""
    from .serializers import UserSerializer
    user = request.user
    organization = getattr(user, 'organization', None)

    organization_data = None
    if organization:
        organization_data = {
            'id': str(organization.id),
            'nombre': organization.nombre,
            'codigo': organization.codigo,
            'slug': organization.slug or '',
            'logo': organization.logo.url if organization.logo else None,
            'primary_color': organization.primary_color,
        }

    return Response({
        'success': True,
        'user': UserSerializer(user).data,
        'organization': organization_data,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def register_api(request):
    """API endpoint para registro - siempre crea nueva organización"""
    serializer = RegisterSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Datos inválidos',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = serializer.save()

        # Generar token de verificación de email
        verification_token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verification_url = f"{settings.FRONTEND_URL}/verificar-email/{uid}/{verification_token}/"

        # Enviar email de verificación
        try:
            send_system_email(
                subject='Verificar tu cuenta en CorteSec',
                message=(
                    f"¡Hola {user.full_name or user.username}!\n\n"
                    f"Gracias por registrarte en CorteSec. Para completar tu registro, "
                    f"por favor verifica tu dirección de correo electrónico:\n\n"
                    f"{verification_url}\n\n"
                    f"Este enlace expirará en 24 horas por seguridad.\n\n"
                    f"Si no creaste esta cuenta, puedes ignorar este mensaje.\n\n"
                    f"Saludos,\nEl equipo de CorteSec"
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Email de verificación enviado a {user.email}")
        except Exception as email_error:
            logger.error(f"Error enviando email de verificación a {user.email}: {email_error}")

        # Log del registro
        logger.info(f"Nuevo usuario registrado via API: {user.email} (org: {user.organization.codigo})")

        user_serializer = UserSerializer(user)

        return Response({
            'success': True,
            'message': 'Registro exitoso. Te hemos enviado un correo de verificación.',
            'user': user_serializer.data,
            'email_verification_required': True,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error en registro API: {e}")
        return Response({
            'success': False,
            'message': 'Error durante el registro'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([LoginAccessPolicy])
def user_profile_api(request):
    """API endpoint para obtener perfil del usuario"""
    serializer = UserSerializer(request.user)
    return Response({
        'success': True,
        'user': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([LoginAccessPolicy])
def update_profile_api(request):
    """API endpoint para actualizar perfil"""
    serializer = ProfileUpdateSerializer(
        request.user, 
        data=request.data, 
        partial=request.method == 'PATCH'
    )
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            logger.info(f"Usuario {user.email} actualizó su perfil via API")
            
            user_serializer = UserSerializer(user)
            return Response({
                'success': True,
                'message': 'Perfil actualizado correctamente',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error actualizando perfil via API: {e}")
            return Response({
                'success': False,
                'message': 'Error al actualizar el perfil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([LoginAccessPolicy])
def change_password_api(request):
    """API endpoint para cambio de contraseña"""
    serializer = PasswordChangeSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        try:
            user = serializer.save()

            # Record password hash in history for reuse prevention
            PasswordHistory.record_password(user)

            # Actualizar password_changed_at
            from django.utils import timezone
            user.password_changed_at = timezone.now()
            user.require_password_change = False
            user.save(update_fields=['password_changed_at', 'require_password_change'])
            
            # Blacklist existing tokens and generate new JWT
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            outstanding_tokens = OutstandingToken.objects.filter(user=user)
            for ot in outstanding_tokens:
                BlacklistedToken.objects.get_or_create(token=ot)
            tokens = get_tokens_for_user(user)

            logger.info(f"Usuario {user.email} cambió su contraseña via API")
            
            # ── Notificar cambio de contraseña si está habilitado ──
            try:
                from login.auth_security import _get_security_config
                sec_config = _get_security_config()
                if sec_config.get('notificar_cambio_password', False) and user.email:
                    send_system_email(
                        subject='[CorteSec] Su contraseña ha sido cambiada',
                        message=(
                            f"Hola {user.display_name},\n\n"
                            f"Le informamos que su contraseña en CorteSec ha sido cambiada exitosamente.\n\n"
                            f"Si usted no realizó este cambio, contacte inmediatamente al administrador del sistema.\n\n"
                            f"Saludos,\nEquipo CorteSec"
                        ),
                        recipient_list=[user.email],
                        fail_silently=True,
                    )
                    logger.info(f"Notificación de cambio de contraseña enviada a {user.email}")
            except Exception as e:
                logger.warning(f"Error enviando notificación de cambio de password: {e}")

            response = Response({
                'success': True,
                'message': 'Contraseña cambiada exitosamente',
            }, status=status.HTTP_200_OK)

            # Set new tokens as httpOnly cookies (never in body)
            from .cookie_auth import set_auth_cookies
            set_auth_cookies(response, tokens['access'], tokens['refresh'])

            return response
            
        except Exception as e:
            logger.error(f"Error cambiando contraseña via API: {e}")
            return Response({
                'success': False,
                'message': 'Error al cambiar la contraseña'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([LoginAccessPolicy])
def resend_verification_email_api(request):
    """API endpoint para reenviar email de verificación"""
    try:
        user = request.user
        
        # Verificar si ya está verificado
        if user.email_verified:
            return Response({
                'success': False,
                'message': 'Tu email ya está verificado.',
                'already_verified': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generar nuevo token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Crear enlace de verificación
        verification_link = f"{settings.FRONTEND_URL}/verificar-email/{uid}/{token}/"
        
        # Enviar email
        email_subject = 'Verificación de Email - CorteSec'
        email_body = f"""
        Hola {user.get_full_name() or user.email},
        
        Por favor, verifica tu dirección de email haciendo clic en el siguiente enlace:
        
        {verification_link}
        
        Si no solicitaste esta verificación, puedes ignorar este correo.
        
        Este enlace expirará en 24 horas.
        
        Saludos,
        El equipo de CorteSec
        """
        
        send_system_email(
            subject=email_subject,
            message=email_body,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        logger.info(f"Email de verificación reenviado a {user.email}")
        
        return Response({
            'success': True,
            'message': f'Se ha enviado un nuevo correo de verificación a {user.email}'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error reenviando email de verificación: {e}")
        return Response({
            'success': False,
            'message': 'Error al enviar el correo de verificación'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def verify_email_confirm_api(request, uid, token):
    """API endpoint para confirmar verificación de email desde enlace de correo"""
    try:
        # Decodificar el UID
        try:
            uid = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({
                'success': False,
                'message': 'Enlace de verificación inválido.',
                'error_code': 'INVALID_LINK'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar el token
        if not default_token_generator.check_token(user, token):
            return Response({
                'success': False,
                'message': 'El enlace de verificación ha expirado o es inválido.',
                'error_code': 'EXPIRED_TOKEN'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya está verificado
        if user.email_verified:
            return Response({
                'success': True,
                'message': 'Tu email ya había sido verificado anteriormente.',
                'already_verified': True
            }, status=status.HTTP_200_OK)
        
        # Verificar el email
        user.verify_email()
        
        logger.info(f"Email verificado exitosamente para usuario {user.email}")
        
        return Response({
            'success': True,
            'message': '¡Email verificado exitosamente! Ya puedes iniciar sesión.',
            'user_email': user.email,
            'redirect_to_login': True
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error en verificación de email: {e}")
        return Response({
            'success': False,
            'message': 'Error interno del servidor.',
            'error_code': 'SERVER_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def password_reset_request_api(request):
    """API endpoint para solicitar reset de contraseña"""
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            email = serializer.validated_data['email']
            user = CustomUser.objects.filter(email=email).first()

            # Por seguridad no revelamos si el email existe
            if not user:
                logger.info(f"Solicitud de reset de contraseña para email no registrado: {email}")
                return Response({
                    'success': True,
                    'message': 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
                }, status=status.HTTP_200_OK)

            # Generar token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

            # Enviar email de recuperación
            email_subject = 'Recuperación de contraseña - CorteSec'
            email_body = f"""
Hola {user.get_full_name() or user.email},

Recibimos una solicitud para restablecer tu contraseña en CorteSec.

Para continuar, haz clic en el siguiente enlace (válido por 24 horas):
{reset_url}

Si no solicitaste este cambio, puedes ignorar este correo.

Saludos,
Equipo CorteSec
"""

            try:
                send_system_email(
                    subject=email_subject,
                    message=email_body,
                    recipient_list=[user.email],
                    fail_silently=False
                )
                logger.info(f"Email de reset enviado a {user.email}")
            except Exception as email_error:
                logger.error(f"Error enviando email de reset a {user.email}: {email_error}")
                return Response({
                    'success': False,
                    'message': 'No se pudo enviar el correo de recuperación. Intenta nuevamente.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            response_data = {
                'success': True,
                'message': 'Se ha enviado un email con las instrucciones para restablecer tu contraseña'
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en reset de contraseña: {e}")
            return Response({
                'success': False,
                'message': 'Error al procesar la solicitud'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm_api(request):
    """API endpoint para confirmar reset de contraseña"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            uid = serializer.validated_data['uid']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            # Decodificar UID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id)
            
            # Verificar token
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.password_changed_at = timezone.now()
                user.require_password_change = False
                user.save()

                # Record password hash in history for reuse prevention
                PasswordHistory.record_password(user)

                # Invalidar todos los tokens JWT del usuario
                try:
                    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                    for ot in OutstandingToken.objects.filter(user=user):
                        BlacklistedToken.objects.get_or_create(token=ot)
                except Exception:
                    pass  # token_blacklist may not be installed

                logger.info(f"Usuario {user.email} reseteó su contraseña via API")

                return Response({
                    'success': True,
                    'message': 'Contraseña restablecida exitosamente'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': 'Token inválido o expirado'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Usuario no encontrado'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error confirmando reset de contraseña: {e}")
            return Response({
                'success': False,
                'message': 'Error al restablecer la contraseña'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([LoginAccessPolicy])
def list_groups(request):
    """Listar grupos (roles) relevantes para la organización del usuario"""
    from django.contrib.auth.models import Group

    org = request.user.organization
    # Only return groups that have at least one member in the user's org
    groups = Group.objects.filter(user__organization=org).distinct()
    groups_data = [
        {
            'id': group.id,
            'name': group.name,
            'permissions_count': group.permissions.count()
        }
        for group in groups
    ]

    return Response(groups_data)
