"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MODELOS LEGALES Y FISCALES - FASE 3                        ║
║                    Sistema de Nómina CorteSec v3.0                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

RESPONSABILIDADES:
------------------
1. Embargos judiciales y retenciones judiciales
2. Tabla de retención en la fuente (Procedimiento 1)
3. Liquidación FIC (Fondo Inversión Colpensiones)

NORMATIVIDAD:
-------------
- Decreto 1070/2013: Embargos judiciales
- Estatuto Tributario Art. 383: Retención en la fuente empleados
- Resolución 2388/2016 UGPP: Archivo PILA
- Decreto 1625/2016: Tabla retención 2024+ (7 tramos UVT)

AUTOR: Sistema CorteSec
FECHA: Enero 2026 - FASE 3
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, MinLengthValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import date

from core.mixins import TenantAwareModel
from payroll.constants import UVT_2026


# ══════════════════════════════════════════════════════════════════════════════
# EMBARGOS JUDICIALES
# ══════════════════════════════════════════════════════════════════════════════

class EmbargoJudicial(TenantAwareModel):
    """
    Embargos judiciales sobre salarios de empleados.
    
    Normatividad: Decreto 1070/2013
    - Inembargable: 1 SMMLV (salvo alimentos)
    - Alimentos: Hasta 50% del excedente sobre 1 SMMLV
    - Otros embargos: Hasta 20% del excedente sobre 1 SMMLV
    - Prelación: Alimentos > Cooperativas > Créditos fiscales > Demás
    """
    
    TIPO_EMBARGO_CHOICES = [
        ('ALIMENTOS', 'Pensión de Alimentos'),
        ('COOPERATIVA', 'Cooperativa o Fondo'),
        ('FISCAL', 'Crédito Fiscal (DIAN, Municipio)'),
        ('EJECUTIVO', 'Ejecutivo (Bancos, Particulares)'),
        ('LIBRANZA', 'Libranza o Préstamo'),
    ]
    
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('SUSPENDIDO', 'Suspendido'),
        ('TERMINADO', 'Terminado'),
    ]
    
    # Relaciones
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.CASCADE,
        related_name='embargos'
    )
    
    # Información del Embargo
    numero_proceso = models.CharField(
        max_length=50,
        help_text="Número de radicado del proceso judicial"
    )
    juzgado = models.CharField(
        max_length=200,
        help_text="Nombre del juzgado o entidad que ordena el embargo"
    )
    tipo_embargo = models.CharField(
        max_length=15,
        choices=TIPO_EMBARGO_CHOICES
    )
    
    # Fechas
    fecha_notificacion = models.DateField(
        help_text="Fecha en que se notificó el embargo a la empresa"
    )
    fecha_inicio_descuento = models.DateField(
        help_text="Fecha a partir de la cual se inicia el descuento"
    )
    fecha_fin = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de finalización del embargo (si se conoce)"
    )
    
    # Montos
    valor_total_deuda = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Valor total de la deuda embargada"
    )
    porcentaje_descuento = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text="Porcentaje del salario a embargar (si se especifica porcentaje)"
    )
    valor_fijo_mensual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        help_text="Valor fijo mensual a embargar (si se especifica monto fijo)"
    )
    
    # Control
    saldo_pendiente = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Saldo pendiente por descontar"
    )
    total_descontado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=Decimal('0.00'),
        help_text="Total acumulado descontado"
    )
    
    # Beneficiario
    beneficiario = models.CharField(
        max_length=200,
        help_text="Nombre del beneficiario del embargo"
    )
    numero_cuenta = models.CharField(
        max_length=50,
        blank=True,
        help_text="Número de cuenta para consignación"
    )
    banco = models.CharField(
        max_length=100,
        blank=True,
        help_text="Banco para consignación"
    )
    
    # Estado
    estado = models.CharField(
        max_length=15,
        choices=ESTADO_CHOICES,
        default='ACTIVO'
    )
    observaciones = models.TextField(blank=True)
    
    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Embargo Judicial"
        verbose_name_plural = "Embargos Judiciales"
        ordering = ['-fecha_notificacion']
        indexes = [
            models.Index(fields=['organization', 'empleado', 'estado']),
            models.Index(fields=['organization', 'tipo_embargo']),
            models.Index(fields=['numero_proceso']),
        ]
    
    def __str__(self):
        return f"Embargo {self.numero_proceso} - {self.empleado.nombres} {self.empleado.apellidos}"
    
    def clean(self):
        """Validaciones de negocio"""
        # Al menos uno: porcentaje o valor fijo
        if not self.porcentaje_descuento and not self.valor_fijo_mensual:
            raise ValidationError(
                "Debe especificar porcentaje_descuento o valor_fijo_mensual"
            )
        
        # Validar saldo pendiente <= valor total
        if self.saldo_pendiente > self.valor_total_deuda:
            raise ValidationError(
                "El saldo pendiente no puede ser mayor al valor total de la deuda"
            )
        
        # Alimentos puede embargar hasta 50%, otros 20%
        if self.porcentaje_descuento:
            if self.tipo_embargo == 'ALIMENTOS' and self.porcentaje_descuento > 50:
                raise ValidationError(
                    "Embargos por alimentos no pueden exceder el 50% del salario embargable"
                )
            elif self.tipo_embargo != 'ALIMENTOS' and self.porcentaje_descuento > 20:
                raise ValidationError(
                    f"Embargos tipo {self.tipo_embargo} no pueden exceder el 20% del salario embargable"
                )
    
    def calcular_descuento_periodo(self, neto_pagar: Decimal, smmlv: Decimal) -> Decimal:
        """
        Calcula el descuento del embargo para un período.
        
        Args:
            neto_pagar: Neto a pagar del empleado (antes de embargos)
            smmlv: Salario mínimo vigente
            
        Returns:
            Valor a descontar por embargo
            
        Lógica:
        1. Calcular salario embargable = neto_pagar - 1 SMMLV (inembargable)
        2. Si porcentaje: descontar % sobre salario embargable
        3. Si valor fijo: descontar monto fijo (respetando topes)
        4. No exceder saldo pendiente
        """
        if self.estado != 'ACTIVO':
            return Decimal('0.00')
        
        # Salario inembargable: 1 SMMLV
        salario_embargable = max(neto_pagar - smmlv, Decimal('0'))
        
        if salario_embargable <= 0:
            return Decimal('0.00')
        
        # Calcular descuento según tipo
        if self.porcentaje_descuento:
            descuento = (salario_embargable * self.porcentaje_descuento / 100).quantize(Decimal('0.01'))
        else:
            descuento = self.valor_fijo_mensual
        
        # No exceder saldo pendiente
        descuento = min(descuento, self.saldo_pendiente)
        
        return descuento
    
    def registrar_descuento(self, monto: Decimal):
        """
        Registra un descuento aplicado y actualiza saldo.
        
        Args:
            monto: Monto descontado en el período
        """
        self.total_descontado += monto
        self.saldo_pendiente -= monto
        
        if self.saldo_pendiente <= 0:
            self.estado = 'TERMINADO'
            self.saldo_pendiente = Decimal('0.00')
        
        self.save()
    
    @property
    def prioridad(self) -> int:
        """
        Prioridad del embargo según normativa.
        
        Returns:
            1: Mayor prioridad (alimentos)
            4: Menor prioridad (otros)
        """
        prioridades = {
            'ALIMENTOS': 1,
            'COOPERATIVA': 2,
            'FISCAL': 3,
            'EJECUTIVO': 4,
            'LIBRANZA': 4,
        }
        return prioridades.get(self.tipo_embargo, 5)


# ══════════════════════════════════════════════════════════════════════════════
# TABLA RETENCIÓN EN LA FUENTE
# ══════════════════════════════════════════════════════════════════════════════

class TablaRetencionFuente(models.Model):
    """
    Tabla de retención en la fuente para empleados (Procedimiento 1).
    
    Normatividad: Estatuto Tributario Art. 383, Decreto 1625/2016
    Base: UVT (Unidad de Valor Tributario)
    
    Tramos 2024+ (Art. 241 ET):
    1. 0 - 95 UVT: 0%
    2. >95 - 150 UVT: 19%
    3. >150 - 360 UVT: 28%
    4. >360 - 640 UVT: 33%
    5. >640 - 945 UVT: 35%
    6. >945 - 2300 UVT: 37%
    7. >2300 UVT: 39%
    """
    
    # Identificación
    vigencia_desde = models.DateField(
        help_text="Fecha desde la cual aplica esta tabla"
    )
    vigencia_hasta = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha hasta la cual aplica (null = vigente)"
    )
    activa = models.BooleanField(default=True)
    
    # Tramo (en UVT)
    numero_tramo = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Número del tramo (1-7)"
    )
    uvt_desde = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="UVT inicial del tramo (ej: 95)"
    )
    uvt_hasta = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        help_text="UVT final del tramo (null = sin límite)"
    )
    
    # Tarifas
    tarifa_marginal = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Tarifa marginal del tramo (ej: 19.00 para 19%)"
    )
    impuesto_tramo_anterior = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=Decimal('0.00'),
        help_text="Impuesto acumulado de tramos anteriores (en UVT)"
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Tabla Retención Fuente"
        verbose_name_plural = "Tablas Retención Fuente"
        ordering = ['vigencia_desde', 'numero_tramo']
        unique_together = [['vigencia_desde', 'numero_tramo']]
        indexes = [
            models.Index(fields=['vigencia_desde', 'activa']),
            models.Index(fields=['numero_tramo']),
        ]
    
    def __str__(self):
        hasta = f"{self.uvt_hasta} UVT" if self.uvt_hasta else "∞"
        return f"Tramo {self.numero_tramo}: {self.uvt_desde} - {hasta} UVT ({self.tarifa_marginal}%)"
    
    def clean(self):
        """Validaciones de coherencia"""
        if self.uvt_hasta and self.uvt_hasta <= self.uvt_desde:
            raise ValidationError("uvt_hasta debe ser mayor a uvt_desde")
        
        if self.vigencia_hasta and self.vigencia_hasta <= self.vigencia_desde:
            raise ValidationError("vigencia_hasta debe ser mayor a vigencia_desde")
    
    @classmethod
    def obtener_tabla_vigente(cls, fecha: date = None) -> list:
        """
        Obtiene la tabla de retención vigente para una fecha.
        
        Args:
            fecha: Fecha de consulta (default: hoy)
            
        Returns:
            Lista de tramos ordenados
        """
        if fecha is None:
            fecha = timezone.now().date()
        
        return cls.objects.filter(
            activa=True,
            vigencia_desde__lte=fecha
        ).filter(
            models.Q(vigencia_hasta__isnull=True) |
            models.Q(vigencia_hasta__gte=fecha)
        ).order_by('numero_tramo')
    
    @classmethod
    def calcular_retencion_procedimiento1(
        cls,
        ingreso_laboral_mensual: Decimal,
        ingreso_no_laboral: Decimal,
        deducciones_mensuales: Decimal,
        uvt_valor: Decimal = UVT_2026,
        fecha: date = None
    ) -> dict:
        """
        Calcula retención en la fuente Procedimiento 1.
        
        Args:
            ingreso_laboral_mensual: Ingresos laborales del mes
            ingreso_no_laboral: Ingresos no laborales del mes
            deducciones_mensuales: Deducciones permitidas (salud, pensión, etc.)
            uvt_valor: Valor UVT vigente
            fecha: Fecha de cálculo
            
        Returns:
            Dict con detalle del cálculo
        """
        # 1. Rentas exentas (25% ingreso laboral, tope 240 UVT mensuales = 2,880 UVT anuales)
        renta_exenta_25pct = ingreso_laboral_mensual * Decimal('0.25')
        tope_mensual_renta_exenta = uvt_valor * 240  # 240 UVT/mes
        renta_exenta = min(renta_exenta_25pct, tope_mensual_renta_exenta)
        
        # 2. Base gravable mensual
        base_gravable = (
            ingreso_laboral_mensual +
            ingreso_no_laboral -
            deducciones_mensuales -
            renta_exenta
        )
        
        if base_gravable <= 0:
            return {
                'base_gravable_pesos': Decimal('0.00'),
                'base_gravable_uvt': Decimal('0.00'),
                'retencion_mensual': Decimal('0.00'),
                'tarifa_promedio': Decimal('0.00'),
                'tramo_aplicado': None,
            }
        
        # 3. Convertir a UVT
        base_gravable_uvt = (base_gravable / uvt_valor).quantize(Decimal('0.01'))
        
        # 4. Aplicar tabla progresiva
        tabla = cls.obtener_tabla_vigente(fecha)
        
        retencion_uvt = Decimal('0.00')
        tramo_aplicado = None
        
        for tramo in tabla:
            if base_gravable_uvt > tramo.uvt_desde:
                # Calcular exceso sobre límite inferior del tramo
                if tramo.uvt_hasta:
                    exceso = min(base_gravable_uvt - tramo.uvt_desde, tramo.uvt_hasta - tramo.uvt_desde)
                else:
                    exceso = base_gravable_uvt - tramo.uvt_desde
                
                # Impuesto del tramo
                impuesto_tramo = (exceso * tramo.tarifa_marginal / 100).quantize(Decimal('0.01'))
                retencion_uvt += impuesto_tramo
                tramo_aplicado = tramo.numero_tramo
                
                # Si no excede el tramo, terminar
                if tramo.uvt_hasta and base_gravable_uvt <= tramo.uvt_hasta:
                    break
        
        # 5. Convertir retención de UVT a pesos
        retencion_mensual = (retencion_uvt * uvt_valor).quantize(Decimal('0.01'))
        
        # 6. Tarifa promedio
        tarifa_promedio = (retencion_mensual / base_gravable * 100).quantize(Decimal('2')) if base_gravable > 0 else Decimal('0.00')
        
        return {
            'base_gravable_pesos': base_gravable.quantize(Decimal('0.01')),
            'base_gravable_uvt': base_gravable_uvt,
            'renta_exenta': renta_exenta.quantize(Decimal('0.01')),
            'retencion_uvt': retencion_uvt,
            'retencion_mensual': retencion_mensual,
            'tarifa_promedio': tarifa_promedio,
            'tramo_aplicado': tramo_aplicado,
        }


# ══════════════════════════════════════════════════════════════════════════════
# LIQUIDACIÓN FIC (FONDO INVERSIÓN COLPENSIONES)
# ══════════════════════════════════════════════════════════════════════════════

class LiquidacionFIC(TenantAwareModel):
    """
    Liquidación mensual FIC (Fondo de Inversión Colpensiones).
    
    CONTEXTO:
    ---------
    El FIC es el aporte adicional al fondo de pensiones cuando el empleado
    cotiza sobre más de 4 SMMLV. Es responsabilidad del EMPLEADOR.
    
    Base Legal: Decreto 1625/2016
    Tasa: 1% sobre el excedente de 4 SMMLV (hasta 16 SMMLV)
          + 0.2% a 1% adicional por tramos (16-20+ SMMLV)
    """
    
    # Período
    anio = models.IntegerField(
        validators=[MinValueValidator(2020), MaxValueValidator(2100)]
    )
    mes = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # Totales del Período
    numero_empleados = models.IntegerField(
        validators=[MinValueValidator(0)],
        default=0,
        help_text="Número de empleados con cotización > 4 SMMLV"
    )
    total_ibc = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=Decimal('0.00'),
        help_text="Sumatoria IBC de todos los empleados con FIC"
    )
    total_fic = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=Decimal('0.00'),
        help_text="Total liquidado de FIC del período"
    )
    
    # Control
    fecha_liquidacion = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha en que se liquidó el FIC"
    )
    liquidado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='liquidaciones_fic'
    )
    
    # Estado PILA
    incluido_en_pila = models.BooleanField(
        default=False,
        help_text="Si ya se incluyó en archivo PILA"
    )
    fecha_pila = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se generó el PILA con este FIC"
    )
    
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Liquidación FIC"
        verbose_name_plural = "Liquidaciones FIC"
        ordering = ['-anio', '-mes']
        unique_together = [['organization', 'anio', 'mes']]
        indexes = [
            models.Index(fields=['organization', 'anio', 'mes']),
            models.Index(fields=['incluido_en_pila']),
        ]
    
    def __str__(self):
        from calendar import month_name
        mes_nombre = month_name[self.mes] if self.mes <= 12 else str(self.mes)
        return f"FIC {mes_nombre}/{self.anio} - {self.numero_empleados} empleados"
    
    def clean(self):
        """Validaciones de coherencia"""
        if self.mes < 1 or self.mes > 12:
            raise ValidationError("El mes debe estar entre 1 y 12")
        
        if self.incluido_en_pila and not self.fecha_pila:
            raise ValidationError("Si incluido_en_pila=True, debe especificar fecha_pila")
    
    @property
    def periodo_completo(self) -> str:
        """Retorna el período en formato YYYY-MM"""
        return f"{self.anio}-{self.mes:02d}"
    
    @classmethod
    def liquidar_mes(cls, organization, anio: int, mes: int, usuario=None) -> 'LiquidacionFIC':
        """
        Liquida el FIC de un mes completo para una organización.
        
        Args:
            organization: Organización a liquidar
            anio: Año del período
            mes: Mes del período
            usuario: Usuario que ejecuta la liquidación
            
        Returns:
            Instancia de LiquidacionFIC creada/actualizada
        """
        from payroll.models import Empleado, NominaSimple
        from payroll.constants import SMMLV_2026, calcular_fsp_adicional
        
        # Buscar nóminas del período
        nominas = NominaSimple.objects.filter(
            organization=organization,
            fecha_inicio__year=anio,
            fecha_inicio__month=mes,
            estado='PROCESADA'
        )
        
        total_empleados = 0
        total_ibc = Decimal('0.00')
        total_fic = Decimal('0.00')
        
        umbral_4_smmlv = SMMLV_2026 * 4  # 4 SMMLV
        
        for nomina in nominas:
            # Solo empleados con IBC > 4 SMMLV pagan FIC
            if nomina.ibc > umbral_4_smmlv:
                total_empleados += 1
                total_ibc += nomina.ibc
                
                # Calcular FIC (usar función de constants.py)
                fic = calcular_fsp_adicional(nomina.ibc)
                total_fic += fic
        
        # Crear o actualizar liquidación
        liquidacion, created = cls.objects.update_or_create(
            organization=organization,
            anio=anio,
            mes=mes,
            defaults={
                'numero_empleados': total_empleados,
                'total_ibc': total_ibc,
                'total_fic': total_fic,
                'liquidado_por': usuario,
            }
        )
        
        return liquidacion


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES AUXILIARES
# ══════════════════════════════════════════════════════════════════════════════

def aplicar_embargos_prelacion(
    empleado,
    neto_antes_embargos: Decimal,
    smmlv: Decimal,
    periodo_pago: date
) -> tuple[Decimal, list]:
    """
    Aplica embargos respetando prelación legal.
    
    Args:
        empleado: Instancia de Empleado
        neto_antes_embargos: Neto a pagar antes de embargos
        smmlv: SMMLV vigente
        periodo_pago: Fecha del período de pago
        
    Returns:
        Tuple (neto_final, lista_embargos_aplicados)
    """
    embargos = EmbargoJudicial.objects.filter(
        empleado=empleado,
        estado='ACTIVO',
        fecha_inicio_descuento__lte=periodo_pago
    ).order_by('prioridad', 'fecha_notificacion')
    
    neto_disponible = neto_antes_embargos
    embargos_aplicados = []
    
    for embargo in embargos:
        descuento = embargo.calcular_descuento_periodo(neto_disponible, smmlv)
        
        if descuento > 0:
            neto_disponible -= descuento
            embargos_aplicados.append({
                'embargo': embargo,
                'monto_descontado': descuento,
            })
            
            # Registrar descuento
            embargo.registrar_descuento(descuento)
    
    return neto_disponible, embargos_aplicados
