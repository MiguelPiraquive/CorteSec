from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal
import datetime


class TipoPrestamo(models.Model):
    """
    Tipos de préstamos disponibles en el sistema.
    """
    
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Nombre del tipo"),
        help_text=_("Nombre descriptivo del tipo de préstamo")
    )
    
    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Código"),
        help_text=_("Código único del tipo de préstamo")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del tipo de préstamo")
    )
    
    # Configuración del tipo de préstamo
    tasa_interes_defecto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Tasa de interés por defecto (%)"),
        help_text=_("Tasa de interés anual por defecto")
    )
    
    plazo_maximo_meses = models.PositiveIntegerField(
        default=12,
        verbose_name=_("Plazo máximo (meses)"),
        help_text=_("Plazo máximo permitido en meses")
    )
    
    monto_maximo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Monto máximo"),
        help_text=_("Monto máximo permitido para este tipo")
    )
    
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
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si está activo, estará disponible para nuevos préstamos")
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )

    class Meta:
        verbose_name = _("Tipo de Préstamo")
        verbose_name_plural = _("Tipos de Préstamo")
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class Prestamo(models.Model):
    """
    Modelo principal para gestionar préstamos a empleados.
    """
    
    ESTADO_CHOICES = [
        ('pendiente', _('Pendiente de aprobación')),
        ('aprobado', _('Aprobado')),
        ('rechazado', _('Rechazado')),
        ('desembolsado', _('Desembolsado')),
        ('activo', _('Activo (en pago)')),
        ('completado', _('Completado')),
        ('cancelado', _('Cancelado')),
        ('en_mora', _('En mora')),
    ]
    
    # Información básica
    numero_prestamo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Número de préstamo"),
        help_text=_("Número único del préstamo")
    )
    
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.PROTECT,
        related_name='prestamos',
        verbose_name=_("Empleado")
    )
    
    tipo_prestamo = models.ForeignKey(
        TipoPrestamo,
        on_delete=models.PROTECT,
        related_name='prestamos',
        verbose_name=_("Tipo de préstamo")
    )
    
    # Términos del préstamo
    monto_solicitado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Monto solicitado"),
        help_text=_("Monto solicitado por el empleado")
    )
    
    monto_aprobado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Monto aprobado"),
        help_text=_("Monto aprobado (puede ser diferente al solicitado)")
    )
    
    tasa_interes = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name=_("Tasa de interés (%)"),
        help_text=_("Tasa de interés anual aplicada")
    )
    
    plazo_meses = models.PositiveIntegerField(
        verbose_name=_("Plazo (meses)"),
        help_text=_("Plazo del préstamo en meses")
    )
    
    cuota_mensual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Cuota mensual"),
        help_text=_("Cuota mensual calculada")
    )
    
    # Fechas importantes
    fecha_solicitud = models.DateField(
        default=datetime.date.today,
        verbose_name=_("Fecha de solicitud")
    )
    
    fecha_aprobacion = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de aprobación")
    )
    
    fecha_desembolso = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de desembolso")
    )
    
    fecha_primer_pago = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Fecha primer pago"),
        help_text=_("Fecha programada para el primer pago")
    )
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name=_("Estado"),
        help_text=_("Estado actual del préstamo")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones"),
        help_text=_("Observaciones adicionales sobre el préstamo")
    )
    
    garantia_descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción de garantía"),
        help_text=_("Descripción de la garantía ofrecida")
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
    
    # Campos de auditoría
    solicitado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='prestamos_solicitados',
        verbose_name=_("Solicitado por")
    )
    
    aprobado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='prestamos_aprobados',
        blank=True,
        null=True,
        verbose_name=_("Aprobado por")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    fecha_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Fecha de modificación")
    )

    class Meta:
        verbose_name = _("Préstamo")
        verbose_name_plural = _("Préstamos")
        ordering = ['-fecha_solicitud', '-numero_prestamo']
        indexes = [
            models.Index(fields=['empleado', 'estado']),
            models.Index(fields=['numero_prestamo']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"{self.numero_prestamo} - {self.empleado}"

    def clean(self):
        super().clean()
        
        # Validar monto máximo del tipo
        if (self.tipo_prestamo.monto_maximo and 
            self.monto_solicitado > self.tipo_prestamo.monto_maximo):
            raise ValidationError(
                _("El monto solicitado excede el máximo permitido para este tipo")
            )
        
        # Validar plazo máximo
        if self.plazo_meses > self.tipo_prestamo.plazo_maximo_meses:
            raise ValidationError(
                _("El plazo excede el máximo permitido para este tipo")
            )
        
        # Validar fechas
        if self.fecha_aprobacion and self.fecha_aprobacion < self.fecha_solicitud:
            raise ValidationError(
                _("La fecha de aprobación no puede ser anterior a la solicitud")
            )

    def save(self, *args, **kwargs):
        # Generar número de préstamo si no existe
        if not self.numero_prestamo:
            self.numero_prestamo = self.generar_numero_prestamo()
        
        # Calcular cuota mensual si está aprobado
        if self.estado == 'aprobado' and self.monto_aprobado and not self.cuota_mensual:
            self.cuota_mensual = self.calcular_cuota_mensual()
        
        # Actualizar saldo pendiente
        if self.estado in ['desembolsado', 'activo']:
            if not self.saldo_pendiente or self.saldo_pendiente == 0:
                self.saldo_pendiente = self.monto_aprobado or self.monto_solicitado
        
        super().save(*args, **kwargs)

    def generar_numero_prestamo(self):
        """Genera un número único para el préstamo"""
        from datetime import datetime
        año = datetime.now().year
        ultimo = Prestamo.objects.filter(
            numero_prestamo__startswith=f'PR{año}'
        ).order_by('-numero_prestamo').first()
        
        if ultimo:
            ultimo_numero = int(ultimo.numero_prestamo[-4:])
            nuevo_numero = ultimo_numero + 1
        else:
            nuevo_numero = 1
        
        return f'PR{año}{nuevo_numero:04d}'

    def calcular_cuota_mensual(self):
        """Calcula la cuota mensual del préstamo"""
        monto = self.monto_aprobado or self.monto_solicitado
        
        if self.tasa_interes == 0:
            return monto / self.plazo_meses
        
        tasa_mensual = self.tasa_interes / 100 / 12
        factor = (1 + tasa_mensual) ** self.plazo_meses
        cuota = monto * (tasa_mensual * factor) / (factor - 1)
        
        return round(cuota, 2)

    def puede_aprobar(self, usuario):
        """Verifica si un usuario puede aprobar este préstamo"""
        # TODO: Implementar lógica de permisos según cargo/rol
        return True

    def aprobar(self, usuario, monto_aprobado=None, observaciones=None):
        """Aprueba el préstamo"""
        if self.estado != 'pendiente':
            raise ValidationError(_("Solo se pueden aprobar préstamos pendientes"))
        
        self.estado = 'aprobado'
        self.monto_aprobado = monto_aprobado or self.monto_solicitado
        self.fecha_aprobacion = datetime.date.today()
        self.aprobado_por = usuario
        self.cuota_mensual = self.calcular_cuota_mensual()
        
        if observaciones:
            self.observaciones = observaciones
        
        self.save()

    def rechazar(self, usuario, motivo):
        """Rechaza el préstamo"""
        if self.estado != 'pendiente':
            raise ValidationError(_("Solo se pueden rechazar préstamos pendientes"))
        
        self.estado = 'rechazado'
        self.aprobado_por = usuario
        self.observaciones = motivo
        self.save()

    @property
    def monto_total_con_intereses(self):
        """Calcula el monto total a pagar con intereses"""
        if self.cuota_mensual:
            return self.cuota_mensual * self.plazo_meses
        return self.monto_aprobado or self.monto_solicitado

    @property
    def porcentaje_pagado(self):
        """Calcula el porcentaje pagado del préstamo"""
        monto_total = self.monto_aprobado or self.monto_solicitado
        if monto_total == 0:
            return 0
        return (self.total_pagado / monto_total) * 100


class PagoPrestamo(models.Model):
    """
    Modelo para registrar los pagos realizados a un préstamo.
    """
    
    TIPO_PAGO_CHOICES = [
        ('nomina', _('Descuento de nómina')),
        ('efectivo', _('Pago en efectivo')),
        ('transferencia', _('Transferencia bancaria')),
        ('cheque', _('Cheque')),
        ('otro', _('Otro')),
    ]
    
    prestamo = models.ForeignKey(
        Prestamo,
        on_delete=models.PROTECT,
        related_name='pagos',
        verbose_name=_("Préstamo")
    )
    
    numero_pago = models.PositiveIntegerField(
        verbose_name=_("Número de pago"),
        help_text=_("Número consecutivo del pago")
    )
    
    monto_pago = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Monto del pago"),
        help_text=_("Monto pagado")
    )
    
    monto_capital = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Monto a capital"),
        help_text=_("Parte del pago que va a capital")
    )
    
    monto_interes = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Monto a interés"),
        help_text=_("Parte del pago que va a interés")
    )
    
    fecha_pago = models.DateField(
        verbose_name=_("Fecha de pago")
    )
    
    fecha_programada = models.DateField(
        verbose_name=_("Fecha programada"),
        help_text=_("Fecha en que estaba programado el pago")
    )
    
    tipo_pago = models.CharField(
        max_length=20,
        choices=TIPO_PAGO_CHOICES,
        verbose_name=_("Tipo de pago")
    )
    
    referencia = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Referencia"),
        help_text=_("Referencia del pago (número de cheque, transferencia, etc.)")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones")
    )
    
    # Relación con nómina si es descuento
    nomina_relacionada = models.ForeignKey(
        'payroll.Nomina',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='descuentos_prestamos',
        verbose_name=_("Nómina relacionada")
    )
    
    # Campos de auditoría
    registrado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='pagos_prestamos_registrados',
        verbose_name=_("Registrado por")
    )
    
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de registro")
    )

    class Meta:
        verbose_name = _("Pago de Préstamo")
        verbose_name_plural = _("Pagos de Préstamo")
        unique_together = ['prestamo', 'numero_pago']
        ordering = ['prestamo', 'numero_pago']
        indexes = [
            models.Index(fields=['prestamo', 'fecha_pago']),
            models.Index(fields=['fecha_pago']),
        ]

    def __str__(self):
        return f"{self.prestamo.numero_prestamo} - Pago #{self.numero_pago}"

    def save(self, *args, **kwargs):
        # Actualizar totales del préstamo
        super().save(*args, **kwargs)
        self.actualizar_saldos_prestamo()

    def actualizar_saldos_prestamo(self):
        """Actualiza los saldos del préstamo relacionado"""
        prestamo = self.prestamo
        total_pagos = prestamo.pagos.aggregate(
            total=models.Sum('monto_pago')
        )['total'] or Decimal('0.00')
        
        prestamo.total_pagado = total_pagos
        prestamo.saldo_pendiente = (prestamo.monto_aprobado or prestamo.monto_solicitado) - total_pagos
        
        # Actualizar estado si está completamente pagado
        if prestamo.saldo_pendiente <= 0:
            prestamo.estado = 'completado'
        elif prestamo.estado == 'aprobado':
            prestamo.estado = 'activo'
        
        prestamo.save()

    @property
    def es_pago_tardio(self):
        """Verifica si el pago fue realizado después de la fecha programada"""
        return self.fecha_pago > self.fecha_programada
