from django.db import models
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from core.mixins import TenantAwareModel

class TipoCantidad(TenantAwareModel):
    """
    Modelo para gestionar unidades de medida del sistema.
    Estas unidades se pueden asignar a ítems salariales y otros conceptos.
    """
    
    codigo = models.CharField(
        max_length=10,
        unique=True,
        validators=[MinLengthValidator(1)],
        verbose_name=_("Código"),
        help_text=_("Código único de la unidad (ej: m2, m3, ml)")
    )
    
    descripcion = models.CharField(
        max_length=100,
        verbose_name=_("Descripción"),
        help_text=_("Descripción completa de la unidad de medida")
    )
    
    simbolo = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name=_("Símbolo"),
        help_text=_("Símbolo de la unidad (ej: m², m³)")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, estará disponible para asignar")
    )
    
    es_sistema = models.BooleanField(
        default=False,
        verbose_name=_("Es del sistema"),
        help_text=_("Las unidades del sistema no se pueden eliminar")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden"),
        help_text=_("Orden de visualización")
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
        verbose_name = _("Tipo de Cantidad")
        verbose_name_plural = _("Tipos de Cantidad")
        ordering = ['orden', 'codigo']
        indexes = [
            models.Index(fields=['activo']),
            models.Index(fields=['codigo']),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.descripcion}"

    def save(self, *args, **kwargs):
        # Convertir código a minúsculas
        self.codigo = self.codigo.lower().strip()
        super().save(*args, **kwargs)

    @property
    def descripcion_completa(self):
        """Descripción completa con símbolo si existe"""
        if self.simbolo:
            return f"{self.descripcion} ({self.simbolo})"
        return self.descripcion

    def puede_eliminarse(self):
        """Verifica si la unidad puede eliminarse"""
        if self.es_sistema:
            return False
        # TODO: Verificar si tiene relaciones con otros modelos
        return True
