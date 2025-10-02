"""
Sistema de Reportes Multi-Módulo - CorteSec
===========================================

Sistema de reportes dinámico que permite generar reportes de CUALQUIER módulo
del sistema con filtros personalizables y múltiples formatos de descarga.

Características:
- Reportes de empleados, préstamos, proyectos, nóminas, etc.
- Filtros dinámicos por fechas, estados, departamentos
- Descarga en PDF, Excel, CSV
- Configuración de columnas visibles
- Reportes programados y automáticos

Autor: Sistema CorteSec
Versión: 3.0.0
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.urls import reverse
from django.apps import apps
import uuid
import json
import os

from core.models import Organizacion
from core.mixins import TenantAwareModel

User = get_user_model()


class ModuloReporte(TenantAwareModel):
    """
    Módulos disponibles para generar reportes
    Cada módulo representa una app/modelo del sistema
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='modulos_reporte'
    )
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre del módulo"),
        help_text=_("Ej: Empleados, Préstamos, Proyectos")
    )
    
    codigo = models.CharField(
        max_length=50,
        verbose_name=_("Código del módulo"),
        help_text=_("Ej: empleados, prestamos, proyectos")
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción")
    )
    
    app_name = models.CharField(
        max_length=50,
        verbose_name=_("Nombre de la app Django"),
        help_text=_("Ej: payroll, prestamos, locations")
    )
    
    model_name = models.CharField(
        max_length=50,
        verbose_name=_("Nombre del modelo"),
        help_text=_("Ej: Employee, Prestamo, Location")
    )
    
    icono = models.CharField(
        max_length=50,
        default='fas fa-table',
        verbose_name=_("Icono FontAwesome")
    )
    
    color = models.CharField(
        max_length=20,
        default='primary',
        verbose_name=_("Color del tema")
    )
    
    # Configuración de campos
    campos_disponibles = models.JSONField(
        default=dict,
        verbose_name=_("Campos disponibles para reportes"),
        help_text=_("Diccionario con nombre_campo: {label, tipo, filtrable}")
    )
    
    campos_por_defecto = models.JSONField(
        default=list,
        verbose_name=_("Campos mostrados por defecto")
    )
    
    # Configuración de filtros
    filtros_disponibles = models.JSONField(
        default=dict,
        verbose_name=_("Filtros disponibles"),
        help_text=_("Configuración de filtros dinámicos")
    )
    
    relaciones_disponibles = models.JSONField(
        default=dict,
        verbose_name=_("Relaciones con otros modelos"),
        help_text=_("Para incluir datos de modelos relacionados")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden de presentación")
    )
    
    # Permisos
    requiere_permiso = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Permiso requerido")
    )
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='modulos_reporte_creados'
    )

    class Meta:
        verbose_name = _("Módulo de Reporte")
        verbose_name_plural = _("Módulos de Reporte")
        ordering = ['orden', 'nombre']
        unique_together = [('organization', 'codigo')]
        indexes = [
            models.Index(fields=['organization', 'activo']),
            models.Index(fields=['app_name', 'model_name']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"
    
    def get_model_class(self):
        """Obtiene la clase del modelo Django"""
        try:
            return apps.get_model(self.app_name, self.model_name)
        except:
            return None
    
    def get_queryset_base(self):
        """Obtiene el queryset base filtrado por organización"""
        model_class = self.get_model_class()
        if not model_class:
            return None
        
        # Filtrar por organización si el modelo lo soporta
        if hasattr(model_class, 'organization'):
            return model_class.objects.filter(organizacion=self.organizacion)
        else:
            return model_class.objects.all()


class ReporteGenerado(TenantAwareModel):
    """
    Reportes generados del sistema
    """
    
    FORMATO_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel (.xlsx)'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente')),
        ('procesando', _('Procesando')),
        ('completado', _('Completado')),
        ('error', _('Error')),
        ('expirado', _('Expirado')),
    ]
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='reportes_generados'
    )
    
    modulo = models.ForeignKey(
        ModuloReporte,
        on_delete=models.PROTECT,
        related_name='reportes_generados',
        verbose_name=_("Módulo del reporte")
    )
    
    # Información del reporte
    titulo = models.CharField(
        max_length=200,
        verbose_name=_("Título del reporte")
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción")
    )
    
    formato = models.CharField(
        max_length=10,
        choices=FORMATO_CHOICES,
        verbose_name=_("Formato de descarga")
    )
    
    # Configuración del reporte
    filtros_aplicados = models.JSONField(
        default=dict,
        verbose_name=_("Filtros aplicados"),
        help_text=_("Filtros que se aplicaron para generar el reporte")
    )
    
    columnas_seleccionadas = models.JSONField(
        default=list,
        verbose_name=_("Columnas incluidas"),
        help_text=_("Lista de campos incluidos en el reporte")
    )
    
    ordenamiento = models.JSONField(
        default=list,
        verbose_name=_("Ordenamiento aplicado"),
        help_text=_("Criterios de ordenamiento")
    )
    
    # Fechas del período
    fecha_inicio = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Fecha inicio del período")
    )
    
    fecha_fin = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Fecha fin del período")
    )
    
    # Estado y progreso
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name=_("Estado")
    )
    
    progreso = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name=_("Progreso (%)")
    )
    
    # Archivo generado
    archivo = models.FileField(
        upload_to='reportes/%Y/%m/%d/',
        null=True,
        blank=True,
        verbose_name=_("Archivo del reporte")
    )
    
    nombre_archivo = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Nombre del archivo")
    )
    
    tamaño_archivo = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Tamaño del archivo (bytes)")
    )
    
    # Estadísticas del reporte
    total_registros = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Total de registros incluidos")
    )
    
    tiempo_generacion = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("Tiempo de generación (segundos)")
    )
    
    # Información de error
    mensaje_error = models.TextField(
        blank=True,
        verbose_name=_("Mensaje de error")
    )
    
    # Control de acceso y expiración
    es_publico = models.BooleanField(
        default=False,
        verbose_name=_("Es público")
    )
    
    fecha_expiracion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de expiración")
    )
    
    # Auditoría
    generado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='reportes_generados',
        verbose_name=_("Generado por")
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de generación")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    # Estadísticas de uso
    veces_descargado = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Veces descargado")
    )
    
    ultimo_acceso = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Último acceso")
    )

    class Meta:
        verbose_name = _("Reporte Generado")
        verbose_name_plural = _("Reportes Generados")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['modulo', 'created_at']),
            models.Index(fields=['generado_por', 'created_at']),
            models.Index(fields=['estado', 'created_at']),
        ]

    def __str__(self):
        return f"{self.titulo} ({self.modulo.nombre}) - {self.get_formato_display()}"
    
    def save(self, *args, **kwargs):
        # Auto-generar nombre de archivo si no existe
        if not self.nombre_archivo and self.titulo:
            fecha = timezone.now().strftime('%Y%m%d_%H%M%S')
            extension = self.get_extension_formato()
            self.nombre_archivo = f"{self.titulo}_{fecha}.{extension}"
        
        super().save(*args, **kwargs)
    
    def get_extension_formato(self):
        """Obtiene la extensión según el formato"""
        extensiones = {
            'pdf': 'pdf',
            'excel': 'xlsx',
            'csv': 'csv',
            'json': 'json'
        }
        return extensiones.get(self.formato, 'txt')
    
    def get_absolute_url(self):
        return reverse('reportes:reporte_detalle', kwargs={'pk': self.pk})
    
    def get_download_url(self):
        return reverse('reportes:descargar_reporte', kwargs={'pk': self.pk})
    
    def marcar_completado(self, archivo_path=None, total_registros=0, tiempo=None):
        """Marca el reporte como completado"""
        self.estado = 'completado'
        self.progreso = 100
        self.total_registros = total_registros
        if tiempo:
            self.tiempo_generacion = tiempo
        if archivo_path:
            self.archivo = archivo_path
        self.save()
    
    def marcar_error(self, mensaje):
        """Marca el reporte con error"""
        self.estado = 'error'
        self.mensaje_error = mensaje
        self.save()
    
    def incrementar_descarga(self):
        """Incrementa contador de descargas"""
        self.veces_descargado += 1
        self.ultimo_acceso = timezone.now()
        self.save(update_fields=['veces_descargado', 'ultimo_acceso'])
    
    @property
    def esta_disponible(self):
        """Verifica si está disponible para descarga"""
        return (
            self.estado == 'completado' and 
            self.archivo and 
            (not self.fecha_expiracion or timezone.now() < self.fecha_expiracion)
        )
    
    @property
    def tamaño_legible(self):
        """Retorna el tamaño en formato legible"""
        if not self.tamaño_archivo:
            return "0 B"
        
        size = float(self.tamaño_archivo)
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"


class ConfiguracionReporte(TenantAwareModel):
    """
    Configuraciones guardadas de reportes para reutilizar
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='configuraciones_reporte'
    )
    
    modulo = models.ForeignKey(
        ModuloReporte,
        on_delete=models.CASCADE,
        related_name='configuraciones'
    )
    
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre de la configuración")
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción")
    )
    
    # Configuración guardada
    filtros = models.JSONField(
        default=dict,
        verbose_name=_("Filtros configurados")
    )
    
    columnas = models.JSONField(
        default=list,
        verbose_name=_("Columnas seleccionadas")
    )
    
    ordenamiento = models.JSONField(
        default=list,
        verbose_name=_("Ordenamiento")
    )
    
    formato_preferido = models.CharField(
        max_length=10,
        choices=ReporteGenerado.FORMATO_CHOICES,
        default='excel',
        verbose_name=_("Formato preferido")
    )
    
    # Control
    es_publica = models.BooleanField(
        default=False,
        verbose_name=_("Es pública"),
        help_text=_("Otros usuarios de la organización pueden usarla")
    )
    
    es_favorita = models.BooleanField(
        default=False,
        verbose_name=_("Es favorita")
    )
    
    veces_usada = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Veces usada")
    )
    
    # Auditoría
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='configuraciones_reporte_creadas'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Configuración de Reporte")
        verbose_name_plural = _("Configuraciones de Reporte")
        ordering = ['-es_favorita', '-veces_usada', 'nombre']
        unique_together = [('organization', 'modulo', 'nombre', 'created_by')]

    def __str__(self):
        return f"{self.nombre} ({self.modulo.nombre})"
    
    def incrementar_uso(self):
        """Incrementa el contador de uso"""
        self.veces_usada += 1
        self.save(update_fields=['veces_usada'])


class LogReporte(TenantAwareModel):
    """
    Log de actividades del sistema de reportes
    """
    
    ACCION_CHOICES = [
        ('generar', _('Generar reporte')),
        ('descargar', _('Descargar reporte')),
        ('eliminar', _('Eliminar reporte')),
        ('configurar', _('Guardar configuración')),
        ('error', _('Error')),
    ]
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='logs_reporte'
    )
    
    usuario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='logs_reporte',
        null=True,
        blank=True
    )
    
    accion = models.CharField(
        max_length=20,
        choices=ACCION_CHOICES,
        verbose_name=_("Acción")
    )
    
    modulo = models.ForeignKey(
        ModuloReporte,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    reporte = models.ForeignKey(
        ReporteGenerado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )
    
    descripcion = models.TextField(
        verbose_name=_("Descripción")
    )
    
    detalles = models.JSONField(
        default=dict,
        verbose_name=_("Detalles adicionales")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        verbose_name = _("Log de Reporte")
        verbose_name_plural = _("Logs de Reportes")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['usuario', 'accion']),
        ]

    def __str__(self):
        return f"{self.get_accion_display()} - {self.timestamp}"
