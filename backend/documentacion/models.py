from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import os
from core.mixins import TenantAwareModel

User = get_user_model()


class CategoriaDocumento(TenantAwareModel):
    """
    Categorías para organizar los documentos.
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre de la categoría")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    icono = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Icono"),
        help_text=_("Clase CSS del icono")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden"),
        help_text=_("Orden de visualización")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Activa")
    )

    class Meta:
        verbose_name = _("Categoría de Documento")
        verbose_name_plural = _("Categorías de Documento")
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class Documento(TenantAwareModel):
    """
    Documentos del sistema (manuales, guías, etc.).
    """
    
    TIPO_CHOICES = [
        ('manual', _('Manual')),
        ('guia', _('Guía')),
        ('politica', _('Política')),
        ('procedimiento', _('Procedimiento')),
        ('formato', _('Formato')),
        ('otro', _('Otro')),
    ]
    
    categoria = models.ForeignKey(
        CategoriaDocumento,
        on_delete=models.CASCADE,
        related_name='documentos',
        verbose_name=_("Categoría")
    )
    
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        verbose_name=_("Tipo de documento")
    )
    
    archivo = models.FileField(
        upload_to='documentacion/',
        verbose_name=_("Archivo"),
        help_text=_("Archivo del documento")
    )
    
    version = models.CharField(
        max_length=20,
        default='1.0',
        verbose_name=_("Versión")
    )
    
    tags = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name=_("Etiquetas"),
        help_text=_("Etiquetas separadas por comas para búsqueda")
    )
    
    es_publico = models.BooleanField(
        default=True,
        verbose_name=_("Es público"),
        help_text=_("Si es visible para todos los usuarios")
    )
    
    requiere_descarga = models.BooleanField(
        default=False,
        verbose_name=_("Requiere descarga"),
        help_text=_("Si se debe descargar en lugar de ver en línea")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    # Campos de auditoría
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='documentos_creados',
        verbose_name=_("Creado por")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Documento")
        verbose_name_plural = _("Documentos")
        ordering = ['categoria__orden', 'orden', 'titulo']

    def __str__(self):
        return f"{self.titulo} (v{self.version})"

    @property
    def tamaño_archivo(self):
        """Retorna el tamaño del archivo en formato legible"""
        if self.archivo:
            size = self.archivo.size
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            else:
                return f"{size / (1024 * 1024):.1f} MB"
        return "0 B"

    @property
    def extension_archivo(self):
        """Retorna la extensión del archivo"""
        if self.archivo:
            return os.path.splitext(self.archivo.name)[1].lower()
        return ""


class DescargaDocumento(TenantAwareModel):
    """
    Registro de descargas de documentos.
    """
    
    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='descargas',
        verbose_name=_("Documento")
    )
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='descargas_documentos',
        verbose_name=_("Usuario")
    )
    
    fecha_descarga = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de descarga")
    )
    
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_("Dirección IP")
    )

    class Meta:
        verbose_name = _("Descarga de Documento")
        verbose_name_plural = _("Descargas de Documento")
        ordering = ['-fecha_descarga']

    def __str__(self):
        return f"{self.usuario.username} - {self.documento.titulo}"


class VersionDocumento(TenantAwareModel):
    """
    Historial de versiones de documentos.
    """
    
    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='versiones',
        verbose_name=_("Documento")
    )
    
    version = models.CharField(
        max_length=20,
        verbose_name=_("Versión")
    )
    
    archivo = models.FileField(
        upload_to='documentacion/versiones/',
        verbose_name=_("Archivo de la versión")
    )
    
    notas_version = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Notas de la versión"),
        help_text=_("Cambios realizados en esta versión")
    )
    
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name=_("Creado por")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )

    class Meta:
        verbose_name = _("Versión de Documento")
        verbose_name_plural = _("Versiones de Documento")
        unique_together = ['documento', 'version']
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.documento.titulo} - v{self.version}"
