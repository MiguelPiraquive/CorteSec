"""
╔══════════════════════════════════════════════════════════════════════════════╗
║              MODELOS ESTRUCTURALES - CENTROS DE COSTO Y DISTRIBUCIÓN          ║
║                        Sistema de Nómina para Construcción                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Modelos para gestión de costos por obra/proyecto y distribución analítica.

CONTEXTO:
En construcción, un empleado puede trabajar en múltiples obras en el mismo período.
La distribución de costos debe reflejar la realidad para cálculo de utilidad por proyecto.

AUTOR: Sistema CorteSec
FECHA: Enero 2026
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

from core.mixins import TenantAwareModel


# ══════════════════════════════════════════════════════════════════════════════
# CENTRO DE COSTO (OBRA/PROYECTO/FASE)
# ══════════════════════════════════════════════════════════════════════════════

class CentroCosto(TenantAwareModel):
    """
    Representa un proyecto, obra, fase o actividad para imputación de costos.
    
    Soporta jerarquía multinivel mediante self-referencing FK:
    - Proyecto (Nivel 0)
      └─ Obra (Nivel 1)
          └─ Fase (Nivel 2)
              └─ Actividad (Nivel 3)
    
    Ejemplo:
        Proyecto: "Torres del Parque"
          └─ Obra: "Torre A"
              └─ Fase: "Cimentación"
                  └─ Actividad: "Excavación Manual"
    """
    
    ESTADO_CHOICES = [
        ('PLN', 'Planificado'),
        ('ACT', 'Activo'),
        ('SUS', 'Suspendido'),
        ('CER', 'Cerrado'),
        ('LIQ', 'Liquidado'),
    ]
    
    TIPO_CHOICES = [
        ('PRO', 'Proyecto'),
        ('OBR', 'Obra'),
        ('FAS', 'Fase'),
        ('ACT', 'Actividad'),
        ('OTR', 'Otro'),
    ]
    
    # Identificación
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Código único del centro de costo (ej: PRO-001, OBR-A, FAS-CIM)"
    )
    nombre = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del centro de costo"
    )
    descripcion = models.TextField(
        blank=True,
        help_text="Descripción detallada, alcance, ubicación"
    )
    tipo = models.CharField(
        max_length=3,
        choices=TIPO_CHOICES,
        default='OBR',
        help_text="Tipo de centro de costo"
    )
    
    # Jerarquía (Tree Structure)
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='hijos',
        help_text="Centro de costo padre (para estructura jerárquica)"
    )
    nivel = models.PositiveSmallIntegerField(
        default=0,
        help_text="Nivel en la jerarquía (0=raíz, 1=hijo, 2=nieto...)"
    )
    ruta_completa = models.CharField(
        max_length=500,
        blank=True,
        editable=False,
        help_text="Ruta completa desde la raíz (ej: PRO-001/OBR-A/FAS-CIM)"
    )
    
    # Presupuesto y Control
    presupuesto_mano_obra = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Presupuesto total de mano de obra para este centro de costo"
    )
    costo_acumulado_mano_obra = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Costo real acumulado de mano de obra (actualizado automáticamente)"
    )
    
    # Ubicación
    ciudad = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ciudad donde se ejecuta la obra"
    )
    direccion = models.TextField(
        blank=True,
        help_text="Dirección física del proyecto/obra"
    )
    
    # Fechas
    fecha_inicio_planificada = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de inicio planificada"
    )
    fecha_fin_planificada = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de fin planificada"
    )
    fecha_inicio_real = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de inicio real"
    )
    fecha_fin_real = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de cierre real"
    )
    
    # Estado
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='PLN',
        help_text="Estado actual del centro de costo"
    )
    activo = models.BooleanField(
        default=True,
        help_text="Si está activo, se puede asignar mano de obra"
    )
    
    # Responsables
    director_obra = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='centros_costo_dirigidos',
        help_text="Usuario responsable del centro de costo"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='centros_costo_creados'
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Centro de Costo"
        verbose_name_plural = "Centros de Costo"
        ordering = ['codigo']
        unique_together = [['organization', 'codigo']]
        indexes = [
            models.Index(fields=['organization', 'estado', 'activo']),
            models.Index(fields=['organization', 'parent']),
            models.Index(fields=['codigo']),
        ]
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    def clean(self):
        """Validaciones de negocio"""
        # Validar que no sea su propio padre
        if self.parent == self:
            raise ValidationError("Un centro de costo no puede ser su propio padre.")
        
        # Validar fechas
        if self.fecha_fin_planificada and self.fecha_inicio_planificada:
            if self.fecha_fin_planificada < self.fecha_inicio_planificada:
                raise ValidationError(
                    "La fecha de fin planificada no puede ser anterior a la de inicio."
                )
        
        # Validar presupuesto vs costo
        if self.costo_acumulado_mano_obra > self.presupuesto_mano_obra:
            # Advertencia, no error (puede haber sobrecostos legítimos)
            pass
    
    def save(self, *args, **kwargs):
        """Override save para calcular nivel y ruta"""
        # Calcular nivel jerárquico
        if self.parent is None:
            self.nivel = 0
        else:
            self.nivel = self.parent.nivel + 1
        
        # Generar ruta completa
        self._actualizar_ruta()
        
        super().save(*args, **kwargs)
    
    def _actualizar_ruta(self):
        """Construye la ruta completa desde la raíz"""
        if self.parent is None:
            self.ruta_completa = self.codigo
        else:
            self.ruta_completa = f"{self.parent.ruta_completa}/{self.codigo}"
    
    @property
    def porcentaje_ejecucion(self) -> Decimal:
        """Calcula el % de ejecución presupuestal"""
        if self.presupuesto_mano_obra == Decimal('0.00'):
            return Decimal('0.00')
        
        porcentaje = (self.costo_acumulado_mano_obra / self.presupuesto_mano_obra) * 100
        return porcentaje.quantize(Decimal('0.01'))
    
    @property
    def saldo_presupuestal(self) -> Decimal:
        """Calcula el saldo disponible del presupuesto"""
        return (self.presupuesto_mano_obra - self.costo_acumulado_mano_obra).quantize(Decimal('0.01'))
    
    @property
    def tiene_hijos(self) -> bool:
        """Verifica si tiene centros de costo hijos"""
        return self.hijos.exists()
    
    @property
    def es_raiz(self) -> bool:
        """Verifica si es un centro de costo raíz (sin padre)"""
        return self.parent is None
    
    def get_ancestros(self):
        """Retorna lista de ancestros desde la raíz hasta este nodo"""
        ancestros = []
        actual = self.parent
        while actual:
            ancestros.insert(0, actual)
            actual = actual.parent
        return ancestros
    
    def get_descendientes(self, incluir_self=False):
        """Retorna QuerySet de todos los descendientes recursivamente"""
        from django.db.models import Q
        
        descendientes_ids = []
        if incluir_self:
            descendientes_ids.append(self.id)
        
        def agregar_hijos(centro):
            for hijo in centro.hijos.all():
                descendientes_ids.append(hijo.id)
                agregar_hijos(hijo)
        
        agregar_hijos(self)
        
        return CentroCosto.objects.filter(id__in=descendientes_ids)
    
    def actualizar_costo_acumulado(self, monto: Decimal):
        """
        Actualiza el costo acumulado de mano de obra.
        También actualiza recursivamente todos los padres.
        """
        self.costo_acumulado_mano_obra += monto
        self.save(update_fields=['costo_acumulado_mano_obra', 'fecha_actualizacion'])
        
        # Actualizar padres recursivamente
        if self.parent:
            self.parent.actualizar_costo_acumulado(monto)
    
    def puede_asignar_mano_obra(self) -> bool:
        """Verifica si se puede asignar mano de obra a este centro de costo"""
        return self.activo and self.estado == 'ACT'


# ══════════════════════════════════════════════════════════════════════════════
# DISTRIBUCIÓN ANALÍTICA DE COSTOS
# ══════════════════════════════════════════════════════════════════════════════

class DistribucionCostoNomina(TenantAwareModel):
    """
    Distribuye el costo de una nómina (o concepto específico) entre múltiples
    centros de costo según tiempo/porcentaje trabajado.
    
    Permite imputar correctamente los costos de mano de obra por proyecto/obra.
    
    Ejemplo:
        Empleado: Juan Pérez
        Nómina: Enero 2026
        Total Nómina: $2,000,000
        
        Distribución:
        - 40% Torre A ($800,000) → 12 días trabajados
        - 60% Torre B ($1,200,000) → 18 días trabajados
    """
    
    # Relación con Nómina
    nomina_simple = models.ForeignKey(
        'payroll.NominaSimple',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='distribuciones_costo',
        help_text="Nómina simple asociada"
    )
    nomina_electronica = models.ForeignKey(
        'payroll.NominaElectronica',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='distribuciones_costo',
        help_text="Nómina electrónica asociada"
    )
    
    # Centro de Costo
    centro_costo = models.ForeignKey(
        CentroCosto,
        on_delete=models.PROTECT,
        related_name='distribuciones',
        help_text="Centro de costo al que se imputa el costo"
    )
    
    # Distribución
    porcentaje_tiempo = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.01')),
            MaxValueValidator(Decimal('100.00'))
        ],
        help_text="Porcentaje de tiempo trabajado en este centro de costo (0.01 - 100.00)"
    )
    dias_trabajados = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Días trabajados en este centro de costo"
    )
    
    # Valores Imputados (Calculados automáticamente)
    # --- DEVENGADOS ---
    valor_devengados = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Devengados imputados a este centro de costo"
    )
    
    # --- SEGURIDAD SOCIAL EMPLEADOR ---
    valor_salud_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte salud empleador imputado"
    )
    valor_pension_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte pensión empleador imputado"
    )
    valor_arl = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte ARL imputado"
    )
    
    # --- PARAFISCALES ---
    valor_sena = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte SENA imputado"
    )
    valor_icbf = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte ICBF imputado"
    )
    valor_caja_compensacion = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Aporte Caja Compensación imputado"
    )
    
    # --- PROVISIONES ---
    valor_cesantias = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Provisión cesantías imputada"
    )
    valor_intereses_cesantias = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Provisión intereses cesantías imputada"
    )
    valor_prima = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Provisión prima imputada"
    )
    valor_vacaciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Provisión vacaciones imputada"
    )
    
    # TOTAL COSTO PATRONAL
    valor_total_imputado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Costo total imputado (devengados + cargas patronales)"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Distribución de Costo de Nómina"
        verbose_name_plural = "Distribuciones de Costo de Nómina"
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['organization', 'centro_costo']),
            models.Index(fields=['nomina_simple']),
            models.Index(fields=['nomina_electronica']),
        ]
    
    def __str__(self):
        nomina = self.nomina_simple or self.nomina_electronica
        return f"{nomina} → {self.centro_costo.codigo} ({self.porcentaje_tiempo}%)"
    
    def clean(self):
        """Validaciones de negocio"""
        # Debe tener una nómina asociada (simple o electrónica)
        if not self.nomina_simple and not self.nomina_electronica:
            raise ValidationError(
                "Debe asociarse a una Nómina Simple o Nómina Electrónica."
            )
        
        # No puede tener ambas nóminas
        if self.nomina_simple and self.nomina_electronica:
            raise ValidationError(
                "No puede estar asociada a ambas nóminas (Simple y Electrónica) simultáneamente."
            )
        
        # Validar que el centro de costo esté activo
        if not self.centro_costo.puede_asignar_mano_obra():
            raise ValidationError(
                f"El centro de costo '{self.centro_costo}' no está activo o disponible."
            )
    
    def calcular_distribucion(self):
        """
        Calcula automáticamente los valores de distribución proporcional
        según el porcentaje_tiempo.
        """
        nomina = self.nomina_simple or self.nomina_electronica
        
        if not nomina:
            return
        
        factor = self.porcentaje_tiempo / Decimal('100.00')
        
        # Distribuir devengados
        self.valor_devengados = (nomina.total_items * factor).quantize(Decimal('0.01'))
        
        # Distribuir seguridad social empleador
        self.valor_salud_empleador = (nomina.aporte_salud_empleador * factor).quantize(Decimal('0.01'))
        self.valor_pension_empleador = (nomina.aporte_pension_empleador * factor).quantize(Decimal('0.01'))
        self.valor_arl = (nomina.aporte_arl * factor).quantize(Decimal('0.01'))
        
        # Distribuir parafiscales
        self.valor_sena = (nomina.aporte_sena * factor).quantize(Decimal('0.01'))
        self.valor_icbf = (nomina.aporte_icbf * factor).quantize(Decimal('0.01'))
        self.valor_caja_compensacion = (nomina.aporte_caja_compensacion * factor).quantize(Decimal('0.01'))
        
        # Distribuir provisiones
        self.valor_cesantias = (nomina.provision_cesantias * factor).quantize(Decimal('0.01'))
        self.valor_intereses_cesantias = (nomina.provision_intereses_cesantias * factor).quantize(Decimal('0.01'))
        self.valor_prima = (nomina.provision_prima * factor).quantize(Decimal('0.01'))
        self.valor_vacaciones = (nomina.provision_vacaciones * factor).quantize(Decimal('0.01'))
        
        # Calcular total
        self.valor_total_imputado = (
            self.valor_devengados +
            self.valor_salud_empleador +
            self.valor_pension_empleador +
            self.valor_arl +
            self.valor_sena +
            self.valor_icbf +
            self.valor_caja_compensacion +
            self.valor_cesantias +
            self.valor_intereses_cesantias +
            self.valor_prima +
            self.valor_vacaciones
        ).quantize(Decimal('0.01'))
    
    def save(self, *args, **kwargs):
        """Override save para calcular distribución automáticamente"""
        self.calcular_distribucion()
        super().save(*args, **kwargs)
        
        # Actualizar costo acumulado del centro de costo
        if self.pk:  # Solo si ya existe (actualización)
            # Restar valor antiguo
            old_instance = DistribucionCostoNomina.objects.get(pk=self.pk)
            self.centro_costo.actualizar_costo_acumulado(-old_instance.valor_total_imputado)
        
        # Sumar nuevo valor
        self.centro_costo.actualizar_costo_acumulado(self.valor_total_imputado)
