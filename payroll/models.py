from django.db import models
from django.core.validators import MinValueValidator
from items.models import Item
from locations.models import Departamento, Municipio

class Cargo(models.Model):
    nombre = models.CharField("Nombre del Cargo", max_length=100, unique=True)

    class Meta:
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Empleado(models.Model):
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]

    nombres = models.CharField("Nombres", max_length=100)
    apellidos = models.CharField("Apellidos", max_length=100)
    documento = models.CharField("Documento de Identidad", max_length=30, unique=True, blank=True, null=True)
    correo = models.EmailField("Correo electrónico", unique=True)
    telefono = models.CharField("Teléfono", max_length=15, blank=True)
    direccion = models.CharField("Dirección", max_length=255, blank=True)
    fecha_nacimiento = models.DateField("Fecha de nacimiento", blank=True, null=True)
    genero = models.CharField("Género", max_length=1, choices=GENERO_CHOICES, blank=True)
    fecha_contratacion = models.DateField("Fecha de contratación", auto_now_add=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Departamento")
    municipio = models.ForeignKey(Municipio, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Municipio")
    cargo = models.ForeignKey(Cargo, on_delete=models.PROTECT, verbose_name="Cargo")
    foto = models.ImageField("Foto", upload_to="empleados/fotos/", blank=True, null=True)
    creado_el = models.DateTimeField("Creado el", auto_now_add=True)
    actualizado_el = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["apellidos", "nombres"]

    def __str__(self):
       return f"{self.nombres} {self.apellidos} - {self.documento}"

class Nomina(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, verbose_name="Empleado", related_name="nominas")
    periodo_inicio = models.DateField("Inicio del periodo", null=True, blank=True)
    periodo_fin = models.DateField("Fin del periodo", null=True, blank=True)
    seguridad = models.DecimalField("Seguridad", max_digits=10, decimal_places=2, default=50000, validators=[MinValueValidator(0)])
    prestamos = models.DecimalField("Préstamos", max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    restaurante = models.DecimalField("Restaurante", max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    creado_el = models.DateTimeField("Creado el", auto_now_add=True)
    actualizado_el = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Nómina"
        verbose_name_plural = "Nóminas"
        ordering = ["-periodo_fin"]

    @property
    def produccion(self):
        # Suma el total de todos los ítems hechos en este corte
        return sum([detalle.total for detalle in self.detalles.all()])

    @property
    def total(self):
        return self.produccion - self.seguridad - self.prestamos - self.restaurante

    def __str__(self):
        return f"Nómina de {self.empleado} ({self.periodo_inicio} - {self.periodo_fin})"

class DetalleNomina(models.Model):
    nomina = models.ForeignKey(Nomina, on_delete=models.CASCADE, related_name="detalles")
    item = models.ForeignKey(Item, on_delete=models.PROTECT, verbose_name="Ítem")
    cantidad = models.DecimalField("Cantidad", max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    @property
    def total(self):
        return self.cantidad * self.item.price

    def __str__(self):
        return f"{self.cantidad} x {self.item.nombre} para {self.nomina.empleado}"