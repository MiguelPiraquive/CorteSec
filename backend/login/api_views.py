from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import CustomUser
from .serializers import (
    UserSerializer, LoginSerializer, RegisterSerializer,
    PasswordChangeSerializer, ProfileUpdateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .auth_security import (
    AuthSecurityManager, SecurityAuditLogger, LoginRateThrottle
)

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
                        'email': 'admin@cortesec.com',
                        'password': 'admin123'
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
            'authentication': 'Incluir token en header: Authorization: Token <your-token>',
            'content_type': 'application/json',
            'test_credentials': {
                'email': 'admin@cortesec.com',
                'password': 'admin123',
                'note': 'Credenciales de prueba para testing'
            }
        },
        'status': 'active',
        'server_time': request.META.get('HTTP_HOST', 'localhost'),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def login_api(request):
    """API endpoint para login con seguridad avanzada"""
    try:
        # Obtener IP del cliente
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
            
            # Agregar información adicional según el tipo de error
            if error_info.get('locked_out'):
                response_data['locked_out'] = True
                response_data['retry_after'] = AuthSecurityManager.LOCKOUT_DURATION
            elif error_info.get('account_disabled'):
                response_data['account_disabled'] = True
            
            return Response(response_data, status=status.HTTP_401_UNAUTHORIZED)
        
        # Crear token seguro
        token = AuthSecurityManager.create_secure_token(user)
        if not token:
            logger.error(f"Error creating token for user {user.email}")
            return Response({
                'success': False,
                'message': 'Error interno del servidor.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Log del login exitoso
        SecurityAuditLogger.log_login_attempt(email, ip_address, True)
        SecurityAuditLogger.log_token_activity(user, "CREATED", f"from IP {ip_address}")
        
        # Serializar datos del usuario
        user_serializer = UserSerializer(user)
        
        return Response({
            'success': True,
            'message': f'Bienvenido, {user.display_name}!',
            'token': token.key,
            'user': user_serializer.data,
            'token_expires_in': AuthSecurityManager.TOKEN_VALIDITY_HOURS * 3600  # en segundos
        }, status=status.HTTP_200_OK)
        
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
        
    except Exception as e:
        logger.error(f"Error en login_api: {e}")
        return Response({
            'success': False,
            'message': 'Error interno del servidor.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_api(request):
    """API endpoint para logout con seguridad avanzada"""
    try:
        user = request.user
        ip_address = AuthSecurityManager.get_client_ip(request)
        
        # Eliminar token del usuario de forma segura
        Token.objects.filter(user=user).delete()
        
        # Log del logout
        SecurityAuditLogger.log_token_activity(user, "DELETED", f"logout from IP {ip_address}")
        logger.info(f"Usuario {user.email} cerró sesión via API desde IP {ip_address}")
        
        return Response({
            'success': True,
            'message': 'Sesión cerrada correctamente'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error en logout API: {e}")
        return Response({
            'success': False,
            'message': 'Error al cerrar sesión'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_api(request):
    """API endpoint para registro con verificación de email"""
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # El usuario se crea con email_verified=False por defecto
            
            # Generar token de verificación
            verification_token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Crear URL de verificación
            verification_url = f"{settings.FRONTEND_URL}/verificar-email/{uid}/{verification_token}/"
            
            # Enviar email de verificación
            try:
                send_mail(
                    subject='Verificar tu cuenta en CorteSec',
                    message=f"""
¡Hola {user.full_name or user.username}!

Gracias por registrarte en CorteSec. Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:

{verification_url}

Este enlace expirará en 24 horas por seguridad.

Si no creaste esta cuenta, puedes ignorar este mensaje.

Saludos,
El equipo de CorteSec
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                
                logger.info(f"Email de verificación enviado a {user.email}")
                
            except Exception as email_error:
                logger.error(f"Error enviando email de verificación a {user.email}: {email_error}")
                # Continuar con el registro aunque falle el email
            
            # Log del registro
            logger.info(f"Nuevo usuario registrado via API: {user.email}")
            
            # Serializar datos del usuario
            user_serializer = UserSerializer(user)
            
            return Response({
                'success': True,
                'message': 'Registro exitoso. Te hemos enviado un correo de verificación.',
                'user': user_serializer.data,
                'email_verification_required': True,
                'note': 'Por favor revisa tu correo electrónico para verificar tu cuenta.'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro API: {e}")
            return Response({
                'success': False,
                'message': 'Error durante el registro'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile_api(request):
    """API endpoint para obtener perfil del usuario"""
    serializer = UserSerializer(request.user)
    return Response({
        'success': True,
        'user': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
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
@permission_classes([permissions.IsAuthenticated])
def change_password_api(request):
    """API endpoint para cambio de contraseña"""
    serializer = PasswordChangeSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # Regenerar token después del cambio de contraseña
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            
            logger.info(f"Usuario {user.email} cambió su contraseña via API")
            
            return Response({
                'success': True,
                'message': 'Contraseña cambiada exitosamente',
                'token': token.key  # Nuevo token
            }, status=status.HTTP_200_OK)
            
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
@permission_classes([permissions.IsAuthenticated])
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
        
        send_mail(
            email_subject,
            email_body,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_email_api(request):
    """API endpoint para verificar email del usuario autenticado"""
    try:
        user = request.user
        user.verify_email()
        
        logger.info(f"Usuario {user.email} verificó su email via API")
        
        return Response({
            'success': True,
            'message': 'Email verificado correctamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error verificando email via API: {e}")
        return Response({
            'success': False,
            'message': 'Error al verificar el email'
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
def password_reset_request_api(request):
    """API endpoint para solicitar reset de contraseña"""
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            email = serializer.validated_data['email']
            user = CustomUser.objects.get(email=email)
            
            # Generar token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # En un entorno real, aquí enviarías el email
            # Por ahora solo retornamos el token para testing
            logger.info(f"Solicitud de reset de contraseña para: {email}")
            
            return Response({
                'success': True,
                'message': 'Se ha enviado un email con las instrucciones para restablecer tu contraseña',
                'reset_token': token,  # Solo para desarrollo
                'uid': uid  # Solo para desarrollo
            }, status=status.HTTP_200_OK)
            
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
                user.save()
                
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
