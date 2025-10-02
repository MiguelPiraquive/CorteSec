"""
Modelos del Dashboard
=====================

Modelos para contratistas, proyectos y pagos del sistema CorteSec.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from django.core.validators import EmailValidator, RegexValidator
from decimal import Decimal
from core.mixins import TenantAwareModel

User = get_user_model()


class Contractor(TenantAwareModel):
    """Modelo para contratistas"""
    
    first_name = models.CharField(
        _("Nombre"), 
        max_length=100,
        help_text=_("Nombre del contratista")
    )
    
    last_name = models.CharField(
        _("Apellido"), 
        max_length=100,
        help_text=_("Apellido del contratista")
    )
    
    email = models.EmailField(
        _("Correo electrónico"), 
        unique=True,
        validators=[EmailValidator()],
        help_text=_("Email único del contratista")
    )
    
    phone_number = models.CharField(
        _("Teléfono"), 
        max_length=15, 
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message=_("El número de teléfono debe tener el formato: '+999999999'. Hasta 15 dígitos permitidos.")
            )
        ],
        help_text=_("Número de teléfono de contacto")
    )
    
    company = models.CharField(
        _("Empresa"), 
        max_length=100, 
        blank=True,
        help_text=_("Empresa a la que pertenece el contratista")
    )
    
    created_at = models.DateTimeField(
        _("Creado el"), 
        auto_now_add=True,
        help_text=_("Fecha de creación del registro")
    )
    
    updated_at = models.DateTimeField(
        _("Actualizado el"), 
        auto_now=True,
        help_text=_("Fecha de última actualización")
    )

    class Meta:
        verbose_name = _("Contratista")
        verbose_name_plural = _("Contratistas")
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        """Retorna el nombre completo"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def active_projects_count(self):
        """Cuenta proyectos activos"""
        return self.projects.filter(end_date__isnull=True).count()
    
    @property
    def total_payments(self):
        """Suma total de pagos recibidos"""
        return self.projects.aggregate(
            total=models.Sum('payments__amount')
        )['total'] or Decimal('0.00')


class Project(TenantAwareModel):
    """Modelo para proyectos"""
    
    name = models.CharField(
        _("Nombre del Proyecto"), 
        max_length=150,
        help_text=_("Nombre descriptivo del proyecto")
    )
    
    description = models.TextField(
        _("Descripción"), 
        blank=True,
        help_text=_("Descripción detallada del proyecto")
    )
    
    contractor = models.ForeignKey(
        Contractor, 
        on_delete=models.CASCADE, 
        related_name="projects", 
        verbose_name=_("Contratista"),
        help_text=_("Contratista asignado al proyecto")
    )
    
    start_date = models.DateField(
        _("Fecha de inicio"),
        help_text=_("Fecha de inicio del proyecto")
    )
    
    end_date = models.DateField(
        _("Fecha de finalización"), 
        null=True, 
        blank=True,
        help_text=_("Fecha de finalización del proyecto (opcional)")
    )
    
    created_at = models.DateTimeField(
        _("Creado el"), 
        auto_now_add=True,
        help_text=_("Fecha de creación del registro")
    )
    
    updated_at = models.DateTimeField(
        _("Actualizado el"), 
        auto_now=True,
        help_text=_("Fecha de última actualización")
    )

    class Meta:
        verbose_name = _("Proyecto")
        verbose_name_plural = _("Proyectos")
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=['contractor']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name
    
    @property
    def is_active(self):
        """Verifica si el proyecto está activo"""
        return self.end_date is None
    
    @property
    def duration_days(self):
        """Calcula la duración en días"""
        if self.end_date:
            return (self.end_date - self.start_date).days
        return None
    
    @property
    def total_payments(self):
        """Suma total de pagos del proyecto"""
        return self.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
    
    @property
    def payments_count(self):
        """Cuenta número de pagos"""
        return self.payments.count()


class Payment(TenantAwareModel):
    """Modelo para pagos"""
    
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name="payments", 
        verbose_name=_("Proyecto"),
        help_text=_("Proyecto al que pertenece el pago")
    )
    
    amount = models.DecimalField(
        _("Monto"), 
        max_digits=10, 
        decimal_places=2,
        help_text=_("Monto del pago")
    )
    
    payment_date = models.DateField(
        _("Fecha de pago"),
        help_text=_("Fecha en que se realizó el pago")
    )
    
    notes = models.TextField(
        _("Notas"), 
        blank=True,
        help_text=_("Notas adicionales sobre el pago")
    )
    
    created_at = models.DateTimeField(
        _("Creado el"), 
        auto_now_add=True,
        help_text=_("Fecha de creación del registro")
    )
    
    updated_at = models.DateTimeField(
        _("Actualizado el"), 
        auto_now=True,
        help_text=_("Fecha de última actualización")
    )

    class Meta:
        verbose_name = _("Pago")
        verbose_name_plural = _("Pagos")
        ordering = ["-payment_date"]
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['payment_date']),
            models.Index(fields=['amount']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Pago de {self.amount} para {self.project.name}"
    
    @property
    def contractor(self):
        """Acceso directo al contratista"""
        return self.project.contractor
    
    def clean(self):
        """Validación personalizada"""
        from django.core.exceptions import ValidationError
        
        if self.amount <= 0:
            raise ValidationError({
                'amount': _('El monto debe ser mayor a cero.')
            })
    
    def save(self, *args, **kwargs):
        """Override save para validaciones"""
        self.full_clean()
        super().save(*args, **kwargs)
