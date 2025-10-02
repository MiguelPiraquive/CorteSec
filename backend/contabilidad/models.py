from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal
import datetime
from core.mixins import TenantAwareModel


class PlanCuentas(TenantAwareModel):
    """
    Plan de cuentas contable del sistema.
    """
    
    TIPO_CUENTA_CHOICES = [
        ('activo', _('Activo')),
        ('pasivo', _('Pasivo')),
        ('patrimonio', _('Patrimonio')),
        ('ingreso', _('Ingreso')),
        ('gasto', _('Gasto')),
        ('costo', _('Costo')),
    ]
    
    NATURALEZA_CHOICES = [
        ('debito', _('Débito')),
        ('credito', _('Crédito')),
    ]
    
    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Código de cuenta"),
        help_text=_("Código único de la cuenta contable")
    )
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre de la cuenta")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción")
    )
    
    cuenta_padre = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='subcuentas',
        verbose_name=_("Cuenta padre")
    )
    
    nivel = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Nivel"),
        help_text=_("Nivel en la jerarquía del plan de cuentas")
    )
    
    tipo_cuenta = models.CharField(
        max_length=20,
        choices=TIPO_CUENTA_CHOICES,
        verbose_name=_("Tipo de cuenta")
    )
    
    naturaleza = models.CharField(
        max_length=10,
        choices=NATURALEZA_CHOICES,
        verbose_name=_("Naturaleza de la cuenta")
    )
    
    acepta_movimientos = models.BooleanField(
        default=True,
        verbose_name=_("Acepta movimientos"),
        help_text=_("Si la cuenta acepta movimientos directos")
    )
    
    requiere_tercero = models.BooleanField(
        default=False,
        verbose_name=_("Requiere tercero"),
        help_text=_("Si los movimientos requieren especificar tercero")
    )
    
    activa = models.BooleanField(
        default=True,
        verbose_name=_("Activa")
    )
    
    # Campos de control
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )

    class Meta:
        verbose_name = _("Plan de Cuentas")
        verbose_name_plural = _("Plan de Cuentas")
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def save(self, *args, **kwargs):
        # Calcular nivel automáticamente
        if self.cuenta_padre:
            self.nivel = self.cuenta_padre.nivel + 1
        else:
            self.nivel = 1
        super().save(*args, **kwargs)

    @property
    def saldo_actual(self):
        """Calcula el saldo actual de la cuenta"""
        movimientos = self.movimientos_debito.aggregate(
            total_debito=models.Sum('valor_debito')
        )['total_debito'] or Decimal('0.00')
        
        movimientos_credito = self.movimientos_credito.aggregate(
            total_credito=models.Sum('valor_credito')
        )['total_credito'] or Decimal('0.00')
        
        if self.naturaleza == 'debito':
            return movimientos - movimientos_credito
        else:
            return movimientos_credito - movimientos

    def get_jerarquia_completa(self):
        """Retorna la jerarquía completa de la cuenta"""
        if self.cuenta_padre:
            return f"{self.cuenta_padre.get_jerarquia_completa()} > {self.nombre}"
        return self.nombre


class ComprobanteContable(TenantAwareModel):
    """
    Comprobantes contables del sistema.
    """
    
    TIPO_COMPROBANTE_CHOICES = [
        ('diario', _('Diario')),
        ('ingreso', _('Ingreso')),
        ('egreso', _('Egreso')),
        ('nomina', _('Nómina')),
        ('ajuste', _('Ajuste')),
        ('cierre', _('Cierre')),
    ]
    
    ESTADO_CHOICES = [
        ('borrador', _('Borrador')),
        ('contabilizado', _('Contabilizado')),
        ('anulado', _('Anulado')),
    ]
    
    numero = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Número de comprobante")
    )
    
    tipo_comprobante = models.CharField(
        max_length=20,
        choices=TIPO_COMPROBANTE_CHOICES,
        verbose_name=_("Tipo de comprobante")
    )
    
    fecha = models.DateField(
        verbose_name=_("Fecha del comprobante")
    )
    
    descripcion = models.TextField(
        verbose_name=_("Descripción"),
        help_text=_("Descripción general del comprobante")
    )
    
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador',
        verbose_name=_("Estado")
    )
    
    total_debito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Total débito")
    )
    
    total_credito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Total crédito")
    )
    
    # Relaciones con otros módulos
    nomina_relacionada = models.ForeignKey(
        'payroll.Nomina',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='comprobantes_contables',
        verbose_name=_("Nómina relacionada")
    )
    
    prestamo_relacionado = models.ForeignKey(
        'prestamos.Prestamo',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='comprobantes_contables',
        verbose_name=_("Préstamo relacionado")
    )
    
    # Campos de auditoría
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='comprobantes_creados',
        verbose_name=_("Creado por")
    )
    
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de creación")
    )
    
    contabilizado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        related_name='comprobantes_contabilizados',
        blank=True,
        null=True,
        verbose_name=_("Contabilizado por")
    )
    
    fecha_contabilizacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Fecha de contabilización")
    )

    class Meta:
        verbose_name = _("Comprobante Contable")
        verbose_name_plural = _("Comprobantes Contables")
        ordering = ['-fecha', '-numero']

    def __str__(self):
        return f"{self.numero} - {self.descripcion}"

    def clean(self):
        super().clean()
        if self.total_debito != self.total_credito:
            raise ValidationError(_("El total débito debe ser igual al total crédito"))

    def contabilizar(self, usuario):
        """Contabiliza el comprobante"""
        if self.estado != 'borrador':
            raise ValidationError(_("Solo se pueden contabilizar comprobantes en borrador"))
        
        self.estado = 'contabilizado'
        self.contabilizado_por = usuario
        self.fecha_contabilizacion = datetime.datetime.now()
        self.save()


class MovimientoContable(TenantAwareModel):
    """
    Movimientos contables individuales.
    """
    
    comprobante = models.ForeignKey(
        ComprobanteContable,
        on_delete=models.CASCADE,
        related_name='movimientos',
        verbose_name=_("Comprobante")
    )
    
    cuenta = models.ForeignKey(
        PlanCuentas,
        on_delete=models.PROTECT,
        related_name='movimientos',
        verbose_name=_("Cuenta")
    )
    
    descripcion = models.CharField(
        max_length=500,
        verbose_name=_("Descripción del movimiento")
    )
    
    valor_debito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Valor débito")
    )
    
    valor_credito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Valor crédito")
    )
    
    tercero = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name=_("Tercero"),
        help_text=_("Identificación o nombre del tercero")
    )
    
    centro_costo = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Centro de costo")
    )

    class Meta:
        verbose_name = _("Movimiento Contable")
        verbose_name_plural = _("Movimientos Contables")
        ordering = ['comprobante', 'id']

    def __str__(self):
        return f"{self.comprobante.numero} - {self.cuenta.codigo}"

    def clean(self):
        super().clean()
        
        # Validar que solo uno de los valores sea mayor a cero
        if self.valor_debito > 0 and self.valor_credito > 0:
            raise ValidationError(_("Un movimiento no puede tener valor en débito y crédito"))
        
        if self.valor_debito == 0 and self.valor_credito == 0:
            raise ValidationError(_("Un movimiento debe tener valor en débito o crédito"))
        
        # Validar que la cuenta acepta movimientos
        if not self.cuenta.acepta_movimientos:
            raise ValidationError(_("La cuenta seleccionada no acepta movimientos directos"))
        
        # Validar tercero si es requerido
        if self.cuenta.requiere_tercero and not self.tercero:
            raise ValidationError(_("Esta cuenta requiere especificar un tercero"))


class FlujoCaja(TenantAwareModel):
    """
    Flujo de caja diario del sistema.
    """
    
    TIPO_MOVIMIENTO_CHOICES = [
        ('ingreso', _('Ingreso')),
        ('egreso', _('Egreso')),
    ]
    
    fecha = models.DateField(
        verbose_name=_("Fecha")
    )
    
    tipo_movimiento = models.CharField(
        max_length=10,
        choices=TIPO_MOVIMIENTO_CHOICES,
        verbose_name=_("Tipo de movimiento")
    )
    
    concepto = models.CharField(
        max_length=200,
        verbose_name=_("Concepto")
    )
    
    valor = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name=_("Valor")
    )
    
    comprobante = models.ForeignKey(
        ComprobanteContable,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='movimientos_flujo',
        verbose_name=_("Comprobante relacionado")
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Observaciones")
    )

    class Meta:
        verbose_name = _("Flujo de Caja")
        verbose_name_plural = _("Flujo de Caja")
        ordering = ['-fecha', 'tipo_movimiento']

    def __str__(self):
        return f"{self.fecha} - {self.concepto} - {self.valor}"

    @classmethod
    def get_saldo_actual(cls):
        """Obtener el saldo actual de caja."""
        from django.db.models import Sum
        
        ingresos = cls.objects.filter(tipo_movimiento='ingreso').aggregate(
            total=Sum('valor')
        )['total'] or Decimal('0')
        
        egresos = cls.objects.filter(tipo_movimiento='egreso').aggregate(
            total=Sum('valor')
        )['total'] or Decimal('0')
        
        return ingresos - egresos
    
    @classmethod
    def get_monthly_data(cls):
        """Obtener datos mensuales para gráficos."""
        from django.db.models import Sum
        from django.utils import timezone
        import calendar
        
        current_year = timezone.now().year
        monthly_data = []
        
        for month in range(1, 13):
            ingresos = cls.objects.filter(
                fecha__year=current_year,
                fecha__month=month,
                tipo_movimiento='ingreso'
            ).aggregate(total=Sum('valor'))['total'] or Decimal('0')
            
            egresos = cls.objects.filter(
                fecha__year=current_year,
                fecha__month=month,
                tipo_movimiento='egreso'
            ).aggregate(total=Sum('valor'))['total'] or Decimal('0')
            
            monthly_data.append({
                'month': calendar.month_name[month],
                'ingresos': float(ingresos),
                'egresos': float(egresos),
                'neto': float(ingresos - egresos)
            })
        
        return monthly_data
    
    @classmethod
    def get_projection_data(cls):
        """Obtener datos de proyección para los próximos 3 meses."""
        # Proyección simple basada en promedio de últimos 3 meses
        from django.db.models import Sum, Avg
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        current_date = timezone.now().date()
        three_months_ago = current_date - relativedelta(months=3)
        
        avg_monthly_flow = cls.objects.filter(
            fecha__gte=three_months_ago,
            fecha__lt=current_date
        ).aggregate(
            avg_ingresos=Avg('valor', filter=models.Q(tipo_movimiento='ingreso')),
            avg_egresos=Avg('valor', filter=models.Q(tipo_movimiento='egreso'))
        )
        
        avg_ingreso = avg_monthly_flow['avg_ingresos'] or Decimal('0')
        avg_egreso = avg_monthly_flow['avg_egresos'] or Decimal('0')
        avg_neto = avg_ingreso - avg_egreso
        
        saldo_actual = cls.get_saldo_actual()
        projections = []
        
        for i in range(3):
            saldo_actual += avg_neto
            projections.append(float(saldo_actual))
        
        return projections


class CentroCosto(TenantAwareModel):
    """
    Centros de Costo para la contabilidad analítica.
    """
    
    codigo = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Código"),
        help_text=_("Código único del centro de costo")
    )
    
    nombre = models.CharField(
        max_length=200,
        verbose_name=_("Nombre"),
        help_text=_("Nombre descriptivo del centro de costo")
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Descripción"),
        help_text=_("Descripción detallada del centro de costo")
    )
    
    centro_padre = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='subcentros',
        verbose_name=_("Centro padre"),
        help_text=_("Centro de costo padre en la jerarquía")
    )
    
    nivel = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Nivel"),
        help_text=_("Nivel en la jerarquía de centros de costo")
    )
    
    responsable = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        verbose_name=_("Responsable"),
        help_text=_("Usuario responsable del centro de costo")
    )
    
    presupuesto_anual = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name=_("Presupuesto anual"),
        help_text=_("Presupuesto anual asignado al centro de costo")
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name=_("Activo"),
        help_text=_("Si el centro de costo está activo")
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
        verbose_name = _("Centro de Costo")
        verbose_name_plural = _("Centros de Costo")
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def save(self, *args, **kwargs):
        # Calcular nivel automáticamente
        if self.centro_padre:
            self.nivel = self.centro_padre.nivel + 1
        else:
            self.nivel = 1
        super().save(*args, **kwargs)

    def get_jerarquia_completa(self):
        """Retorna la jerarquía completa del centro de costo"""
        if self.centro_padre:
            return f"{self.centro_padre.get_jerarquia_completa()} > {self.nombre}"
        return self.nombre

    def get_movimientos_periodo(self, fecha_inicio=None, fecha_fin=None):
        """Obtiene los movimientos del centro de costo en un período"""
        movimientos = self.movimientos.all()
        
        if fecha_inicio:
            movimientos = movimientos.filter(fecha_movimiento__gte=fecha_inicio)
        if fecha_fin:
            movimientos = movimientos.filter(fecha_movimiento__lte=fecha_fin)
        
        return movimientos

    def get_saldo_periodo(self, fecha_inicio=None, fecha_fin=None):
        """Calcula el saldo del centro de costo en un período"""
        movimientos = self.get_movimientos_periodo(fecha_inicio, fecha_fin)
        
        total_debitos = movimientos.aggregate(
            total=models.Sum('valor_debito')
        )['total'] or Decimal('0')
        
        total_creditos = movimientos.aggregate(
            total=models.Sum('valor_credito')
        )['total'] or Decimal('0')
        
        return total_debitos - total_creditos

    def get_utilizacion_presupuesto(self, año=None):
        """Calcula el porcentaje de utilización del presupuesto"""
        if not self.presupuesto_anual:
            return 0
        
        if not año:
            año = datetime.date.today().year
        
        fecha_inicio = datetime.date(año, 1, 1)
        fecha_fin = datetime.date(año, 12, 31)
        
        gasto_periodo = abs(self.get_saldo_periodo(fecha_inicio, fecha_fin))
        
        if self.presupuesto_anual > 0:
            return (gasto_periodo / self.presupuesto_anual) * 100
        
        return 0


class BalanceComprobacion(TenantAwareModel):
    """
    Balance de Comprobación para períodos específicos.
    """
    
    periodo = models.CharField(
        max_length=7,
        verbose_name=_("Período"),
        help_text=_("Período en formato YYYY-MM")
    )
    
    cuenta = models.ForeignKey(
        PlanCuentas,
        on_delete=models.CASCADE,
        verbose_name=_("Cuenta")
    )
    
    saldo_inicial_debito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Saldo inicial débito")
    )
    
    saldo_inicial_credito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Saldo inicial crédito")
    )
    
    movimiento_debito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Movimientos débito")
    )
    
    movimiento_credito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Movimientos crédito")
    )
    
    saldo_final_debito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Saldo final débito")
    )
    
    saldo_final_credito = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Saldo final crédito")
    )
    
    fecha_generacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de generación")
    )

    class Meta:
        verbose_name = _("Balance de Comprobación")
        verbose_name_plural = _("Balances de Comprobación")
        unique_together = ['periodo', 'cuenta']
        ordering = ['periodo', 'cuenta__codigo']

    def __str__(self):
        return f"Balance {self.periodo} - {self.cuenta.codigo}"

    def calcular_saldos_finales(self):
        """Calcula los saldos finales basados en iniciales y movimientos"""
        if self.cuenta.naturaleza == 'debito':
            saldo_neto = (self.saldo_inicial_debito - self.saldo_inicial_credito) + \
                        (self.movimiento_debito - self.movimiento_credito)
            
            if saldo_neto >= 0:
                self.saldo_final_debito = saldo_neto
                self.saldo_final_credito = Decimal('0.00')
            else:
                self.saldo_final_debito = Decimal('0.00')
                self.saldo_final_credito = abs(saldo_neto)
        else:  # naturaleza crédito
            saldo_neto = (self.saldo_inicial_credito - self.saldo_inicial_debito) + \
                        (self.movimiento_credito - self.movimiento_debito)
            
            if saldo_neto >= 0:
                self.saldo_final_credito = saldo_neto
                self.saldo_final_debito = Decimal('0.00')
            else:
                self.saldo_final_credito = Decimal('0.00')
                self.saldo_final_debito = abs(saldo_neto)

    def save(self, *args, **kwargs):
        self.calcular_saldos_finales()
        super().save(*args, **kwargs)


# Signals para generar automáticamente movimientos contables
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='prestamos.PagoPrestamo')
def crear_comprobante_pago_prestamo(sender, instance, created, **kwargs):
    """Crea automáticamente comprobante contable para pagos de préstamos"""
    if created and instance.tipo_pago == 'nomina':
        # TODO: Implementar lógica para crear comprobante contable
        pass

@receiver(post_save, sender='payroll.Nomina')
def crear_comprobante_nomina(sender, instance, created, **kwargs):
    """Crea automáticamente comprobante contable para nómina"""
    if created:
        # TODO: Implementar lógica para crear comprobante contable de nómina
        pass
