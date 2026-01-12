"""
Modelos para Nómina Electrónica DIAN

Este módulo contiene ÚNICAMENTE los modelos relacionados con la nómina electrónica
según la Resolución 000013/2021 de la DIAN.

NO CONFUNDIR CON NÓMINA SIMPLE (payroll.NominaSimple):
- NominaSimple: Gestión interna de RRHH, cálculo de producción, conceptos laborales
- NominaElectronica: Documento tributario electrónico para envío a DIAN

Modelos incluidos:
- NominaElectronica: Documento electrónico (heredado de NominaBase)
- DetalleItemNominaElectronica: Items de producción (formato DIAN)
- DetalleConceptoNominaElectronica: Conceptos laborales (formato DIAN)
- ConfiguracionNominaElectronica: Configuración técnica DIAN
- WebhookConfig: Webhooks para notificaciones
- WebhookLog: Logs de eventos
- NominaAjuste: Notas de ajuste DIAN
- DetalleAjuste: Detalles de ajustes

Author: Sistema CorteSec
Date: Enero 2026
Version: 2.0.0 (Separado de payroll)
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal

from core.mixins import TenantAwareModel
from items.models import Item
from payroll.models.legacy import (
    NominaBase,
    ConceptoLaboral,
    DetalleItemBase,
    DetalleConceptoBase
)


# ══════════════════════════════════════════════════════════════════════════════
# NÓMINA ELECTRÓNICA DIAN
# ══════════════════════════════════════════════════════════════════════════════

class NominaElectronica(NominaBase):
    """
    Nómina Electrónica para envío a DIAN (hereda toda la lógica de NominaBase).
    
    Este modelo representa un documento tributario electrónico (DTE) de nómina
    que debe ser enviado a la DIAN según la Resolución 000013/2021.
    
    Diferencias con NominaSimple:
    - Tiene CUNE (Código Único de Nómina Electrónica)
    - Genera XML UBL 2.1
    - Requiere firma digital XMLDSIG
    - Se envía a API DIAN para validación
    - Estados específicos DIAN (aceptado/rechazado)
    
    Estados del documento:
    - borrador: Creado pero no validado
    - validado: Validado localmente (XML generado)
    - enviado: Enviado a DIAN (esperando respuesta)
    - aceptado: Aceptado por DIAN (documento válido)
    - rechazado: Rechazado por DIAN (errores)
    - anulado: Anulado manualmente
    """
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('validado', 'Validado'),
        ('enviado', 'Enviado a DIAN'),
        ('aceptado', 'Aceptado por DIAN'),
        ('rechazado', 'Rechazado por DIAN'),
        ('anulado', 'Anulado'),
    ]
    
    numero_documento = models.CharField(
        'Número de Documento',
        max_length=50,
        unique=True,
        help_text='Número consecutivo del documento electrónico (NE-2026-000001)'
    )
    
    estado = models.CharField(
        'Estado',
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador'
    )
    
    # Información DIAN
    cune = models.CharField(
        'CUNE',
        max_length=255,
        blank=True,
        help_text='Código Único de Nómina Electrónica generado por la DIAN'
    )
    
    xml_contenido = models.TextField(
        'Contenido XML',
        blank=True,
        help_text='XML UBL 2.1 generado según XSD de la DIAN'
    )
    
    codigo_respuesta_dian = models.CharField(
        'Código Respuesta DIAN',
        max_length=20,
        blank=True
    )
    
    mensaje_respuesta_dian = models.TextField(
        'Mensaje Respuesta DIAN',
        blank=True
    )
    
    fecha_envio_dian = models.DateTimeField(
        'Fecha Envío DIAN',
        null=True,
        blank=True
    )
    
    fecha_respuesta_dian = models.DateTimeField(
        'Fecha Respuesta DIAN',
        null=True,
        blank=True
    )
    
    # Vinculación OPCIONAL con nómina simple
    nomina_simple = models.OneToOneField(
        'payroll.NominaSimple',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nomina_electronica',
        help_text="Nómina simple asociada (opcional, para generar documento electrónico)"
    )
    
    class Meta:
        verbose_name = "Nómina Electrónica (DIAN)"
        verbose_name_plural = "Nóminas Electrónicas (DIAN)"
        ordering = ['-fecha_creacion']
        unique_together = [['organization', 'empleado', 'periodo']]
        indexes = [
            models.Index(fields=['organization', 'numero_documento']),
            models.Index(fields=['cune']),
            models.Index(fields=['estado']),
            models.Index(fields=['-fecha_creacion']),
        ]
    
    def __str__(self):
        return f"{self.numero_documento} - {self.empleado.nombre_completo} - {self.periodo}"
    
    def generar_numero_documento(self):
        """
        Genera el número consecutivo de documento electrónico.
        
        Formato: NE-YYYY-NNNNNN
        Ejemplo: NE-2026-000001
        """
        if not self.numero_documento:
            from datetime import datetime
            año = datetime.now().year
            ultimo = NominaElectronica.objects.filter(
                organization=self.organization,
                numero_documento__startswith=f"NE-{año}"
            ).count()
            self.numero_documento = f"NE-{año}-{ultimo + 1:06d}"
    
    def save(self, *args, **kwargs):
        """Genera número automáticamente si no existe"""
        if not self.numero_documento:
            self.generar_numero_documento()
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES DE NÓMINA ELECTRÓNICA
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaElectronica(DetalleItemBase, TenantAwareModel):
    """
    Items de trabajo para Nómina Electrónica.
    
    Representa los items de producción que deben aparecer en el XML
    enviado a la DIAN.
    """
    
    nomina = models.ForeignKey(
        NominaElectronica,
        on_delete=models.CASCADE,
        related_name='detalles_items',
        verbose_name='Nómina'
    )
    
    codigo_dian = models.CharField(
        'Código DIAN',
        max_length=10,
        blank=True,
        help_text='Código DIAN del item si aplica'
    )
    
    class Meta:
        verbose_name = "Detalle Item Nómina Electrónica"
        verbose_name_plural = "Detalles Items Nómina Electrónica"
        ordering = ['item__nombre']
        indexes = [
            models.Index(fields=['nomina', 'item']),
        ]


class DetalleConceptoNominaElectronica(DetalleConceptoBase, TenantAwareModel):
    """
    Conceptos laborales para Nómina Electrónica.
    
    Incluye código DIAN para el XML según catálogos oficiales:
    - Devengados: SAL (Salario), AUX (Auxilios), BNF (Bonificaciones)
    - Deducciones: APO (Aportes), DED (Deducciones)
    """
    
    nomina = models.ForeignKey(
        NominaElectronica,
        on_delete=models.CASCADE,
        related_name='detalles_conceptos',
        verbose_name='Nómina'
    )
    
    codigo_dian = models.CharField(
        'Código DIAN',
        max_length=10,
        blank=True,
        help_text="Código DIAN automático del concepto o personalizado"
    )
    
    class Meta:
        verbose_name = "Detalle Concepto Nómina Electrónica"
        verbose_name_plural = "Detalles Conceptos Nómina Electrónica"
        ordering = ['concepto__tipo_concepto', 'concepto__orden']
        unique_together = [['nomina', 'concepto']]
        indexes = [
            models.Index(fields=['nomina', 'concepto']),
        ]
    
    def save(self, *args, **kwargs):
        """Auto-asigna codigo_dian del concepto si no está definido"""
        if not self.codigo_dian and self.concepto.codigo_dian:
            self.codigo_dian = self.concepto.codigo_dian
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validar que el concepto sea activo"""
        if self.concepto and not self.concepto.activo:
            raise ValidationError(f"El concepto '{self.concepto.nombre}' no está activo.")


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DIAN
# ══════════════════════════════════════════════════════════════════════════════

class ConfiguracionNominaElectronica(TenantAwareModel):
    """
    Configuración técnica para generación de nómina electrónica según DIAN.
    
    Contiene todos los parámetros necesarios para:
    - Generación de XML UBL 2.1
    - Firma digital XMLDSIG
    - Envío a API DIAN
    - Numeración autorizada
    """
    
    AMBIENTE_CHOICES = [
        ('pruebas', 'Ambiente de Pruebas'),
        ('produccion', 'Ambiente de Producción'),
    ]
    
    # Configuración activa
    activa = models.BooleanField(
        'Activa',
        default=True,
        help_text='Solo puede haber una configuración activa por organización'
    )
    
    ambiente = models.CharField(
        'Ambiente',
        max_length=20,
        choices=AMBIENTE_CHOICES,
        default='pruebas'
    )
    
    # Datos del empleador
    razon_social = models.CharField('Razón Social', max_length=200)
    nit = models.CharField('NIT', max_length=20)
    dv = models.CharField('Dígito de Verificación', max_length=1)
    direccion = models.CharField('Dirección', max_length=200)
    telefono = models.CharField('Teléfono', max_length=20, blank=True)
    email = models.EmailField('Email')
    
    # Numeración DIAN
    prefijo = models.CharField(
        'Prefijo',
        max_length=10,
        blank=True,
        help_text='Prefijo autorizado por DIAN (opcional)'
    )
    
    resolucion_numero = models.CharField(
        'Número de Resolución',
        max_length=50,
        blank=True,
        help_text='Número de resolución DIAN de numeración'
    )
    
    resolucion_fecha = models.DateField(
        'Fecha de Resolución',
        null=True,
        blank=True
    )
    
    rango_inicio = models.BigIntegerField(
        'Rango Inicio',
        null=True,
        blank=True,
        help_text='Número inicial autorizado'
    )
    
    rango_fin = models.BigIntegerField(
        'Rango Fin',
        null=True,
        blank=True,
        help_text='Número final autorizado'
    )
    
    consecutivo_actual = models.BigIntegerField(
        'Consecutivo Actual',
        default=1,
        help_text='Último número utilizado'
    )
    
    # Certificado digital
    certificado_archivo = models.FileField(
        'Certificado Digital',
        upload_to='certificados_digitales/',
        null=True,
        blank=True,
        help_text='Archivo .p12 o .pfx del certificado digital'
    )
    
    certificado_password = models.CharField(
        'Contraseña del Certificado',
        max_length=200,
        blank=True
    )
    
    # Software
    identificador_software = models.CharField(
        'Identificador de Software',
        max_length=100,
        blank=True,
        help_text='ID del software proveedor autorizado por DIAN'
    )
    
    clave_tecnica = models.CharField(
        'Clave Técnica',
        max_length=100,
        blank=True,
        help_text='Clave técnica del software'
    )
    
    # URLs DIAN
    url_webservice = models.URLField(
        'URL WebService DIAN',
        blank=True,
        help_text='URL del servicio web DIAN'
    )
    
    url_recepcion = models.URLField(
        'URL Recepción DIAN',
        blank=True,
        help_text='URL de recepción de documentos'
    )
    
    # Configuración
    envio_automatico = models.BooleanField(
        'Envío Automático',
        default=False,
        help_text='Enviar automáticamente a DIAN al generar'
    )
    
    notificar_empleado = models.BooleanField(
        'Notificar Empleado',
        default=True,
        help_text='Enviar notificación al empleado'
    )
    
    fecha_creacion = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    fecha_modificacion = models.DateTimeField('Fecha de Modificación', auto_now=True)
    
    class Meta:
        verbose_name = "Configuración Nómina Electrónica"
        verbose_name_plural = "Configuraciones Nómina Electrónica"
        unique_together = [['organization', 'activa']]
        indexes = [
            models.Index(fields=['organization', 'activa']),
        ]
    
    def __str__(self):
        return f"{self.razon_social} - {self.get_ambiente_display()}"
    
    def save(self, *args, **kwargs):
        """Solo puede haber una configuración activa por organización"""
        if self.activa:
            ConfiguracionNominaElectronica.objects.filter(
                organization=self.organization,
                activa=True
            ).exclude(id=self.id).update(activa=False)
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOKS Y NOTIFICACIONES
# ══════════════════════════════════════════════════════════════════════════════

class WebhookConfig(TenantAwareModel):
    """
    Configuración de webhooks para notificaciones de eventos DIAN.
    
    Permite configurar endpoints HTTP que recibirán notificaciones
    cuando ocurran eventos importantes (nómina aceptada, rechazada, etc.)
    """
    
    nombre = models.CharField('Nombre', max_length=100)
    url = models.URLField('URL')
    secret = models.CharField('Secret', max_length=200, blank=True)
    activo = models.BooleanField('Activo', default=True)
    
    eventos = models.JSONField(
        'Eventos',
        default=list,
        help_text="Lista de eventos suscritos (nomina.aceptada, nomina.rechazada, etc.)"
    )
    
    # Configuración de reintentos
    reintentos_maximos = models.IntegerField('Reintentos Máximos', default=3)
    timeout_segundos = models.IntegerField('Timeout (segundos)', default=10)
    
    # Estadísticas
    total_disparos = models.IntegerField('Total Disparos', default=0)
    total_exitosos = models.IntegerField('Total Exitosos', default=0)
    total_fallidos = models.IntegerField('Total Fallidos', default=0)
    ultimo_disparo = models.DateTimeField('Último Disparo', null=True, blank=True)
    ultimo_estado = models.CharField(
        'Último Estado',
        max_length=20,
        blank=True,
        choices=[
            ('exito', 'Éxito'),
            ('error', 'Error'),
            ('timeout', 'Timeout'),
        ]
    )
    
    fecha_creacion = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    fecha_modificacion = models.DateTimeField('Fecha de Modificación', auto_now=True)
    
    class Meta:
        verbose_name = "Webhook"
        verbose_name_plural = "Webhooks"
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['organization', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.url}"
    
    def registrar_disparo(self, exitoso: bool):
        """Registra estadísticas de un disparo"""
        self.total_disparos += 1
        if exitoso:
            self.total_exitosos += 1
            self.ultimo_estado = 'exito'
        else:
            self.total_fallidos += 1
            self.ultimo_estado = 'error'
        self.ultimo_disparo = timezone.now()
        self.save()


class WebhookLog(models.Model):
    """
    Log de disparos de webhooks.
    
    Registra cada intento de envío de webhook para auditoría.
    """
    
    webhook = models.ForeignKey(
        WebhookConfig,
        on_delete=models.CASCADE,
        related_name='logs',
        verbose_name='Webhook'
    )
    
    evento = models.CharField('Evento', max_length=50)
    payload = models.JSONField('Payload')
    codigo_respuesta = models.IntegerField('Código Respuesta', null=True, blank=True)
    respuesta = models.TextField('Respuesta', blank=True)
    exitoso = models.BooleanField('Exitoso', default=False)
    error = models.TextField('Error', blank=True)
    tiempo_respuesta = models.FloatField('Tiempo Respuesta (s)', null=True, blank=True)
    fecha_disparo = models.DateTimeField('Fecha Disparo', auto_now_add=True)
    
    class Meta:
        verbose_name = "Log de Webhook"
        verbose_name_plural = "Logs de Webhooks"
        ordering = ['-fecha_disparo']
        indexes = [
            models.Index(fields=['-fecha_disparo']),
            models.Index(fields=['webhook', '-fecha_disparo']),
        ]
    
    def __str__(self):
        return f"{self.webhook.nombre} - {self.evento} - {self.fecha_disparo}"


# ══════════════════════════════════════════════════════════════════════════════
# NOTAS DE AJUSTE DIAN
# ══════════════════════════════════════════════════════════════════════════════

class NominaAjuste(TenantAwareModel):
    """
    Nota de ajuste a una nómina electrónica previamente enviada a la DIAN.
    
    Casos de uso:
    - Corrección de valores erróneos
    - Adición de conceptos omitidos
    - Reemplazo completo de nómina
    - Eliminación de nómina
    
    Normatividad:
    - Resolución 000013/2021 DIAN: Nómina electrónica
    - Art. 5: Notas de ajuste
    """
    
    # Tipos de ajuste
    TIPO_REEMPLAZAR = 'REEMPLAZAR'
    TIPO_ELIMINAR = 'ELIMINAR'
    TIPO_ADICIONAR = 'ADICIONAR'
    TIPO_CORREGIR = 'CORREGIR'
    
    TIPOS_AJUSTE = [
        (TIPO_REEMPLAZAR, 'Reemplazar - Reemplaza completamente la nómina original'),
        (TIPO_ELIMINAR, 'Eliminar - Anula la nómina original'),
        (TIPO_ADICIONAR, 'Adicionar - Agrega conceptos a la nómina original'),
        (TIPO_CORREGIR, 'Corregir - Corrige valores específicos'),
    ]
    
    # Estados
    ESTADO_BORRADOR = 'borrador'
    ESTADO_GENERADO = 'generado'
    ESTADO_ENVIADO = 'enviado'
    ESTADO_ACEPTADO = 'aceptado'
    ESTADO_RECHAZADO = 'rechazado'
    ESTADO_ERROR = 'error'
    
    ESTADOS = [
        (ESTADO_BORRADOR, 'Borrador'),
        (ESTADO_GENERADO, 'XML Generado'),
        (ESTADO_ENVIADO, 'Enviado a DIAN'),
        (ESTADO_ACEPTADO, 'Aceptado por DIAN'),
        (ESTADO_RECHAZADO, 'Rechazado por DIAN'),
        (ESTADO_ERROR, 'Error en Procesamiento'),
    ]
    
    # Relaciones
    nomina_original = models.ForeignKey(
        NominaElectronica,
        on_delete=models.PROTECT,
        related_name='ajustes',
        verbose_name='Nómina Original'
    )
    
    # Información del ajuste
    tipo_ajuste = models.CharField(
        'Tipo de Ajuste',
        max_length=20,
        choices=TIPOS_AJUSTE
    )
    
    numero_ajuste = models.CharField(
        'Número de Ajuste',
        max_length=50,
        unique=True,
        help_text='Número consecutivo del ajuste (NADJ-2026-00001)'
    )
    
    fecha_ajuste = models.DateField(
        'Fecha de Ajuste',
        default=timezone.now
    )
    
    motivo_ajuste = models.TextField(
        'Motivo del Ajuste',
        help_text='Descripción detallada del motivo del ajuste'
    )
    
    # Datos DIAN
    cune = models.CharField(
        'CUNE',
        max_length=100,
        blank=True,
        null=True,
        help_text='Código Único de Nómina Electrónica (CUNE) del ajuste'
    )
    
    xml_contenido = models.TextField(
        'Contenido XML',
        blank=True,
        null=True,
        help_text='XML UBL 2.1 del ajuste generado'
    )
    
    xml_firmado = models.TextField(
        'XML Firmado',
        blank=True,
        null=True,
        help_text='XML con firma digital XMLDSIG'
    )
    
    # Estado
    estado = models.CharField(
        'Estado',
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_BORRADOR
    )
    
    # Respuesta DIAN
    codigo_respuesta_dian = models.CharField(
        'Código Respuesta DIAN',
        max_length=10,
        blank=True,
        null=True
    )
    
    mensaje_respuesta_dian = models.TextField(
        'Mensaje Respuesta DIAN',
        blank=True,
        null=True
    )
    
    fecha_envio_dian = models.DateTimeField(
        'Fecha Envío DIAN',
        blank=True,
        null=True
    )
    
    fecha_respuesta_dian = models.DateTimeField(
        'Fecha Respuesta DIAN',
        blank=True,
        null=True
    )
    
    # Valores ajustados (si aplica)
    total_devengado_ajustado = models.DecimalField(
        'Total Devengado Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    total_deducido_ajustado = models.DecimalField(
        'Total Deducido Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    neto_ajustado = models.DecimalField(
        'Neto Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(
        'Fecha de Creación',
        auto_now_add=True
    )
    
    fecha_modificacion = models.DateTimeField(
        'Fecha de Modificación',
        auto_now=True
    )
    
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ajustes_nomina_creados',
        verbose_name='Creado Por'
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Notas adicionales internas'
    )
    
    class Meta:
        verbose_name = 'Ajuste de Nómina Electrónica'
        verbose_name_plural = 'Ajustes de Nómina Electrónica'
        ordering = ['-fecha_ajuste', '-numero_ajuste']
        indexes = [
            models.Index(fields=['organization', 'nomina_original']),
            models.Index(fields=['numero_ajuste']),
            models.Index(fields=['cune']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_ajuste']),
        ]
    
    def __str__(self):
        return f"{self.numero_ajuste} - {self.get_tipo_ajuste_display()} - {self.nomina_original.numero_documento}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Validar que la nómina original esté aceptada por DIAN
        if self.nomina_original.estado not in ['aprobado', 'aceptado']:
            raise ValidationError({
                'nomina_original': 'Solo se pueden ajustar nóminas aprobadas/aceptadas por DIAN'
            })
        
        # Validar valores según tipo de ajuste
        if self.tipo_ajuste == self.TIPO_ELIMINAR:
            # Al eliminar, todos los valores deben ser 0
            if any([self.total_devengado_ajustado, self.total_deducido_ajustado, self.neto_ajustado]):
                raise ValidationError({
                    'tipo_ajuste': 'Para ajustes tipo ELIMINAR, todos los valores deben ser cero'
                })
    
    @property
    def diferencia_neto(self):
        """
        Calcula la diferencia entre el neto ajustado y el neto original.
        
        Returns:
            Decimal: Diferencia (positiva o negativa)
        """
        neto_original = self.nomina_original.neto_pagar or Decimal('0.00')
        return self.neto_ajustado - neto_original
    
    def generar_numero_ajuste(self):
        """
        Genera número consecutivo de ajuste.
        
        Returns:
            str: Número de ajuste (NADJ-2026-00001)
        """
        anio_actual = timezone.now().year
        
        # Obtener último ajuste del año
        ultimo = NominaAjuste.objects.filter(
            organization=self.organization,
            fecha_ajuste__year=anio_actual
        ).order_by('-numero_ajuste').first()
        
        if ultimo and ultimo.numero_ajuste:
            try:
                partes = ultimo.numero_ajuste.split('-')
                ultimo_numero = int(partes[-1])
                nuevo_numero = ultimo_numero + 1
            except:
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        return f"NADJ-{anio_actual}-{nuevo_numero:05d}"
    
    def save(self, *args, **kwargs):
        """Genera número automáticamente si no existe"""
        if not self.numero_ajuste:
            self.numero_ajuste = self.generar_numero_ajuste()
        super().save(*args, **kwargs)


class DetalleAjuste(TenantAwareModel):
    """
    Detalle de conceptos ajustados en una nota de ajuste.
    
    Almacena los conceptos laborales que cambian en el ajuste.
    """
    
    ajuste = models.ForeignKey(
        NominaAjuste,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Ajuste'
    )
    
    concepto = models.ForeignKey(
        ConceptoLaboral,
        on_delete=models.PROTECT,
        verbose_name='Concepto Laboral'
    )
    
    # Valores originales (de la nómina original)
    valor_original = models.DecimalField(
        'Valor Original',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Valores ajustados (nuevos valores)
    valor_ajustado = models.DecimalField(
        'Valor Ajustado',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Motivo específico del ajuste de este concepto'
    )
    
    class Meta:
        verbose_name = 'Detalle de Ajuste'
        verbose_name_plural = 'Detalles de Ajuste'
        ordering = ['concepto__codigo']
        indexes = [
            models.Index(fields=['ajuste', 'concepto']),
        ]
        unique_together = [
            ['organization', 'ajuste', 'concepto']
        ]
    
    def __str__(self):
        return f"{self.ajuste.numero_ajuste} - {self.concepto.codigo}"
    
    @property
    def diferencia(self):
        """
        Calcula la diferencia entre valor ajustado y original.
        
        Returns:
            Decimal: Diferencia
        """
        return self.valor_ajustado - self.valor_original
