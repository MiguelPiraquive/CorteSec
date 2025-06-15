from django.db import models

class Contractor(models.Model):
    first_name = models.CharField("Nombre", max_length=100)
    last_name = models.CharField("Apellido", max_length=100)
    email = models.EmailField("Correo electrónico", unique=True)
    phone_number = models.CharField("Teléfono", max_length=15, blank=True)
    company = models.CharField("Empresa", max_length=100, blank=True)
    created_at = models.DateTimeField("Creado el", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Contratista"
        verbose_name_plural = "Contratistas"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Project(models.Model):
    name = models.CharField("Nombre del Proyecto", max_length=150)
    description = models.TextField("Descripción", blank=True)
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE, related_name="projects", verbose_name="Contratista")
    start_date = models.DateField("Fecha de inicio")
    end_date = models.DateField("Fecha de finalización", null=True, blank=True)
    created_at = models.DateTimeField("Creado el", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Proyecto"
        verbose_name_plural = "Proyectos"
        ordering = ["-start_date"]

    def __str__(self):
        return self.name

class Payment(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="payments", verbose_name="Proyecto")
    amount = models.DecimalField("Monto", max_digits=10, decimal_places=2)
    payment_date = models.DateField("Fecha de pago")
    notes = models.TextField("Notas", blank=True)
    created_at = models.DateTimeField("Creado el", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado el", auto_now=True)

    class Meta:
        verbose_name = "Pago"
        verbose_name_plural = "Pagos"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"Pago de {self.amount} para {self.project.name}"