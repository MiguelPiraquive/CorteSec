# locations/models.py
"""
MODELOS DE UBICACIONES - APP LOCATIONS
=======================================

Modelos para gestión de departamentos y municipios de Colombia.
Sistema geográfico para proyectos de construcción.
"""

from django.db import models
import uuid

from core.models import Organizacion
from core.mixins import TenantAwareModel


class Departamento(TenantAwareModel):
    """Departamentos de Colombia"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='departamentos',
        null=True,
        blank=True,
        verbose_name="Organización"
    )
    
    # Campos principales del modelo original
    nombre = models.CharField(
        max_length=100, 
        verbose_name="Nombre del Departamento",
        help_text="Nombre completo del departamento"
    )
    codigo = models.CharField(
        max_length=10, 
        blank=True,
        verbose_name="Código",
        help_text="Código DANE del departamento"
    )
    
    # Campos adicionales útiles para construcción
    capital = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Capital"
    )
    region = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Región",
        help_text="Región geográfica (Andina, Caribe, etc.)"
    )
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["nombre"]
        unique_together = [['organization', 'nombre']]
        indexes = [
            models.Index(fields=['codigo']),
            models.Index(fields=['nombre']),
        ]
    
    def __str__(self):
        if self.codigo:
            return f"{self.codigo} - {self.nombre}"
        return self.nombre
    
    @property
    def municipios_count(self):
        """Cuenta los municipios del departamento"""
        return self.municipios.count()


class Municipio(TenantAwareModel):
    """Municipios de Colombia"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='municipios',
        null=True,
        blank=True,
        verbose_name="Organización"
    )
    
    # Relación con departamento (campo principal del modelo original)
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.CASCADE,
        related_name="municipios",
        verbose_name="Departamento"
    )
    
    # Campos principales del modelo original  
    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre del Municipio"
    )
    codigo = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Código",
        help_text="Código DANE del municipio"
    )
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['departamento', 'nombre'], ['organization', 'departamento', 'codigo']]
        verbose_name = "Municipio"
        verbose_name_plural = "Municipios"
        ordering = ["departamento__nombre", "nombre"]
        indexes = [
            models.Index(fields=['departamento', 'nombre']),
            models.Index(fields=['codigo']),
        ]
    
    def __str__(self):
        try:
            if self.departamento_id:
                return f"{self.nombre} ({self.departamento.nombre})"
        except Exception:
            pass
        return self.nombre
    
    @property
    def nombre_completo(self):
        """Nombre completo con departamento"""
        return f"{self.nombre}, {self.departamento.nombre}"
