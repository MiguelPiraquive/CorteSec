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
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from django.utils.text import slugify
import uuid
import secrets
from datetime import timedelta


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

    slug = models.SlugField(
        max_length=50,
        unique=True,
        blank=True,
        verbose_name=_("Slug/Subdominio"),
        help_text=_("Identificador único para URL/subdominio (ej: empresa)")
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

    website = models.URLField(
        blank=True,
        verbose_name=_("Sitio web"),
        help_text=_("Sitio web oficial de la organización")
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

    city = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Ciudad"),
        help_text=_("Ciudad donde se ubica la organización")
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Estado/Provincia"),
        help_text=_("Estado o provincia")
    )

    country = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("País"),
        help_text=_("País donde opera la organización")
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Código postal"),
        help_text=_("Código postal o ZIP")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Organización activa"),
        help_text=_("Si está activa, la organización puede operar en el sistema")
    )

    plan = models.ForeignKey(
        'core.Plan',
        on_delete=models.PROTECT,
        to_field='code',
        db_column='plan',
        default='FREE',
        verbose_name=_("Plan de suscripción"),
        help_text=_("Plan actual de la organización")
    )

    max_users = models.PositiveIntegerField(
        default=5,
        verbose_name=_("Máximo de usuarios"),
        help_text=_("Número máximo de usuarios permitidos")
    )

    max_storage_mb = models.PositiveIntegerField(
        default=1024,
        verbose_name=_("Almacenamiento máximo (MB)"),
        help_text=_("Espacio de almacenamiento máximo en MB")
    )

    is_trial = models.BooleanField(
        default=True,
        verbose_name=_("En periodo de prueba"),
        help_text=_("Si la organización está en periodo de prueba")
    )

    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fin del periodo de prueba"),
        help_text=_("Fecha y hora cuando termina el periodo de prueba")
    )
    
    logo = models.ImageField(
        upload_to='organizaciones/logos/',
        blank=True,
        null=True,
        verbose_name=_("Logo"),
        help_text=_("Logo de la organización"),
        validators=[FileExtensionValidator(
            allowed_extensions=['jpg', 'jpeg', 'png', 'webp', 'svg']
        )]
    )

    primary_color = models.CharField(
        max_length=7,
        default='#007bff',
        verbose_name=_("Color primario"),
        help_text=_("Color principal para branding")
    )
    
    configuracion = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración específica"),
        help_text=_("Configuraciones personalizadas en formato JSON")
    )

    settings = JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Settings SaaS"),
        help_text=_("Configuraciones SaaS adicionales en formato JSON")
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
        if not self.slug and self.codigo:
            self.slug = slugify(self.codigo)
    
    def save(self, *args, **kwargs):
        if not self.slug and self.codigo:
            self.slug = slugify(self.codigo)
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def usuarios_count(self):
        """Cuenta usuarios asociados a esta organización"""
        try:
            if hasattr(self, 'users'):
                return self.users.count()
        except Exception:
            pass

        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(organization=self).count()
    
    @property
    def es_principal(self):
        """Verifica si es la organización principal del sistema"""
        return self.configuracion.get('es_principal', False)

    @property
    def is_enterprise(self):
        """Verifica si tiene plan empresarial"""
        return self.plan_id == 'ENTERPRISE'

    @property
    def is_free_plan(self):
        """Verifica si tiene plan gratuito"""
        return self.plan_id == 'FREE'

    @property
    def can_add_users(self):
        """Verifica si se pueden añadir más usuarios"""
        return self.usuarios_count < self.max_users

    @property
    def is_trial_expired(self):
        """Verifica si el periodo de prueba ha expirado"""
        if not self.is_trial or not self.trial_ends_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.trial_ends_at

    @property
    def users_usage_percentage(self):
        """Porcentaje de usuarios usados"""
        if self.max_users == 0:
            return 0
        return round((self.usuarios_count / self.max_users) * 100, 1)


# ==================== PLANES SAAS ====================

class Plan(TimestampedModel):
    """
    Planes SaaS configurables para la plataforma.
    """

    code = models.CharField(
        max_length=30,
        unique=True,
        verbose_name=_('Código'),
        help_text=_('Identificador único del plan (ej: FREE, PRO)')
    )

    name = models.CharField(
        max_length=100,
        verbose_name=_('Nombre'),
        help_text=_('Nombre visible del plan')
    )

    description = models.TextField(
        blank=True,
        verbose_name=_('Descripción'),
        help_text=_('Descripción corta del plan')
    )

    price_monthly_cop = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('Precio mensual (COP)'),
        help_text=_('Valor mensual en COP. Nulo para cotización.')
    )

    price_yearly_cop = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('Precio anual (COP)'),
        help_text=_('Valor anual en COP. Nulo para cotización.')
    )

    max_users = models.PositiveIntegerField(
        default=5,
        verbose_name=_('Máximo de usuarios'),
        help_text=_('Límite de usuarios permitidos')
    )

    max_storage_mb = models.PositiveIntegerField(
        default=1024,
        verbose_name=_('Almacenamiento máximo (MB)'),
        help_text=_('Límite de almacenamiento en MB')
    )

    features = JSONField(
        default=list,
        blank=True,
        verbose_name=_('Características'),
        help_text=_('Lista de características del plan')
    )

    is_public = models.BooleanField(
        default=True,
        verbose_name=_('Visible en landing'),
        help_text=_('Mostrar en la landing pública')
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Activo'),
        help_text=_('Plan activo para asignación')
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Orden'),
        help_text=_('Orden de visualización en la landing')
    )

    class Meta:
        verbose_name = _('Plan')
        verbose_name_plural = _('Planes')
        ordering = ['sort_order', 'price_monthly_cop', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def to_public_dict(self):
        return {
            'id': self.code,
            'name': self.name,
            'price_monthly_cop': self.price_monthly_cop,
            'price_yearly_cop': self.price_yearly_cop,
            'limits': {
                'max_users': self.max_users,
                'max_storage_mb': self.max_storage_mb,
            },
            'features': self.features or [],
        }


class PlanChangeLog(TimestampedModel):
    """Historial de cambios de plan por organización."""

    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='plan_changes',
        verbose_name=_('Organización')
    )

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plan_changes',
        verbose_name=_('Cambiado por')
    )

    previous_plan = models.CharField(
        max_length=30,
        blank=True,
        verbose_name=_('Plan anterior')
    )

    new_plan = models.CharField(
        max_length=30,
        blank=True,
        verbose_name=_('Plan nuevo')
    )

    previous_limits = JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Límites anteriores')
    )

    new_limits = JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Límites nuevos')
    )

    note = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('Nota')
    )

    class Meta:
        verbose_name = _('Cambio de plan')
        verbose_name_plural = _('Cambios de plan')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization.codigo}: {self.previous_plan} → {self.new_plan}"


# ==================== BÚSQUEDA GLOBAL ====================

class SearchHistory(TimestampedModel):
    """Historial de búsquedas globales del usuario."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='search_history',
        verbose_name=_('Usuario')
    )

    query = models.CharField(
        max_length=255,
        verbose_name=_('Búsqueda')
    )

    module = models.CharField(
        max_length=50,
        default='all',
        verbose_name=_('Módulo')
    )

    filters = JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Filtros')
    )

    results_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Cantidad de resultados')
    )

    execution_time_ms = models.FloatField(
        default=0,
        verbose_name=_('Tiempo de ejecución (ms)')
    )

    clicked_result = models.BooleanField(
        default=False,
        verbose_name=_('Resultado clickeado')
    )

    last_clicked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Último click')
    )

    class Meta:
        verbose_name = _('Búsqueda')
        verbose_name_plural = _('Historial de búsquedas')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['query']),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.query}"


class SearchClick(TimestampedModel):
    """Clicks en resultados de búsqueda."""

    history = models.ForeignKey(
        SearchHistory,
        on_delete=models.CASCADE,
        related_name='clicks',
        verbose_name=_('Búsqueda')
    )

    result_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('ID resultado')
    )

    result_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_('Tipo resultado')
    )

    module = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_('Módulo')
    )

    position = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('Posición')
    )

    url = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('URL')
    )

    metadata = JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Metadata')
    )

    class Meta:
        verbose_name = _('Click de búsqueda')
        verbose_name_plural = _('Clicks de búsqueda')
        ordering = ['-created_at']


# ==================== NOTIFICACIONES ====================

class TipoNotificacion(models.TextChoices):
    """Tipos de notificación disponibles"""
    INFO = 'info', _('Información')
    SUCCESS = 'success', _('Éxito')
    WARNING = 'warning', _('Advertencia')
    ERROR = 'error', _('Error')
    SYSTEM = 'system', _('Sistema')


class CategoriaNotificacion(models.TextChoices):
    """Categorías de notificación para agrupación y filtrado"""
    GENERAL = 'general', _('General')
    NOMINA = 'nomina', _('Nómina')
    PRESTAMOS = 'prestamos', _('Préstamos')
    CONTRATOS = 'contratos', _('Contratos')
    EMPLEADOS = 'empleados', _('Empleados')
    CONTABILIDAD = 'contabilidad', _('Contabilidad')
    PROYECTOS = 'proyectos', _('Proyectos')
    SEGURIDAD = 'seguridad', _('Seguridad')
    SISTEMA = 'sistema', _('Sistema')


class PrioridadNotificacion(models.TextChoices):
    """Niveles de prioridad de notificación"""
    BAJA = 'baja', _('Baja')
    NORMAL = 'normal', _('Normal')
    ALTA = 'alta', _('Alta')
    URGENTE = 'urgente', _('Urgente')


class NotificacionManager(models.Manager):
    """Manager para notificaciones"""
    
    def no_leidas(self, usuario):
        """Notificaciones no leídas de un usuario"""
        return self.filter(usuario=usuario, leida=False)
    
    def por_tipo(self, tipo):
        """Notificaciones por tipo"""
        return self.filter(tipo=tipo)
    
    def por_categoria(self, categoria):
        """Notificaciones por categoría"""
        return self.filter(categoria=categoria)
    
    def urgentes(self, usuario):
        """Notificaciones urgentes no leídas"""
        return self.filter(usuario=usuario, leida=False, prioridad='urgente')
    
    def recientes(self, usuario, limite=10):
        """Notificaciones recientes de un usuario"""
        return self.filter(usuario=usuario).order_by('-fecha')[:limite]
    
    def expiradas(self):
        """Notificaciones cuya fecha de expiración ya pasó"""
        return self.filter(expires_at__lt=timezone.now())
    
    def limpiar_expiradas(self):
        """Elimina notificaciones expiradas"""
        return self.expiradas().delete()


class Notificacion(models.Model):
    """
    Sistema de notificaciones para usuarios.
    Modelo unificado con soporte multi-tenant, categorías, prioridades y linking.
    """
    
    organization = models.ForeignKey(
        'Organizacion',
        on_delete=models.CASCADE,
        related_name='notificaciones_org',
        verbose_name=_("Organización"),
        null=True, blank=True,
        help_text=_("Organización a la que pertenece esta notificación")
    )
    
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
    
    categoria = models.CharField(
        max_length=20,
        choices=CategoriaNotificacion.choices,
        default=CategoriaNotificacion.GENERAL,
        verbose_name=_("Categoría"),
        help_text=_("Categoría para agrupación y filtrado")
    )
    
    prioridad = models.CharField(
        max_length=10,
        choices=PrioridadNotificacion.choices,
        default=PrioridadNotificacion.NORMAL,
        verbose_name=_("Prioridad"),
        help_text=_("Nivel de prioridad de la notificación")
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
    
    url_accion = models.CharField(
        max_length=500,
        blank=True,
        default='',
        verbose_name=_("URL de acción"),
        help_text=_("Ruta a la que redirigir cuando se hace clic (ej: /dashboard/nomina)")
    )
    
    texto_accion = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name=_("Texto del botón de acción"),
        help_text=_("Texto del botón de acción (ej: 'Ver nómina')")
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
    
    # Linking: para navegar al objeto que generó la notificación
    origen_tipo = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name=_("Tipo de origen"),
        help_text=_("Modelo que generó la notificación (ej: 'nomina', 'prestamo')")
    )
    
    origen_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name=_("ID de origen"),
        help_text=_("ID del objeto que generó la notificación")
    )
    
    fecha = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación"),
        db_index=True
    )
    
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de expiración"),
        help_text=_("La notificación se eliminará automáticamente después de esta fecha")
    )
    
    @property
    def created_at(self):
        return self.fecha
    
    @property  
    def updated_at(self):
        return self.fecha
    
    @property
    def esta_expirada(self):
        """Verifica si la notificación ha expirado"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    objects = NotificacionManager()
    
    class Meta:
        verbose_name = _("Notificación")
        verbose_name_plural = _("Notificaciones")
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['organization', 'usuario', 'leida']),
            models.Index(fields=['tipo', 'categoria']),
            models.Index(fields=['prioridad']),
            models.Index(fields=['expires_at']),
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


# ══════════════════════════════════════════════════════════════════════════
# DEPRECADO: Este modelo (Notification v2) ya NO se usa.
# El sistema de notificaciones usa el modelo 'Notificacion' (arriba).
# Se mantiene únicamente para no romper el historial de migraciones.
# NO USAR EN CÓDIGO NUEVO.
# ══════════════════════════════════════════════════════════════════════════
class Notification(models.Model):
    """
    [DEPRECADO] Modelo antiguo para notificaciones del sistema.
    Usar core.models.Notificacion + core.notification_engine.NotificationEngine en su lugar.
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


# ==================== INVITACIONES ====================

def _default_invitation_expiry():
    return timezone.now() + timedelta(days=7)


class Invitacion(TimestampedModel):
    """
    Invitaciones para unirse a una organización.
    Admin/Owner crea invitación -> se genera token único -> invitado accede via link.
    """

    ROLE_CHOICES = [
        ('ADMIN', _('Administrador')),
        ('MANAGER', _('Gerente')),
        ('MEMBER', _('Miembro')),
        ('VIEWER', _('Visor')),
    ]

    ESTADO_CHOICES = [
        ('PENDING', _('Pendiente')),
        ('ACCEPTED', _('Aceptada')),
        ('EXPIRED', _('Expirada')),
        ('CANCELLED', _('Cancelada')),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    organization = models.ForeignKey(
        Organizacion,
        on_delete=models.CASCADE,
        related_name='invitaciones',
        verbose_name=_("Organización")
    )

    email = models.EmailField(
        verbose_name=_("Email del invitado"),
        help_text=_("Email al que se envía la invitación")
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='MEMBER',
        verbose_name=_("Nivel de acceso"),
        help_text=_("Nivel de acceso organizacional del usuario")
    )

    rbac_rol_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Rol RBAC"),
        help_text=_("ID del rol del sistema de roles/permisos que se asignará al aceptar")
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name=_("Token de invitación"),
        help_text=_("Token único para validar la invitación")
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitaciones_enviadas',
        verbose_name=_("Invitado por")
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='PENDING',
        verbose_name=_("Estado"),
        help_text=_("Estado actual de la invitación")
    )

    mensaje = models.TextField(
        blank=True,
        verbose_name=_("Mensaje personalizado"),
        help_text=_("Mensaje opcional del invitador")
    )

    expires_at = models.DateTimeField(
        default=_default_invitation_expiry,
        verbose_name=_("Fecha de expiración"),
        help_text=_("Fecha y hora en que expira la invitación")
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de aceptación")
    )

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitaciones_aceptadas',
        verbose_name=_("Aceptada por")
    )

    class Meta:
        verbose_name = _("Invitación")
        verbose_name_plural = _("Invitaciones")
        ordering = ['-created_at']
        unique_together = [('organization', 'email', 'estado')]
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email']),
            models.Index(fields=['organization', 'estado']),
        ]

    def __str__(self):
        return f"{self.email} → {self.organization.nombre} ({self.estado})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.estado == 'PENDING' and not self.is_expired

    def cancel(self):
        self.estado = 'CANCELLED'
        self.save(update_fields=['estado', 'updated_at'])

    def accept(self, user):
        self.estado = 'ACCEPTED'
        self.accepted_at = timezone.now()
        self.accepted_by = user
        self.save(update_fields=['estado', 'accepted_at', 'accepted_by', 'updated_at'])
