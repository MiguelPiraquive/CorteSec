from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.mixins import TenantAwareModel


class ConfiguracionGeneral(TenantAwareModel):
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
        """
        Implementar singleton pattern.
        Solo permite crear un registro si no existe ninguno.
        Las actualizaciones siempre están permitidas.
        """
        # Solo validar en creación (cuando no tiene pk)
        if not self.pk:
            # Verificar si ya existe algún registro
            if ConfiguracionGeneral.objects.exists():
                # Si ya existe, obtener el existente y actualizarlo en lugar de crear uno nuevo
                existing = ConfiguracionGeneral.objects.first()
                self.pk = existing.pk
        
        # Guardar (creación o actualización)
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


class ParametroSistema(TenantAwareModel):
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


class ConfiguracionModulo(TenantAwareModel):
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


class LogConfiguracion(TenantAwareModel):
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


class ConfiguracionSeguridad(TenantAwareModel):
    """
    Configuración específica de seguridad del sistema.
    """
    
    # Configuración de sesiones
    tiempo_sesion = models.PositiveIntegerField(
        default=30,
        verbose_name=_("Tiempo de sesión (minutos)"),
        help_text=_("Tiempo de inactividad antes de cerrar sesión automáticamente")
    )
    
    max_intentos_login = models.PositiveIntegerField(
        default=3,
        verbose_name=_("Máximo intentos de login"),
        help_text=_("Número máximo de intentos fallidos antes de bloquear la cuenta")
    )
    
    tiempo_bloqueo = models.PositiveIntegerField(
        default=15,
        verbose_name=_("Tiempo de bloqueo (minutos)"),
        help_text=_("Tiempo de bloqueo después de exceder los intentos de login")
    )
    
    # Configuración de contraseñas
    longitud_minima_password = models.PositiveIntegerField(
        default=8,
        verbose_name=_("Longitud mínima de contraseña"),
        help_text=_("Número mínimo de caracteres para las contraseñas")
    )
    
    requiere_mayusculas = models.BooleanField(
        default=True,
        verbose_name=_("Requiere mayúsculas"),
        help_text=_("Las contraseñas deben contener al menos una letra mayúscula")
    )
    
    requiere_minusculas = models.BooleanField(
        default=True,
        verbose_name=_("Requiere minúsculas"),
        help_text=_("Las contraseñas deben contener al menos una letra minúscula")
    )
    
    requiere_numeros = models.BooleanField(
        default=True,
        verbose_name=_("Requiere números"),
        help_text=_("Las contraseñas deben contener al menos un número")
    )
    
    requiere_simbolos = models.BooleanField(
        default=True,
        verbose_name=_("Requiere símbolos"),
        help_text=_("Las contraseñas deben contener al menos un símbolo especial")
    )
    
    dias_expiracion_password = models.PositiveIntegerField(
        default=90,
        verbose_name=_("Días de expiración de contraseña"),
        help_text=_("Número de días después de los cuales expira la contraseña")
    )
    
    historial_passwords = models.PositiveIntegerField(
        default=5,
        verbose_name=_("Historial de contraseñas"),
        help_text=_("Número de contraseñas anteriores que no se pueden reutilizar")
    )
    
    # Configuración de auditoría
    habilitar_auditoria = models.BooleanField(
        default=True,
        verbose_name=_("Habilitar auditoría"),
        help_text=_("Registrar todas las acciones de los usuarios")
    )
    
    dias_retencion_logs = models.PositiveIntegerField(
        default=365,
        verbose_name=_("Días de retención de logs"),
        help_text=_("Número de días para mantener los logs de auditoría")
    )
    
    # Configuración de acceso
    permitir_multiples_sesiones = models.BooleanField(
        default=False,
        verbose_name=_("Permitir múltiples sesiones"),
        help_text=_("Permitir que un usuario tenga múltiples sesiones activas")
    )
    
    ips_permitidas = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("IPs permitidas"),
        help_text=_("Lista de IPs permitidas (separadas por comas). Vacío = todas permitidas")
    )
    
    # Configuración de notificaciones de seguridad
    notificar_login_fallido = models.BooleanField(
        default=True,
        verbose_name=_("Notificar login fallido"),
        help_text=_("Enviar notificación cuando hay intentos de login fallidos")
    )
    
    notificar_cambio_password = models.BooleanField(
        default=True,
        verbose_name=_("Notificar cambio de contraseña"),
        help_text=_("Enviar notificación cuando se cambia la contraseña")
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
    
    modificado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Modificado por")
    )

    class Meta:
        verbose_name = _("Configuración de Seguridad")
        verbose_name_plural = _("Configuración de Seguridad")

    def __str__(self):
        return f"Configuración de Seguridad - {self.fecha_modificacion}"

    def save(self, *args, **kwargs):
        # Implementar singleton pattern
        if not self.pk and ConfiguracionSeguridad.objects.exists():
            raise ValueError(_("Solo puede existir una configuración de seguridad"))
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Obtiene la configuración de seguridad (singleton)"""
        config, created = cls.objects.get_or_create(pk=1)
        return config


class ConfiguracionEmail(TenantAwareModel):
    """
    Configuración específica para el envío de emails.
    """
    
    # Configuración del servidor SMTP
    servidor_smtp = models.CharField(
        max_length=255,
        verbose_name=_("Servidor SMTP"),
        help_text=_("Dirección del servidor SMTP")
    )
    
    puerto_smtp = models.PositiveIntegerField(
        default=587,
        verbose_name=_("Puerto SMTP"),
        help_text=_("Puerto del servidor SMTP")
    )
    
    usuario_smtp = models.CharField(
        max_length=255,
        verbose_name=_("Usuario SMTP"),
        help_text=_("Usuario para autenticación SMTP")
    )
    
    password_smtp = models.CharField(
        max_length=255,
        verbose_name=_("Contraseña SMTP"),
        help_text=_("Contraseña para autenticación SMTP")
    )
    
    usar_tls = models.BooleanField(
        default=True,
        verbose_name=_("Usar TLS"),
        help_text=_("Usar conexión segura TLS")
    )
    
    usar_ssl = models.BooleanField(
        default=False,
        verbose_name=_("Usar SSL"),
        help_text=_("Usar conexión segura SSL")
    )
    
    # Configuración de remitente
    email_remitente = models.EmailField(
        verbose_name=_("Email remitente"),
        help_text=_("Dirección de email que aparecerá como remitente")
    )
    
    nombre_remitente = models.CharField(
        max_length=255,
        verbose_name=_("Nombre remitente"),
        help_text=_("Nombre que aparecerá como remitente")
    )
    
    email_respuesta = models.EmailField(
        blank=True,
        null=True,
        verbose_name=_("Email de respuesta"),
        help_text=_("Email para respuestas (opcional)")
    )
    
    # Configuración de plantillas
    plantilla_header = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Header de plantilla"),
        help_text=_("HTML que se incluirá en el header de todos los emails")
    )
    
    plantilla_footer = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Footer de plantilla"),
        help_text=_("HTML que se incluirá en el footer de todos los emails")
    )
    
    # Configuración de límites
    limite_emails_hora = models.PositiveIntegerField(
        default=100,
        verbose_name=_("Límite de emails por hora"),
        help_text=_("Número máximo de emails que se pueden enviar por hora")
    )
    
    limite_emails_dia = models.PositiveIntegerField(
        default=1000,
        verbose_name=_("Límite de emails por día"),
        help_text=_("Número máximo de emails que se pueden enviar por día")
    )
    
    # Configuración de notificaciones
    notificar_error_envio = models.BooleanField(
        default=True,
        verbose_name=_("Notificar errores de envío"),
        help_text=_("Enviar notificación cuando falla el envío de un email")
    )
    
    email_administrador = models.EmailField(
        blank=True,
        null=True,
        verbose_name=_("Email administrador"),
        help_text=_("Email del administrador para notificaciones")
    )
    
    # Estado del servicio
    servicio_activo = models.BooleanField(
        default=True,
        verbose_name=_("Servicio activo"),
        help_text=_("Si el servicio de email está activo")
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
    
    modificado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name=_("Modificado por")
    )

    class Meta:
        verbose_name = _("Configuración de Email")
        verbose_name_plural = _("Configuración de Email")

    def __str__(self):
        return f"Config Email - {self.email_remitente}"

    def save(self, *args, **kwargs):
        # Implementar singleton pattern
        if not self.pk and ConfiguracionEmail.objects.exists():
            raise ValueError(_("Solo puede existir una configuración de email"))
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Obtiene la configuración de email (singleton)"""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'servidor_smtp': 'smtp.gmail.com',
                'puerto_smtp': 587,
                'usuario_smtp': '',
                'password_smtp': '',
                'email_remitente': 'noreply@empresa.com',
                'nombre_remitente': 'Sistema CorteSec',
            }
        )
        return config
