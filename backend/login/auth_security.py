"""
Sistema de seguridad avanzado para autenticación.
Incluye límites de intentos, validación de tokens y auditoría.
"""

import logging
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.throttling import UserRateThrottle
from rest_framework import status
from rest_framework.response import Response
import hashlib

logger = logging.getLogger('security')


class LoginRateThrottle(UserRateThrottle):
    """
    Límite específico para intentos de login.
    """
    scope = 'login'


class AuthSecurityManager:
    """
    Gestor de seguridad para autenticación.
    """
    
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutos en segundos
    TOKEN_VALIDITY_HOURS = 24
    
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
            if datetime.now() < attempts_data['locked_until']:
                return True
            else:
                # El bloqueo ha expirado, limpiar
                cache.delete(cache_key)
                return False
        
        return False
    
    @classmethod
    def record_failed_attempt(cls, email, ip_address):
        """Registra un intento fallido de login"""
        cache_key = cls.get_cache_key(email, ip_address)
        attempts_data = cache.get(cache_key, {'attempts': 0, 'locked_until': None})
        
        attempts_data['attempts'] += 1
        
        # Si se excede el límite, bloquear
        if attempts_data['attempts'] >= cls.MAX_LOGIN_ATTEMPTS:
            attempts_data['locked_until'] = datetime.now() + timedelta(seconds=cls.LOCKOUT_DURATION)
            logger.warning(
                f"Account locked out for {email} from IP {ip_address} "
                f"after {attempts_data['attempts']} failed attempts"
            )
        
        cache.set(cache_key, attempts_data, cls.LOCKOUT_DURATION + 60)
        
        logger.warning(
            f"Failed login attempt {attempts_data['attempts']}/{cls.MAX_LOGIN_ATTEMPTS} "
            f"for {email} from IP {ip_address}"
        )
    
    @classmethod
    def record_successful_login(cls, email, ip_address):
        """Registra un login exitoso y limpia intentos fallidos"""
        cache_key = cls.get_cache_key(email, ip_address)
        cache.delete(cache_key)
        
        logger.info(f"Successful login for {email} from IP {ip_address}")
    
    @classmethod
    def is_token_valid(cls, token):
        """Verifica si un token es válido y no ha expirado"""
        try:
            if not token or not token.created:
                return False
            
            # Verificar si el token ha expirado
            token_age = datetime.now() - token.created.replace(tzinfo=None)
            max_age = timedelta(hours=cls.TOKEN_VALIDITY_HOURS)
            
            if token_age > max_age:
                logger.info(f"Token expired for user {token.user.email}")
                token.delete()
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating token: {e}")
            return False
    
    @classmethod
    def clean_expired_tokens(cls):
        """Limpia tokens expirados del sistema"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=cls.TOKEN_VALIDITY_HOURS)
            expired_tokens = Token.objects.filter(created__lt=cutoff_time)
            count = expired_tokens.count()
            expired_tokens.delete()
            
            if count > 0:
                logger.info(f"Cleaned {count} expired tokens")
            
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning expired tokens: {e}")
            return 0
    
    @classmethod
    def secure_authenticate(cls, request, email, password):
        """
        Autenticación segura con verificación de intentos y auditoría.
        """
        ip_address = cls.get_client_ip(request)
        
        # Verificar si está bloqueado
        if cls.is_locked_out(email, ip_address):
            logger.warning(
                f"Login attempt blocked for {email} from IP {ip_address} - account locked out"
            )
            return None, {
                'error': 'Cuenta temporalmente bloqueada debido a múltiples intentos fallidos.',
                'locked_out': True
            }
        
        # Intentar autenticar
        user = authenticate(request, email=email, password=password)
        
        if user:
            if not user.is_active:
                cls.record_failed_attempt(email, ip_address)
                return None, {
                    'error': 'Esta cuenta está desactivada.',
                    'account_disabled': True
                }
            
            # Login exitoso
            cls.record_successful_login(email, ip_address)
            return user, None
        else:
            # Login fallido
            cls.record_failed_attempt(email, ip_address)
            return None, {
                'error': 'Credenciales inválidas.',
                'invalid_credentials': True
            }
    
    @classmethod
    def create_secure_token(cls, user):
        """Crea un token seguro y limpia tokens antiguos del usuario"""
        try:
            # Eliminar tokens existentes del usuario
            Token.objects.filter(user=user).delete()
            
            # Crear nuevo token
            token = Token.objects.create(user=user)
            
            logger.info(f"New secure token created for user {user.email}")
            return token
            
        except Exception as e:
            logger.error(f"Error creating secure token for user {user.email}: {e}")
            return None
    
    @classmethod
    def validate_user_token(cls, user):
        """Valida y renueva el token de un usuario si es necesario"""
        try:
            token = Token.objects.filter(user=user).first()
            
            if not token or not cls.is_token_valid(token):
                # Crear nuevo token si no existe o ha expirado
                token = cls.create_secure_token(user)
            
            return token
            
        except Exception as e:
            logger.error(f"Error validating user token: {e}")
            return None


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
