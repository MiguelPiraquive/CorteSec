"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           MODELOS TIME & ATTENDANCE - GESTIÓN DE NOVEDADES Y CALENDARIO      ║
║                        Sistema de Nómina para Construcción                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Modelos para registro de novedades de ausent

ismos, licencias, incapacidades
y cálculo automático de días trabajados.

CONTEXTO:
Reemplaza el campo simple `dias_trabajados` por un sistema robusto que:
- Registra todas las novedades (vacaciones, incapacidades, licencias)
- Calcula automáticamente días efectivos
- Integra con PILA (marcas de novedad)
- Afecta cálculos de nómina según legislación

AUTOR: Sistema CorteSec
FECHA: Enero 2026
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta

from core.mixins import TenantAwareModel


# ══════════════════════════════════════════════════════════════════════════════
# TIPO DE NOVEDAD
# ══════════════════════════════════════════════════════════════════════════════

class TipoNovedad(TenantAwareModel):
    """
    Catálogo de tipos de novedades que afectan el tiempo trabajado.
    
    Define cómo cada novedad afecta:
    - El cálculo de días trabajados
    - El pago al empleado
    - La base de cotización (IBC)
    - Los parafiscales
    - La marca PILA
    """
    
    EFECTO_PAGO_CHOICES = [
        ('COM', 'Pago Completo (100% empleador)'),
        ('PAR', 'Pago Parcial (empleador + EPS)'),
        ('EPS', 'Pago EPS (66.67% desde día 3)'),
        ('ARL', 'Pago ARL (100%)'),
        ('NOP', 'Sin Pago'),
    ]
    
    MARCA_PILA_CHOICES = [
        ('X', 'Normal (sin marca)'),
        ('IGE', 'Incapacidad General'),
        ('LMA', 'Licencia de Maternidad'),
        ('LPA', 'Licencia de Paternidad'),
        ('VAC', 'Vacaciones'),
        ('SLN', 'Suspensión Temporal (Licencia No Remunerada)'),
        ('VCT', 'Variación Centro de Trabajo'),
    ]
    
    # Identificación
    codigo = models.CharField(
        max_length=20,
        unique=True,
        help_text="Código único del tipo de novedad (ej: INC_GEN, LIC_MAT)"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Nombre descriptivo"
    )
    descripcion = models.TextField(
        blank=True,
        help_text="Descripción detallada y fundamento legal"
    )
    
    # Configuración de Pago
    efecto_pago = models.CharField(
        max_length=3,
        choices=EFECTO_PAGO_CHOICES,
        default='COM',
        help_text="Cómo afecta el pago al empleado"
    )
    porcentaje_pago_empleador = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00'))
        ],
        help_text="% que paga el empleador (0-100%)"
    )
    porcentaje_pago_eps = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00'))
        ],
        help_text="% que paga la EPS/ARL (0-100%)"
    )
    
    # Días de Carencia (Ej: Incapacidad General primeros 2 días los paga empresa)
    dias_carencia_empleador = models.PositiveSmallIntegerField(
        default=0,
        help_text="Días iniciales que paga 100% el empleador antes de EPS/ARL"
    )
    
    # Afectación de Bases
    afecta_ibc_salud = models.BooleanField(
        default=True,
        help_text="Si afecta la base de cotización de salud"
    )
    afecta_ibc_pension = models.BooleanField(
        default=True,
        help_text="Si afecta la base de cotización de pensión"
    )
    afecta_ibc_arl = models.BooleanField(
        default=True,
        help_text="Si afecta la base de cotización de ARL"
    )
    afecta_parafiscales = models.BooleanField(
        default=True,
        help_text="Si afecta la base de parafiscales (SENA, ICBF, Caja)"
    )
    afecta_provisiones = models.BooleanField(
        default=True,
        help_text="Si afecta el cálculo de prestaciones sociales"
    )
    
    # Afectación de Auxilio de Transporte
    suspende_auxilio_transporte = models.BooleanField(
        default=False,
        help_text="Si suspende el pago del auxilio de transporte"
    )
    
    # Integración PILA
    marca_pila = models.CharField(
        max_length=3,
        choices=MARCA_PILA_CHOICES,
        default='X',
        help_text="Marca a reportar en la planilla PILA"
    )
    
    # Requiere Documentación
    requiere_soporte = models.BooleanField(
        default=False,
        help_text="Si requiere adjuntar documento soporte (ej: incapacidad médica)"
    )
    
    # Control
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(
        default=0,
        help_text="Orden de presentación"
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tipo de Novedad"
        verbose_name_plural = "Tipos de Novedad"
        ordering = ['orden', 'nombre']
        unique_together = [['organization', 'codigo']]
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


# ══════════════════════════════════════════════════════════════════════════════
# NOVEDAD DE CALENDARIO (AUSENTISMO/LICENCIA/INCAPACIDAD)
# ══════════════════════════════════════════════════════════════════════════════

class NovedadCalendario(TenantAwareModel):
    """
    Registra una novedad de tiempo (ausencia, licencia, incapacidad, etc.)
    para un empleado en un rango de fechas.
    
    Afecta automáticamente:
    - El cálculo de días trabajados
    - El monto a pagar en la nómina
    - Las bases de cotización
    - La planilla PILA
    
    Ejemplo:
        Empleado: Juan Pérez
        Tipo: Incapacidad General
        Fechas: 15-Ene-2026 a 20-Ene-2026 (6 días)
        Efecto:
          - Días 1-2: Paga empleador 100%
          - Días 3-6: Paga EPS 66.67%
          - Marca PILA: IGE
    """
    
    ESTADO_CHOICES = [
        ('REG', 'Registrada'),
        ('APR', 'Aprobada'),
        ('REC', 'Rechazada'),
        ('PRO', 'Procesada en Nómina'),
        ('ANU', 'Anulada'),
    ]
    
    # Empleado
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.CASCADE,
        related_name='novedades_calendario',
        help_text="Empleado al que aplica la novedad"
    )
    
    # Tipo de Novedad
    tipo_novedad = models.ForeignKey(
        TipoNovedad,
        on_delete=models.PROTECT,
        related_name='novedades',
        help_text="Tipo de novedad (Incapacidad, Licencia, etc.)"
    )
    
    # Período
    fecha_inicio = models.DateField(
        help_text="Fecha de inicio de la novedad (inclusive)"
    )
    fecha_fin = models.DateField(
        help_text="Fecha de fin de la novedad (inclusive)"
    )
    dias_calendario = models.PositiveSmallIntegerField(
        default=0,
        editable=False,
        help_text="Días calendario totales (calculado automáticamente)"
    )
    dias_habiles = models.PositiveSmallIntegerField(
        default=0,
        editable=False,
        help_text="Días hábiles (excluyendo domingos/festivos si aplica)"
    )
    
    # Centro de Costo (Opcional - para distribución)
    centro_costo = models.ForeignKey(
        'payroll.CentroCosto',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='novedades',
        help_text="Centro de costo donde trabajaba (para estadísticas)"
    )
    
    # Documentación Soporte
    documento_soporte = models.FileField(
        upload_to='novedades_calendario/%Y/%m/',
        null=True,
        blank=True,
        help_text="Archivo soporte (incapacidad médica, certificado, etc.)"
    )
    numero_documento = models.CharField(
        max_length=100,
        blank=True,
        help_text="Número del documento soporte (ej: número de incapacidad)"
    )
    entidad_emisora = models.CharField(
        max_length=200,
        blank=True,
        help_text="Entidad que emite el soporte (EPS, ARL, Juzgado, etc.)"
    )
    
    # Valores Calculados (Para nómina)
    valor_pagado_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto que paga el empleador"
    )
    valor_pagado_eps_arl = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Monto que paga EPS/ARL (a cobrar)"
    )
    
    # Estado y Aprobación
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='REG',
        help_text="Estado actual de la novedad"
    )
    aprobada_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='novedades_aprobadas',
        help_text="Usuario que aprobó/rechazó"
    )
    fecha_aprobacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de aprobación/rechazo"
    )
    motivo_rechazo = models.TextField(
        blank=True,
        help_text="Motivo del rechazo (si aplica)"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='novedades_creadas'
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Novedad de Calendario"
        verbose_name_plural = "Novedades de Calendario"
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['organization', 'empleado', 'fecha_inicio']),
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
        ]
    
    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.tipo_novedad.nombre} ({self.fecha_inicio} a {self.fecha_fin})"
    
    def clean(self):
        """Validaciones de negocio"""
        # Validar rango de fechas
        if self.fecha_fin < self.fecha_inicio:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")
        
        # Validar solapamiento con otras novedades del mismo empleado
        if self.pk:  # Solo en actualización
            solapamientos = NovedadCalendario.objects.filter(
                empleado=self.empleado,
                estado__in=['REG', 'APR', 'PRO'],
            ).exclude(pk=self.pk).filter(
                models.Q(fecha_inicio__lte=self.fecha_fin, fecha_fin__gte=self.fecha_inicio)
            )
            
            if solapamientos.exists():
                raise ValidationError(
                    f"Ya existe una novedad registrada para el empleado en este período: "
                    f"{solapamientos.first()}"
                )
        
        # Validar documento soporte si es requerido
        if self.tipo_novedad.requiere_soporte and not self.documento_soporte:
            if self.estado in ['APR', 'PRO']:
                raise ValidationError(
                    f"Este tipo de novedad requiere adjuntar documento soporte."
                )
    
    def save(self, *args, **kwargs):
        """Override save para calcular días automáticamente"""
        self._calcular_dias()
        super().save(*args, **kwargs)
    
    def _calcular_dias(self):
        """Calcula días calendario y días hábiles"""
        if not self.fecha_inicio or not self.fecha_fin:
            return
        
        # Días calendario (inclusive)
        delta = self.fecha_fin - self.fecha_inicio
        self.dias_calendario = delta.days + 1
        
        # Días hábiles (excluir domingos - simplificado)
        # TODO: Integrar con calendario de festivos colombiano
        dias_habiles = 0
        fecha_actual = self.fecha_inicio
        while fecha_actual <= self.fecha_fin:
            # Excluir domingos (weekday 6)
            if fecha_actual.weekday() != 6:
                dias_habiles += 1
            fecha_actual += timedelta(days=1)
        
        self.dias_habiles = dias_habiles
    
    def calcular_valores_pago(self, salario_diario: Decimal):
        """
        Calcula los valores a pagar por empleador y EPS/ARL.
        
        Args:
            salario_diario: Salario diario del empleado para el cálculo
        """
        tipo = self.tipo_novedad
        
        # Días que paga empleador (carencia + porcentaje)
        dias_empleador = min(tipo.dias_carencia_empleador, self.dias_calendario)
        dias_eps_arl = max(0, self.dias_calendario - dias_empleador)
        
        # Calcular valores
        self.valor_pagado_empleador = (
            (salario_diario * dias_empleador) +
            (salario_diario * dias_eps_arl * tipo.porcentaje_pago_empleador / 100)
        ).quantize(Decimal('0.01'))
        
        self.valor_pagado_eps_arl = (
            salario_diario * dias_eps_arl * tipo.porcentaje_pago_eps / 100
        ).quantize(Decimal('0.01'))
    
    def aprobar(self, usuario, observaciones=''):
        """Aprueba la novedad"""
        self.estado = 'APR'
        self.aprobada_por = usuario
        self.fecha_aprobacion = timezone.now()
        if observaciones:
            self.observaciones = observaciones
        self.save()
    
    def rechazar(self, usuario, motivo):
        """Rechaza la novedad"""
        self.estado = 'REC'
        self.aprobada_por = usuario
        self.fecha_aprobacion = timezone.now()
        self.motivo_rechazo = motivo
        self.save()
    
    def anular(self, usuario, motivo):
        """Anula la novedad"""
        if self.estado == 'PRO':
            raise ValidationError("No se puede anular una novedad ya procesada en nómina.")
        
        self.estado = 'ANU'
        self.observaciones += f"\n\nANULADA por {usuario}: {motivo}"
        self.save()
    
    def marcar_procesada(self):
        """Marca la novedad como procesada en nómina"""
        self.estado = 'PRO'
        self.save()
    
    @property
    def dias_afectan_nomina(self) -> int:
        """Retorna los días que afectan el cálculo de nómina"""
        # Si la novedad no suspende el pago, cuenta como días trabajados
        if self.tipo_novedad.efecto_pago in ['COM', 'PAR']:
            return self.dias_calendario
        return 0
    
    @property
    def dias_restan_nomina(self) -> int:
        """Retorna los días que se restan de los días trabajados"""
        if self.tipo_novedad.efecto_pago == 'NOP':
            return self.dias_calendario
        return 0
    
    @staticmethod
    def calcular_dias_trabajados_periodo(empleado, fecha_inicio, fecha_fin):
        """
        Calcula los días trabajados de un empleado en un período,
        descontando las novedades que afectan.
        
        Args:
            empleado: Instancia de Empleado
            fecha_inicio: Fecha inicio del período
            fecha_fin: Fecha fin del período
            
        Returns:
            Días trabajados efectivos
        """
        # Días del período
        dias_periodo = (fecha_fin - fecha_inicio).days + 1
        
        # Buscar novedades en el período
        novedades = NovedadCalendario.objects.filter(
            empleado=empleado,
            estado__in=['APR', 'PRO'],
            fecha_inicio__lte=fecha_fin,
            fecha_fin__gte=fecha_inicio
        )
        
        # Restar días según novedades
        dias_descontados = 0
        for novedad in novedades:
            dias_descontados += novedad.dias_restan_nomina
        
        dias_trabajados = dias_periodo - dias_descontados
        return max(0, dias_trabajados)  # No puede ser negativo
