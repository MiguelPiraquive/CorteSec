from django.db import models

class Departamento(models.Model):
    nombre = models.CharField("Nombre del Departamento", max_length=100, unique=True)
    codigo = models.CharField("Código", max_length=10, unique=True, null=True, blank=True)

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class Municipio(models.Model):
    departamento = models.ForeignKey(
        'Departamento',
        on_delete=models.CASCADE,
        related_name="municipios",
        verbose_name="Departamento",
        null=False,  # Asegura integridad
        blank=False   # Asegura que el campo sea obligatorio en formularios
    )

    codigo = models.CharField(
        "Código",
        max_length=10,
        null=True,
        blank=True
    )
    nombre = models.CharField(
        "Nombre del Municipio",
        max_length=100
    )

    class Meta:
        unique_together = ('departamento', 'nombre')
        verbose_name = "Municipio"
        verbose_name_plural = "Municipios"
        ordering = ["departamento__nombre", "nombre"]

    def __str__(self):
        try:
            if self.departamento_id:
                return f"{self.nombre} ({self.departamento.nombre})"
        except Exception:
            pass
        return self.nombre

