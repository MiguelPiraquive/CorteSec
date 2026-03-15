# locations/models.py
"""
MODELOS DE UBICACIONES - APP LOCATIONS
=======================================

Modelos para gestión de departamentos y municipios de Colombia.
Sistema geográfico para proyectos de construcción.
"""

from django.db import models
import uuid


class Departamento(models.Model):
    """Departamentos de Colombia — Datos globales compartidos entre todas las organizaciones"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Campos principales
    nombre = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name="Nombre del Departamento",
        help_text="Nombre completo del departamento"
    )
    codigo = models.CharField(
        max_length=10, 
        blank=True,
        verbose_name="Código",
        help_text="Código DANE del departamento"
    )
    
    # Campos adicionales
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


class Municipio(models.Model):
    """Municipios de Colombia — Datos globales compartidos entre todas las organizaciones"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relación con departamento
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.CASCADE,
        related_name="municipios",
        verbose_name="Departamento"
    )
    
    # Campos principales
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
        unique_together = [['departamento', 'nombre']]
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
            return self.nombre
        return self.nombre
    
    @property
    def nombre_completo(self):
        """Nombre completo con departamento"""
        return f"{self.nombre}, {self.departamento.nombre}"
