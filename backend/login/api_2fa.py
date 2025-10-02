"""
Vista API para autenticación de dos factores (2FA)
================================================

Endpoints para gestión de 2FA, sesiones y alertas de seguridad.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

import logging
import secrets
import pyotp
import qrcode
from io import BytesIO
import base64
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.gis.geoip2 import GeoIP2
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CustomUser, LoginAttempt, UserSession
from .auth_security import AuthSecurityManager, SecurityAuditLogger

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """
    Habilita la autenticación de dos factores para el usuario
    """
    try:
        user = request.user
        method = request.data.get('method', 'email')  # email, sms, app
        
        if user.two_factor_enabled:
            return Response({
                'error': 'La autenticación de dos factores ya está habilitada'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generar código de verificación
        verification_code = secrets.randbelow(900000) + 100000  # 6 dígitos
        
        # Almacenar en cache por 5 minutos
        cache_key = f"2fa_verification_{user.id}_{method}"
        cache.set(cache_key, verification_code, 300)
        
        if method == 'email':
            # Enviar código por email
            from django.core.mail import send_mail
            send_mail(
                'Código de verificación 2FA - CorteSec',
                f'Tu código de verificación es: {verification_code}\n\nEste código expira en 5 minutos.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
        elif method == 'app':
            # Generar secreto TOTP
            user.generate_totp_secret()
            # No enviamos código, el usuario usará la app
            verification_code = None
            
        # Log de seguridad
        SecurityAuditLogger.log_security_event(
            user=user,
            action="2FA_ENABLE_ATTEMPT",
            details={'method': method},
            request=request
        )
        
        response_data = {
            'message': f'Código de verificación enviado via {method}',
            'expires_in': 300
        }
        
        if method == 'app':
            # Generar QR code para apps como Google Authenticator
            totp_uri = user.get_totp_uri()
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            response_data.update({
                'qr_code': f'data:image/png;base64,{img_str}',
                'secret': user.totp_secret,
                'message': 'Escanea el código QR con tu app de autenticación'
            })
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error enabling 2FA for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_2fa(request):
    """
    Verifica el código 2FA y completa la activación
    """
    try:
        user = request.user
        code = request.data.get('code')
        method = request.data.get('method', 'email')
        
        if not code:
            return Response({
                'error': 'Código de verificación requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if method == 'app':
            # Verificar código TOTP
            if user.verify_totp(code):
                # Activar 2FA
                user.two_factor_enabled = True
                user.save()
                
                # Generar códigos de respaldo
                backup_codes = user.generate_backup_codes()
                
                SecurityAuditLogger.log_security_event(
                    user=user,
                    action="2FA_ENABLED",
                    details={'method': method},
                    request=request
                )
                
                return Response({
                    'message': 'Autenticación de dos factores activada exitosamente',
                    'backup_codes': backup_codes
                })
            else:
                return Response({
                    'error': 'Código de verificación inválido'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            # Verificar código de cache
            cache_key = f"2fa_verification_{user.id}_{method}"
            stored_code = cache.get(cache_key)
            
            if not stored_code or str(stored_code) != str(code):
                return Response({
                    'error': 'Código de verificación inválido o expirado'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Activar 2FA
            user.two_factor_enabled = True
            user.save()
            
            # Limpiar cache
            cache.delete(cache_key)
            
            # Generar códigos de respaldo
            backup_codes = user.generate_backup_codes()
            
            SecurityAuditLogger.log_security_event(
                user=user,
                action="2FA_ENABLED",
                details={'method': method},
                request=request
            )
            
            return Response({
                'message': 'Autenticación de dos factores activada exitosamente',
                'backup_codes': backup_codes
            })
            
    except Exception as e:
        logger.error(f"Error verifying 2FA for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Deshabilita la autenticación de dos factores
    """
    try:
        user = request.user
        password = request.data.get('password')
        
        if not password:
            return Response({
                'error': 'Contraseña requerida para deshabilitar 2FA'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar contraseña
        if not user.check_password(password):
            return Response({
                'error': 'Contraseña incorrecta'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deshabilitar 2FA
        user.two_factor_enabled = False
        user.totp_secret = ''
        user.backup_codes = []
        user.save()
        
        SecurityAuditLogger.log_security_event(
            user=user,
            action="2FA_DISABLED",
            details={},
            request=request
        )
        
        return Response({
            'message': 'Autenticación de dos factores deshabilitada'
        })
        
    except Exception as e:
        logger.error(f"Error disabling 2FA for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_sessions(request):
    """
    Obtiene las sesiones activas del usuario
    """
    try:
        user = request.user
        sessions = UserSession.objects.filter(user=user, is_active=True)
        
        sessions_data = []
        for session in sessions:
            is_current = session.session_key == request.session.session_key
            
            sessions_data.append({
                'id': session.id,
                'ip_address': session.ip_address,
                'location': session.location,
                'user_agent': session.user_agent,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
                'is_current': is_current,
                'device_type': _get_device_type(session.user_agent),
                'device_name': _parse_user_agent(session.user_agent)
            })
        
        return Response({'sessions': sessions_data})
        
    except Exception as e:
        logger.error(f"Error getting sessions for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_session(request):
    """
    Termina una sesión específica
    """
    try:
        user = request.user
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response({
                'error': 'ID de sesión requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session = UserSession.objects.filter(
            id=session_id, 
            user=user, 
            is_active=True
        ).first()
        
        if not session:
            return Response({
                'error': 'Sesión no encontrada'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Terminar sesión
        session.is_active = False
        session.save()
        
        SecurityAuditLogger.log_security_event(
            user=user,
            action="SESSION_TERMINATED",
            details={'session_id': session_id, 'ip': session.ip_address},
            request=request
        )
        
        return Response({
            'message': 'Sesión terminada exitosamente'
        })
        
    except Exception as e:
        logger.error(f"Error terminating session {session_id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_all_other_sessions(request):
    """
    Termina todas las demás sesiones del usuario excepto la actual
    """
    try:
        user = request.user
        current_session_key = request.session.session_key
        
        # Terminar todas las otras sesiones
        other_sessions = UserSession.objects.filter(
            user=user, 
            is_active=True
        ).exclude(session_key=current_session_key)
        
        count = other_sessions.count()
        other_sessions.update(is_active=False)
        
        SecurityAuditLogger.log_security_event(
            user=user,
            action="ALL_OTHER_SESSIONS_TERMINATED",
            details={'count': count},
            request=request
        )
        
        return Response({
            'message': f'{count} sesión(es) terminada(s) exitosamente'
        })
        
    except Exception as e:
        logger.error(f"Error terminating all sessions for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_security_alerts(request):
    """
    Obtiene las alertas de seguridad del usuario
    """
    try:
        user = request.user
        
        # Obtener alertas de los últimos 30 días
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Intentos de login recientes
        login_attempts = LoginAttempt.objects.filter(
            user_email=user.email,
            timestamp__gte=thirty_days_ago
        ).order_by('-timestamp')[:50]
        
        alerts = []
        for attempt in login_attempts:
            if not attempt.success:
                severity = 'high' if attempt.timestamp > timezone.now() - timedelta(hours=1) else 'medium'
                alerts.append({
                    'id': f'login_{attempt.id}',
                    'type': 'login',
                    'severity': severity,
                    'timestamp': attempt.timestamp.isoformat(),
                    'message': f'Intento de login fallido desde {attempt.location or attempt.ip_address}',
                    'data': {
                        'isSuccess': False,
                        'ipAddress': attempt.ip_address,
                        'location': attempt.location,
                        'userAgent': attempt.user_agent
                    },
                    'isRead': False,
                    'hasDetails': True,
                    'details': {
                        'ip': attempt.ip_address,
                        'location': attempt.location,
                        'reason': attempt.reason,
                        'userAgent': attempt.user_agent
                    },
                    'recommendations': [
                        'Verifica si reconoces esta actividad',
                        'Considera cambiar tu contraseña si es sospechoso',
                        'Habilita 2FA para mayor seguridad'
                    ]
                })
        
        # Ordenar por timestamp descendente
        alerts.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({'alerts': alerts})
        
    except Exception as e:
        logger.error(f"Error getting security alerts for user {request.user.id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _get_device_type(user_agent):
    """
    Determina el tipo de dispositivo basado en el user agent
    """
    user_agent_lower = user_agent.lower()
    if any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone', 'ipad']):
        return 'mobile'
    return 'desktop'


def _parse_user_agent(user_agent):
    """
    Parsea el user agent para obtener información del dispositivo/navegador
    """
    try:
        # Simplificación básica - en producción usar una librería como user-agents
        if 'Chrome' in user_agent:
            return 'Google Chrome'
        elif 'Firefox' in user_agent:
            return 'Mozilla Firefox'
        elif 'Safari' in user_agent and 'Chrome' not in user_agent:
            return 'Safari'
        elif 'Edge' in user_agent:
            return 'Microsoft Edge'
        else:
            return 'Navegador desconocido'
    except:
        return 'Navegador desconocido'


def _get_location_from_ip(ip_address):
    """
    Obtiene la ubicación geográfica de una IP
    """
    try:
        g = GeoIP2()
        location = g.city(ip_address)
        return f"{location['city']}, {location['country_name']}" if location['city'] else location['country_name']
    except:
        return 'Ubicación desconocida'
