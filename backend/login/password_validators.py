"""
Validadores de contraseñas personalizados para CorteSec.
Implementa políticas de seguridad robustas según OWASP.
"""

import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.contrib.auth.password_validation import CommonPasswordValidator
import logging

logger = logging.getLogger('security')


class PasswordComplexityValidator:
    """
    Validador que requiere contraseñas complejas según mejores prácticas.
    """
    
    def __init__(self, min_length=12):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        errors = []
        
        # Longitud mínima
        if len(password) < self.min_length:
            errors.append(
                f"La contraseña debe tener al menos {self.min_length} caracteres."
            )
        
        # Al menos una minúscula
        if not re.search(r'[a-z]', password):
            errors.append("La contraseña debe contener al menos una letra minúscula.")
        
        # Al menos una mayúscula
        if not re.search(r'[A-Z]', password):
            errors.append("La contraseña debe contener al menos una letra mayúscula.")
        
        # Al menos un número
        if not re.search(r'\d', password):
            errors.append("La contraseña debe contener al menos un número.")
        
        # Al menos un carácter especial
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\'\":\\|,.<>\?]', password):
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
        return _(
            f"Su contraseña debe tener al menos {self.min_length} caracteres y debe contener "
            "al menos una letra minúscula, una mayúscula, un número y un carácter especial."
        )


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
    """
    
    def __init__(self, last_passwords=5):
        self.last_passwords = last_passwords
    
    def validate(self, password, user=None):
        if not user or not user.pk:
            return
        
        from .models import PasswordHistory
        from django.contrib.auth.hashers import check_password
        
        # Verificar últimas contraseñas
        recent_passwords = PasswordHistory.objects.filter(
            user=user
        ).order_by('-created_at')[:self.last_passwords]
        
        for pwd_history in recent_passwords:
            if check_password(password, pwd_history.password_hash):
                raise ValidationError(
                    _(f"No puede reutilizar una de sus últimas {self.last_passwords} contraseñas."),
                    code='password_reused',
                )
    
    def get_help_text(self):
        return _(f"Su contraseña no puede ser igual a ninguna de sus últimas {self.last_passwords} contraseñas.")


class PasswordExpiryValidator:
    """
    Validador que verifica si la contraseña ha expirado.
    """
    
    def __init__(self, max_age_days=90):
        self.max_age_days = max_age_days
    
    def validate(self, password, user=None):
        # Este validador se usa más para verificación que para validación
        pass
    
    def get_help_text(self):
        return _(f"Las contraseñas expiran cada {self.max_age_days} días.")
    
    @classmethod
    def is_password_expired(cls, user, max_age_days=90):
        """Verifica si la contraseña del usuario ha expirado"""
        if not user.last_login:
            return False
        
        from django.utils import timezone
        from datetime import timedelta
        
        expiry_date = user.last_login + timedelta(days=max_age_days)
        return timezone.now() > expiry_date
