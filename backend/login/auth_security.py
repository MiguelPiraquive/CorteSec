"""
Sistema de seguridad avanzado para autenticación.
Incluye límites de intentos y auditoría.
Lee configuración dinámica desde ConfiguracionSeguridad.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.throttling import UserRateThrottle
from rest_framework import status
from rest_framework.response import Response
import hashlib

logger = logging.getLogger('security')

# Cache key y TTL para la configuración de seguridad (evita hit a DB en cada request)
_SECURITY_CONFIG_CACHE_KEY = 'security_config_cached'
_SECURITY_CONFIG_CACHE_TTL = 60  # 1 minuto


def _get_security_config():
    """
    Obtiene la configuración de seguridad desde DB con cache de 1 minuto.
    Retorna dict con max_intentos_login, tiempo_bloqueo (en segundos), etc.
    Si la tabla aún no existe (migraciones pendientes), retorna defaults.
    """
    cached = cache.get(_SECURITY_CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    defaults = {
        'max_intentos_login': 5,
        'tiempo_bloqueo': 900,  # 15 min en segundos
        'tiempo_sesion': 30,
        'notificar_login_fallido': True,
        'notificar_cambio_password': True,
        'permitir_multiples_sesiones': False,
        'ips_permitidas': '',
    }

    try:
        from configuracion.models import ConfiguracionSeguridad
        config = ConfiguracionSeguridad.get_config()
        result = {
            'max_intentos_login': config.max_intentos_login or 5,
            'tiempo_bloqueo': (config.tiempo_bloqueo or 15) * 60,  # convertir minutos a segundos
            'tiempo_sesion': config.tiempo_sesion or 30,
            'notificar_login_fallido': config.notificar_login_fallido,
            'notificar_cambio_password': config.notificar_cambio_password,
            'permitir_multiples_sesiones': config.permitir_multiples_sesiones,
            'ips_permitidas': config.ips_permitidas or '',
        }
        cache.set(_SECURITY_CONFIG_CACHE_KEY, result, _SECURITY_CONFIG_CACHE_TTL)
        return result
    except Exception:
        return defaults


class LoginRateThrottle(UserRateThrottle):
    """
    Límite específico para intentos de login.
    """
    scope = 'login'


class AuthSecurityManager:
    """
    Gestor de seguridad para autenticación.
    Lee max_intentos_login y tiempo_bloqueo desde ConfiguracionSeguridad.
    """
    
    # Fallbacks (se usan solo si la DB no está disponible)
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutos en segundos
    
    @classmethod
    def _get_limits(cls):
        """Obtiene límites dinámicos desde ConfiguracionSeguridad"""
        config = _get_security_config()
        return config['max_intentos_login'], config['tiempo_bloqueo']
    
    @classmethod
    def get_client_ip(cls, request):
        """Obtiene la IP real del cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip
    
    @classmethod
    def get_cache_key(cls, email, ip_address):
        """Genera clave de cache para intentos de login"""
        key_data = f"{email}:{ip_address}"
        return f"login_attempts_{hashlib.md5(key_data.encode()).hexdigest()}"
    
    @classmethod
    def is_locked_out(cls, email, ip_address):
        """Verifica si la cuenta/IP está bloqueada"""
        cache_key = cls.get_cache_key(email, ip_address)
        attempts_data = cache.get(cache_key, {'attempts': 0, 'locked_until': None})
        
        if attempts_data.get('locked_until'):
            if timezone.now() < attempts_data['locked_until']:
                return True
            else:
                # El bloqueo ha expirado, limpiar
                cache.delete(cache_key)
                return False
        
        return False
    
    @classmethod
    def record_failed_attempt(cls, email, ip_address):
        """Registra un intento fallido de login"""
        max_attempts, lockout_duration = cls._get_limits()
        
        cache_key = cls.get_cache_key(email, ip_address)
        attempts_data = cache.get(cache_key, {'attempts': 0, 'locked_until': None})
        
        attempts_data['attempts'] += 1
        
        # Si se excede el límite, bloquear
        if attempts_data['attempts'] >= max_attempts:
            attempts_data['locked_until'] = timezone.now() + timedelta(seconds=lockout_duration)
            logger.warning(
                f"Account locked out for {email} from IP {ip_address} "
                f"after {attempts_data['attempts']} failed attempts"
            )
            # Enviar notificación si está habilitada
            cls._notify_failed_login(email, ip_address, attempts_data['attempts'])
        
        cache.set(cache_key, attempts_data, lockout_duration + 60)
        
        logger.warning(
            f"Failed login attempt {attempts_data['attempts']}/{max_attempts} "
            f"for {email} from IP {ip_address}"
        )
    
    @classmethod
    def _notify_failed_login(cls, email, ip_address, attempt_count):
        """Envía notificación por email al admin cuando se bloquea una cuenta"""
        try:
            config = _get_security_config()
            if not config.get('notificar_login_fallido', False):
                return
            
            from core.email_service import send_system_email, _get_email_config
            
            subject = f'[CorteSec] Alerta: Cuenta bloqueada - {email}'
            message = (
                f"Se ha bloqueado el acceso para el usuario {email}\n\n"
                f"Detalles:\n"
                f"- IP: {ip_address}\n"
                f"- Intentos fallidos: {attempt_count}\n"
                f"- Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                f"La cuenta será desbloqueada automáticamente después del tiempo configurado."
            )
            
            # Enviar al email_administrador configurado, o a ADMINS de settings
            email_config = _get_email_config()
            admin_email = email_config.get('email_administrador', '') if email_config else ''
            
            if admin_email:
                send_system_email(
                    subject=subject,
                    message=message,
                    recipient_list=[admin_email],
                    fail_silently=True,
                )
            else:
                # Fallback: enviar a ADMINS de settings.py
                from django.conf import settings as django_settings
                admins = getattr(django_settings, 'ADMINS', [])
                admin_emails = [a[1] for a in admins if len(a) > 1]
                if admin_emails:
                    send_system_email(
                        subject=subject,
                        message=message,
                        recipient_list=admin_emails,
                        fail_silently=True,
                    )
            
            logger.info(f"Notificación de login fallido enviada para {email}")
        except Exception as e:
            logger.error(f"Error enviando notificación de login fallido: {e}")
    
    @classmethod
    def record_successful_login(cls, email, ip_address):
        """Registra un login exitoso y limpia intentos fallidos"""
        cache_key = cls.get_cache_key(email, ip_address)
        cache.delete(cache_key)
        
        logger.info(f"Successful login for {email} from IP {ip_address}")

    @classmethod
    def secure_authenticate(cls, request, email, password):
        """
        Autenticación segura con verificación de intentos y auditoría.
        """
        ip_address = cls.get_client_ip(request)
        _max_attempts, lockout_duration = cls._get_limits()
        
        # Verificar si está bloqueado
        if cls.is_locked_out(email, ip_address):
            logger.warning(
                f"Login attempt blocked for {email} from IP {ip_address} - account locked out"
            )
            return None, {
                'error': 'Cuenta temporalmente bloqueada debido a múltiples intentos fallidos.',
                'locked_out': True,
                'lockout_duration': lockout_duration
            }
        
        # Intentar autenticar
        user = authenticate(request, email=email, password=password)

        # Mensaje genérico para evitar account enumeration
        generic_error = {
            'error': 'Credenciales inválidas.',
            'invalid_credentials': True
        }

        if user:
            if not user.is_active:
                cls.record_failed_attempt(email, ip_address)
                # Mismo mensaje genérico para evitar revelar que la cuenta existe
                return None, generic_error

            # Login exitoso
            cls.record_successful_login(email, ip_address)
            return user, None
        else:
            # Login fallido
            cls.record_failed_attempt(email, ip_address)
            return None, generic_error


class SecurityAuditLogger:
    """
    Logger específico para auditoría de seguridad.
    """
    
    @staticmethod
    def log_login_attempt(email, ip_address, success, reason=None):
        """Registra intentos de login"""
        status_msg = "SUCCESS" if success else "FAILED"
        reason_msg = f" - {reason}" if reason else ""
        
        logger.info(
            f"LOGIN_ATTEMPT [{status_msg}] {email} from {ip_address}{reason_msg}"
        )
    
    @staticmethod
    def log_token_activity(user, action, details=None):
        """Registra actividad de tokens"""
        details_msg = f" - {details}" if details else ""
        
        logger.info(
            f"TOKEN_{action} for user {user.email}{details_msg}"
        )
    
    @staticmethod
    def log_security_event(event_type, user_email, ip_address, details):
        """Registra eventos de seguridad"""
        logger.warning(
            f"SECURITY_EVENT [{event_type}] {user_email} from {ip_address} - {details}"
        )
