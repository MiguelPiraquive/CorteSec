from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class ConfiguracionGeneral(models.Model):
    """
    Configuración general del sistema.
    Singleton pattern - solo debe existir un registro.
    """
    
    # Información de la empresa
    nombre_empresa = models.CharField(
        max_length=200,
        verbose_name=_("Nombre de la empresa"),
        help_text=_("Nombre oficial de la empresa")
    )
    
    nit = models.CharField(
        max_length=50,
        verbose_name=_("NIT"),
        help_text=_("Número de identificación tributaria")
    )
    
    direccion = models.TextField(
        verbose_name=_("Dirección"),
        help_text=_("Dirección principal de la empresa")
    )
    
    telefono = models.CharField(
        max_length=50,
        verbose_name=_("Teléfono principal")
    )
    
    email = models.EmailField(
        verbose_name=_("Email principal"),
        help_text=_("Email principal de la empresa")
    )
    
    sitio_web = models.URLField(
        blank=True,
        null=True,
        verbose_name=_("Sitio web")
    )
    
    logo = models.ImageField(
        upload_to='configuracion/logos/',
        blank=True,
        null=True,
        verbose_name=_("Logo de la empresa")
    )
    
    # Configuración de moneda
    moneda = models.CharField(
        max_length=10,
        default='COP',
        verbose_name=_("Moneda"),
        help_text=_("Código de moneda (ej: COP, USD)")
    )
    
    simbolo_moneda = models.CharField(
        max_length=5,
        default='$',
        verbose_name=_("Símbolo de moneda")
    )
    
    # Configuración de fechas y horarios
    zona_horaria = models.CharField(
        max_length=50,
        default='America/Bogota',
        verbose_name=_("Zona horaria"),
        help_text=_("Zona horaria de la empresa")
    )
    
    formato_fecha = models.CharField(
        max_length=20,
        choices=[
            ('%d/%m/%Y', 'DD/MM/YYYY'),
            ('%m/%d/%Y', 'MM/DD/YYYY'),
            ('%Y-%m-%d', 'YYYY-MM-DD'),
        ],
        default='%d/%m/%Y',
        verbose_name=_("Formato de fecha")
    )
    
    # Configuración de nómina
    dia_pago_nomina = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        default=30,
        verbose_name=_("Día de pago de nómina"),
        help_text=_("Día del mes para pago de nómina")
    )
    
    periodo_nomina = models.CharField(
        max_length=20,
        choices=[
            ('mensual', _('Mensual')),
            ('quincenal', _('Quincenal')),
            ('semanal', _('Semanal')),
        ],
        default='mensual',
        verbose_name=_("Período de nómina")
    )
    
    # Configuración contable
    cuenta_efectivo_defecto = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Cuenta de efectivo por defecto"),
        help_text=_("Código de cuenta contable para efectivo")
    )
    
    cuenta_nomina_defecto = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Cuenta de nómina por defecto"),
        help_text=_("Código de cuenta contable para nómina")
    )
    
    # Configuración de seguridad
    sesion_timeout_minutos = models.PositiveIntegerField(
        default=30,
        verbose_name=_("Timeout de sesión (minutos)"),
        help_text=_("Tiempo de inactividad antes de cerrar sesión")
    )
    
    max_intentos_login = models.PositiveIntegerField(
        default=3,
        verbose_name=_("Máximo intentos de login"),
        help_text=_("Máximo intentos fallidos antes de bloquear cuenta")
    )
    
    requiere_cambio_password = models.BooleanField(
        default=True,
        verbose_name=_("Requiere cambio de contraseña"),
        help_text=_("Si los usuarios deben cambiar contraseña periódicamente")
    )
    
    dias_cambio_password = models.PositiveIntegerField(
        default=90,
        verbose_name=_("Días para cambio de contraseña"),
        help_text=_("Cada cuántos días se debe cambiar la contraseña")
    )
    
    # Configuración de correo
    servidor_email = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Servidor de email"),
        help_text=_("Servidor SMTP para envío de correos")
    )
    
    puerto_email = models.PositiveIntegerField(
        default=587,
        verbose_name=_("Puerto de email")
    )
    
    email_usuario = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Usuario de email")
    )
    
    usar_tls = models.BooleanField(
        default=True,
        verbose_name=_("Usar TLS"),
        help_text=_("Usar conexión segura TLS para email")
    )
    
    # Campos de auditoría
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Última modificación")
    )
    
    modificado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        verbose_name=_("Modificado por")
    )

    class Meta:
        verbose_name = _("Configuración General")
        verbose_name_plural = _("Configuración General")

    def __str__(self):
        return f"Configuración - {self.nombre_empresa}"

    def save(self, *args, **kwargs):
        # Implementar singleton pattern
        if not self.pk and ConfiguracionGeneral.objects.exists():
            raise ValueError(_("Solo puede existir una configuración general"))
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Obtiene la configuración general (singleton)"""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'nombre_empresa': 'Mi Empresa',
                'nit': '123456789-0',
                'direccion': 'Dirección de la empresa',
                'telefono': '123-456-7890',
                'email': 'info@miempresa.com',
            }
        )
        return config


class ParametroSistema(models.Model):
    """
    Parámetros específicos del sistema que pueden ser configurados.
    """
    
    TIPO_VALOR_CHOICES = [
        ('string', _('Texto')),
        ('integer', _('Número entero')),
        ('decimal', _('Número decimal')),
        ('boolean', _('Verdadero/Falso')),
        ('date', _('Fecha')),
        ('json', _('JSON')),
    ]
    
    codigo = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Código"),
        help_text=_("Código único del parámetro")
    )
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre"),
        help_text=_("Nombre descriptivo del parámetro")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del parámetro")
    )
    
    tipo_valor = models.CharField(
        max_length=20,
        choices=TIPO_VALOR_CHOICES,
        verbose_name=_("Tipo de valor")
    )
    
    valor = models.TextField(
        verbose_name=_("Valor"),
        help_text=_("Valor del parámetro")
    )
    
    valor_defecto = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Valor por defecto"),
        help_text=_("Valor por defecto del parámetro")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema"),
        help_text=_("Los parámetros del sistema no se pueden eliminar")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Parámetro del Sistema")
        verbose_name_plural = _("Parámetros del Sistema")
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def get_valor_tipado(self):
        """Retorna el valor convertido al tipo correspondiente"""
        if not self.valor:
            return None
        
        try:
            if self.tipo_valor == 'integer':
                return int(self.valor)
            elif self.tipo_valor == 'decimal':
                return Decimal(self.valor)
            elif self.tipo_valor == 'boolean':
                return self.valor.lower() in ['true', '1', 'yes', 'on']
            elif self.tipo_valor == 'date':
                from datetime import datetime
                return datetime.strptime(self.valor, '%Y-%m-%d').date()
            elif self.tipo_valor == 'json':
                import json
                return json.loads(self.valor)
            else:  # string
                return self.valor
        except (ValueError, TypeError):
            return self.valor

    @classmethod
    def get_valor(cls, codigo, defecto=None):
        """Obtiene el valor de un parámetro por su código"""
        try:
            parametro = cls.objects.get(codigo=codigo, activo=True)
            return parametro.get_valor_tipado()
        except cls.DoesNotExist:
            return defecto


class ConfiguracionModulo(models.Model):
    """
    Configuración específica por módulo del sistema.
    """
    
    modulo = models.CharField(
        max_length=100,
        verbose_name=_("Módulo"),
        help_text=_("Nombre del módulo a configurar")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Módulo activo"),
        help_text=_("Si el módulo está activo y disponible")
    )
    
    version = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Versión"),
        help_text=_("Versión del módulo")
    )
    
    configuracion_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración JSON"),
        help_text=_("Configuración específica del módulo en formato JSON")
    )
    
    orden_menu = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden en menú"),
        help_text=_("Orden de aparición en el menú principal")
    )
    
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono del módulo")
    )
    
    color = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Color"),
        help_text=_("Color principal del módulo")
    )
    
    # Campos de auditoría
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Configuración de Módulo")
        verbose_name_plural = _("Configuraciones de Módulo")
        unique_together = ['modulo']
        ordering = ['orden_menu', 'modulo']

    def __str__(self):
        return f"Config {self.modulo}"

    def get_config_valor(self, clave, defecto=None):
        """Obtiene un valor específico de la configuración JSON"""
        return self.configuracion_json.get(clave, defecto)

    def set_config_valor(self, clave, valor):
        """Establece un valor específico en la configuración JSON"""
        self.configuracion_json[clave] = valor
        self.save()


class LogConfiguracion(models.Model):
    """
    Log de cambios en la configuración del sistema.
    """
    
    TIPO_CAMBIO_CHOICES = [
        ('general', _('Configuración General')),
        ('parametro', _('Parámetro')),
        ('modulo', _('Configuración Módulo')),
        ('sistema', _('Sistema')),
    ]
    
    NIVEL_CHOICES = [
        ('info', _('Información')),
        ('warning', _('Advertencia')),
        ('error', _('Error')),
        ('success', _('Éxito')),
    ]
    
    tipo_cambio = models.CharField(
        max_length=20,
        choices=TIPO_CAMBIO_CHOICES,
        verbose_name=_("Tipo de cambio")
    )
    
    nivel = models.CharField(
        max_length=10,
        choices=NIVEL_CHOICES,
        default='info',
        verbose_name=_("Nivel")
    )
    
    item_modificado = models.CharField(
        max_length=200,
        verbose_name=_("Item modificado"),
        help_text=_("Nombre o código del item modificado")
    )
    
    valor_anterior = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Valor anterior")
    )
    
    valor_nuevo = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Valor nuevo")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción del cambio")
    )
    
    # Campos de auditoría
    usuario = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Usuario")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación"),
        null=True,
        blank=True
    )
    
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_("Dirección IP")
    )

    class Meta:
        verbose_name = _("Log de Configuración")
        verbose_name_plural = _("Logs de Configuración")
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.tipo_cambio} - {self.item_modificado} ({self.fecha_creacion})"
