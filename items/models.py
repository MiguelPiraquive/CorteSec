from django.db import models

class Item(models.Model):
    TIPO_CANTIDAD_CHOICES = [
    ('m2', 'Metro cuadrado (m²)'),
    ('m3', 'Metro cúbico (m³)'),
    ('ml', 'Metro lineal (ml)'),
    ('global', 'Global'),
]


    name = models.CharField("Nombre", max_length=100)
    description = models.TextField("Descripción", blank=True)
    price = models.DecimalField("Precio Unitario", max_digits=10, decimal_places=2)
    tipo_cantidad = models.CharField(
        "Tipo de cantidad",
        max_length=10,
        choices=TIPO_CANTIDAD_CHOICES,
        default='m2'
    )
    created_at = models.DateTimeField("Creado el", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Ítem"
        verbose_name_plural = "Ítems"
        ordering = ["name"]

    def __str__(self):
        return self.name