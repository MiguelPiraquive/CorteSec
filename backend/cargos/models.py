from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from core.mixins import TenantAwareModel


class Cargo(TenantAwareModel):
    """
    Modelo para gestionar la estructura jerárquica de cargos de la empresa.
    """
    
    nombre = models.CharField(
        max_length=150,
        verbose_name=_("Nombre del cargo"),
        help_text=_("Nombre único del cargo")
    )
    
    codigo = models.CharField(
        max_length=20,
        verbose_name=_("Código"),
        help_text=_("Código único del cargo")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del cargo y sus responsabilidades")
    )
    
    # Jerarquía
    cargo_superior = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='cargos_subordinados',
        verbose_name=_("Cargo superior"),
        help_text=_("Cargo del cual depende jerárquicamente")
    )
    
    nivel_jerarquico = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Nivel jerárquico"),
        help_text=_("Nivel en la jerarquía (1=más alto)")
    )
    
    # Configuración de permisos base
    roles_permitidos = models.ManyToManyField(
        'roles.Rol',
        blank=True,
        related_name='cargos_permitidos',
        verbose_name=_("Roles permitidos"),
        help_text=_("Roles que pueden ser asignados a este cargo")
    )
    
    # Estado
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el cargo estará disponible")
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
        verbose_name = _("Cargo")
        verbose_name_plural = _("Cargos")
        ordering = ['nivel_jerarquico', 'nombre']
        unique_together = [
            ('organization', 'nombre'),
            ('organization', 'codigo'),
        ]
        indexes = [
            models.Index(fields=['activo']),
            models.Index(fields=['nivel_jerarquico']),
            models.Index(fields=['codigo']),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def clean(self):
        super().clean()
        
        # Validar que no sea su propio superior
        if self.cargo_superior == self:
            raise ValidationError(_("Un cargo no puede ser superior de sí mismo"))

    def save(self, *args, **kwargs):
        # Calcular nivel jerárquico automáticamente
        if self.cargo_superior:
            self.nivel_jerarquico = self.cargo_superior.nivel_jerarquico + 1
        else:
            self.nivel_jerarquico = 1
        
        super().save(*args, **kwargs)

    @property
    def jerarquia_completa(self):
        """Retorna la jerarquía completa del cargo"""
        if self.cargo_superior:
            return f"{self.cargo_superior.jerarquia_completa} > {self.nombre}"
        return self.nombre

    def get_subordinados_directos(self):
        """Retorna los cargos que reportan directamente a este cargo"""
        return self.cargos_subordinados.filter(activo=True)

    def get_todos_subordinados(self):
        """Retorna todos los cargos subordinados (directos e indirectos)"""
        subordinados = []
        directos = self.get_subordinados_directos()
        
        for cargo in directos:
            subordinados.append(cargo)
            subordinados.extend(cargo.get_todos_subordinados())
        
        return subordinados

    def get_empleados_count(self):
        """Retorna el número de empleados asignados a este cargo"""
        try:
            from nomina.models import Contrato
            # Buscar contratos activos con este cargo (ForeignKey en nomina.Contrato)
            return Contrato.objects.filter(cargo=self, activo=True).count()
        except ImportError:
            return 0

    @property
    def empleados_count(self):
        """Property para acceso directo al conteo de empleados"""
        return self.get_empleados_count()


class HistorialCargo(models.Model):
    """
    Modelo para registrar el historial de cambios en cargos.
    """
    
    empleado = models.ForeignKey(
        'nomina.Empleado',
        on_delete=models.CASCADE,
        related_name='historial_cargos',
        verbose_name=_("Empleado")
    )
    
    cargo_anterior = models.ForeignKey(
        Cargo,
        on_delete=models.PROTECT,
        related_name='historiales_anterior',
        blank=True,
        null=True,
        verbose_name=_("Cargo anterior")
    )
    
    cargo_nuevo = models.ForeignKey(
        Cargo,
        on_delete=models.PROTECT,
        related_name='historiales_nuevo',
        verbose_name=_("Cargo nuevo")
    )
    
    fecha_inicio = models.DateField(
        verbose_name=_("Fecha de inicio"),
        help_text=_("Fecha en que inició en el nuevo cargo")
    )
    
    fecha_fin = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de fin"),
        help_text=_("Fecha en que terminó en el cargo (si aplica)")
    )
    
    salario_asignado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Salario asignado"),
        help_text=_("Salario asignado en este cargo")
    )
    
    motivo_cambio = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Motivo del cambio"),
        help_text=_("Razón del cambio de cargo")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones"),
        help_text=_("Observaciones adicionales")
    )
    
    # Campos de auditoría
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='cambios_cargo_realizados',
        verbose_name=_("Creado por")
    )
    
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de registro")
    )

    class Meta:
        verbose_name = _("Historial de Cargo")
        verbose_name_plural = _("Historiales de Cargo")
        ordering = ['-fecha_inicio', '-fecha_registro']
        indexes = [
            models.Index(fields=['empleado', 'fecha_inicio']),
            models.Index(fields=['cargo_nuevo', 'fecha_inicio']),
        ]

    def __str__(self):
        return f"{self.empleado} - {self.cargo_nuevo} ({self.fecha_inicio})"

    def clean(self):
        super().clean()
        
        if self.fecha_fin and self.fecha_inicio > self.fecha_fin:
            raise ValidationError(
                _("La fecha de inicio no puede ser mayor que la fecha de fin")
            )

    @property
    def esta_activo(self):
        """Verifica si este historial representa el cargo actual"""
        return self.fecha_fin is None

    @property
    def duracion_en_cargo(self):
        """Calcula la duración en el cargo"""
        from datetime import date
        
        fecha_fin = self.fecha_fin or date.today()
        return fecha_fin - self.fecha_inicio
