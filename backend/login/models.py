"""
Modelos del Sistema de Autenticación
====================================

Modelo de usuario customizado para CorteSec.
Extiende AbstractUser con campos adicionales.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator


class CustomUser(AbstractUser):
    """
    Modelo de usuario customizado que extiende AbstractUser.
    Añade campos adicionales para información del perfil.
    """
    
    full_name = models.CharField(
        _("Nombre completo"), 
        max_length=150, 
        blank=True,
        help_text=_("Nombre completo del usuario")
    )
    
    email = models.EmailField(
        _("Dirección de email"), 
        unique=True,
        help_text=_("Email único del usuario (usado para login)")
    )
    
    phone = models.CharField(
        _("Teléfono"), 
        max_length=20, 
        blank=True,
        help_text=_("Número de teléfono de contacto")
    )
    
    birth_date = models.DateField(
        _("Fecha de nacimiento"), 
        blank=True, 
        null=True,
        help_text=_("Fecha de nacimiento del usuario")
    )
    
    avatar = models.ImageField(
        _("Avatar"),
        upload_to="avatars/",
        blank=True,
        null=True,
        help_text=_("Imagen de perfil del usuario"),
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
        ]
    )
    
    bio = models.TextField(
        _("Biografía"), 
        blank=True,
        help_text=_("Descripción o biografía del usuario")
    )
    
    address = models.CharField(
        _("Dirección"), 
        max_length=255, 
        blank=True,
        help_text=_("Dirección física del usuario")
    )
    
    city = models.CharField(
        _("Ciudad"), 
        max_length=100, 
        blank=True,
        help_text=_("Ciudad de residencia")
    )
    
    country = models.CharField(
        _("País"), 
        max_length=100, 
        blank=True,
        help_text=_("País de residencia")
    )
    
    email_verified = models.BooleanField(
        _("Email verificado"), 
        default=False,
        help_text=_("Si el email del usuario ha sido verificado")
    )
    
    # Campos para 2FA y seguridad avanzada
    two_factor_enabled = models.BooleanField(
        _("2FA habilitado"),
        default=False,
        help_text=_("Si la autenticación de dos factores está habilitada")
    )
    
    backup_codes = models.JSONField(
        _("Códigos de respaldo"),
        default=list,
        blank=True,
        help_text=_("Códigos de respaldo para 2FA")
    )
    
    totp_secret = models.CharField(
        _("Secreto TOTP"),
        max_length=256,
        blank=True,
        help_text=_("Clave secreta para TOTP (encriptada)")
    )
    
    # Campos para seguridad de sesión
    last_ip = models.GenericIPAddressField(
        _("Última IP"),
        null=True,
        blank=True,
        help_text=_("Última dirección IP desde la que se conectó")
    )
    
    last_user_agent = models.TextField(
        _("Último User Agent"),
        blank=True,
        help_text=_("Último navegador/dispositivo usado")
    )
    
    last_location = models.CharField(
        _("Última ubicación"),
        max_length=100,
        blank=True,
        help_text=_("Última ubicación geográfica detectada")
    )
    
    failed_login_attempts = models.IntegerField(
        _("Intentos fallidos"),
        default=0,
        help_text=_("Número de intentos de login fallidos consecutivos")
    )
    
    account_locked_until = models.DateTimeField(
        _("Cuenta bloqueada hasta"),
        null=True,
        blank=True,
        help_text=_("Fecha y hora hasta cuando la cuenta está bloqueada")
    )
    
    # Configuración de contraseña
    password_changed_at = models.DateTimeField(
        _("Contraseña cambiada en"),
        auto_now_add=True,
        null=True,
        blank=True,
        help_text=_("Fecha del último cambio de contraseña")
    )
    
    require_password_change = models.BooleanField(
        _("Requiere cambio de contraseña"),
        default=False,
        help_text=_("Si el usuario debe cambiar su contraseña en el próximo login")
    )
    
    # Redefinimos campos existentes para agregar help_text en español
    is_active = models.BooleanField(
        _("Activo"), 
        default=True,
        help_text=_("Designa si el usuario debe ser tratado como activo. Desmarcar en lugar de eliminar cuentas.")
    )
    
    is_staff = models.BooleanField(
        _("Es staff"), 
        default=False,
        help_text=_("Designa si el usuario puede acceder al sitio de administración.")
    )
    
    date_joined = models.DateTimeField(
        _("Fecha de registro"), 
        auto_now_add=True,
        help_text=_("Fecha y hora cuando el usuario se registró")
    )
    
    updated_at = models.DateTimeField(
        _("Última actualización"), 
        auto_now=True,
        help_text=_("Fecha y hora de la última actualización del perfil")
    )

    # Configuración de autenticación
    USERNAME_FIELD = 'email'  # Usar email para login
    REQUIRED_FIELDS = ['username']  # username sigue siendo requerido por AbstractUser

    class Meta:
        verbose_name = _("Usuario")
        verbose_name_plural = _("Usuarios")
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
            models.Index(fields=['date_joined']),
        ]

    def __str__(self):
        """Representación string del usuario"""
        if self.full_name:
            return f"{self.full_name} ({self.email})"
        return self.email or self.username

    def get_full_name(self):
        """Retorna el nombre completo del usuario"""
        return self.full_name or f"{self.first_name} {self.last_name}".strip() or self.username

    def get_short_name(self):
        """Retorna el nombre corto del usuario"""
        return self.first_name or self.username

    @property
    def display_name(self):
        """Nombre para mostrar en la interfaz"""
        return self.get_full_name()

    @property
    def has_avatar(self):
        """Verifica si el usuario tiene avatar"""
        return bool(self.avatar and hasattr(self.avatar, 'url'))

    def get_avatar_url(self):
        """Retorna la URL del avatar o una por defecto"""
        if self.has_avatar:
            return self.avatar.url
        return '/static/img/default-avatar.png'  # URL de avatar por defecto

    @property
    def is_verified(self):
        """Alias para email_verified"""
        return self.email_verified

    def verify_email(self):
        """Marca el email como verificado"""
        self.email_verified = True
        self.save(update_fields=['email_verified'])

    def unverify_email(self):
        """Marca el email como no verificado"""
        self.email_verified = False
        self.save(update_fields=['email_verified'])
    
    # Métodos para 2FA y seguridad avanzada
    def generate_totp_secret(self):
        """Genera una clave secreta para TOTP (encriptada en DB)"""
        import pyotp
        from .crypto import encrypt_value
        if not self.totp_secret:
            secret = pyotp.random_base32()
            self.totp_secret = encrypt_value(secret)
            self.save()
            return secret
        # If already set, decrypt and return
        from .crypto import decrypt_value
        return decrypt_value(self.totp_secret)

    def get_totp_uri(self):
        """Genera URI para QR code de TOTP"""
        import pyotp
        secret = self.generate_totp_secret()
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=self.email,
            issuer_name="CorteSec"
        )

    def verify_totp(self, token):
        """Verifica token TOTP"""
        import pyotp
        from .crypto import decrypt_value
        if not self.totp_secret:
            return False
        secret = decrypt_value(self.totp_secret)
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)

    def generate_backup_codes(self):
        """Genera códigos de respaldo para 2FA (encriptados en DB)"""
        import secrets
        from .crypto import encrypt_json
        codes = [secrets.token_hex(4).upper() for _ in range(10)]
        self.backup_codes = encrypt_json(codes)
        self.save()
        return codes

    def use_backup_code(self, code):
        """Usa un código de respaldo"""
        from .crypto import decrypt_json, encrypt_json
        codes = decrypt_json(self.backup_codes)
        if code.upper() in codes:
            codes.remove(code.upper())
            self.backup_codes = encrypt_json(codes)
            self.save()
            return True
        return False
    
    def is_account_locked(self):
        """Verifica si la cuenta está bloqueada"""
        from django.utils import timezone
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False
    
    def lock_account(self, minutes=15):
        """Bloquea la cuenta por X minutos"""
        from django.utils import timezone
        from datetime import timedelta
        self.account_locked_until = timezone.now() + timedelta(minutes=minutes)
        self.save()
    
    def unlock_account(self):
        """Desbloquea la cuenta"""
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.save()
    
    def password_needs_change(self):
        """Verifica si la contraseña necesita ser cambiada (lee config de DB)"""
        from django.utils import timezone
        from datetime import timedelta
        if self.require_password_change:
            return True
        # Leer días de expiración desde ConfiguracionSeguridad
        try:
            from configuracion.models import ConfiguracionSeguridad
            config = ConfiguracionSeguridad.get_config()
            max_days = config.dias_expiracion_password or 90
        except Exception:
            max_days = 90
        if self.password_changed_at:
            return timezone.now() > self.password_changed_at + timedelta(days=max_days)
        return False

    # Campos añadidos para soporte Multi-Tenant (coincide con migraciones)
    organization = models.ForeignKey(
        'core.Organizacion',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        verbose_name=_('Organización'),
        help_text=_('Organización a la que pertenece este usuario')
    )

    ORGANIZATION_ROLE_CHOICES = [
        ('OWNER', 'Propietario'),
        ('ADMIN', 'Administrador'),
        ('MANAGER', 'Gerente'),
        ('MEMBER', 'Miembro'),
        ('VIEWER', 'Visualizador'),
    ]

    organization_role = models.CharField(
        _('Rol en organizacion'),
        max_length=20,
        choices=ORGANIZATION_ROLE_CHOICES,
        default='MEMBER',
        help_text=_('Rol del usuario dentro de la organización')
    )

    roles = models.ManyToManyField(
        'roles.Rol',
        through='roles.AsignacionRol',
        through_fields=('usuario', 'rol'),
        related_name='usuarios',
        blank=True,
        verbose_name=_('Roles')
    )

    @property
    def organizacion(self):
        """Alias para organization por compatibilidad"""
        return self.organization

    @organizacion.setter
    def organizacion(self, value):
        self.organization = value

class LoginAttempt(models.Model):
    """Modelo para registrar intentos de login"""
    user_email = models.EmailField(_("Email del usuario"))
    ip_address = models.GenericIPAddressField(_("Dirección IP"))
    user_agent = models.TextField(_("User Agent"))
    location = models.CharField(_("Ubicación"), max_length=100, blank=True)
    success = models.BooleanField(_("Exitoso"))
    reason = models.CharField(_("Razón"), max_length=200, blank=True)
    timestamp = models.DateTimeField(_("Fecha y hora"), auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("Intento de login")
        verbose_name_plural = _("Intentos de login")
    
    def __str__(self):
        status = "SUCCESS" if self.success else "FAILED"
        return f"{status} - {self.user_email} from {self.ip_address}"


class UserSession(models.Model):
    """Modelo para gestionar sesiones de usuario"""
    user = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE,
        verbose_name=_("Usuario")
    )
    session_key = models.CharField(
        _("Clave de sesión"),
        max_length=40,
        unique=True
    )
    ip_address = models.GenericIPAddressField(_("Dirección IP"))
    user_agent = models.TextField(_("User Agent"))
    location = models.CharField(_("Ubicación"), max_length=100, blank=True)
    created_at = models.DateTimeField(_("Creado en"), auto_now_add=True)
    last_activity = models.DateTimeField(_("Última actividad"), auto_now=True)
    is_active = models.BooleanField(_("Activo"), default=True)
    
    class Meta:
        ordering = ['-last_activity']
        verbose_name = _("Sesión de usuario")
        verbose_name_plural = _("Sesiones de usuario")
    
    def __str__(self):
        return f"{self.user.email} - {self.ip_address}"


class PasswordHistory(models.Model):
    """Historial de contraseñas para prevenir reuso."""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='password_history',
        verbose_name=_("Usuario")
    )
    password_hash = models.CharField(
        _("Hash de contraseña"),
        max_length=256,
        help_text=_("Hash de la contraseña anterior")
    )
    created_at = models.DateTimeField(
        _("Creado"),
        auto_now_add=True
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Historial de contraseña")
        verbose_name_plural = _("Historial de contraseñas")

    def __str__(self):
        return f"{self.user.email} - {self.created_at.strftime('%Y-%m-%d')}"

    @classmethod
    def record_password(cls, user):
        """Records the current password hash for history tracking."""
        cls.objects.create(
            user=user,
            password_hash=user.password
        )
        # Prune old entries (keep last 10)
        old_entries = cls.objects.filter(user=user).order_by('-created_at')[10:]
        if old_entries.exists():
            cls.objects.filter(pk__in=old_entries.values_list('pk', flat=True)).delete()
