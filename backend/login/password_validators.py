"""
Validadores de contraseñas personalizados para CorteSec.
Implementa políticas de seguridad robustas según OWASP.
Lee configuración dinámica desde ConfiguracionSeguridad.
"""

import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.core.cache import cache
import logging

logger = logging.getLogger('security')

# Cache para configuración de seguridad (evita hit a DB en cada validación)
_PWD_CONFIG_CACHE_KEY = 'pwd_security_config'
_PWD_CONFIG_CACHE_TTL = 60  # 1 minuto


def _get_password_config():
    """
    Obtiene la configuración de contraseñas desde ConfiguracionSeguridad con cache.
    Retorna dict con todos los campos de política de contraseñas.
    """
    cached = cache.get(_PWD_CONFIG_CACHE_KEY)
    if cached is not None:
        return cached

    defaults = {
        'longitud_minima_password': 8,
        'requiere_mayusculas': True,
        'requiere_minusculas': True,
        'requiere_numeros': True,
        'requiere_simbolos': True,
        'dias_expiracion_password': 90,
        'historial_passwords': 5,
    }

    try:
        from configuracion.models import ConfiguracionSeguridad
        config = ConfiguracionSeguridad.get_config()
        result = {
            'longitud_minima_password': config.longitud_minima_password or 8,
            'requiere_mayusculas': config.requiere_mayusculas,
            'requiere_minusculas': config.requiere_minusculas,
            'requiere_numeros': config.requiere_numeros,
            'requiere_simbolos': config.requiere_simbolos,
            'dias_expiracion_password': config.dias_expiracion_password or 90,
            'historial_passwords': config.historial_passwords or 5,
        }
        cache.set(_PWD_CONFIG_CACHE_KEY, result, _PWD_CONFIG_CACHE_TTL)
        return result
    except Exception:
        return defaults


class PasswordComplexityValidator:
    """
    Validador que requiere contraseñas complejas.
    Lee las políticas desde ConfiguracionSeguridad dinámicamente.
    """
    
    def __init__(self, min_length=12):
        # min_length de settings.py es solo fallback; se lee de DB en runtime
        self.fallback_min_length = min_length
    
    def validate(self, password, user=None):
        config = _get_password_config()
        min_length = config['longitud_minima_password']
        errors = []
        
        # Longitud mínima
        if len(password) < min_length:
            errors.append(
                f"La contraseña debe tener al menos {min_length} caracteres."
            )
        
        # Al menos una minúscula (condicional)
        if config['requiere_minusculas'] and not re.search(r'[a-z]', password):
            errors.append("La contraseña debe contener al menos una letra minúscula.")
        
        # Al menos una mayúscula (condicional)
        if config['requiere_mayusculas'] and not re.search(r'[A-Z]', password):
            errors.append("La contraseña debe contener al menos una letra mayúscula.")
        
        # Al menos un número (condicional)
        if config['requiere_numeros'] and not re.search(r'\d', password):
            errors.append("La contraseña debe contener al menos un número.")
        
        # Al menos un carácter especial (condicional)
        if config['requiere_simbolos'] and not re.search(r'[!@#$%^&*()_+\-=\[\]{};\'\":\\|,.<>\?]', password):
            errors.append("La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;':\",./<>?).")
        
        # No debe contener información del usuario
        if user:
            user_info = [
                user.username.lower() if user.username else '',
                user.email.lower().split('@')[0] if user.email else '',
                user.first_name.lower() if user.first_name else '',
                user.last_name.lower() if user.last_name else '',
            ]
            
            password_lower = password.lower()
            for info in user_info:
                if info and len(info) > 2 and info in password_lower:
                    errors.append("La contraseña no debe contener información personal.")
                    break
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        config = _get_password_config()
        parts = [f"Su contraseña debe tener al menos {config['longitud_minima_password']} caracteres"]
        reqs = []
        if config['requiere_minusculas']:
            reqs.append("una letra minúscula")
        if config['requiere_mayusculas']:
            reqs.append("una mayúscula")
        if config['requiere_numeros']:
            reqs.append("un número")
        if config['requiere_simbolos']:
            reqs.append("un carácter especial")
        if reqs:
            parts.append(" y debe contener al menos " + ", ".join(reqs))
        return _(". ".join(parts) + ".")


class CommonPasswordValidator:
    """
    Validador que rechaza contraseñas comunes.
    """
    
    COMMON_PASSWORDS = [
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
        'admin123', 'root', 'toor', 'pass', 'test', 'guest', 'user',
        'cortesec', 'cortesec123', 'admin@cortesec.com', 'sistema'
    ]
    
    def validate(self, password, user=None):
        if password.lower() in [p.lower() for p in self.COMMON_PASSWORDS]:
            raise ValidationError(
                _("Esta contraseña es demasiado común. Elija una contraseña más segura."),
                code='password_too_common',
            )
    
    def get_help_text(self):
        return _("Su contraseña no puede ser una contraseña comúnmente utilizada.")


class PasswordHistoryValidator:
    """
    Validador que previene reutilizar contraseñas recientes.
    Lee historial_passwords desde ConfiguracionSeguridad.
    """
    
    def __init__(self, last_passwords=5):
        # Fallback from settings; runtime reads from DB
        self.fallback_last_passwords = last_passwords
    
    def validate(self, password, user=None):
        if not user or not user.pk:
            return
        
        config = _get_password_config()
        last_passwords = config['historial_passwords']
        
        from .models import PasswordHistory
        from django.contrib.auth.hashers import check_password
        
        # Verificar últimas contraseñas
        recent_passwords = PasswordHistory.objects.filter(
            user=user
        ).order_by('-created_at')[:last_passwords]
        
        for pwd_history in recent_passwords:
            if check_password(password, pwd_history.password_hash):
                raise ValidationError(
                    _(f"No puede reutilizar una de sus últimas {last_passwords} contraseñas."),
                    code='password_reused',
                )
    
    def get_help_text(self):
        config = _get_password_config()
        return _(f"Su contraseña no puede ser igual a ninguna de sus últimas {config['historial_passwords']} contraseñas.")


class PasswordExpiryValidator:
    """
    Validador que verifica si la contraseña ha expirado.
    Lee dias_expiracion_password desde ConfiguracionSeguridad.
    """
    
    def __init__(self, max_age_days=90):
        self.fallback_max_age_days = max_age_days
    
    def validate(self, password, user=None):
        # Este validador se usa más para verificación que para validación
        pass
    
    def get_help_text(self):
        config = _get_password_config()
        return _(f"Las contraseñas expiran cada {config['dias_expiracion_password']} días.")
    
    @classmethod
    def is_password_expired(cls, user, max_age_days=None):
        """Verifica si la contraseña del usuario ha expirado, leyendo config de DB"""
        if max_age_days is None:
            config = _get_password_config()
            max_age_days = config['dias_expiracion_password']
        
        if not user.last_login:
            return False
        
        # Usar password_changed_at si existe, sino last_login
        from django.utils import timezone
        from datetime import timedelta
        
        reference_date = getattr(user, 'password_changed_at', None) or user.last_login
        if not reference_date:
            return False
        
        expiry_date = reference_date + timedelta(days=max_age_days)
        return timezone.now() > expiry_date
