# items/models.py
"""
MODELOS DE ITEMS - APP ITEMS
============================

Modelos para gestión de trabajos/servicios de construcción.
Sistema para contratistas y empresas constructoras.
"""

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

from core.models import Organizacion
from core.mixins import TenantAwareModel


class Item(TenantAwareModel):
    """
    Modelo para items de trabajo/servicios de construcción
    
    Representa trabajos, servicios o actividades que se realizan en proyectos de construcción.
    Cada item tiene un tipo de medición específico (m², m³, ml, global) y un precio unitario.
    """
    
    TIPO_CANTIDAD_CHOICES = [
        ('m2', 'Metro cuadrado (m²)'),
        ('m3', 'Metro cúbico (m³)'),
        ('ml', 'Metro lineal (ml)'),
        ('global', 'Global'),
    ]
    
    # Campos principales
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name="Organización"
    )
    
    # Información del trabajo/servicio (campos del modelo original)
    nombre = models.CharField(
        max_length=100, 
        verbose_name="Nombre del Trabajo/Servicio",
        help_text="Ej: Excavación manual, Instalación tubería PVC, Pintura de fachada"
    )
    descripcion = models.TextField(
        blank=True, 
        verbose_name="Descripción",
        help_text="Descripción detallada del trabajo o servicio"
    )
    precio_unitario = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Precio Unitario",
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Precio por unidad de medida (por m², m³, ml o global)"
    )
    tipo_cantidad = models.CharField(
        max_length=10,
        choices=TIPO_CANTIDAD_CHOICES,
        default='m2',
        verbose_name="Tipo de Medición",
        help_text="Unidad de medida para el trabajo"
    )
    
    # Campos adicionales específicos para construcción
    codigo = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Código",
        help_text="Código interno del trabajo (opcional)"
    )
    
    # Configuración
    activo = models.BooleanField(
        default=True, 
        verbose_name="Activo",
        help_text="Si el trabajo/servicio está disponible"
    )
    observaciones = models.TextField(
        blank=True, 
        verbose_name="Observaciones",
        help_text="Notas adicionales sobre el trabajo"
    )
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado el")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado el")
    
    class Meta:
        verbose_name = "Item de Trabajo"
        verbose_name_plural = "Items de Trabajo"
        ordering = ['nombre']
        unique_together = [['organization', 'nombre']]
    
    def __str__(self):
        if self.codigo:
            return f"{self.codigo} - {self.nombre}"
        return self.nombre
    
    @property
    def precio_formateado(self):
        """Retorna el precio formateado con su unidad de medida"""
        unidades = {
            'm2': '/m²',
            'm3': '/m³', 
            'ml': '/ml',
            'global': ' (Global)'
        }
        unidad = unidades.get(self.tipo_cantidad, '')
        return f"${self.precio_unitario:,.2f}{unidad}"
    
    @property
    def descripcion_completa(self):
        """Retorna descripción completa con tipo de medición"""
        if self.descripcion:
            return f"{self.descripcion} - Medición: {self.get_tipo_cantidad_display()}"
        return f"Medición: {self.get_tipo_cantidad_display()}"
