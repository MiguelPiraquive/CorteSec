from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from locations.models import Departamento, Municipio
from items.models import Item
from cargos.models import Cargo
from core.mixins import TenantAwareModel


# ============================================
# CATÁLOGOS BASE
# ============================================

class TipoDocumento(models.Model):
    """Catálogo de tipos de documento de identidad"""
    CODIGO_CHOICES = [
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('TI', 'Tarjeta de Identidad'),
        ('PA', 'Pasaporte'),
        ('RC', 'Registro Civil'),
        ('NIT', 'NIT'),
        ('DIE', 'Documento de Identificación Extranjero'),
    ]
    
    codigo = models.CharField(max_length=10, unique=True, choices=CODIGO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documento"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class TipoTrabajador(models.Model):
    """Catálogo de tipos de trabajador según DIAN"""
    CODIGO_CHOICES = [
        ('DEP', 'Dependiente'),
        ('APR', 'Aprendiz'),
        ('PEN', 'Pensionado'),
        ('SUB', 'Subcontratista'),
    ]
    
    codigo = models.CharField(max_length=10, unique=True, choices=CODIGO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    requiere_nomina_electronica = models.BooleanField(
        default=True,
        help_text="Si requiere generación de nómina electrónica DIAN"
    )
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Tipo de Trabajador"
        verbose_name_plural = "Tipos de Trabajador"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class TipoContrato(models.Model):
    """Catálogo de tipos de contrato laboral"""
    CODIGO_CHOICES = [
        ('IND', 'Indefinido'),
        ('FIJ', 'Término Fijo'),
        ('OBR', 'Obra o Labor'),
        ('APR', 'Aprendizaje'),
        ('PSE', 'Prestación de Servicios'),
    ]
    
    codigo = models.CharField(max_length=10, unique=True, choices=CODIGO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    requiere_fecha_fin = models.BooleanField(
        default=False,
        help_text="Si el contrato requiere fecha de finalización"
    )
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Tipo de Contrato"
        verbose_name_plural = "Tipos de Contrato"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


# ============================================
# MODELO EMPLEADO MEJORADO
# ============================================


class Empleado(TenantAwareModel):
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]

    # Información Personal
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    tipo_documento = models.ForeignKey(
        TipoDocumento, 
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Tipo de documento de identidad"
    )
    documento = models.CharField(max_length=20, unique=True)
    correo = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, default='M')
    
    # Ubicación
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE, null=True, blank=True)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, null=True, blank=True)
    
    # Información Laboral
    cargo = models.ForeignKey(Cargo, on_delete=models.CASCADE)
    tipo_vinculacion = models.ForeignKey(
        TipoTrabajador,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Tipo de vinculación laboral (Dependiente, Aprendiz, Subcontratista, etc.)"
    )
    fecha_ingreso = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de ingreso a la empresa"
    )
    
    # IBC para Subcontratistas
    ibc_default = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Ingreso Base de Cotización por defecto para cálculo de seguridad social (típicamente 1 SMMLV para subcontratistas)"
    )
    
    # Información Adicional
    foto = models.ImageField(upload_to='empleados/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ['apellidos', 'nombres']

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"
    
    @property
    def usa_nomina_electronica(self):
        """Determina si el empleado requiere nómina electrónica DIAN"""
        if self.tipo_vinculacion:
            return self.tipo_vinculacion.requiere_nomina_electronica
        return False  # Por defecto, subcontratistas no requieren
    
    @property
    def es_subcontratista(self):
        """Verifica si el empleado es subcontratista"""
        return self.tipo_vinculacion and self.tipo_vinculacion.codigo == 'SUB'


# ============================================
# MODELO CONTRATO
# ============================================

class Contrato(TenantAwareModel):
    """Información contractual del empleado"""
    
    TIPO_SALARIO_CHOICES = [
        ('ORD', 'Ordinario'),
        ('INT', 'Integral'),
    ]
    
    JORNADA_CHOICES = [
        ('DIU', 'Diurna'),
        ('NOC', 'Nocturna'),
        ('MIX', 'Mixta'),
    ]
    
    NIVEL_RIESGO_CHOICES = [
        (1, 'Nivel I - Riesgo Mínimo'),
        (2, 'Nivel II - Riesgo Bajo'),
        (3, 'Nivel III - Riesgo Medio'),
        (4, 'Nivel IV - Riesgo Alto'),
        (5, 'Nivel V - Riesgo Máximo'),
    ]
    
    ESTADO_CHOICES = [
        ('ACT', 'Activo'),
        ('SUS', 'Suspendido'),
        ('TER', 'Terminado'),
    ]
    
    # Relaciones
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name='contratos'
    )
    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        help_text="Tipo de contrato laboral"
    )
    
    # Información Salarial
    tipo_salario = models.CharField(
        max_length=3,
        choices=TIPO_SALARIO_CHOICES,
        default='ORD',
        help_text="Ordinario o Integral"
    )
    salario_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Salario base mensual"
    )
    
    # Condiciones Laborales
    jornada = models.CharField(
        max_length=3,
        choices=JORNADA_CHOICES,
        default='DIU'
    )
    auxilio_transporte = models.BooleanField(
        default=True,
        help_text="Si aplica auxilio de transporte"
    )
    
    # Seguridad Social
    nivel_riesgo_arl = models.IntegerField(
        choices=NIVEL_RIESGO_CHOICES,
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Nivel de riesgo para ARL"
    )
    
    # Vigencia
    fecha_inicio = models.DateField(help_text="Fecha de inicio del contrato")
    fecha_fin = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de finalización (solo para contratos a término fijo u obra/labor)"
    )
    
    # Estado
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='ACT'
    )
    motivo_terminacion = models.TextField(
        blank=True,
        help_text="Motivo de terminación del contrato"
    )
    fecha_terminacion_real = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha real de terminación del contrato"
    )
    
    # Auditoría
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"Contrato {self.empleado.nombre_completo} - {self.tipo_contrato.nombre} ({self.fecha_inicio})"
    
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        # Validar que contratos a término fijo tengan fecha de finalización
        if self.tipo_contrato and self.tipo_contrato.requiere_fecha_fin and not self.fecha_fin:
            raise ValidationError({
                'fecha_fin': f'El tipo de contrato {self.tipo_contrato.nombre} requiere fecha de finalización'
            })
        
        # Validar que fecha_fin sea posterior a fecha_inicio
        if self.fecha_fin and self.fecha_inicio and self.fecha_fin <= self.fecha_inicio:
            raise ValidationError({
                'fecha_fin': 'La fecha de finalización debe ser posterior a la fecha de inicio'
            })
    
    @property
    def esta_activo(self):
        """Verifica si el contrato está activo"""
        if self.estado != 'ACT':
            return False
        if self.fecha_fin and date.today() > self.fecha_fin:
            return False
        return True
    
    @property
    def requiere_nomina_electronica(self):
        """Determina si este contrato requiere nómina electrónica DIAN"""
        return self.empleado.usa_nomina_electronica


# ============================================
# MODELO PERIODO DE NÓMINA
# ============================================

class PeriodoNomina(TenantAwareModel):
    """Periodo de liquidación de nómina"""
    
    TIPO_CHOICES = [
        ('MEN', 'Mensual'),
        ('QUI', 'Quincenal'),
        ('SEM', 'Semanal'),
    ]
    
    ESTADO_CHOICES = [
        ('ABI', 'Abierto'),
        ('CER', 'Cerrado'),
        ('PAG', 'Pagado'),
        ('APR', 'Aprobado'),
    ]
    
    nombre = models.CharField(
        max_length=100,
        help_text="Ej: Nómina Enero 2024, Quincena 1 Febrero 2024"
    )
    tipo = models.CharField(
        max_length=3,
        choices=TIPO_CHOICES,
        default='MEN'
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_pago = models.DateField(
        help_text="Fecha programada de pago"
    )
    fecha_pago_real = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha real en que se efectuó el pago"
    )
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='ABI'
    )
    observaciones = models.TextField(blank=True)
    
    # Auditoría
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)
    cerrado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='periodos_cerrados'
    )
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Periodo de Nómina"
        verbose_name_plural = "Periodos de Nómina"
        ordering = ['-fecha_inicio']
        unique_together = ['organization', 'fecha_inicio', 'fecha_fin']
    
    def __str__(self):
        return f"{self.nombre} ({self.fecha_inicio} - {self.fecha_fin})"
    
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        if self.fecha_fin <= self.fecha_inicio:
            raise ValidationError({
                'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio'
            })
        
        if self.fecha_pago < self.fecha_fin:
            raise ValidationError({
                'fecha_pago': 'La fecha de pago debe ser igual o posterior a la fecha de fin del periodo'
            })


# ============================================
# MODELO NÓMINA MEJORADO (SIMPLE + IBC)
# ============================================


class Nomina(TenantAwareModel):
    """
    Nómina mejorada con soporte para:
    - Subcontratistas con ingreso variable e IBC fijo
    - Cálculo automático de seguridad social
    - Separación entre ingreso real y excedente no salarial
    """
    
    # Relaciones
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE)
    periodo = models.ForeignKey(
        PeriodoNomina,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Periodo de nómina (opcional para nóminas antiguas)"
    )
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Contrato vigente al momento de la nómina"
    )
    
    # Fechas (mantener compatibilidad con nóminas antiguas)
    periodo_inicio = models.DateField()
    periodo_fin = models.DateField()
    
    # Días trabajados
    dias_trabajados = models.IntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(31)],
        help_text="Días efectivamente trabajados en el periodo"
    )
    dias_incapacidad = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Días de incapacidad"
    )
    dias_licencia = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Días de licencia"
    )
    
    # ==========================================
    # LÓGICA DE INGRESO REAL vs IBC (CRÍTICO)
    # ==========================================
    
    ingreso_real_periodo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Ingreso real del periodo (producción total para subcontratistas)"
    )
    
    ibc_cotizacion = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Ingreso Base de Cotización para seguridad social (típicamente 1 SMMLV para subcontratistas)"
    )
    
    excedente_no_salarial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Excedente sobre IBC (tratado como bonificación no salarial)"
    )
    
    # ==========================================
    # DEDUCCIONES (mejoradas)
    # ==========================================
    
    # Seguridad Social (sobre IBC)
    deduccion_salud = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="4% del IBC"
    )
    
    deduccion_pension = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="4% del IBC"
    )
    
    # Otras deducciones (mantener compatibilidad)
    prestamos = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Descuento por préstamos"
    )
    
    restaurante = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Descuento por restaurante"
    )
    
    otras_deducciones = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Otras deducciones"
    )
    
    # Campo legacy (mantener para migración)
    seguridad = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="LEGACY: Usar deduccion_salud + deduccion_pension"
    )
    
    # Observaciones
    observaciones = models.TextField(
        blank=True,
        help_text="Observaciones sobre esta nómina"
    )
    
    # Auditoría
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nómina"
        verbose_name_plural = "Nóminas"
        ordering = ['-periodo_fin']
        unique_together = ['empleado', 'periodo_inicio', 'periodo_fin']

    def __str__(self):
        return f"Nómina {self.empleado} - {self.periodo_inicio} a {self.periodo_fin}"
    
    # ==========================================
    # MÉTODOS DE CÁLCULO AUTOMÁTICO
    # ==========================================
    
    def calcular_automatico(self):
        """
        Calcula automáticamente todos los valores de la nómina
        LÓGICA CRÍTICA PARA SUBCONTRATISTAS:
        1. Calcula ingreso_real desde DetalleNomina (producción)
        2. Usa IBC del empleado para seguridad social
        3. Calcula excedente = ingreso_real - IBC (bonificación no salarial)
        4. Aplica 4% salud y 4% pensión SOLO sobre IBC
        """
        from decimal import Decimal
        
        # 1. Calcular ingreso real desde detalles de producción
        total_produccion = sum(
            Decimal(str(detalle.total)) 
            for detalle in self.detallenomina_set.all()
        ) or Decimal('0.00')
        self.ingreso_real_periodo = total_produccion.quantize(Decimal('0.01'))
        
        # 2. Obtener IBC (del empleado o del contrato)
        if self.empleado.es_subcontratista and self.empleado.ibc_default:
            self.ibc_cotizacion = self.empleado.ibc_default.quantize(Decimal('0.01'))
        elif self.contrato and self.contrato.salario_base:
            self.ibc_cotizacion = self.contrato.salario_base.quantize(Decimal('0.01'))
        else:
            # Si no hay IBC definido, usar ingreso real como IBC
            self.ibc_cotizacion = self.ingreso_real_periodo
        
        # 3. Calcular excedente no salarial
        if self.ingreso_real_periodo > self.ibc_cotizacion:
            self.excedente_no_salarial = (self.ingreso_real_periodo - self.ibc_cotizacion).quantize(Decimal('0.01'))
        else:
            self.excedente_no_salarial = Decimal('0.00')
        
        # 4. Calcular deducciones de seguridad social (4% + 4% sobre IBC)
        self.deduccion_salud = (self.ibc_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        self.deduccion_pension = (self.ibc_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        
        # Actualizar campo legacy
        self.seguridad = self.deduccion_salud + self.deduccion_pension
        
        return {
            'ingreso_real': self.ingreso_real_periodo,
            'ibc': self.ibc_cotizacion,
            'excedente_no_salarial': self.excedente_no_salarial,
            'salud': self.deduccion_salud,
            'pension': self.deduccion_pension,
            'neto': self.neto_pagar
        }

    @property
    def produccion(self):
        """Calcula el total de producción basado en los detalles"""
        from decimal import Decimal
        total = sum(detalle.total for detalle in self.detallenomina_set.all())
        return Decimal(str(total)) if total else Decimal('0.00')
    
    @property
    def total_deducciones(self):
        """Total de todas las deducciones"""
        return (
            self.deduccion_salud + 
            self.deduccion_pension + 
            self.prestamos + 
            self.restaurante + 
            self.otras_deducciones
        )
    
    @property
    def neto_pagar(self):
        """Neto a pagar al empleado"""
        return self.ingreso_real_periodo - self.total_deducciones

    @property
    def total(self):
        """LEGACY: Mantener compatibilidad con código anterior"""
        return self.neto_pagar
    
    @property
    def desglose_completo(self):
        """Retorna desglose completo para desprendible de pago"""
        return {
            'empleado': self.empleado.nombre_completo,
            'periodo': f"{self.periodo_inicio} - {self.periodo_fin}",
            'dias_trabajados': self.dias_trabajados,
            
            # Ingresos
            'ingreso_real': self.ingreso_real_periodo,
            'ibc_cotizacion': self.ibc_cotizacion,
            'excedente_no_salarial': self.excedente_no_salarial,
            
            # Deducciones
            'salud_4pct': self.deduccion_salud,
            'pension_4pct': self.deduccion_pension,
            'prestamos': self.prestamos,
            'restaurante': self.restaurante,
            'otras_deducciones': self.otras_deducciones,
            'total_deducciones': self.total_deducciones,
            
            # Neto
            'neto_pagar': self.neto_pagar,
        }


class DetalleNomina(TenantAwareModel):
    nomina = models.ForeignKey(Nomina, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    cantidad = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Detalle de Nómina"
        verbose_name_plural = "Detalles de Nómina"
        unique_together = ['nomina', 'item']

    def __str__(self):
        return f"{self.nomina.empleado} - {self.item.nombre}: {self.cantidad}"

    @property
    def total(self):
        """Calcula el total del detalle"""
        return self.cantidad * self.item.precio_unitario


# ============================================
# MODELOS DE INTEGRACIÓN (FASE 2A)
# ============================================

class TipoDeduccion(models.Model):
    """Catálogo de tipos de deducción para nómina"""
    CODIGO_CHOICES = [
        ('SALUD', 'Salud (4%)'),
        ('PENSION', 'Pensión (4%)'),
        ('PRESTAMO', 'Préstamo'),
        ('RETENCION', 'Retención en la Fuente'),
        ('EMBARGO', 'Embargo Judicial'),
        ('FONDO', 'Fondo de Empleados'),
        ('COOPERATIVA', 'Cooperativa'),
        ('RESTAURANTE', 'Restaurante'),
        ('SINDICATO', 'Cuota Sindical'),
        ('OTRO', 'Otra Deducción'),
    ]
    
    codigo = models.CharField(max_length=20, unique=True, choices=CODIGO_CHOICES)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    es_obligatoria = models.BooleanField(
        default=False,
        help_text="Si la deducción es obligatoria por ley"
    )
    aplica_sobre_ibc = models.BooleanField(
        default=False,
        help_text="Si la deducción se calcula sobre el IBC"
    )
    porcentaje_defecto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje por defecto si aplica"
    )
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Tipo de Deducción"
        verbose_name_plural = "Tipos de Deducción"
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class DetalleDeduccion(TenantAwareModel):
    """
    Detalle de deducciones aplicadas a una nómina.
    Permite trazabilidad y vinculación con préstamos u otros conceptos.
    """
    nomina = models.ForeignKey(
        Nomina,
        on_delete=models.CASCADE,
        related_name='deducciones_detalladas'
    )
    tipo_deduccion = models.ForeignKey(
        TipoDeduccion,
        on_delete=models.PROTECT,
        help_text="Tipo de deducción aplicada"
    )
    
    # Vinculación con préstamos
    prestamo = models.ForeignKey(
        'prestamos.Prestamo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deducciones_nomina',
        help_text="Préstamo relacionado si aplica"
    )
    pago_prestamo = models.ForeignKey(
        'prestamos.PagoPrestamo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deducciones_nomina',
        help_text="Pago específico del préstamo"
    )
    
    # Datos de la deducción
    concepto = models.CharField(
        max_length=200,
        help_text="Descripción del concepto"
    )
    base_calculo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Base sobre la cual se calculó (IBC, salario, etc.)"
    )
    porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje aplicado si corresponde"
    )
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Valor de la deducción"
    )
    
    # Observaciones
    observaciones = models.TextField(blank=True)
    
    # Auditoría
    creado_el = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deducciones_creadas'
    )
    
    class Meta:
        verbose_name = "Detalle de Deducción"
        verbose_name_plural = "Detalles de Deducciones"
        ordering = ['nomina', 'tipo_deduccion']
    
    def __str__(self):
        return f"{self.nomina.empleado.nombre_completo} - {self.concepto}: ${self.valor:,.2f}"
    
    def clean(self):
        """Validaciones personalizadas"""
        super().clean()
        
        # Si es deducción de préstamo, debe tener préstamo vinculado
        if self.tipo_deduccion.codigo == 'PRESTAMO' and not self.prestamo:
            raise ValidationError({
                'prestamo': 'Las deducciones tipo PRESTAMO deben tener un préstamo vinculado'
            })


class ComprobanteContableNomina(TenantAwareModel):
    """
    Comprobante contable generado automáticamente para una nómina.
    Registra todos los movimientos contables relacionados.
    """
    nomina = models.OneToOneField(
        Nomina,
        on_delete=models.CASCADE,
        related_name='comprobante_contable',
        help_text="Nómina que origina este comprobante"
    )
    comprobante = models.ForeignKey(
        'contabilidad.ComprobanteContable',
        on_delete=models.PROTECT,
        related_name='nominas',
        help_text="Comprobante contable generado"
    )
    
    # Resumen financiero
    total_devengado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Total devengado (ingreso real)"
    )
    total_deducciones = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Total de deducciones"
    )
    total_aportes_empresa = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total de aportes patronales (8.5% + 12% + ARL + parafiscales)"
    )
    neto_pagado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Neto pagado al empleado"
    )
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=[
            ('generado', 'Generado'),
            ('contabilizado', 'Contabilizado'),
            ('anulado', 'Anulado'),
        ],
        default='generado'
    )
    
    # Auditoría
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    generado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comprobantes_nomina_generados'
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Comprobante Contable de Nómina"
        verbose_name_plural = "Comprobantes Contables de Nómina"
        ordering = ['-fecha_generacion']
    
    def __str__(self):
        return f"Comprobante {self.comprobante.numero} - Nómina {self.nomina.empleado.nombre_completo}"
    
    @property
    def costo_total_empresa(self):
        """Costo total para la empresa (neto + aportes patronales)"""
        return self.neto_pagado + self.total_aportes_empresa


class HistorialNomina(TenantAwareModel):
    """
    Auditoría completa de cambios en nóminas.
    Registra quién, cuándo y qué cambió en cada nómina.
    """
    ACCION_CHOICES = [
        ('crear', 'Creación'),
        ('editar', 'Edición'),
        ('calcular', 'Cálculo Automático'),
        ('aprobar', 'Aprobación'),
        ('rechazar', 'Rechazo'),
        ('pagar', 'Registro de Pago'),
        ('anular', 'Anulación'),
    ]
    
    nomina = models.ForeignKey(
        Nomina,
        on_delete=models.CASCADE,
        related_name='historial'
    )
    accion = models.CharField(
        max_length=20,
        choices=ACCION_CHOICES
    )
    usuario = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Datos del cambio
    datos_anteriores = models.JSONField(
        null=True,
        blank=True,
        help_text="Estado anterior de la nómina"
    )
    datos_nuevos = models.JSONField(
        null=True,
        blank=True,
        help_text="Estado nuevo de la nómina"
    )
    campos_modificados = models.JSONField(
        null=True,
        blank=True,
        help_text="Lista de campos que cambiaron"
    )
    
    observaciones = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Dirección IP desde donde se realizó la acción"
    )
    
    class Meta:
        verbose_name = "Historial de Nómina"
        verbose_name_plural = "Historiales de Nómina"
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.nomina.empleado.nombre_completo} - {self.get_accion_display()} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"


# ============================================
# MODELOS DE NÓMINA ELECTRÓNICA (FASE 2B)
# ============================================


class NominaElectronica(TenantAwareModel):
    """
    Nómina electrónica según estándares DIAN (Resolución 000013 de 2021)
    Documento electrónico con validez jurídica para efectos tributarios
    INDEPENDIENTE de la nómina simple de RRHH
    """
    
    TIPO_DOCUMENTO_CHOICES = [
        ('102', 'Nómina individual'),
        ('103', 'Nómina individual de ajuste'),
    ]
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('generando', 'Generando XML'),
        ('generado', 'XML Generado'),
        ('firmando', 'Firmando Digitalmente'),
        ('firmado', 'Firmado Digitalmente'),
        ('enviando', 'Enviando a DIAN'),
        ('enviado', 'Enviado a DIAN'),
        ('aceptado', 'Aceptado por DIAN'),
        ('rechazado', 'Rechazado por DIAN'),
        ('error', 'Error en Proceso'),
    ]
    
    # Relaciones - AHORA OPCIONALES
    nomina = models.OneToOneField(
        Nomina,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nomina_electronica',
        help_text="Nómina simple de referencia (OPCIONAL)"
    )
    
    # Datos propios del empleado (independientes de Nomina)
    empleado = models.ForeignKey(
        'Empleado',
        on_delete=models.PROTECT,
        null=True,  # Temporal para migración
        blank=True,
        related_name='nominas_electronicas',
        help_text="Empleado de la nómina electrónica"
    )
    
    periodo = models.ForeignKey(
        'PeriodoNomina',
        on_delete=models.PROTECT,
        null=True,  # Temporal para migración
        blank=True,
        related_name='nominas_electronicas',
        help_text="Periodo de la nómina electrónica"
    )
    
    periodo_inicio = models.DateField(
        null=True,  # Temporal para migración
        blank=True,
        verbose_name="Fecha Inicio del Periodo"
    )
    periodo_fin = models.DateField(
        null=True,  # Temporal para migración
        blank=True,
        verbose_name="Fecha Fin del Periodo"
    )
    dias_trabajados = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Días efectivos trabajados en el periodo"
    )
    
    # Identificación del documento
    cune = models.CharField(
        max_length=96,
        unique=True,
        null=True,
        blank=True,
        verbose_name="CUNE",
        help_text="Código Único de Nómina Electrónica (SHA-384)"
    )
    
    numero_documento = models.CharField(
        max_length=50,
        unique=True,
        blank=True,  # Permitir vacío para autogenerar
        verbose_name="Número de Documento",
        help_text="Número único del documento electrónico (ej: NE-2024-00001)"
    )
    
    tipo_documento = models.CharField(
        max_length=3,
        choices=TIPO_DOCUMENTO_CHOICES,
        default='102',
        verbose_name="Tipo de Documento"
    )
    
    prefijo = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Prefijo",
        help_text="Prefijo de numeración autorizado por DIAN"
    )
    
    # Fechas
    fecha_generacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Generación"
    )
    
    fecha_emision = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de Emisión",
        help_text="Fecha y hora de emisión del documento"
    )
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador',
        verbose_name="Estado"
    )
    
    # Archivos generados
    xml_contenido = models.TextField(
        blank=True,
        verbose_name="Contenido XML",
        help_text="XML generado según esquema DIAN"
    )
    
    xml_firmado = models.TextField(
        blank=True,
        verbose_name="XML Firmado",
        help_text="XML con firma digital incluida"
    )
    
    pdf_generado = models.FileField(
        upload_to='nominas_electronicas/pdf/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="PDF Generado",
        help_text="Representación gráfica del documento"
    )
    
    # Respuesta DIAN
    track_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Track ID DIAN",
        help_text="Identificador de seguimiento DIAN"
    )
    
    codigo_respuesta = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Código de Respuesta",
        help_text="Código de respuesta de DIAN"
    )
    
    mensaje_respuesta = models.TextField(
        blank=True,
        verbose_name="Mensaje de Respuesta",
        help_text="Mensaje completo de respuesta de DIAN"
    )
    
    fecha_validacion_dian = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de Validación DIAN"
    )
    
    # Errores
    errores = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Errores",
        help_text="Lista de errores de validación"
    )
    
    # Auditoría
    generado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nominas_electronicas_generadas',
        verbose_name="Generado por"
    )
    
    fecha_envio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de Envío a DIAN"
    )
    
    intentos_envio = models.IntegerField(
        default=0,
        verbose_name="Intentos de Envío"
    )
    
    ultimo_intento = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Último Intento de Envío"
    )
    
    observaciones = models.TextField(
        blank=True,
        verbose_name="Observaciones"
    )
    
    class Meta:
        verbose_name = "Nómina Electrónica"
        verbose_name_plural = "Nóminas Electrónicas"
        ordering = ['-fecha_generacion']
        indexes = [
            models.Index(fields=['cune']),
            models.Index(fields=['numero_documento']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_emision']),
        ]
    
    def __str__(self):
        return f"{self.numero_documento} - {self.nomina.empleado.nombre_completo} - {self.get_estado_display()}"
    
    def generar_numero_documento(self):
        """Genera el número de documento electrónico"""
        if not self.numero_documento:
            from datetime import datetime
            año = datetime.now().year
            ultimo = NominaElectronica.objects.filter(
                organization=self.organization,
                numero_documento__startswith=f"NE-{año}"
            ).count()
            
            if self.prefijo:
                self.numero_documento = f"{self.prefijo}{año}{ultimo + 1:06d}"
            else:
                self.numero_documento = f"NE-{año}-{ultimo + 1:06d}"
    
    def generar_cune(self):
        """
        Genera el CUNE (Código Único de Nómina Electrónica)
        SHA-384 de concatenación según especificación DIAN
        """
        import hashlib
        
        # Elementos para generar CUNE según DIAN
        elementos = [
            str(self.numero_documento),
            self.fecha_emision.strftime('%Y-%m-%d') if self.fecha_emision else '',
            str(self.nomina.ingreso_real_periodo),
            str(self.nomina.total_deducciones),
            str(self.nomina.neto_pagar),
            str(self.organization.nit),
            str(self.nomina.empleado.documento),
            # TODO: Agregar clave técnica de software (configuración)
        ]
        
        cadena = ''.join(elementos)
        self.cune = hashlib.sha384(cadena.encode()).hexdigest()
        return self.cune
    
    @property
    def puede_enviar(self):
        """Verifica si el documento puede ser enviado a DIAN"""
        return self.estado in ['firmado', 'rechazado'] and self.xml_firmado
    
    @property
    def esta_aceptado(self):
        """Verifica si el documento fue aceptado por DIAN"""
        return self.estado == 'aceptado'


class DevengadoNominaElectronica(TenantAwareModel):
    """
    Devengados de nómina electrónica según estructura DIAN
    Incluye todos los conceptos que incrementan el pago
    """
    
    TIPO_DEVENGADO_CHOICES = [
        ('basico', 'Sueldo Básico'),
        ('auxilio_transporte', 'Auxilio de Transporte'),
        ('horas_extras', 'Horas Extras'),
        ('recargos', 'Recargos'),
        ('comisiones', 'Comisiones'),
        ('bonificaciones', 'Bonificaciones'),
        ('auxilio_no_salarial', 'Auxilio No Salarial'),
        ('primas', 'Primas'),
        ('cesantias', 'Cesantías'),
        ('intereses_cesantias', 'Intereses de Cesantías'),
        ('vacaciones', 'Vacaciones'),
        ('incapacidad', 'Incapacidad'),
        ('licencia_remunerada', 'Licencia Remunerada'),
        ('otro', 'Otro Devengado'),
    ]
    
    nomina_electronica = models.ForeignKey(
        NominaElectronica,
        on_delete=models.CASCADE,
        related_name='devengados'
    )
    
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_DEVENGADO_CHOICES,
        verbose_name="Tipo de Devengado"
    )
    
    concepto = models.CharField(
        max_length=200,
        verbose_name="Concepto"
    )
    
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Cantidad",
        help_text="Cantidad de unidades (horas, días, etc.)"
    )
    
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Valor Unitario"
    )
    
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Valor Total"
    )
    
    es_salarial = models.BooleanField(
        default=True,
        verbose_name="Es Salarial",
        help_text="Si el concepto tiene naturaleza salarial"
    )
    
    class Meta:
        verbose_name = "Devengado Nómina Electrónica"
        verbose_name_plural = "Devengados Nómina Electrónica"
        ordering = ['nomina_electronica', 'tipo']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - ${self.valor_total:,.2f}"


class DeduccionNominaElectronica(TenantAwareModel):
    """
    Deducciones de nómina electrónica según estructura DIAN
    Incluye todos los conceptos que disminuyen el pago
    """
    
    TIPO_DEDUCCION_CHOICES = [
        ('salud', 'Salud'),
        ('pension', 'Pensión'),
        ('fondo_solidaridad', 'Fondo de Solidaridad Pensional'),
        ('fondo_subsistencia', 'Fondo de Subsistencia'),
        ('retencion_fuente', 'Retención en la Fuente'),
        ('afc', 'Ahorro AFC'),
        ('cooperativa', 'Cooperativa'),
        ('embargo', 'Embargo Fiscal'),
        ('plan_complementario', 'Plan Complementario'),
        ('educacion', 'Educación'),
        ('reintegro', 'Reintegro'),
        ('deuda', 'Deuda'),
        ('sindicato', 'Cuota Sindical'),
        ('libranza', 'Libranza'),
        ('otra', 'Otra Deducción'),
    ]
    
    nomina_electronica = models.ForeignKey(
        NominaElectronica,
        on_delete=models.CASCADE,
        related_name='deducciones'
    )
    
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_DEDUCCION_CHOICES,
        verbose_name="Tipo de Deducción"
    )
    
    concepto = models.CharField(
        max_length=200,
        verbose_name="Concepto"
    )
    
    porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Porcentaje"
    )
    
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Valor"
    )
    
    class Meta:
        verbose_name = "Deducción Nómina Electrónica"
        verbose_name_plural = "Deducciones Nómina Electrónica"
        ordering = ['nomina_electronica', 'tipo']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - ${self.valor:,.2f}"


class ConfiguracionNominaElectronica(TenantAwareModel):
    """
    Configuración para generación de nómina electrónica
    Incluye datos del empleador y parámetros técnicos
    Cumple con requisitos técnicos DIAN Resolución 000013 de 2021
    """
    
    AMBIENTE_CHOICES = [
        ('pruebas', 'Ambiente de Pruebas (Habilitación)'),
        ('produccion', 'Ambiente de Producción'),
    ]
    
    TIPO_AMBIENTE_CHOICES = [
        (1, 'Producción'),
        (2, 'Habilitación/Pruebas'),
    ]
    
    TIPO_REGIMEN_CHOICES = [
        ('48', 'Responsable de IVA'),
        ('49', 'No responsable de IVA'),
    ]
    
    # Configuración activa (solo una por organización)
    activa = models.BooleanField(
        default=True,
        verbose_name="Configuración Activa"
    )
    
    # Ambiente DIAN
    ambiente = models.CharField(
        max_length=20,
        choices=AMBIENTE_CHOICES,
        default='pruebas',
        verbose_name="Ambiente"
    )
    
    tipo_ambiente_id = models.IntegerField(
        choices=TIPO_AMBIENTE_CHOICES,
        default=2,
        verbose_name="Tipo de Ambiente ID",
        help_text="1=Producción, 2=Habilitación"
    )
    
    # ============================================
    # DATOS DEL EMPLEADOR (OBLIGATORIOS DIAN)
    # ============================================
    
    razon_social = models.CharField(
        max_length=200,
        verbose_name="Razón Social"
    )
    
    nombre_comercial = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Nombre Comercial",
        help_text="Si es diferente a la razón social"
    )
    
    nit = models.CharField(
        max_length=20,
        verbose_name="NIT"
    )
    
    dv = models.CharField(
        max_length=1,
        verbose_name="Dígito de Verificación"
    )
    
    tipo_regimen = models.CharField(
        max_length=2,
        choices=TIPO_REGIMEN_CHOICES,
        default='48',
        verbose_name="Tipo de Régimen Fiscal"
    )
    
    responsabilidades_tributarias = models.JSONField(
        default=list,
        verbose_name="Responsabilidades Tributarias",
        help_text="Códigos DIAN: ['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN']"
    )
    
    codigo_actividad_economica = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Código Actividad Económica (CIIU)",
        help_text="Código CIIU de la actividad principal"
    )
    
    # Ubicación geográfica (códigos DANE/DIVIPOLA)
    pais_codigo = models.CharField(
        max_length=2,
        default='CO',
        verbose_name="Código País",
        help_text="Código ISO 3166-1 alpha-2 (CO=Colombia)"
    )
    
    departamento_codigo = models.CharField(
        max_length=2,
        verbose_name="Código Departamento DANE",
        help_text="Código DANE del departamento (ej: 11=Bogotá, 05=Antioquia)"
    )
    
    municipio_codigo = models.CharField(
        max_length=5,
        verbose_name="Código Municipio DANE",
        help_text="Código DANE completo (ej: 11001=Bogotá, 05001=Medellín)"
    )
    
    direccion = models.CharField(
        max_length=200,
        verbose_name="Dirección"
    )
    
    telefono = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Teléfono"
    )
    
    email = models.EmailField(
        verbose_name="Correo Electrónico"
    )
    
    # ============================================
    # NUMERACIÓN AUTORIZADA DIAN
    # ============================================
    
    prefijo = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Prefijo Autorizado",
        help_text="Prefijo de la numeración (ej: NE, NOM)"
    )
    
    resolucion_numero = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Número de Resolución DIAN"
    )
    
    resolucion_fecha = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de Resolución"
    )
    
    rango_inicio = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name="Rango Inicial Autorizado"
    )
    
    rango_fin = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name="Rango Final Autorizado"
    )
    
    consecutivo_actual = models.BigIntegerField(
        default=1,
        verbose_name="Consecutivo Actual",
        help_text="Próximo número a utilizar"
    )
    
    fecha_vigencia_desde = models.DateField(
        null=True,
        blank=True,
        verbose_name="Vigencia Desde"
    )
    
    fecha_vigencia_hasta = models.DateField(
        null=True,
        blank=True,
        verbose_name="Vigencia Hasta"
    )
    
    # ============================================
    # PROVEEDOR TECNOLÓGICO (OBLIGATORIO)
    # ============================================
    
    proveedor_razon_social = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Razón Social Proveedor Tecnológico"
    )
    
    proveedor_nit = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="NIT Proveedor Tecnológico"
    )
    
    proveedor_software_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Software ID del Proveedor",
        help_text="ID del software del proveedor tecnológico"
    )
    
    # ============================================
    # PARÁMETROS TÉCNICOS SOFTWARE
    # ============================================
    
    identificador_software = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Identificador de Software",
        help_text="ID del software registrado ante DIAN (Software ID del empleador)"
    )
    
    clave_tecnica = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Clave Técnica",
        help_text="Clave técnica del software (PIN de software)"
    )
    
    test_set_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Test Set ID",
        help_text="Identificador del set de pruebas para ambiente de habilitación"
    )
    
    # ============================================
    # CERTIFICADO DIGITAL (.p12/.pfx)
    # ============================================
    
    certificado_archivo = models.FileField(
        upload_to='certificados_digitales/',
        null=True,
        blank=True,
        verbose_name="Archivo de Certificado (.p12/.pfx)"
    )
    
    certificado_password = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Contraseña del Certificado"
    )
    
    certificado_fecha_vencimiento = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de Vencimiento del Certificado"
    )
    
    certificado_emisor = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Emisor del Certificado"
    )
    
    certificado_numero_serie = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Número de Serie del Certificado"
    )
    
    # ============================================
    # URLs DE SERVICIOS WEB DIAN
    # ============================================
    
    url_webservice = models.URLField(
        blank=True,
        verbose_name="URL WebService Principal DIAN",
        help_text="URL base del servicio web de DIAN"
    )
    
    url_validacion_previa = models.URLField(
        blank=True,
        verbose_name="URL Validación Previa",
        help_text="Endpoint para validación previa del documento"
    )
    
    url_recepcion = models.URLField(
        blank=True,
        verbose_name="URL Recepción Documentos",
        help_text="Endpoint para recepción de documentos electrónicos"
    )
    
    url_consulta = models.URLField(
        blank=True,
        verbose_name="URL Consulta Estado",
        help_text="Endpoint para consultar estado de documentos"
    )
    
    # Configuración de envío
    envio_automatico = models.BooleanField(
        default=False,
        verbose_name="Envío Automático",
        help_text="Enviar automáticamente a DIAN tras generación"
    )
    
    notificar_empleado = models.BooleanField(
        default=True,
        verbose_name="Notificar al Empleado",
        help_text="Enviar correo al empleado con el documento"
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuración Nómina Electrónica"
        verbose_name_plural = "Configuraciones Nómina Electrónica"
        unique_together = [['organization', 'activa']]
    
    def __str__(self):
        return f"{self.razon_social} - {self.get_ambiente_display()}"
    
    def save(self, *args, **kwargs):
        # Si se marca como activa, desactivar las demás configuraciones
        if self.activa:
            ConfiguracionNominaElectronica.objects.filter(
                organization=self.organization,
                activa=True
            ).exclude(id=self.id).update(activa=False)
        super().save(*args, **kwargs)


# ============================================
# FASE 3: WEBHOOKS Y NOTIFICACIONES
# ============================================

class WebhookConfig(TenantAwareModel):
    """
    Configuración de webhooks para notificaciones de eventos
    """
    nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre del Webhook"
    )
    
    url = models.URLField(
        verbose_name="URL del Webhook",
        help_text="URL que recibirá las notificaciones"
    )
    
    secret = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Secret Key",
        help_text="Clave secreta para firma HMAC"
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )
    
    EVENTOS_CHOICES = [
        ('nomina.generada', 'Nómina Generada'),
        ('nomina.firmada', 'Nómina Firmada'),
        ('nomina.enviada', 'Nómina Enviada'),
        ('nomina.aceptada', 'Nómina Aceptada'),
        ('nomina.rechazada', 'Nómina Rechazada'),
        ('nomina.error', 'Error en Nómina'),
        ('todos', 'Todos los Eventos'),
    ]
    
    eventos = models.JSONField(
        default=list,
        verbose_name="Eventos Suscritos",
        help_text="Lista de eventos que disparan este webhook"
    )
    
    # Configuración de reintentos
    reintentos_maximos = models.IntegerField(
        default=3,
        verbose_name="Reintentos Máximos"
    )
    
    timeout_segundos = models.IntegerField(
        default=10,
        verbose_name="Timeout (segundos)"
    )
    
    # Estadísticas
    total_disparos = models.IntegerField(
        default=0,
        verbose_name="Total de Disparos"
    )
    
    total_exitosos = models.IntegerField(
        default=0,
        verbose_name="Total Exitosos"
    )
    
    total_fallidos = models.IntegerField(
        default=0,
        verbose_name="Total Fallidos"
    )
    
    ultimo_disparo = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Último Disparo"
    )
    
    ultimo_estado = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('exito', 'Éxito'),
            ('error', 'Error'),
            ('timeout', 'Timeout'),
        ],
        verbose_name="Último Estado"
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Webhook"
        verbose_name_plural = "Webhooks"
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.nombre} - {self.url}"
    
    def registrar_disparo(self, exitoso: bool):
        """Registra estadísticas de un disparo"""
        from django.utils import timezone
        
        self.total_disparos += 1
        if exitoso:
            self.total_exitosos += 1
            self.ultimo_estado = 'exito'
        else:
            self.total_fallidos += 1
            self.ultimo_estado = 'error'
        
        self.ultimo_disparo = timezone.now()
        self.save(update_fields=[
            'total_disparos', 'total_exitosos', 'total_fallidos',
            'ultimo_disparo', 'ultimo_estado'
        ])


class WebhookLog(models.Model):
    """
    Log de disparos de webhooks
    """
    webhook = models.ForeignKey(
        WebhookConfig,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    
    evento = models.CharField(max_length=50)
    
    payload = models.JSONField(
        verbose_name="Payload Enviado"
    )
    
    codigo_respuesta = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Código HTTP"
    )
    
    respuesta = models.TextField(
        blank=True,
        verbose_name="Respuesta del Webhook"
    )
    
    exitoso = models.BooleanField(
        default=False,
        verbose_name="Exitoso"
    )
    
    error = models.TextField(
        blank=True,
        verbose_name="Error"
    )
    
    tiempo_respuesta = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Tiempo de Respuesta (s)"
    )
    
    fecha_disparo = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Log de Webhook"
        verbose_name_plural = "Logs de Webhooks"
        ordering = ['-fecha_disparo']
        indexes = [
            models.Index(fields=['-fecha_disparo']),
            models.Index(fields=['webhook', '-fecha_disparo']),
        ]
    
    def __str__(self):
        return f"{self.webhook.nombre} - {self.evento} - {self.fecha_disparo}"

