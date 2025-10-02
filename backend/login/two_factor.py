"""
Sistema de autenticación de dos factores (2FA/MFA).
"""

import secrets
import qrcode
import io
import base64
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import pyotp

User = get_user_model()


class TwoFactorAuth(models.Model):
    """
    Configuración de autenticación de dos factores para usuarios.
    """
    
    METHOD_CHOICES = [
        ('totp', _('Aplicación Autenticadora (TOTP)')),
        ('sms', _('SMS')),
        ('email', _('Email')),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='two_factor_auth',
        verbose_name=_("Usuario")
    )
    
    is_enabled = models.BooleanField(
        _("Habilitado"),
        default=False,
        help_text=_("Si 2FA está habilitado para este usuario")
    )
    
    method = models.CharField(
        _("Método"),
        max_length=10,
        choices=METHOD_CHOICES,
        default='totp',
        help_text=_("Método de autenticación de dos factores")
    )
    
    secret_key = models.CharField(
        _("Clave secreta"),
        max_length=32,
        blank=True,
        help_text=_("Clave secreta para TOTP")
    )
    
    backup_codes = models.JSONField(
        _("Códigos de respaldo"),
        default=list,
        blank=True,
        help_text=_("Códigos de respaldo para recuperación")
    )
    
    phone_number = models.CharField(
        _("Número de teléfono"),
        max_length=20,
        blank=True,
        help_text=_("Número de teléfono para SMS")
    )
    
    last_used = models.DateTimeField(
        _("Último uso"),
        null=True,
        blank=True,
        help_text=_("Última vez que se usó 2FA")
    )
    
    created_at = models.DateTimeField(
        _("Fecha de creación"),
        auto_now_add=True
    )
    
    updated_at = models.DateTimeField(
        _("Fecha de actualización"),
        auto_now=True
    )
    
    class Meta:
        verbose_name = _("Autenticación de Dos Factores")
        verbose_name_plural = _("Autenticaciones de Dos Factores")
    
    def __str__(self):
        return f"{self.user.email} - {self.get_method_display()}"
    
    def generate_secret_key(self):
        """Genera una nueva clave secreta para TOTP"""
        self.secret_key = pyotp.random_base32()
        self.save(update_fields=['secret_key'])
        return self.secret_key
    
    def generate_backup_codes(self, count=10):
        """Genera códigos de respaldo"""
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        self.backup_codes = codes
        self.save(update_fields=['backup_codes'])
        return codes
    
    def get_qr_code(self):
        """Genera código QR para configurar TOTP"""
        if not self.secret_key:
            self.generate_secret_key()
        
        issuer_name = getattr(settings, 'SITE_NAME', 'CorteSec')
        totp = pyotp.TOTP(self.secret_key)
        provisioning_uri = totp.provisioning_uri(
            name=self.user.email,
            issuer_name=issuer_name
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_totp(self, token):
        """Verifica un token TOTP"""
        if not self.secret_key:
            return False
        
        totp = pyotp.TOTP(self.secret_key)
        is_valid = totp.verify(token, valid_window=1)
        
        if is_valid:
            self.last_used = timezone.now()
            self.save(update_fields=['last_used'])
        
        return is_valid
    
    def verify_backup_code(self, code):
        """Verifica y consume un código de respaldo"""
        if code.upper() in self.backup_codes:
            self.backup_codes.remove(code.upper())
            self.last_used = timezone.now()
            self.save(update_fields=['backup_codes', 'last_used'])
            return True
        return False


class TwoFactorToken(models.Model):
    """
    Tokens temporales para 2FA por SMS/Email.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='two_factor_tokens',
        verbose_name=_("Usuario")
    )
    
    token = models.CharField(
        _("Token"),
        max_length=6,
        help_text=_("Código de 6 dígitos")
    )
    
    method = models.CharField(
        _("Método"),
        max_length=10,
        choices=[('sms', 'SMS'), ('email', 'Email')],
        help_text=_("Método de envío del token")
    )
    
    is_used = models.BooleanField(
        _("Usado"),
        default=False,
        help_text=_("Si el token ya fue usado")
    )
    
    expires_at = models.DateTimeField(
        _("Expira"),
        help_text=_("Cuándo expira el token")
    )
    
    created_at = models.DateTimeField(
        _("Creado"),
        auto_now_add=True
    )
    
    class Meta:
        verbose_name = _("Token de Dos Factores")
        verbose_name_plural = _("Tokens de Dos Factores")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.token} - {self.method}"
    
    def is_expired(self):
        """Verifica si el token ha expirado"""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Verifica si el token es válido (no usado y no expirado)"""
        return not self.is_used and not self.is_expired()
    
    @classmethod
    def generate_token(cls, user, method='email', expires_in_minutes=5):
        """Genera un nuevo token 2FA"""
        # Eliminar tokens anteriores no usados
        cls.objects.filter(
            user=user,
            method=method,
            is_used=False
        ).delete()
        
        # Generar nuevo token
        token = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = timezone.now() + timedelta(minutes=expires_in_minutes)
        
        token_obj = cls.objects.create(
            user=user,
            token=token,
            method=method,
            expires_at=expires_at
        )
        
        # Enviar token
        if method == 'email':
            token_obj.send_email()
        elif method == 'sms':
            token_obj.send_sms()
        
        return token_obj
    
    def send_email(self):
        """Envía el token por email"""
        subject = 'Código de verificación CorteSec'
        
        context = {
            'user': self.user,
            'token': self.token,
            'expires_minutes': 5,
            'site_name': getattr(settings, 'SITE_NAME', 'CorteSec')
        }
        
        html_message = render_to_string('login/2fa_email.html', context)
        plain_message = render_to_string('login/2fa_email.txt', context)
        
        send_mail(
            subject=subject,
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.user.email],
            fail_silently=False
        )
    
    def send_sms(self):
        """Envía el token por SMS (implementación pendiente)"""
        # Aquí se integraría con un servicio de SMS como Twilio
        # Por ahora solo logeamos
        import logging
        logger = logging.getLogger('security')
        logger.info(f"SMS 2FA token for {self.user.email}: {self.token}")
    
    def verify_and_consume(self, provided_token):
        """Verifica y consume el token"""
        if self.token == provided_token and self.is_valid():
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True
        return False


class TrustedDevice(models.Model):
    """
    Dispositivos de confianza que no requieren 2FA por un tiempo.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trusted_devices',
        verbose_name=_("Usuario")
    )
    
    device_fingerprint = models.CharField(
        _("Huella del dispositivo"),
        max_length=64,
        help_text=_("Hash único del dispositivo")
    )
    
    device_name = models.CharField(
        _("Nombre del dispositivo"),
        max_length=100,
        help_text=_("Nombre descriptivo del dispositivo")
    )
    
    ip_address = models.GenericIPAddressField(
        _("Dirección IP"),
        help_text=_("IP cuando se marcó como confiable")
    )
    
    user_agent = models.TextField(
        _("User Agent"),
        help_text=_("Información del navegador/dispositivo")
    )
    
    is_active = models.BooleanField(
        _("Activo"),
        default=True,
        help_text=_("Si el dispositivo sigue siendo confiable")
    )
    
    expires_at = models.DateTimeField(
        _("Expira"),
        help_text=_("Cuándo expira la confianza")
    )
    
    last_used = models.DateTimeField(
        _("Último uso"),
        auto_now=True,
        help_text=_("Última vez que se usó el dispositivo")
    )
    
    created_at = models.DateTimeField(
        _("Creado"),
        auto_now_add=True
    )
    
    class Meta:
        verbose_name = _("Dispositivo de Confianza")
        verbose_name_plural = _("Dispositivos de Confianza")
        unique_together = ['user', 'device_fingerprint']
        ordering = ['-last_used']
    
    def __str__(self):
        return f"{self.user.email} - {self.device_name}"
    
    def is_expired(self):
        """Verifica si la confianza ha expirado"""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Verifica si el dispositivo sigue siendo confiable"""
        return self.is_active and not self.is_expired()
    
    @classmethod
    def create_trusted_device(cls, user, device_fingerprint, device_name, 
                            ip_address, user_agent, trust_days=30):
        """Crea un nuevo dispositivo de confianza"""
        expires_at = timezone.now() + timedelta(days=trust_days)
        
        # Actualizar si ya existe
        device, created = cls.objects.update_or_create(
            user=user,
            device_fingerprint=device_fingerprint,
            defaults={
                'device_name': device_name,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'is_active': True,
                'expires_at': expires_at
            }
        )
        
        return device
