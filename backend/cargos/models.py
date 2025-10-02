from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal
from core.mixins import TenantAwareModel


class Cargo(TenantAwareModel):
    """
    Modelo para gestionar la estructura jerárquica de cargos de la empresa.
    """
    
    nombre = models.CharField(
        max_length=150,
        unique=True,
        verbose_name=_("Nombre del cargo"),
        help_text=_("Nombre único del cargo")
    )
    
    codigo = models.CharField(
        max_length=20,
        unique=True,
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
    
    # Información salarial
    salario_base_minimo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Salario base mínimo"),
        help_text=_("Salario base mínimo para este cargo")
    )
    
    salario_base_maximo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Salario base máximo"),
        help_text=_("Salario base máximo para este cargo")
    )
    
    # Configuración de permisos base
    roles_permitidos = models.ManyToManyField(
        'roles.Rol',
        blank=True,
        related_name='cargos_permitidos',
        verbose_name=_("Roles permitidos"),
        help_text=_("Roles que pueden ser asignados a este cargo")
    )
    
    # Configuración del cargo
    requiere_aprobacion = models.BooleanField(
        default=False,
        verbose_name=_("Requiere aprobación"),
        help_text=_("Si las acciones de este cargo requieren aprobación")
    )
    
    puede_aprobar = models.BooleanField(
        default=False,
        verbose_name=_("Puede aprobar"),
        help_text=_("Si este cargo puede aprobar acciones de otros")
    )
    
    limite_aprobacion = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Límite de aprobación"),
        help_text=_("Monto máximo que puede aprobar")
    )
    
    # Estado
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, el cargo estará disponible")
    )
    
    es_temporal = models.BooleanField(
        default=False,
        verbose_name=_("Es temporal"),
        help_text=_("Si es un cargo temporal")
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
        
        # Validar salarios
        if (self.salario_base_maximo and 
            self.salario_base_minimo > self.salario_base_maximo):
            raise ValidationError(
                _("El salario mínimo no puede ser mayor que el máximo")
            )
        
        # Validar límite de aprobación
        if self.puede_aprobar and not self.limite_aprobacion:
            raise ValidationError(
                _("Debe especificar un límite de aprobación si puede aprobar")
            )

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

    def puede_gestionar_cargo(self, otro_cargo):
        """Verifica si este cargo puede gestionar otro cargo"""
        if not self.puede_aprobar:
            return False
        
        # Un cargo puede gestionar cargos de nivel inferior
        return self.nivel_jerarquico < otro_cargo.nivel_jerarquico

    def esta_en_rango_salarial(self, salario):
        """Verifica si un salario está en el rango permitido para el cargo"""
        if salario < self.salario_base_minimo:
            return False
        
        if self.salario_base_maximo and salario > self.salario_base_maximo:
            return False
        
        return True

    def get_empleados_count(self):
        """Retorna el número de empleados asignados a este cargo"""
        try:
            from payroll.models import Empleado, Cargo as PayrollCargo
            # Buscar el cargo equivalente en payroll por nombre
            payroll_cargo = PayrollCargo.objects.filter(nombre=self.nombre).first()
            if payroll_cargo:
                return Empleado.objects.filter(cargo=payroll_cargo).count()
            return 0
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
        'payroll.Empleado',
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
        
        # Validar que el salario esté en el rango del cargo
        if not self.cargo_nuevo.esta_en_rango_salarial(self.salario_asignado):
            raise ValidationError(
                _("El salario asignado no está en el rango permitido para este cargo")
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
