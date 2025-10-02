from django.db import models
from django.core.validators import MinValueValidator
from locations.models import Departamento, Municipio
from items.models import Item
from cargos.models import Cargo
from core.mixins import TenantAwareModel


class Empleado(TenantAwareModel):
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]

    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    correo = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, default='M')
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE, null=True, blank=True)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, null=True, blank=True)
    cargo = models.ForeignKey(Cargo, on_delete=models.CASCADE)
    foto = models.ImageField(upload_to='empleados/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ['apellidos', 'nombres']

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"


class Nomina(TenantAwareModel):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    periodo_inicio = models.DateField()
    periodo_fin = models.DateField()
    seguridad = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    prestamos = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    restaurante = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nómina"
        verbose_name_plural = "Nóminas"
        ordering = ['-periodo_fin']
        unique_together = ['empleado', 'periodo_inicio', 'periodo_fin']

    def __str__(self):
        return f"Nómina {self.empleado} - {self.periodo_inicio} a {self.periodo_fin}"

    @property
    def produccion(self):
        """Calcula el total de producción basado en los detalles"""
        return sum(detalle.total for detalle in self.detallenomina_set.all())

    @property
    def total(self):
        """Calcula el total de la nómina"""
        return self.produccion - (self.seguridad + self.prestamos + self.restaurante)


class DetalleNomina(TenantAwareModel):
    nomina = models.ForeignKey(Nomina, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    cantidad = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Detalle de Nómina"
        verbose_name_plural = "Detalles de Nómina"
        unique_together = ['nomina', 'item']

    def __str__(self):
        return f"{self.nomina.empleado} - {self.item.nombre}: {self.cantidad}"

    @property
    def total(self):
        """Calcula el total del detalle"""
        return self.cantidad * self.item.precio_unitario
