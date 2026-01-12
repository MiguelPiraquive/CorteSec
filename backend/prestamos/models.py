"""
Modelos de Préstamos - Sistema CorteSec
=======================================

Modelos completos para gestión de préstamos y tipos de préstamos.
Incluye funcionalidades avanzadas como cálculo automático de cuotas,
gestión de estados, auditoría y validaciones empresariales.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.urls import reverse
from decimal import Decimal, InvalidOperation
import uuid
import datetime
import json

from core.models import Organizacion
from core.mixins import TenantAwareModel

User = get_user_model()


class TipoPrestamo(TenantAwareModel):
    """
    Tipos de préstamos disponibles en el sistema.
    Define las características y limitaciones de cada tipo de préstamo.
    """
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        help_text=_("Identificador único del tipo de préstamo")
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='tipos_prestamo',
        help_text=_("Organización a la que pertenece este tipo")
    )
    
    # Información básica
    nombre = models.CharField(
        max_length=100,
        verbose_name=_("Nombre del tipo"),
        help_text=_("Nombre descriptivo del tipo de préstamo")
    )
    
    codigo = models.CharField(
        max_length=20,
        verbose_name=_("Código"),
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9_]{2,20}$',
                message=_("El código debe contener solo letras mayúsculas, números y guiones bajos")
            )
        ],
        help_text=_("Código único del tipo de préstamo")
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del tipo de préstamo")
    )
    
    # Configuración financiera
    monto_minimo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_("Monto mínimo"),
        help_text=_("Monto mínimo permitido para este tipo")
    )
    
    monto_maximo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_("Monto máximo"),
        help_text=_("Monto máximo permitido para este tipo")
    )
    
    tasa_interes_defecto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        verbose_name=_("Tasa de interés por defecto (%)"),
        help_text=_("Tasa de interés anual por defecto")
    )
    
    tasa_interes_minima = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        verbose_name=_("Tasa de interés mínima (%)"),
        help_text=_("Tasa de interés mínima permitida")
    )
    
    tasa_interes_maxima = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        verbose_name=_("Tasa de interés máxima (%)"),
        help_text=_("Tasa de interés máxima permitida")
    )
    
    # Configuración de plazos
    plazo_minimo_meses = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        verbose_name=_("Plazo mínimo (meses)"),
        help_text=_("Plazo mínimo permitido en meses")
    )
    
    plazo_maximo_meses = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        verbose_name=_("Plazo máximo (meses)"),
        help_text=_("Plazo máximo permitido en meses")
    )
    
    # Configuración de requisitos
    requiere_garantia = models.BooleanField(
        default=False,
        verbose_name=_("Requiere garantía"),
        help_text=_("Si este tipo de préstamo requiere garantía")
    )
    
    requiere_aprobacion = models.BooleanField(
        default=True,
        verbose_name=_("Requiere aprobación"),
        help_text=_("Si requiere aprobación de un superior")
    )
    
    permite_prepago = models.BooleanField(
        default=True,
        verbose_name=_("Permite prepago"),
        help_text=_("Si permite pago anticipado sin penalización")
    )
    
    # Configuración avanzada
    configuracion_avanzada = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Configuración avanzada"),
        help_text=_("Configuraciones adicionales en formato JSON")
    )
    
    # Estado y control
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, estará disponible para nuevos préstamos")
    )
    
    orden = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Orden"),
        help_text=_("Orden de presentación en listados")
    )
    
    # Campos de auditoría
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de actualización")
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tipos_prestamo_creados',
        null=True,
        blank=True,
        verbose_name=_("Creado por")
    )
    
    updated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tipos_prestamo_actualizados',
        null=True,
        blank=True,
        verbose_name=_("Actualizado por")
    )

    class Meta:
        verbose_name = _("Tipo de Préstamo")
        verbose_name_plural = _("Tipos de Préstamo")
        ordering = ['orden', 'codigo', 'nombre']
        unique_together = [('organization', 'codigo')]
        indexes = [
            models.Index(fields=['organization', 'activo']),
            models.Index(fields=['codigo']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        # Validar montos
        if self.monto_minimo >= self.monto_maximo:
            raise ValidationError(_("El monto mínimo debe ser menor al monto máximo"))
        
        # Validar plazos
        if self.plazo_minimo_meses >= self.plazo_maximo_meses:
            raise ValidationError(_("El plazo mínimo debe ser menor al plazo máximo"))
        
        # Validar tasas de interés
        if self.tasa_interes_minima > self.tasa_interes_maxima:
            raise ValidationError(_("La tasa mínima debe ser menor o igual a la tasa máxima"))
        
        if not (self.tasa_interes_minima <= self.tasa_interes_defecto <= self.tasa_interes_maxima):
            raise ValidationError(_("La tasa por defecto debe estar entre la mínima y máxima"))
    
    def get_absolute_url(self):
        """URL del tipo de préstamo"""
        return reverse('prestamos:tipo_detail', kwargs={'pk': self.pk})
    
    @property
    def prestamos_activos_count(self):
        """Cuenta préstamos activos de este tipo"""
        return self.prestamos.filter(estado__in=['aprobado', 'desembolsado', 'activo']).count()


class Prestamo(TenantAwareModel):
    """
    Modelo principal para gestionar préstamos a empleados.
    Maneja todo el ciclo de vida desde solicitud hasta liquidación.
    """
    
    ESTADO_CHOICES = [
        ('borrador', _('Borrador')),
        ('solicitado', _('Solicitado')),
        ('en_revision', _('En revisión')),
        ('pendiente', _('Pendiente de aprobación')),
        ('aprobado', _('Aprobado')),
        ('rechazado', _('Rechazado')),
        ('desembolsado', _('Desembolsado')),
        ('activo', _('Activo (en pago)')),
        ('completado', _('Completado')),
        ('cancelado', _('Cancelado')),
        ('en_mora', _('En mora')),
        ('reestructurado', _('Reestructurado')),
    ]
    
    TIPO_GARANTIA_CHOICES = [
        ('ninguna', _('Sin garantía')),
        ('personal', _('Garantía personal')),
        ('hipotecaria', _('Garantía hipotecaria')),
        ('vehicular', _('Garantía vehicular')),
        ('prendaria', _('Garantía prendaria')),
        ('deposito', _('Depósito en garantía')),
        ('codeudor', _('Codeudor')),
        ('otra', _('Otra')),
    ]
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        help_text=_("Identificador único del préstamo")
    )
    
    organization = models.ForeignKey(
        Organizacion, 
        on_delete=models.CASCADE, 
        related_name='prestamos',
        help_text=_("Organización a la que pertenece este préstamo")
    )
    
    # Información básica
    numero_prestamo = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        verbose_name=_("Número de préstamo"),
        help_text=_("Número único del préstamo (se genera automáticamente)")
    )
    
    empleado = models.ForeignKey(
        'nomina.Empleado',
        on_delete=models.PROTECT,
        related_name='prestamos',
        verbose_name=_("Empleado"),
        help_text=_("Empleado que solicita el préstamo")
    )
    
    tipo_prestamo = models.ForeignKey(
        TipoPrestamo,
        on_delete=models.PROTECT,
        related_name='prestamos',
        verbose_name=_("Tipo de préstamo"),
        help_text=_("Tipo de préstamo solicitado")
    )
    
    # Términos financieros
    monto_solicitado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_("Monto solicitado"),
        help_text=_("Monto solicitado por el empleado")
    )
    
    monto_aprobado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_("Monto aprobado"),
        help_text=_("Monto aprobado (puede ser diferente al solicitado)")
    )
    
    tasa_interes = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        verbose_name=_("Tasa de interés (%)"),
        help_text=_("Tasa de interés anual aplicada")
    )
    
    plazo_meses = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        verbose_name=_("Plazo (meses)"),
        help_text=_("Plazo del préstamo en meses")
    )
    
    cuota_mensual = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Cuota mensual"),
        help_text=_("Cuota mensual calculada (se calcula automáticamente)")
    )
    
    # Fechas importantes
    fecha_solicitud = models.DateField(
        default=timezone.now,
        verbose_name=_("Fecha de solicitud"),
        help_text=_("Fecha en que se realizó la solicitud")
    )
    
    fecha_aprobacion = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de aprobación"),
        help_text=_("Fecha en que fue aprobado el préstamo")
    )
    
    fecha_desembolso = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de desembolso"),
        help_text=_("Fecha en que se desembolsó el dinero")
    )
    
    fecha_primer_pago = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha primer pago"),
        help_text=_("Fecha programada para el primer pago")
    )
    
    fecha_ultimo_pago = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha último pago"),
        help_text=_("Fecha programada para el último pago")
    )
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador',
        verbose_name=_("Estado"),
        help_text=_("Estado actual del préstamo")
    )
    
    # Garantías
    tipo_garantia = models.CharField(
        max_length=20,
        choices=TIPO_GARANTIA_CHOICES,
        default='ninguna',
        verbose_name=_("Tipo de garantía"),
        help_text=_("Tipo de garantía ofrecida")
    )
    
    garantia_descripcion = models.TextField(
        blank=True,
        verbose_name=_("Descripción de garantía"),
        help_text=_("Descripción detallada de la garantía ofrecida")
    )
    
    # Observaciones y comentarios
    observaciones = models.TextField(
        blank=True,
        verbose_name=_("Observaciones"),
        help_text=_("Observaciones adicionales sobre el préstamo")
    )
    
    motivo_rechazo = models.TextField(
        blank=True,
        verbose_name=_("Motivo de rechazo"),
        help_text=_("Motivo del rechazo si aplica")
    )
    
    # Campos calculados
    saldo_pendiente = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Saldo pendiente"),
        help_text=_("Saldo pendiente por pagar")
    )
    
    total_pagado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Total pagado"),
        help_text=_("Total pagado hasta la fecha")
    )
    
    total_intereses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Total intereses"),
        help_text=_("Total de intereses calculados")
    )
    
    # Campos de auditoría y control
    solicitado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prestamos_solicitados',
        verbose_name=_("Solicitado por"),
        help_text=_("Usuario que registró la solicitud")
    )
    
    aprobado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prestamos_aprobados',
        blank=True,
        null=True,
        verbose_name=_("Aprobado por"),
        help_text=_("Usuario que aprobó el préstamo")
    )
    
    desembolsado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prestamos_desembolsados',
        blank=True,
        null=True,
        verbose_name=_("Desembolsado por"),
        help_text=_("Usuario que realizó el desembolso")
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de actualización")
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prestamos_creados',
        null=True,
        blank=True,
        verbose_name=_("Creado por")
    )
    
    updated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='prestamos_actualizados',
        null=True,
        blank=True,
        verbose_name=_("Actualizado por")
    )

    class Meta:
        verbose_name = _("Préstamo")
        verbose_name_plural = _("Préstamos")
        ordering = ['-fecha_solicitud', '-numero_prestamo']
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['empleado', 'estado']),
            models.Index(fields=['numero_prestamo']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_solicitud']),
            models.Index(fields=['fecha_aprobacion']),
        ]

    def __str__(self):
        return f"{self.numero_prestamo} - {self.empleado}"
    
    def save(self, *args, **kwargs):
        """Override save para cálculos automáticos"""
        # Generar número de préstamo si no existe
        if not self.numero_prestamo:
            self.numero_prestamo = self.generar_numero_prestamo()
        
        # Calcular cuota mensual si está aprobado
        if self.estado in ['aprobado', 'desembolsado', 'activo'] and self.monto_aprobado and not self.cuota_mensual:
            self.cuota_mensual = self.calcular_cuota_mensual()
        
        # Actualizar saldo pendiente
        if self.estado in ['desembolsado', 'activo']:
            if not self.saldo_pendiente or self.saldo_pendiente == 0:
                self.saldo_pendiente = self.monto_aprobado or self.monto_solicitado
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        # Validar monto según tipo de préstamo
        if self.tipo_prestamo:
            if self.monto_solicitado < self.tipo_prestamo.monto_minimo:
                raise ValidationError(
                    _("El monto solicitado es menor al mínimo permitido para este tipo (${})").format(
                        self.tipo_prestamo.monto_minimo
                    )
                )
            
            if self.monto_solicitado > self.tipo_prestamo.monto_maximo:
                raise ValidationError(
                    _("El monto solicitado excede el máximo permitido para este tipo (${})").format(
                        self.tipo_prestamo.monto_maximo
                    )
                )
            
            # Validar plazo
            if self.plazo_meses < self.tipo_prestamo.plazo_minimo_meses:
                raise ValidationError(
                    _("El plazo es menor al mínimo permitido para este tipo ({} meses)").format(
                        self.tipo_prestamo.plazo_minimo_meses
                    )
                )
            
            if self.plazo_meses > self.tipo_prestamo.plazo_maximo_meses:
                raise ValidationError(
                    _("El plazo excede el máximo permitido para este tipo ({} meses)").format(
                        self.tipo_prestamo.plazo_maximo_meses
                    )
                )
            
            # Validar tasa de interés
            if not (self.tipo_prestamo.tasa_interes_minima <= self.tasa_interes <= self.tipo_prestamo.tasa_interes_maxima):
                raise ValidationError(
                    _("La tasa de interés debe estar entre {}% y {}%").format(
                        self.tipo_prestamo.tasa_interes_minima,
                        self.tipo_prestamo.tasa_interes_maxima
                    )
                )
        
        # Validar fechas
        if self.fecha_aprobacion and self.fecha_aprobacion < self.fecha_solicitud:
            raise ValidationError(_("La fecha de aprobación no puede ser anterior a la solicitud"))
        
        if self.fecha_desembolso and self.fecha_aprobacion and self.fecha_desembolso < self.fecha_aprobacion:
            raise ValidationError(_("La fecha de desembolso no puede ser anterior a la aprobación"))
        
        # Validar monto aprobado
        if self.monto_aprobado and self.monto_aprobado > self.monto_solicitado * Decimal('1.2'):
            raise ValidationError(_("El monto aprobado no puede ser mayor al 120% del solicitado"))
    
    def generar_numero_prestamo(self):
        """Genera un número único de préstamo"""
        year = timezone.now().year
        # Obtener último número del año
        ultimo_prestamo = Prestamo.objects.filter(
            numero_prestamo__startswith=f'PR{year}'
        ).order_by('-numero_prestamo').first()
        
        if ultimo_prestamo:
            try:
                ultimo_numero = int(ultimo_prestamo.numero_prestamo[-4:])
                nuevo_numero = ultimo_numero + 1
            except (ValueError, IndexError):
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        return f'PR{year}{nuevo_numero:04d}'
    
    def calcular_cuota_mensual(self):
        """Calcula la cuota mensual del préstamo"""
        from decimal import Decimal, ROUND_HALF_UP
        
        monto = Decimal(str(self.monto_aprobado or self.monto_solicitado))
        plazo = Decimal(str(self.plazo_meses))
        
        if self.tasa_interes == 0:
            cuota = monto / plazo
        else:
            tasa_anual = Decimal(str(self.tasa_interes))
            tasa_mensual = tasa_anual / Decimal('100') / Decimal('12')
            factor = (Decimal('1') + tasa_mensual) ** int(self.plazo_meses)
            cuota = monto * (tasa_mensual * factor) / (factor - Decimal('1'))
        
        # Redondear a 2 decimales
        return cuota.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calcular_total_con_intereses(self):
        """Calcula el total a pagar con intereses"""
        if self.cuota_mensual:
            return self.cuota_mensual * self.plazo_meses
        return self.calcular_cuota_mensual() * self.plazo_meses
    
    def calcular_porcentaje_pagado(self):
        """Calcula el porcentaje pagado del préstamo"""
        monto_total = self.monto_aprobado or self.monto_solicitado
        if monto_total > 0:
            return (self.total_pagado / monto_total) * 100
        return 0
    
    def esta_vigente(self):
        """Verifica si el préstamo está vigente"""
        return self.estado in ['aprobado', 'desembolsado', 'activo']
    
    def puede_recibir_pagos(self):
        """Verifica si puede recibir pagos"""
        return self.estado in ['desembolsado', 'activo', 'en_mora']
    
    def aprobar(self, usuario, monto_aprobado=None, observaciones=None):
        """Aprueba el préstamo"""
        if self.estado not in ['solicitado', 'en_revision', 'pendiente']:
            raise ValidationError(_("Solo se pueden aprobar préstamos en estado solicitado, en revisión o pendiente"))
        
        self.estado = 'aprobado'
        self.monto_aprobado = monto_aprobado or self.monto_solicitado
        self.fecha_aprobacion = timezone.now().date()
        self.aprobado_por = usuario
        self.cuota_mensual = self.calcular_cuota_mensual()
        
        if observaciones:
            self.observaciones = observaciones
        
        self.save()
    
    def rechazar(self, usuario, motivo):
        """Rechaza el préstamo"""
        if self.estado not in ['solicitado', 'en_revision', 'pendiente']:
            raise ValidationError(_("Solo se pueden rechazar préstamos en estado solicitado, en revisión o pendiente"))
        
        self.estado = 'rechazado'
        self.aprobado_por = usuario
        self.motivo_rechazo = motivo
        self.save()
    
    def desembolsar(self, usuario, fecha_desembolso=None):
        """Registra el desembolso del préstamo"""
        if self.estado != 'aprobado':
            raise ValidationError(_("Solo se pueden desembolsar préstamos aprobados"))
        
        self.estado = 'desembolsado'
        self.fecha_desembolso = fecha_desembolso or timezone.now().date()
        self.desembolsado_por = usuario
        self.saldo_pendiente = self.monto_aprobado
        
        # Calcular fecha del primer pago (un mes después del desembolso)
        from dateutil.relativedelta import relativedelta
        self.fecha_primer_pago = self.fecha_desembolso + relativedelta(months=1)
        
        self.save()
    
    def activar(self):
        """Activa el préstamo para inicio de pagos"""
        if self.estado != 'desembolsado':
            raise ValidationError(_("Solo se pueden activar préstamos desembolsados"))
        
        self.estado = 'activo'
        if not self.fecha_primer_pago:
            # Calcular fecha primer pago (30 días después del desembolso)
            self.fecha_primer_pago = self.fecha_desembolso + datetime.timedelta(days=30)
        self.save()
    
    def get_absolute_url(self):
        """URL del préstamo"""
        return reverse('prestamos:detail', kwargs={'pk': self.pk})
    
    @property
    def monto_final(self):
        """Monto que se usará para el préstamo"""
        return self.monto_aprobado or self.monto_solicitado
    
    @property
    def dias_desde_solicitud(self):
        """Días transcurridos desde la solicitud"""
        return (timezone.now().date() - self.fecha_solicitud).days
    
    @property
    def dias_para_primer_pago(self):
        """Días restantes para el primer pago"""
        if self.fecha_primer_pago:
            return (self.fecha_primer_pago - timezone.now().date()).days
        return None


class PagoPrestamo(TenantAwareModel):
    """
    Modelo para registrar los pagos realizados a los préstamos.
    """
    
    TIPO_PAGO_CHOICES = [
        ('cuota', _('Pago de cuota')),
        ('abono_capital', _('Abono a capital')),
        ('pago_total', _('Pago total')),
        ('prepago', _('Prepago')),
        ('interes', _('Pago de intereses')),
        ('mora', _('Pago de mora')),
    ]
    
    METODO_PAGO_CHOICES = [
        ('efectivo', _('Efectivo')),
        ('transferencia', _('Transferencia bancaria')),
        ('cheque', _('Cheque')),
        ('descuento_nomina', _('Descuento de nómina')),
        ('tarjeta', _('Tarjeta de crédito/débito')),
        ('otro', _('Otro')),
    ]
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    prestamo = models.ForeignKey(
        Prestamo,
        on_delete=models.PROTECT,
        related_name='pagos',
        verbose_name=_("Préstamo")
    )
    
    numero_pago = models.CharField(
        max_length=20,
        verbose_name=_("Número de pago"),
        help_text=_("Número secuencial del pago")
    )
    
    fecha_pago = models.DateField(
        verbose_name=_("Fecha de pago")
    )
    
    tipo_pago = models.CharField(
        max_length=20,
        choices=TIPO_PAGO_CHOICES,
        default='cuota',
        verbose_name=_("Tipo de pago")
    )
    
    metodo_pago = models.CharField(
        max_length=20,
        choices=METODO_PAGO_CHOICES,
        default='efectivo',
        verbose_name=_("Método de pago")
    )
    
    monto_pago = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name=_("Monto del pago")
    )
    
    monto_capital = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Monto aplicado a capital")
    )
    
    monto_interes = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Monto aplicado a intereses")
    )
    
    monto_mora = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Monto aplicado a mora")
    )
    
    saldo_anterior = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Saldo anterior")
    )
    
    saldo_nuevo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Nuevo saldo")
    )
    
    observaciones = models.TextField(
        blank=True,
        verbose_name=_("Observaciones")
    )
    
    comprobante = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Número de comprobante")
    )
    
    registrado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='pagos_prestamos_registrados',
        verbose_name=_("Registrado por")
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de registro")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de actualización")
    )

    class Meta:
        verbose_name = _("Pago de Préstamo")
        verbose_name_plural = _("Pagos de Préstamos")
        ordering = ['-fecha_pago', '-created_at']
        indexes = [
            models.Index(fields=['prestamo', 'fecha_pago']),
            models.Index(fields=['numero_pago']),
            models.Index(fields=['fecha_pago']),
        ]

    def __str__(self):
        return f"{self.numero_pago} - ${self.monto_pago} - {self.prestamo.numero_prestamo}"
    
    def save(self, *args, **kwargs):
        """Override save para actualizar saldo del préstamo"""
        if not self.numero_pago:
            self.numero_pago = self.generar_numero_pago()
        
        super().save(*args, **kwargs)
        
        # Actualizar saldo del préstamo
        self.prestamo.total_pagado = self.prestamo.pagos.aggregate(
            total=models.Sum('monto_pago')
        )['total'] or Decimal('0.00')
        
        self.prestamo.saldo_pendiente = (
            self.prestamo.monto_final - self.prestamo.total_pagado
        )
        
        # Cambiar estado si está completamente pagado
        if self.prestamo.saldo_pendiente <= Decimal('0.00'):
            self.prestamo.estado = 'completado'
        
        self.prestamo.save()
    
    def generar_numero_pago(self):
        """Genera número secuencial de pago"""
        ultimo_pago = PagoPrestamo.objects.filter(
            prestamo=self.prestamo
        ).order_by('-numero_pago').first()
        
        if ultimo_pago:
            try:
                ultimo_numero = int(ultimo_pago.numero_pago.split('-')[-1])
                nuevo_numero = ultimo_numero + 1
            except (ValueError, IndexError):
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        return f"{self.prestamo.numero_prestamo}-P{nuevo_numero:03d}"
