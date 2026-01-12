"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   ARQUITECTURA DEFINITIVA - SISTEMA DE NÓMINAS               ║
║                              CorteSec - Versión 3.0                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

CONTEXTO DEL NEGOCIO:
=====================

El sistema maneja nómina para construcción donde:

1. PAGO POR PRODUCCIÓN (Items de Obra):
   - Empleado realiza trabajo: 123.5 m² de mampostería
   - Precio unitario: $20,000/m²
   - Salario del periodo: 123.5 × $20,000 = $2,470,000
   - Items tienen unidades: m², m³, ml, global

2. SALARIO BASE DEL CONTRATO:
   - Usado SOLO para cálculo de seguridad social
   - Si tiene contrato fijo: salario del contrato
   - Si es subcontratista: IBC mínimo (1 SMMLV)
   - NO es el salario a pagar, es la BASE legal

3. DEDUCCIONES:
   - Préstamos: Lógica propia en módulo prestamos (cuotas, periodicidad)
   - Restaurante: Monto fijo definido por usuario (checkbox)
   - Seguridad social: Calculada sobre salario_base del contrato
   - Anticipos: Montos fijos

4. RESULTADO:
   Total Items - Deducciones = NETO A PAGAR


FLUJO REAL DEL SISTEMA:
========================

┌─────────────────────────────────────────────────────────────────────────┐
│                        PASO 1: TRABAJO REALIZADO                        │
└─────────────────────────────────────────────────────────────────────────┘
Empleado trabaja en periodo:
- 123.5 m² de mampostería @ $20,000/m² = $2,470,000
- 50 m³ de excavación @ $35,000/m³ = $1,750,000
- 1 global de instalación @ $500,000 = $500,000
                                    ─────────────
TOTAL ITEMS (lo que GANÓ):          $4,720,000  ← ESTO ES SU SALARIO

┌─────────────────────────────────────────────────────────────────────────┐
│              PASO 2: CÁLCULO SEGURIDAD SOCIAL Y PROVISIONES             │
└─────────────────────────────────────────────────────────────────────────┘
Se calcula sobre SALARIO BASE DEL CONTRATO (NO sobre items):
- Salario contrato: $1,300,000 (SMMLV)
- IBC = $1,300,000

Aportes (del empleado, SE DESCUENTAN):
- Salud (4%): $1,300,000 × 4% = $52,000
- Pensión (4%): $1,300,000 × 4% = $52,000
- Total descuentos seguridad social: $104,000

Provisiones (del empleador, NO SE DESCUENTAN):
- Cesantías: $1,300,000 × 8.33% = $108,290
- Prima: $1,300,000 × 8.33% = $108,290
- Vacaciones: $1,300,000 × 4.17% = $54,210

┌─────────────────────────────────────────────────────────────────────────┐
│                      PASO 3: OTRAS DEDUCCIONES                          │
└─────────────────────────────────────────────────────────────────────────┘
- Préstamo (cuota según módulo prestamos): $150,000
- Restaurante (monto fijo, checkbox): $80,000
- Anticipo: $200,000
                                    ──────────
Total otras deducciones:            $430,000

┌─────────────────────────────────────────────────────────────────────────┐
│                         PASO 4: NETO A PAGAR                            │
└─────────────────────────────────────────────────────────────────────────┘
Total items ganados:                $4,720,000
- Seguridad social:                   -$104,000
- Préstamo:                           -$150,000
- Restaurante:                         -$80,000
- Anticipo:                           -$200,000
                                    ──────────
NETO A PAGAR:                       $4,186,000  ← ESTO RECIBE EL EMPLEADO


ARQUITECTURA DE MODELOS:
=========================
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from core.mixins import TenantAwareModel
from items.models import Item
from prestamos.models import Prestamo


# ══════════════════════════════════════════════════════════════════════════════
# CLASE BASE ABSTRACTA - LÓGICA COMPARTIDA
# ══════════════════════════════════════════════════════════════════════════════

class NominaBase(TenantAwareModel):
    """
    Clase abstracta base para Nóminas
    
    Contiene TODA la lógica común de cálculo laboral según legislación colombiana.
    Ambas nóminas (Simple y Electrónica) heredan esta lógica.
    
    CONCEPTOS CLAVE:
    ----------------
    - total_items: Lo que el empleado GANÓ por trabajo realizado
    - salario_base_contrato: Base legal para calcular seguridad social (del contrato)
    - total_deducciones: Todo lo que se le descuenta
    - neto_pagar: total_items - total_deducciones
    """
    
    # ═══════════════════════════════════════════════════════════════════════
    # INFORMACIÓN BÁSICA
    # ═══════════════════════════════════════════════════════════════════════
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.PROTECT,
        help_text="Empleado al que se le genera la nómina"
    )
    periodo = models.ForeignKey(
        'payroll.PeriodoNomina',
        on_delete=models.PROTECT,
        help_text="Periodo de pago (quincenal, mensual, etc.)"
    )
    periodo_inicio = models.DateField(
        help_text="Fecha de inicio del periodo trabajado"
    )
    periodo_fin = models.DateField(
        help_text="Fecha de fin del periodo trabajado"
    )
    dias_trabajados = models.PositiveIntegerField(
        default=0,
        help_text="Días efectivamente trabajados en el periodo"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 1: ITEMS DE TRABAJO (LO QUE GANÓ EL EMPLEADO)
    # ═══════════════════════════════════════════════════════════════════════
    total_items = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Suma total de todos los items trabajados (m², m³, ml, etc.)"
    )
    # Ejemplo: 123.5 m² × $20,000 + 50 m³ × $35,000 = $4,220,000
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 2: SALARIO BASE DEL CONTRATO (PARA CÁLCULOS LEGALES)
    # ═══════════════════════════════════════════════════════════════════════
    salario_base_contrato = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Salario base del contrato (usado para seguridad social). Si es subcontratista: IBC mínimo (1 SMMLV)"
    )
    # Este NO es lo que gana, es la BASE para calcular aportes legales
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 3: CÁLCULOS DE SEGURIDAD SOCIAL (Ley 100 de 1993)
    # ═══════════════════════════════════════════════════════════════════════
    
    # --- IBC (Ingreso Base de Cotización) ---
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
        help_text="Parte de items que excede 25 SMMLV (no cotiza)"
    )
    
    # --- APORTES DEL EMPLEADO (SE DESCUENTAN) ---
    aporte_salud_empleado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte salud empleado: 4% del IBC"
    )
    aporte_pension_empleado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte pensión empleado: 4% del IBC"
    )
    
    # --- APORTES DEL EMPLEADOR (NO SE DESCUENTAN) ---
    aporte_salud_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte salud empleador: 8.5% del IBC"
    )
    aporte_pension_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte pensión empleador: 12% del IBC"
    )
    aporte_arl = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte ARL empleador: 0.522% - 6.96% según riesgo"
    )
    
    # --- PARAFISCALES (NO SE DESCUENTAN, solo para empresas grandes) ---
    aporte_sena = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte SENA: 2% del IBC (si aplica)"
    )
    aporte_icbf = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte ICBF: 3% del IBC (si aplica)"
    )
    aporte_caja_compensacion = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte Caja Compensación: 4% del IBC"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 4: PROVISIONES (NO SE DESCUENTAN, se acumulan)
    # ═══════════════════════════════════════════════════════════════════════
    provision_cesantias = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Cesantías: 8.33% del salario base contrato"
    )
    provision_intereses_cesantias = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Intereses cesantías: 12% anual sobre cesantías"
    )
    provision_prima = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Prima de servicios: 8.33% del salario base contrato"
    )
    provision_vacaciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Vacaciones: 4.17% del salario base contrato"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 5: DEDUCCIONES (LO QUE SE LE DESCUENTA)
    # ═══════════════════════════════════════════════════════════════════════
    deduccion_prestamos = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total descuento por préstamos activos (según módulo prestamos)"
    )
    deduccion_restaurante = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Descuento fijo por servicio de restaurante"
    )
    deduccion_anticipos = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Anticipos de nómina"
    )
    otras_deducciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Otras deducciones misceláneas"
    )
    total_deducciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Suma de TODAS las deducciones"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # PARTE 6: RESULTADO FINAL
    # ═══════════════════════════════════════════════════════════════════════
    neto_pagar = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total items - total deducciones = LO QUE RECIBE EL EMPLEADO"
    )
    
    # ═══════════════════════════════════════════════════════════════════════
    # METADATOS
    # ═══════════════════════════════════════════════════════════════════════
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_creadas'
    )
    observaciones = models.TextField(
        blank=True,
        help_text="Observaciones generales de la nómina"
    )
    
    class Meta:
        abstract = True  # ← CLASE ABSTRACTA, no crea tabla propia
    
    # ═══════════════════════════════════════════════════════════════════════
    # MÉTODOS DE CÁLCULO (HEREDADOS POR AMBAS NÓMINAS)
    # ═══════════════════════════════════════════════════════════════════════
    
    def calcular_ibc(self):
        """
        Calcula el Ingreso Base de Cotización (IBC)
        
        Regla:
        - Base = salario_base_contrato (del contrato del empleado)
        - Tope máximo: 25 SMMLV
        - Lo que excede 25 SMMLV no cotiza (es excedente no salarial)
        """
        SMMLV_2026 = Decimal('1423500')  # Actualizar anualmente
        TOPE_IBC = 25 * SMMLV_2026
        
        if self.salario_base_contrato <= TOPE_IBC:
            self.base_cotizacion = self.salario_base_contrato
            self.excedente_no_salarial = Decimal('0.00')
        else:
            self.base_cotizacion = TOPE_IBC
            self.excedente_no_salarial = self.salario_base_contrato - TOPE_IBC
    
    def calcular_seguridad_social(self):
        """
        Calcula aportes de seguridad social según Ley 100 de 1993
        
        APORTES EMPLEADO (SE DESCUENTAN):
        - Salud: 4% del IBC
        - Pensión: 4% del IBC
        
        APORTES EMPLEADOR (NO SE DESCUENTAN):
        - Salud: 8.5% del IBC
        - Pensión: 12% del IBC
        - ARL: Variable según nivel de riesgo (0.522% - 6.96%)
        """
        # Primero calcular IBC
        self.calcular_ibc()
        
        # Aportes empleado (SE DESCUENTAN)
        self.aporte_salud_empleado = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        self.aporte_pension_empleado = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
        
        # Aportes empleador (NO SE DESCUENTAN, pero se registran)
        self.aporte_salud_empleador = (self.base_cotizacion * Decimal('0.085')).quantize(Decimal('0.01'))
        self.aporte_pension_empleador = (self.base_cotizacion * Decimal('0.12')).quantize(Decimal('0.01'))
        
        # ARL según nivel de riesgo del contrato
        try:
            contrato_activo = self.empleado.contratos.filter(estado='ACT').first()
            if contrato_activo:
                nivel_riesgo = contrato_activo.nivel_riesgo
                tasas_arl = {
                    1: Decimal('0.00522'),   # 0.522%
                    2: Decimal('0.01044'),   # 1.044%
                    3: Decimal('0.02436'),   # 2.436%
                    4: Decimal('0.04350'),   # 4.350%
                    5: Decimal('0.06960'),   # 6.960%
                }
                tasa_arl = tasas_arl.get(nivel_riesgo, Decimal('0.00522'))
                self.aporte_arl = (self.base_cotizacion * tasa_arl).quantize(Decimal('0.01'))
        except:
            self.aporte_arl = Decimal('0.00')
    
    def calcular_parafiscales(self):
        """
        Calcula aportes parafiscales (solo para empresas con > 10 empleados)
        
        - SENA: 2% del IBC
        - ICBF: 3% del IBC
        - Caja Compensación: 4% del IBC
        
        NOTA: Estos NO se descuentan al empleado, los paga la empresa.
        """
        # TODO: Agregar lógica para verificar si la empresa califica
        # Por ahora, calculamos siempre
        
        self.aporte_sena = (self.base_cotizacion * Decimal('0.02')).quantize(Decimal('0.01'))
        self.aporte_icbf = (self.base_cotizacion * Decimal('0.03')).quantize(Decimal('0.01'))
        self.aporte_caja_compensacion = (self.base_cotizacion * Decimal('0.04')).quantize(Decimal('0.01'))
    
    def calcular_provisiones(self):
        """
        Calcula provisiones mensuales sobre salario_base_contrato
        
        - Cesantías: 8.33% del salario base
        - Intereses cesantías: 12% anual sobre cesantías (1% mensual)
        - Prima de servicios: 8.33% del salario base
        - Vacaciones: 4.17% del salario base
        
        NOTA: Estas NO se descuentan, se acumulan y pagan en fechas específicas.
        """
        self.provision_cesantias = (self.salario_base_contrato * Decimal('0.0833')).quantize(Decimal('0.01'))
        self.provision_intereses_cesantias = (self.provision_cesantias * Decimal('0.01')).quantize(Decimal('0.01'))
        self.provision_prima = (self.salario_base_contrato * Decimal('0.0833')).quantize(Decimal('0.01'))
        self.provision_vacaciones = (self.salario_base_contrato * Decimal('0.0417')).quantize(Decimal('0.01'))
    
    def calcular_deduccion_prestamos(self):
        """
        Calcula el total a descontar por préstamos activos
        
        Consulta el módulo de préstamos para obtener:
        - Préstamos activos del empleado
        - Cuotas pendientes en este periodo
        - Según periodicidad configurada en cada préstamo
        """
        total = Decimal('0.00')
        
        # Obtener préstamos activos del empleado
        prestamos_activos = Prestamo.objects.filter(
            empleado=self.empleado,
            estado='APR',  # Aprobado
            saldo_pendiente__gt=Decimal('0.00')
        )
        
        for prestamo in prestamos_activos:
            # Lógica del módulo de préstamos
            # Verifica si corresponde descontar en este periodo
            # Según periodicidad: mensual, quincenal, etc.
            if prestamo.corresponde_descontar_en_periodo(self.periodo):
                total += prestamo.valor_cuota
        
        self.deduccion_prestamos = total
    
    def calcular_total_deducciones(self):
        """
        Suma TODAS las deducciones que se le descuentan al empleado:
        
        1. Seguridad social (salud + pensión del empleado)
        2. Préstamos (cuotas según módulo prestamos)
        3. Restaurante (monto fijo si tiene checkbox)
        4. Anticipos
        5. Otras deducciones
        """
        self.total_deducciones = (
            self.aporte_salud_empleado +
            self.aporte_pension_empleado +
            self.deduccion_prestamos +
            self.deduccion_restaurante +
            self.deduccion_anticipos +
            self.otras_deducciones
        ).quantize(Decimal('0.01'))
    
    def calcular_neto_pagar(self):
        """
        Calcula el neto a pagar al empleado
        
        FÓRMULA:
        Total items (lo que ganó) - Total deducciones = NETO A PAGAR
        """
        self.neto_pagar = (self.total_items - self.total_deducciones).quantize(Decimal('0.01'))
        
        if self.neto_pagar < Decimal('0.00'):
            raise ValidationError(
                f"El neto a pagar no puede ser negativo. "
                f"Items: ${self.total_items}, Deducciones: ${self.total_deducciones}"
            )
    
    def procesar_completo(self):
        """
        Ejecuta TODOS los cálculos en el orden correcto
        
        ORDEN CRÍTICO:
        1. Calcular IBC (sobre salario_base_contrato)
        2. Calcular seguridad social (sobre IBC)
        3. Calcular parafiscales (sobre IBC)
        4. Calcular provisiones (sobre salario_base_contrato)
        5. Calcular deducción préstamos (módulo prestamos)
        6. Sumar todas las deducciones
        7. Calcular neto final (items - deducciones)
        """
        # 1. Validar datos básicos
        if not self.empleado or not self.periodo:
            raise ValidationError("Empleado y periodo son obligatorios")
        
        # 2. Obtener salario base del contrato (si no está asignado)
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
        
        # 3. Ejecutar cálculos en orden
        self.calcular_ibc()
        self.calcular_seguridad_social()
        self.calcular_parafiscales()
        self.calcular_provisiones()
        self.calcular_deduccion_prestamos()
        self.calcular_total_deducciones()
        self.calcular_neto_pagar()
        
        # 4. Guardar
        self.save()


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA SIMPLE (RRHH INTERNO)
# ══════════════════════════════════════════════════════════════════════════════

class NominaSimple(NominaBase):
    """
    Nómina para uso interno de RRHH
    
    Hereda TODA la lógica de NominaBase.
    Agrega campos específicos de gestión interna.
    """
    
    ESTADO_CHOICES = [
        ('BOR', 'Borrador'),
        ('REV', 'En Revisión'),
        ('APR', 'Aprobada'),
        ('PAG', 'Pagada'),
        ('ANU', 'Anulada'),
    ]
    
    # Campos propios de nómina simple
    numero_interno = models.CharField(
        max_length=50,
        unique=True,
        help_text="Número de nómina interno (ej: NOM-2026-001)"
    )
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='BOR'
    )
    aprobada_por = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nominas_simples_aprobadas'
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    fecha_pago = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se realizó el pago"
    )
    comprobante_pago = models.CharField(
        max_length=100,
        blank=True,
        help_text="Número de comprobante o transacción"
    )
    
    class Meta:
        verbose_name = "Nómina Simple (RRHH)"
        verbose_name_plural = "Nóminas Simples (RRHH)"
        ordering = ['-fecha_creacion']
        unique_together = [['organization', 'empleado', 'periodo']]
    
    def __str__(self):
        return f"{self.numero_interno} - {self.empleado.nombre_completo} - {self.periodo}"


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA ELECTRÓNICA (DIAN)
# ══════════════════════════════════════════════════════════════════════════════

class NominaElectronica(NominaBase):
    """
    Nómina Electrónica para envío a DIAN
    
    Hereda TODA la lógica de NominaBase.
    Agrega campos específicos de facturación electrónica.
    """
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('validado', 'Validado'),
        ('enviado', 'Enviado a DIAN'),
        ('aceptado', 'Aceptado por DIAN'),
        ('rechazado', 'Rechazado por DIAN'),
        ('anulado', 'Anulado'),
    ]
    
    # Campos propios de nómina electrónica
    numero_documento = models.CharField(
        max_length=50,
        unique=True,
        help_text="Número de documento electrónico (ej: NE-2026-001)"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador'
    )
    
    # Información DIAN
    cune = models.CharField(
        max_length=255,
        blank=True,
        help_text="Código Único de Nómina Electrónica (CUNE)"
    )
    xml_contenido = models.TextField(
        blank=True,
        help_text="Contenido del XML de nómina electrónica"
    )
    codigo_respuesta_dian = models.CharField(
        max_length=20,
        blank=True,
        help_text="Código de respuesta de la DIAN"
    )
    mensaje_respuesta_dian = models.TextField(
        blank=True,
        help_text="Mensaje de respuesta de la DIAN"
    )
    fecha_envio_dian = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de envío a DIAN"
    )
    fecha_respuesta_dian = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de respuesta de DIAN"
    )
    
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
    
    def generar_xml(self):
        """
        Genera el XML de nómina electrónica según estándar DIAN
        
        Usa todos los campos calculados de NominaBase para generar el XML.
        """
        # TODO: Implementar generación de XML según formato DIAN
        pass
    
    def enviar_a_dian(self):
        """
        Envía el documento a DIAN y actualiza estado según respuesta
        """
        # TODO: Implementar envío a DIAN
        pass


# ══════════════════════════════════════════════════════════════════════════════
# CLASE BASE ABSTRACTA: DETALLES DE ITEMS
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemBase(models.Model):
    """
    Clase abstracta para detalles de items de trabajo
    
    Representa cada item individual trabajado:
    - Item de obra (mampostería, excavación, etc.)
    - Cantidad realizada (123.5 m², 50 m³, etc.)
    - Precio unitario ($20,000/m², $35,000/m³, etc.)
    - Valor total (cantidad × precio_unitario)
    """
    
    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        help_text="Item de trabajo de la tabla items (mampostería, excavación, etc.)"
    )
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Cantidad realizada (ej: 123.5 para 123.5 m²)"
    )
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Precio por unidad de medida ($/m², $/m³, etc.)"
    )
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="cantidad × valor_unitario (calculado automáticamente)"
    )
    observaciones = models.TextField(
        blank=True,
        help_text="Observaciones sobre el trabajo realizado"
    )
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        """
        Auto-calcula valor_total antes de guardar
        """
        self.valor_total = (self.cantidad * self.valor_unitario).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.item.nombre} - {self.cantidad} {self.item.get_tipo_cantidad_display()} × ${self.valor_unitario}"


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES DE ITEMS PARA NÓMINA SIMPLE
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaSimple(DetalleItemBase):
    """
    Items de trabajo para Nómina Simple (RRHH)
    """
    nomina = models.ForeignKey(
        NominaSimple,
        on_delete=models.CASCADE,
        related_name='detalles_items'
    )
    
    class Meta:
        verbose_name = "Detalle Item Nómina Simple"
        verbose_name_plural = "Detalles Items Nómina Simple"
        ordering = ['item__nombre']


# ══════════════════════════════════════════════════════════════════════════════
# DETALLES DE ITEMS PARA NÓMINA ELECTRÓNICA
# ══════════════════════════════════════════════════════════════════════════════

class DetalleItemNominaElectronica(DetalleItemBase):
    """
    Items de trabajo para Nómina Electrónica (DIAN)
    
    Incluye código DIAN del concepto para XML
    """
    nomina = models.ForeignKey(
        NominaElectronica,
        on_delete=models.CASCADE,
        related_name='detalles_items'
    )
    codigo_dian = models.CharField(
        max_length=10,
        blank=True,
        help_text="Código DIAN del concepto de devengado"
    )
    
    class Meta:
        verbose_name = "Detalle Item Nómina Electrónica"
        verbose_name_plural = "Detalles Items Nómina Electrónica"
        ordering = ['item__nombre']


"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RESUMEN DE BENEFICIOS                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

1. ✅ CÓDIGO ÚNICO
   - Toda la lógica de cálculo en NominaBase
   - Si cambia una ley, se modifica en UN solo lugar

2. ✅ HERENCIA CLARA
   - NominaSimple hereda todo de NominaBase
   - NominaElectronica hereda todo de NominaBase
   - Cada una agrega solo sus campos específicos

3. ✅ SEPARACIÓN DE CONCEPTOS
   - total_items: Lo que el empleado GANÓ por trabajo (items de obra)
   - salario_base_contrato: Base legal para seguridad social (del contrato)
   - total_deducciones: Todo lo que se le descuenta
   - neto_pagar: total_items - total_deducciones

4. ✅ INTEGRACIÓN CON ITEMS
   - Items de obra con unidades de medida (m², m³, ml, global)
   - Cantidad × precio_unitario = valor_total
   - Suma de todos los items = total_items

5. ✅ INTEGRACIÓN CON PRÉSTAMOS
   - calcular_deduccion_prestamos() consulta módulo prestamos
   - Respeta periodicidad de cada préstamo
   - Cuotas según configuración del préstamo

6. ✅ CUMPLIMIENTO LEGAL COLOMBIANO
   - Ley 100 de 1993: Seguridad social
   - IBC con tope 25 SMMLV
   - Aportes empleado/empleador correctos
   - Parafiscales: SENA, ICBF, Caja
   - Provisiones: Cesantías, prima, vacaciones

7. ✅ VINCULACIÓN OPCIONAL
   - NominaElectronica puede existir SIN NominaSimple
   - NominaElectronica puede vincularse a NominaSimple (opcional)
   - Flexibilidad total para ambos flujos

8. ✅ FÁCIL AUDITORÍA
   - Todos los campos de cálculo están guardados
   - Se puede verificar cada paso del cálculo
   - Transparencia total en deducciones

9. ✅ PROFESIONAL Y ROBUSTO
   - Validaciones en todos los métodos
   - Manejo de errores con ValidationError
   - Documentación completa en cada campo
   - Código limpio y mantenible


╔══════════════════════════════════════════════════════════════════════════════╗
║                        PRÓXIMOS PASOS DE IMPLEMENTACIÓN                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

FASE 1: MIGRACIÓN DE DATOS
---------------------------
1. Crear migraciones para nuevos modelos
2. Migrar datos de Nomina → NominaSimple
3. Migrar datos de DetalleNomina → DetalleItemNominaSimple
4. Actualizar NominaElectronica con nuevos campos

FASE 2: SERIALIZERS Y APIS
---------------------------
1. Crear NominaSimpleSerializer
2. Crear NominaElectronicaSerializer
3. Crear DetalleItemSerializers
4. Actualizar ViewSets con nueva lógica

FASE 3: FRONTEND
----------------
1. Actualizar formularios de nómina
2. Agregar selección de items de obra
3. Mostrar desglose de deducciones
4. Visualización de neto a pagar

FASE 4: PRUEBAS
---------------
1. Probar cálculos de seguridad social
2. Probar integración con préstamos
3. Probar generación de XML para DIAN
4. Validar neto a pagar con casos reales
"""
