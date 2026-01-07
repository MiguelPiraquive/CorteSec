"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MODELOS DE NÓMINA - ARQUITECTURA DEFINITIVA                ║
║                              CorteSec v3.0                                    ║
║                         Sistema de Construcción                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXTO:
---------
Sistema de nómina para construcción con pago por producción (items de obra).
Soporta cálculos de seguridad social según legislación colombiana (Ley 100/1993).

ARQUITECTURA:
-------------
- NominaBase: Clase abstracta con lógica compartida de cálculo
- NominaSimple: Nómina interna RRHH (hereda NominaBase)
- NominaElectronica: Nómina DIAN (hereda NominaBase)
- DetalleItemBase: Clase abstracta para items de trabajo

AUTOR: Sistema CorteSec
FECHA: Enero 2026
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import date
import uuid

from core.mixins import TenantAwareModel
from locations.models import Departamento, Municipio
from items.models import Item
from cargos.models import Cargo


# ══════════════════════════════════════════════════════════════════════════════
# CATÁLOGOS BASE
# ══════════════════════════════════════════════════════════════════════════════

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


class ConceptoLaboral(TenantAwareModel):
    """
    Catálogo único de conceptos laborales para devengados y deducciones.
    Compartido entre NominaSimple y NominaElectronica para garantizar consistencia.
    """
    
    TIPO_CONCEPTO_CHOICES = [
        ('DEV', 'Devengado'),
        ('DED', 'Deducción'),
        ('APO', 'Aporte'),
    ]
    
    codigo = models.CharField(
        max_length=20,
        unique=True,
        help_text="Código único del concepto (ej: SAL_BASE, AUX_TRANS, HOR_EXTRA)"
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    tipo_concepto = models.CharField(max_length=3, choices=TIPO_CONCEPTO_CHOICES)
    
    # Características del concepto
    es_salarial = models.BooleanField(
        default=False,
        help_text="Si aporta a base de cotización de seguridad social"
    )
    aplica_seguridad_social = models.BooleanField(
        default=False,
        help_text="Si se calcula automáticamente (ej: salud, pensión)"
    )
    es_item_construccion = models.BooleanField(
        default=False,
        help_text="Si es un item de construcción (vinculado a Item model)"
    )
    
    # Integración DIAN (Nómina Electrónica)
    codigo_dian = models.CharField(
        max_length=10,
        blank=True,
        help_text="Código según catálogo DIAN para nómina electrónica"
    )
    
    # Control
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(
        default=0,
        help_text="Orden de presentación en formularios"
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Concepto Laboral"
        verbose_name_plural = "Conceptos Laborales"
        ordering = ['tipo_concepto', 'orden', 'nombre']
        unique_together = [['organization', 'codigo']]
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    @property
    def es_devengado(self):
        return self.tipo_concepto == 'DEV'
    
    @property
    def es_deduccion(self):
        return self.tipo_concepto == 'DED'


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


# ══════════════════════════════════════════════════════════════════════════════
# EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

class Empleado(TenantAwareModel):
    """Empleado o Subcontratista"""
    
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
        blank=True
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
        help_text="Tipo de vinculación laboral"
    )
    fecha_ingreso = models.DateField(null=True, blank=True)
    
    # IBC para Subcontratistas (CRÍTICO)
    ibc_default = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="IBC por defecto para cálculo de seguridad social (típicamente 1 SMMLV para subcontratistas)"
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
        return False
    
    @property
    def es_subcontratista(self):
        """Verifica si el empleado es subcontratista"""
        return self.tipo_vinculacion and self.tipo_vinculacion.codigo == 'SUB'


# ══════════════════════════════════════════════════════════════════════════════
# CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

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
    
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name='contratos')
    tipo_contrato = models.ForeignKey(TipoContrato, on_delete=models.PROTECT)
    
    # Información Salarial
    tipo_salario = models.CharField(max_length=3, choices=TIPO_SALARIO_CHOICES, default='ORD')
    salario_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Salario base mensual del contrato"
    )
    
    # Condiciones Laborales
    jornada = models.CharField(max_length=3, choices=JORNADA_CHOICES, default='DIU')
    auxilio_transporte = models.BooleanField(default=True)
    nivel_riesgo_arl = models.IntegerField(
        choices=NIVEL_RIESGO_CHOICES,
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    # Vigencia
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    
    # Estado
    estado = models.CharField(max_length=3, choices=ESTADO_CHOICES, default='ACT')
    motivo_terminacion = models.TextField(blank=True)
    fecha_terminacion_real = models.DateField(null=True, blank=True)
    
    creado_el = models.DateTimeField(auto_now_add=True)
    actualizado_el = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"Contrato {self.empleado.nombre_completo} - {self.tipo_contrato.nombre}"
    
    @property
    def esta_activo(self):
        if self.estado != 'ACT':
            return False
        if self.fecha_fin and date.today() > self.fecha_fin:
            return False
        return True
    
    @property
    def nivel_riesgo(self):
        """Alias para compatibilidad"""
        return self.nivel_riesgo_arl


# ══════════════════════════════════════════════════════════════════════════════
# PERIODO DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

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
    
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=3, choices=TIPO_CHOICES, default='MEN')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_pago = models.DateField()
    fecha_pago_real = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=3, choices=ESTADO_CHOICES, default='ABI')
    observaciones = models.TextField(blank=True)
    
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


# ══════════════════════════════════════════════════════════════════════════════
# CLASE BASE ABSTRACTA: NÓMINA BASE
# ══════════════════════════════════════════════════════════════════════════════

class NominaBase(TenantAwareModel):
    """
    Clase abstracta base para Nóminas (Simple y Electrónica)
    
    Contiene TODA la lógica común de cálculo laboral según legislación colombiana.
    
    FLUJO:
    ------
    1. Items de trabajo (producción) → total_items
    2. Salario base contrato → salario_base_contrato (para seguridad social)
    3. Cálculos legales sobre salario_base_contrato
    4. Deducciones (seguridad social + préstamos + otros)
    5. Neto = total_items - deducciones
    """
    
    # ═══════════════════════════════════════════════════════════════════════
    # INFORMACIÓN BÁSICA
    # ═══════════════════════════════════════════════════════════════════════
    empleado = models.ForeignKey(Empleado, on_delete=models.PROTECT)
    periodo = models.ForeignKey(PeriodoNomina, on_delete=models.PROTECT)
    periodo_inicio = models.DateField()
    periodo_fin = models.DateField()
    dias_trabajados = models.PositiveIntegerField(default=0)
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 1: ITEMS DE TRABAJO (LO QUE GANÓ)
    # ═══════════════════════════════════════════════════════════════════════
    total_items = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Suma total de todos los items trabajados"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 2: SALARIO BASE DEL CONTRATO (PARA CÁLCULOS LEGALES)
    # ═══════════════════════════════════════════════════════════════════════
    salario_base_contrato = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Salario base del contrato (usado para seguridad social)"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 3: CÁLCULOS DE SEGURIDAD SOCIAL (Ley 100/1993)
    # ═══════════════════════════════════════════════════════════════════════
    base_cotizacion = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="IBC = Salario base del contrato (tope 25 SMMLV)"
    )
    excedente_no_salarial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Excedente sobre 25 SMMLV (no cotiza)"
    )
    
    # Aportes empleado (SE DESCUENTAN)
    aporte_salud_empleado = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aporte_pension_empleado = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Aportes empleador (NO SE DESCUENTAN)
    aporte_salud_empleador = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aporte_pension_empleador = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aporte_arl = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # Parafiscales (NO SE DESCUENTAN)
    aporte_sena = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aporte_icbf = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    aporte_caja_compensacion = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 4: PROVISIONES (NO SE DESCUENTAN)
    # ═══════════════════════════════════════════════════════════════════════
    provision_cesantias = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    provision_intereses_cesantias = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    provision_prima = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    provision_vacaciones = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 5: DEDUCCIONES (LO QUE SE LE DESCUENTA)
    # ═══════════════════════════════════════════════════════════════════════
    deduccion_prestamos = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    deduccion_restaurante = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    deduccion_anticipos = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    otras_deducciones = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_deducciones = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 6: RESULTADO FINAL
    # ═══════════════════════════════════════════════════════════════════════
    neto_pagar = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="total_items - total_deducciones"
    )
    
    # Metadatos
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_creadas'
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        abstract = True
    
    # ═══════════════════════════════════════════════════════════════════════
    # MÉTODOS DE CÁLCULO
    # ═══════════════════════════════════════════════════════════════════════
    
    def calcular_ibc(self):
        """Calcula el Ingreso Base de Cotización (IBC) con tope 25 SMMLV"""
        SMMLV_2026 = Decimal('1423500')
        TOPE_IBC = 25 * SMMLV_2026
        
        if self.salario_base_contrato <= TOPE_IBC:
            self.base_cotizacion = self.salario_base_contrato
            self.excedente_no_salarial = Decimal('0.00')
        else:
            self.base_cotizacion = TOPE_IBC
            self.excedente_no_salarial = self.salario_base_contrato - TOPE_IBC
    
    def calcular_seguridad_social(self):
        """Calcula aportes de seguridad social según Ley 100/1993"""
        self.calcular_ibc()
        
        # Aportes empleado (SE DESCUENTAN)
        self.aporte_salud_empleado = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        self.aporte_pension_empleado = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        
        # Aportes empleador (NO SE DESCUENTAN)
        self.aporte_salud_empleador = (self.base_cotizacion * Decimal('0.085')).quantize(Decimal('0.01'))
        self.aporte_pension_empleador = (self.base_cotizacion * Decimal('0.12')).quantize(Decimal('0.01'))
        
        # ARL según nivel de riesgo
        try:
            contrato_activo = self.empleado.contratos.filter(estado='ACT').first()
            if contrato_activo:
                tasas_arl = {
                    1: Decimal('0.00522'),
                    2: Decimal('0.01044'),
                    3: Decimal('0.02436'),
                    4: Decimal('0.04350'),
                    5: Decimal('0.06960'),
                }
                tasa = tasas_arl.get(contrato_activo.nivel_riesgo_arl, Decimal('0.00522'))
                self.aporte_arl = (self.base_cotizacion * tasa).quantize(Decimal('0.01'))
        except:
            self.aporte_arl = Decimal('0.00')
    
    def calcular_parafiscales(self):
        """Calcula aportes parafiscales (SENA, ICBF, Caja)"""
        self.aporte_sena = (self.base_cotizacion * Decimal('0.02')).quantize(Decimal('0.01'))
        self.aporte_icbf = (self.base_cotizacion * Decimal('0.03')).quantize(Decimal('0.01'))
        self.aporte_caja_compensacion = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
    
    def calcular_provisiones(self):
        """Calcula provisiones mensuales sobre salario_base_contrato"""
        self.provision_cesantias = (self.salario_base_contrato * Decimal('0.0833')).quantize(Decimal('0.01'))
        self.provision_intereses_cesantias = (self.provision_cesantias * Decimal('0.01')).quantize(Decimal('0.01'))
        self.provision_prima = (self.salario_base_contrato * Decimal('0.0833')).quantize(Decimal('0.01'))
        self.provision_vacaciones = (self.salario_base_contrato * Decimal('0.0417')).quantize(Decimal('0.01'))
    
    def calcular_deduccion_prestamos(self):
        """Calcula el total a descontar por préstamos activos"""
        from prestamos.models import Prestamo
        total = Decimal('0.00')
        
        prestamos_activos = Prestamo.objects.filter(
            empleado=self.empleado,
            estado='APR',
            saldo_pendiente__gt=Decimal('0.00')
        )
        
        for prestamo in prestamos_activos:
            if hasattr(prestamo, 'corresponde_descontar_en_periodo'):
                if prestamo.corresponde_descontar_en_periodo(self.periodo):
                    total += prestamo.valor_cuota
        
        self.deduccion_prestamos = total
    
    def calcular_total_deducciones(self):
        """Suma TODAS las deducciones"""
        self.total_deducciones = (
            self.aporte_salud_empleado +
            self.aporte_pension_empleado +
            self.deduccion_prestamos +
            self.deduccion_restaurante +
            self.deduccion_anticipos +
            self.otras_deducciones
        ).quantize(Decimal('0.01'))
    
    def calcular_neto_pagar(self):
        """Calcula el neto a pagar: total_items - deducciones"""
        self.neto_pagar = (self.total_items - self.total_deducciones).quantize(Decimal('0.01'))
        
        if self.neto_pagar < Decimal('0.00'):
            raise ValidationError(
                f"El neto a pagar no puede ser negativo. "
                f"Items: ${self.total_items}, Deducciones: ${self.total_deducciones}"
            )
    
    def procesar_completo(self):
        """Ejecuta TODOS los cálculos en orden correcto"""
        # 1. Obtener salario base del contrato si no está
        if self.salario_base_contrato == Decimal('0.00'):
            try:
                contrato_activo = self.empleado.contratos.filter(estado='ACT').first()
                if contrato_activo:
                    self.salario_base_contrato = contrato_activo.salario_base
                elif self.empleado.es_subcontratista and self.empleado.ibc_default:
                    self.salario_base_contrato = self.empleado.ibc_default
                else:
                    raise ValidationError("No se encontró salario base del contrato")
            except:
                raise ValidationError("Error obteniendo salario base del contrato")
        
        # 2. Ejecutar cálculos
        self.calcular_ibc()
        self.calcular_seguridad_social()
        self.calcular_parafiscales()
        self.calcular_provisiones()
        self.calcular_deduccion_prestamos()
        self.calcular_total_deducciones()
        self.calcular_neto_pagar()
        
        # 3. Guardar
        self.save()


# ══════════════════════════════════════════════════════════════════════════════
# NÓMINA SIMPLE (RRHH INTERNO)
# ══════════════════════════════════════════════════════════════════════════════

class NominaSimple(NominaBase):
    """Nómina para uso interno de RRHH (hereda toda la lógica de NominaBase)"""
    
    ESTADO_CHOICES = [
        ('BOR', 'Borrador'),
        ('REV', 'En Revisión'),
        ('APR', 'Aprobada'),
        ('PAG', 'Pagada'),
        ('ANU', 'Anulada'),
    ]
    
    numero_interno = models.CharField(max_length=50, unique=True)
    estado = models.CharField(max_length=3, choices=ESTADO_CHOICES, default='BOR')
    aprobada_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nominas_simples_aprobadas'
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    fecha_pago = models.DateField(null=True, blank=True)
    comprobante_pago = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name = "Nómina Simple (RRHH)"
        verbose_name_plural = "Nóminas Simples (RRHH)"
        ordering = ['-fecha_creacion']
        unique_together = [['organization', 'empleado', 'periodo']]
    
    def __str__(self):
        return f"{self.numero_interno} - {self.empleado.nombre_completo} - {self.periodo}"
    
    def generar_numero_interno(self):
        """Genera el número interno de nómina"""
        if not self.numero_interno:
            from datetime import datetime
            año = datetime.now().year
            ultimo = NominaSimple.objects.filter(
                organization=self.organization,
                numero_interno__startswith=f"NOM-{año}"
            ).count()
            self.numero_interno = f"NOM-{año}-{ultimo + 1:06d}"


# ══════════════════════════════════════════════════════════════════════════════
# NÓMINA ELECTRÓNICA (DIAN)
# ══════════════════════════════════════════════════════════════════════════════

class NominaElectronica(NominaBase):
    """Nómina Electrónica para envío a DIAN (hereda toda la lógica de NominaBase)"""
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('validado', 'Validado'),
        ('enviado', 'Enviado a DIAN'),
        ('aceptado', 'Aceptado por DIAN'),
        ('rechazado', 'Rechazado por DIAN'),
        ('anulado', 'Anulado'),
    ]
    
    numero_documento = models.CharField(max_length=50, unique=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')
    
    # Información DIAN
    cune = models.CharField(max_length=255, blank=True)
    xml_contenido = models.TextField(blank=True)
    codigo_respuesta_dian = models.CharField(max_length=20, blank=True)
    mensaje_respuesta_dian = models.TextField(blank=True)
    fecha_envio_dian = models.DateTimeField(null=True, blank=True)
    fecha_respuesta_dian = models.DateTimeField(null=True, blank=True)
    
    # Vinculación OPCIONAL con nómina simple
    nomina_simple = models.OneToOneField(
        NominaSimple,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nomina_electronica',
        help_text="Nómina simple asociada (opcional)"
    )
    
    class Meta:
        verbose_name = "Nómina Electrónica (DIAN)"
        verbose_name_plural = "Nóminas Electrónicas (DIAN)"
        ordering = ['-fecha_creacion']
        unique_together = [['organization', 'empleado', 'periodo']]
    
    def __str__(self):
        return f"{self.numero_documento} - {self.empleado.nombre_completo} - {self.periodo}"
    
    def generar_numero_documento(self):
        """Genera el número de documento electrónico"""
        if not self.numero_documento:
            from datetime import datetime
            año = datetime.now().year
            ultimo = NominaElectronica.objects.filter(
                organization=self.organization,
                numero_documento__startswith=f"NE-{año}"
            ).count()
            self.numero_documento = f"NE-{año}-{ultimo + 1:06d}"


# ══════════════════════════════════════════════════════════════════════════════
# CLASE BASE ABSTRACTA: DETALLES DE ITEMS
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemBase(models.Model):
    """Clase abstracta para detalles de items de trabajo"""
    
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        """Auto-calcula valor_total"""
        self.valor_total = (self.cantidad * self.valor_unitario).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.item.nombre} - {self.cantidad} × ${self.valor_unitario}"


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES DE ITEMS
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaSimple(DetalleItemBase, TenantAwareModel):
    """Items de trabajo para Nómina Simple"""
    nomina = models.ForeignKey(NominaSimple, on_delete=models.CASCADE, related_name='detalles_items')
    
    class Meta:
        verbose_name = "Detalle Item Nómina Simple"
        verbose_name_plural = "Detalles Items Nómina Simple"
        ordering = ['item__nombre']


class DetalleItemNominaElectronica(DetalleItemBase, TenantAwareModel):
    """Items de trabajo para Nómina Electrónica"""
    nomina = models.ForeignKey(NominaElectronica, on_delete=models.CASCADE, related_name='detalles_items')
    codigo_dian = models.CharField(max_length=10, blank=True)
    
    class Meta:
        verbose_name = "Detalle Item Nómina Electrónica"
        verbose_name_plural = "Detalles Items Nómina Electrónica"
        ordering = ['item__nombre']


# ══════════════════════════════════════════════════════════════════════════════
# CLASE BASE ABSTRACTA: DETALLES DE CONCEPTOS
# ══════════════════════════════════════════════════════════════════════════════

class DetalleConceptoBase(models.Model):
    """
    Clase abstracta para detalles de conceptos laborales (devengados/deducciones).
    Permite registrar auxilio de transporte, bonificaciones, deducciones, etc.
    """
    
    concepto = models.ForeignKey(ConceptoLaboral, on_delete=models.PROTECT)
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Cantidad de unidades (ej: días, horas, etc.)"
    )
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Valor por unidad"
    )
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        """Auto-calcula valor_total"""
        self.valor_total = (self.cantidad * self.valor_unitario).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.concepto.nombre} - {self.cantidad} × ${self.valor_unitario}"


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES DE CONCEPTOS
# ══════════════════════════════════════════════════════════════════════════════

class DetalleConceptoNominaSimple(DetalleConceptoBase, TenantAwareModel):
    """
    Conceptos laborales para Nómina Simple.
    Ejemplos: Auxilio de transporte, bonificaciones, horas extras, etc.
    """
    nomina = models.ForeignKey(
        NominaSimple, 
        on_delete=models.CASCADE, 
        related_name='detalles_conceptos'
    )
    
    class Meta:
        verbose_name = "Detalle Concepto Nómina Simple"
        verbose_name_plural = "Detalles Conceptos Nómina Simple"
        ordering = ['concepto__tipo_concepto', 'concepto__orden']
        unique_together = [['nomina', 'concepto']]
    
    def clean(self):
        """Validar que el concepto sea activo"""
        if self.concepto and not self.concepto.activo:
            raise ValidationError(f"El concepto '{self.concepto.nombre}' no está activo.")


class DetalleConceptoNominaElectronica(DetalleConceptoBase, TenantAwareModel):
    """
    Conceptos laborales para Nómina Electrónica.
    Incluye código DIAN para el XML.
    """
    nomina = models.ForeignKey(
        NominaElectronica, 
        on_delete=models.CASCADE, 
        related_name='detalles_conceptos'
    )
    codigo_dian = models.CharField(
        max_length=10, 
        blank=True,
        help_text="Código DIAN automático del concepto o personalizado"
    )
    
    class Meta:
        verbose_name = "Detalle Concepto Nómina Electrónica"
        verbose_name_plural = "Detalles Conceptos Nómina Electrónica"
        ordering = ['concepto__tipo_concepto', 'concepto__orden']
        unique_together = [['nomina', 'concepto']]
    
    def save(self, *args, **kwargs):
        """Auto-asigna codigo_dian del concepto si no está definido"""
        if not self.codigo_dian and self.concepto.codigo_dian:
            self.codigo_dian = self.concepto.codigo_dian
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validar que el concepto sea activo"""
        if self.concepto and not self.concepto.activo:
            raise ValidationError(f"El concepto '{self.concepto.nombre}' no está activo.")


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE NÓMINA ELECTRÓNICA
# ══════════════════════════════════════════════════════════════════════════════

class ConfiguracionNominaElectronica(TenantAwareModel):
    """Configuración para generación de nómina electrónica según DIAN"""
    
    AMBIENTE_CHOICES = [
        ('pruebas', 'Ambiente de Pruebas'),
        ('produccion', 'Ambiente de Producción'),
    ]
    
    # Configuración activa
    activa = models.BooleanField(default=True)
    ambiente = models.CharField(max_length=20, choices=AMBIENTE_CHOICES, default='pruebas')
    
    # Datos del empleador
    razon_social = models.CharField(max_length=200)
    nit = models.CharField(max_length=20)
    dv = models.CharField(max_length=1)
    direccion = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField()
    
    # Numeración DIAN
    prefijo = models.CharField(max_length=10, blank=True)
    resolucion_numero = models.CharField(max_length=50, blank=True)
    resolucion_fecha = models.DateField(null=True, blank=True)
    rango_inicio = models.BigIntegerField(null=True, blank=True)
    rango_fin = models.BigIntegerField(null=True, blank=True)
    consecutivo_actual = models.BigIntegerField(default=1)
    
    # Certificado digital
    certificado_archivo = models.FileField(upload_to='certificados_digitales/', null=True, blank=True)
    certificado_password = models.CharField(max_length=200, blank=True)
    
    # Software
    identificador_software = models.CharField(max_length=100, blank=True)
    clave_tecnica = models.CharField(max_length=100, blank=True)
    
    # URLs DIAN
    url_webservice = models.URLField(blank=True)
    url_recepcion = models.URLField(blank=True)
    
    # Configuración
    envio_automatico = models.BooleanField(default=False)
    notificar_empleado = models.BooleanField(default=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuración Nómina Electrónica"
        verbose_name_plural = "Configuraciones Nómina Electrónica"
        unique_together = [['organization', 'activa']]
    
    def __str__(self):
        return f"{self.razon_social} - {self.get_ambiente_display()}"
    
    def save(self, *args, **kwargs):
        if self.activa:
            ConfiguracionNominaElectronica.objects.filter(
                organization=self.organization,
                activa=True
            ).exclude(id=self.id).update(activa=False)
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOKS Y NOTIFICACIONES
# ══════════════════════════════════════════════════════════════════════════════

class WebhookConfig(TenantAwareModel):
    """Configuración de webhooks para notificaciones de eventos"""
    
    nombre = models.CharField(max_length=100)
    url = models.URLField()
    secret = models.CharField(max_length=200, blank=True)
    activo = models.BooleanField(default=True)
    
    eventos = models.JSONField(default=list, help_text="Lista de eventos suscritos")
    
    # Configuración de reintentos
    reintentos_maximos = models.IntegerField(default=3)
    timeout_segundos = models.IntegerField(default=10)
    
    # Estadísticas
    total_disparos = models.IntegerField(default=0)
    total_exitosos = models.IntegerField(default=0)
    total_fallidos = models.IntegerField(default=0)
    ultimo_disparo = models.DateTimeField(null=True, blank=True)
    ultimo_estado = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('exito', 'Éxito'),
            ('error', 'Error'),
            ('timeout', 'Timeout'),
        ]
    )
    
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
        self.total_disparos += 1
        if exitoso:
            self.total_exitosos += 1
            self.ultimo_estado = 'exito'
        else:
            self.total_fallidos += 1
            self.ultimo_estado = 'error'
        self.ultimo_disparo = timezone.now()
        self.save()


class WebhookLog(models.Model):
    """Log de disparos de webhooks"""
    
    webhook = models.ForeignKey(WebhookConfig, on_delete=models.CASCADE, related_name='logs')
    evento = models.CharField(max_length=50)
    payload = models.JSONField()
    codigo_respuesta = models.IntegerField(null=True, blank=True)
    respuesta = models.TextField(blank=True)
    exitoso = models.BooleanField(default=False)
    error = models.TextField(blank=True)
    tiempo_respuesta = models.FloatField(null=True, blank=True)
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


# ══════════════════════════════════════════════════════════════════════════════
# MODELOS DE COMPATIBILIDAD (MANTENER TEMPORALMENTE)
# ══════════════════════════════════════════════════════════════════════════════

# Alias para compatibilidad con código antiguo
Nomina = NominaSimple
DetalleNomina = DetalleItemNominaSimple
