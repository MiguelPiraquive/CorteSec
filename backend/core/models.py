"""
Modelos Core del Sistema CorteSec
=================================

Modelos compartidos y fundamentales para todo el sistema:
- Organizaciones (Multi-tenant)
- Notificaciones del sistema
- Auditoría centralizada
- Configuraciones globales

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.db.models import JSONField
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid


# ==================== MIXINS Y CLASES BASE ====================

class TimestampedModel(models.Model):
    """Mixin para campos de fecha comunes"""
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación"),
        db_index=True
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación"),
        db_index=True
    )
    
    class Meta:
        abstract = True


class AuditedModel(TimestampedModel):
    """Mixin para campos de auditoría completos"""
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_created",
        null=True,
        blank=True,
        verbose_name=_("Creado por")
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_updated",
        null=True,
        blank=True,
        verbose_name=_("Actualizado por")
    )
    
    class Meta:
        abstract = True


# ==================== ORGANIZACIONES ====================

class OrganizacionManager(models.Manager):
    """Manager personalizado para organizaciones"""
    
    def activas(self):
        """Retorna solo organizaciones activas"""
        return self.filter(activa=True)
    
    def por_codigo(self, codigo):
        """Busca organización por código"""
        return self.filter(codigo=codigo).first()


class Organizacion(AuditedModel):
    """
    Modelo para soporte multi-tenant.
    Permite que el sistema maneje múltiples organizaciones.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    nombre = models.CharField(
        max_length=200,
        unique=True,
        verbose_name=_("Nombre de la organización"),
        help_text=_("Nombre completo de la organización")
    )
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Código único"),
        help_text=_("Código identificador único de la organización")
    )
    
    razon_social = models.CharField(
        max_length=250,
        blank=True,
        verbose_name=_("Razón social"),
        help_text=_("Razón social legal de la organización")
    )
    
    nit = models.CharField(
        max_length=20,
        blank=True,
        unique=True,
        null=True,
        verbose_name=_("NIT"),
        help_text=_("Número de identificación tributaria")
    )
    
    email = models.EmailField(
        blank=True,
        verbose_name=_("Email principal"),
        help_text=_("Email de contacto principal")
    )
    
    telefono = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Teléfono"),
        help_text=_("Teléfono de contacto principal")
    )
    
    direccion = models.TextField(
        blank=True,
        verbose_name=_("Dirección"),
        help_text=_("Dirección física de la organización")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Organización activa"),
        help_text=_("Si está activa, la organización puede operar en el sistema")
    )
    
    logo = models.ImageField(
        upload_to='organizaciones/logos/',
        blank=True,
        null=True,
        verbose_name=_("Logo"),
        help_text=_("Logo de la organización")
    )
    
    configuracion = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración específica"),
        help_text=_("Configuraciones personalizadas en formato JSON")
    )
    
    metadata = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadatos"),
        help_text=_("Información adicional en formato JSON")
    )
    
    objects = OrganizacionManager()
    
    class Meta:
        verbose_name = _("Organización")
        verbose_name_plural = _("Organizaciones")
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['codigo']),
            models.Index(fields=['activa']),
        ]

    def __str__(self):
        return self.nombre
    
    def clean(self):
        if self.codigo:
            self.codigo = self.codigo.upper()
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def usuarios_count(self):
        """Cuenta usuarios asociados a esta organización"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return 0  # Placeholder
    
    @property
    def es_principal(self):
        """Verifica si es la organización principal del sistema"""
        return self.configuracion.get('es_principal', False)


# ==================== NOTIFICACIONES ====================

class TipoNotificacion(models.TextChoices):
    """Tipos de notificación disponibles"""
    INFO = 'info', _('Información')
    SUCCESS = 'success', _('Éxito')
    WARNING = 'warning', _('Advertencia')
    ERROR = 'error', _('Error')
    SYSTEM = 'system', _('Sistema')


class NotificacionManager(models.Manager):
    """Manager para notificaciones"""
    
    def no_leidas(self, usuario):
        """Notificaciones no leídas de un usuario"""
        return self.filter(usuario=usuario, leida=False)
    
    def por_tipo(self, tipo):
        """Notificaciones por tipo"""
        return self.filter(tipo=tipo)
    
    def recientes(self, usuario, limite=10):
        """Notificaciones recientes de un usuario"""
        return self.filter(usuario=usuario).order_by('-fecha')[:limite]


class Notificacion(models.Model):
    """
    Sistema de notificaciones para usuarios.
    Maneja notificaciones internas del sistema.
    """
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificaciones',
        verbose_name=_("Usuario"),
        null=True, blank=True
    )
    
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título"),
        help_text=_("Título de la notificación"),
        default="Notificación"
    )
    
    mensaje = models.TextField(
        verbose_name=_("Mensaje"),
        help_text=_("Contenido de la notificación")
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TipoNotificacion.choices,
        default=TipoNotificacion.INFO,
        verbose_name=_("Tipo"),
        help_text=_("Tipo de notificación")
    )
    
    leida = models.BooleanField(
        default=False,
        verbose_name=_("Leída"),
        help_text=_("Si la notificación ha sido leída")
    )
    
    fecha_leida = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de lectura")
    )
    
    url_accion = models.URLField(
        blank=True,
        verbose_name=_("URL de acción"),
        help_text=_("URL a la que redirigir cuando se hace clic")
    )
    
    icono = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono a mostrar")
    )
    
    datos_adicionales = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Datos adicionales"),
        help_text=_("Información adicional en formato JSON")
    )
    
    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación"),
        db_index=True
    )
    
    @property
    def created_at(self):
        return self.fecha
    
    @property  
    def updated_at(self):
        return self.fecha
    
    objects = NotificacionManager()
    
    class Meta:
        verbose_name = _("Notificación")
        verbose_name_plural = _("Notificaciones")
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['usuario', 'leida']),
            models.Index(fields=['tipo']),
            models.Index(fields=['fecha']),
        ]

    def __str__(self):
        return f"{self.usuario.username if self.usuario else 'Sistema'} - {self.titulo}"
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        if not self.leida:
            self.leida = True
            self.fecha_leida = timezone.now()
            self.save(update_fields=['leida', 'fecha_leida'])
    
    def marcar_como_no_leida(self):
        """Marca la notificación como no leída"""
        if self.leida:
            self.leida = False
            self.fecha_leida = None
            self.save(update_fields=['leida', 'fecha_leida'])


# ==================== CONFIGURACIÓN GLOBAL ====================

class ConfiguracionSistema(AuditedModel):
    """
    Configuración global del sistema.
    Permite configurar parámetros generales.
    """
    
    clave = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Clave"),
        help_text=_("Clave identificadora de la configuración")
    )
    
    valor = models.TextField(
        verbose_name=_("Valor"),
        help_text=_("Valor de la configuración")
    )
    
    tipo_dato = models.CharField(
        max_length=20,
        choices=[
            ('string', _('Texto')),
            ('integer', _('Número entero')),
            ('float', _('Número decimal')),
            ('boolean', _('Verdadero/Falso')),
            ('json', _('JSON')),
        ],
        default='string',
        verbose_name=_("Tipo de dato")
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción de para qué sirve esta configuración")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Activa"),
        help_text=_("Si la configuración está activa")
    )
    
    class Meta:
        verbose_name = _("Configuración del Sistema")
        verbose_name_plural = _("Configuraciones del Sistema")
        ordering = ['clave']
    
    def __str__(self):
        return f"{self.clave}: {self.valor[:50]}"
    
    def get_valor_typed(self):
        """Retorna el valor convertido al tipo correcto"""
        if self.tipo_dato == 'integer':
            return int(self.valor)
        elif self.tipo_dato == 'float':
            return float(self.valor)
        elif self.tipo_dato == 'boolean':
            return self.valor.lower() in ('true', '1', 'yes', 'on')
        elif self.tipo_dato == 'json':
            import json
            return json.loads(self.valor)
        return self.valor


# ==================== AUDITORÍA GLOBAL ====================

class LogAuditoria(TimestampedModel):
    """
    Log de auditoría global del sistema.
    Registra todas las acciones importantes.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Usuario")
    )
    
    accion = models.CharField(
        max_length=100,
        verbose_name=_("Acción"),
        help_text=_("Acción realizada")
    )
    
    modelo = models.CharField(
        max_length=100,
        verbose_name=_("Modelo"),
        help_text=_("Modelo afectado")
    )
    
    objeto_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name=_("ID del objeto"),
        help_text=_("ID del objeto afectado")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Dirección IP")
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User Agent")
    )
    
    datos_antes = JSONField(
        null=True,
        blank=True,
        verbose_name=_("Datos antes"),
        help_text=_("Estado del objeto antes del cambio")
    )
    
    datos_despues = JSONField(
        null=True,
        blank=True,
        verbose_name=_("Datos después"),
        help_text=_("Estado del objeto después del cambio")
    )
    
    metadata = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Metadatos adicionales")
    )
    
    class Meta:
        verbose_name = _("Log de Auditoría")
        verbose_name_plural = _("Logs de Auditoría")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['usuario', 'created_at']),
            models.Index(fields=['modelo', 'accion']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        usuario = self.usuario.username if self.usuario else "Sistema"
        return f"{usuario} - {self.accion} - {self.modelo}"


class Notification(models.Model):
    """
    Modelo para notificaciones del sistema
    """
    
    TIPO_CHOICES = [
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('error', 'Error'),
        ('success', 'Éxito'),
    ]
    
    CATEGORIA_CHOICES = [
        ('sistema', 'Sistema'),
        ('payroll', 'Nómina'),
        ('prestamos', 'Préstamos'),
        ('contabilidad', 'Contabilidad'),
        ('dashboard', 'Dashboard'),
        ('usuarios', 'Usuarios'),
        ('seguridad', 'Seguridad'),
        ('general', 'General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'Organizacion', 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    
    # Destinatario (si es específico)
    usuario = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name=_("Usuario")
    )
    
    # Contenido de la notificación
    titulo = models.CharField(max_length=200, verbose_name=_("Título"))
    mensaje = models.TextField(verbose_name=_("Mensaje"))
    
    # Clasificación
    tipo = models.CharField(
        max_length=10,
        choices=TIPO_CHOICES,
        default='info',
        verbose_name=_("Tipo")
    )
    categoria = models.CharField(
        max_length=15,
        choices=CATEGORIA_CHOICES,
        default='general',
        verbose_name=_("Categoría")
    )
    
    # Estado
    is_read = models.BooleanField(default=False, verbose_name=_("Leída"))
    fecha_leida = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de lectura")
    )
    
    # Enlaces y acciones
    url_accion = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("URL de acción")
    )
    texto_accion = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Texto del botón de acción")
    )
    
    # Metadatos
    data = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Datos adicionales")
    )
    
    # Fechas
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Fecha de creación"))
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de expiración")
    )
    
    class Meta:
        verbose_name = _("Notificación")
        verbose_name_plural = _("Notificaciones")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'usuario', 'is_read']),
            models.Index(fields=['tipo', 'categoria']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.organization.nombre}"
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        if not self.is_read:
            self.is_read = True
            self.fecha_leida = timezone.now()
            self.save(update_fields=['is_read', 'fecha_leida'])
    
    @property
    def esta_expirada(self):
        """Verifica si la notificación ha expirado"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @classmethod
    def crear_notificacion(cls, organization, titulo, mensaje, tipo='info', categoria='general', 
                          usuario=None, url_accion='', texto_accion='', data=None):
        """Método helper para crear notificaciones"""
        return cls.objects.create(
            organization=organization,
            usuario=usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            categoria=categoria,
            url_accion=url_accion,
            texto_accion=texto_accion,
            data=data or {}
        )


# Alias para compatibilidad con otros módulos
Organization = Organizacion
