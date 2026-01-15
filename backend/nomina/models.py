"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MODELOS DE NÓMINA - CORTESEC                               ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Modelos completos para gestión de nómina con:
- Sin valores quemados en código
- Tablas de configuración para porcentajes legales
- Separación clara de devengados y deducciones
- Cálculos automáticos basados en configuración
- Integración con préstamos e items de trabajo

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP
import uuid

from core.mixins import TenantAwareModel
from locations.models import Departamento, Municipio
from cargos.models import Cargo


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

class Empleado(TenantAwareModel):
    """
    Empleado de la empresa.
    
    Contiene datos básicos del trabajador. Los datos laborales (salario, tipo de contrato)
    se manejan en el modelo Contrato.
    """
    
    TIPO_DOCUMENTO_CHOICES = [
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('TI', 'Tarjeta de Identidad'),
        ('PA', 'Pasaporte'),
        ('NIT', 'NIT'),
    ]
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('retirado', 'Retirado'),
    ]
    
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Relación opcional con usuario del sistema
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='empleado',
        verbose_name='Usuario del Sistema',
        help_text='Si el empleado tiene acceso al sistema, enlazar con su usuario'
    )
    
    # Identificación
    tipo_documento = models.CharField(
        max_length=5,
        choices=TIPO_DOCUMENTO_CHOICES,
        default='CC',
        verbose_name='Tipo de Documento'
    )
    
    numero_documento = models.CharField(
        max_length=20,
        verbose_name='Número de Documento',
        validators=[
            RegexValidator(
                regex=r'^[0-9]{5,20}$',
                message='El documento debe contener entre 5 y 20 dígitos'
            )
        ]
    )
    
    # Datos personales
    primer_nombre = models.CharField(max_length=50, verbose_name='Primer Nombre')
    segundo_nombre = models.CharField(max_length=50, blank=True, verbose_name='Segundo Nombre')
    primer_apellido = models.CharField(max_length=50, verbose_name='Primer Apellido')
    segundo_apellido = models.CharField(max_length=50, blank=True, verbose_name='Segundo Apellido')
    
    fecha_nacimiento = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Nacimiento'
    )
    
    genero = models.CharField(
        max_length=1,
        choices=GENERO_CHOICES,
        blank=True,
        verbose_name='Género'
    )
    
    # Contacto
    email = models.EmailField(blank=True, verbose_name='Email')
    telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    direccion = models.CharField(max_length=200, blank=True, verbose_name='Dirección')
    
    # Ubicación geográfica
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='empleados',
        verbose_name='Departamento'
    )
    ciudad = models.ForeignKey(
        Municipio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='empleados',
        verbose_name='Ciudad/Municipio'
    )
    
    # Foto de perfil
    foto = models.ImageField(
        upload_to='empleados/fotos/',
        null=True,
        blank=True,
        verbose_name='Foto de Perfil'
    )
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='activo',
        verbose_name='Estado'
    )
    
    fecha_ingreso = models.DateField(
        default=timezone.now,
        verbose_name='Fecha de Ingreso'
    )
    
    fecha_retiro = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Retiro'
    )
    
    # Datos bancarios
    banco = models.CharField(max_length=100, blank=True, verbose_name='Banco')
    tipo_cuenta = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('ahorros', 'Cuenta de Ahorros'),
            ('corriente', 'Cuenta Corriente'),
        ],
        verbose_name='Tipo de Cuenta'
    )
    numero_cuenta = models.CharField(max_length=30, blank=True, verbose_name='Número de Cuenta')
    
    # Observaciones
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['primer_apellido', 'primer_nombre']
        unique_together = [['organization', 'numero_documento']]
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['numero_documento']),
        ]
    
    def __str__(self):
        return f"{self.nombre_completo} ({self.numero_documento})"
    
    @property
    def nombre_completo(self):
        """Retorna el nombre completo del empleado"""
        nombres = [self.primer_nombre, self.segundo_nombre]
        apellidos = [self.primer_apellido, self.segundo_apellido]
        return f"{' '.join(filter(None, nombres))} {' '.join(filter(None, apellidos))}".strip()
    
    @property
    def contrato_activo(self):
        """Retorna el contrato activo del empleado"""
        return self.contratos.filter(activo=True).first()
    
    @property
    def perfil(self):
        """
        Acceso al perfil del usuario si está vinculado.
        
        Returns:
            Perfil o None
        """
        if self.usuario and hasattr(self.usuario, 'perfil'):
            return self.usuario.perfil
        return None
    
    @property
    def tiene_acceso_sistema(self):
        """Indica si el empleado tiene acceso al sistema"""
        return self.usuario is not None


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: TIPO DE CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

class TipoContrato(TenantAwareModel):
    """
    Define las reglas de aplicación de aportes según el tipo de contrato.
    
    Permite configurar qué aportes aplican para cada tipo de contrato:
    - Contratos laborales: Aplica todo (salud, pensión, ARL, parafiscales)
    - Contratos por servicios: IBC reducido (40%), puede no aplicar algunos aportes
    - Aprendices: Reglas especiales
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    nombre = models.CharField(
        max_length=100,
        verbose_name='Nombre',
        help_text='Ej: Término Indefinido, Término Fijo, Prestación de Servicios'
    )
    
    codigo = models.CharField(
        max_length=20,
        verbose_name='Código',
        help_text='Código corto del tipo de contrato'
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name='Descripción'
    )
    
    # Reglas de aplicación de aportes
    aplica_salud = models.BooleanField(
        default=True,
        verbose_name='Aplica Salud',
        help_text='¿Se descuenta salud al empleado?'
    )
    
    aplica_pension = models.BooleanField(
        default=True,
        verbose_name='Aplica Pensión',
        help_text='¿Se descuenta pensión al empleado?'
    )
    
    aplica_arl = models.BooleanField(
        default=True,
        verbose_name='Aplica ARL',
        help_text='¿Se paga ARL por este empleado?'
    )
    
    aplica_parafiscales = models.BooleanField(
        default=True,
        verbose_name='Aplica Parafiscales',
        help_text='¿Se pagan parafiscales (Caja, SENA, ICBF)?'
    )
    
    # IBC (Ingreso Base de Cotización)
    ibc_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00'))
        ],
        verbose_name='Porcentaje IBC (%)',
        help_text='Porcentaje del ingreso que se toma como IBC (100% laboral, 40% servicios)'
    )
    
    # Configuración adicional
    requiere_fecha_fin = models.BooleanField(
        default=False,
        verbose_name='Requiere Fecha Fin',
        help_text='¿El contrato debe tener fecha de finalización?'
    )
    
    activo = models.BooleanField(default=True, verbose_name='Activo')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Tipo de Contrato'
        verbose_name_plural = 'Tipos de Contrato'
        ordering = ['nombre']
        unique_together = [['organization', 'codigo']]
    
    def __str__(self):
        return self.nombre


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

class Contrato(TenantAwareModel):
    """
    Contrato laboral de un empleado.
    
    Define la relación laboral entre el empleado y la empresa,
    incluyendo salario, tipo de contrato y nivel de riesgo ARL.
    """
    
    NIVEL_ARL_CHOICES = [
        ('I', 'Nivel I - Riesgo Mínimo (0.522%)'),
        ('II', 'Nivel II - Riesgo Bajo (1.044%)'),
        ('III', 'Nivel III - Riesgo Medio (2.436%)'),
        ('IV', 'Nivel IV - Riesgo Alto (4.350%)'),
        ('V', 'Nivel V - Riesgo Máximo (6.960%)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relaciones
    empleado = models.ForeignKey(
        Empleado,
        on_delete=models.CASCADE,
        related_name='contratos',
        verbose_name='Empleado'
    )
    
    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.PROTECT,
        related_name='contratos',
        verbose_name='Tipo de Contrato'
    )
    
    # Datos del contrato
    salario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Salario',
        help_text='Salario mensual del empleado'
    )
    
    nivel_arl = models.CharField(
        max_length=5,
        choices=NIVEL_ARL_CHOICES,
        default='I',
        verbose_name='Nivel de Riesgo ARL'
    )
    
    # Fechas
    fecha_inicio = models.DateField(verbose_name='Fecha de Inicio')
    fecha_fin = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Fin',
        help_text='Dejar vacío para contratos indefinidos'
    )
    
    # Estado
    activo = models.BooleanField(
        default=True,
        verbose_name='Activo',
        help_text='Indica si es el contrato vigente del empleado'
    )
    
    # Cargo (Relación con el módulo de cargos)
    cargo = models.ForeignKey(
        Cargo,
        on_delete=models.PROTECT,
        related_name='contratos',
        null=True,
        blank=True,
        verbose_name='Cargo',
        help_text='Cargo o posición del empleado'
    )
    
    # Observaciones
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['organization', 'empleado', 'activo']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
        ]
    
    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.tipo_contrato.nombre}"
    
    def clean(self):
        """Validaciones del contrato"""
        super().clean()
        
        # Validar fecha fin si el tipo de contrato lo requiere
        if self.tipo_contrato_id:
            tipo = self.tipo_contrato
            if tipo.requiere_fecha_fin and not self.fecha_fin:
                raise ValidationError({
                    'fecha_fin': 'Este tipo de contrato requiere fecha de finalización'
                })
        
        # Validar que fecha_fin > fecha_inicio
        if self.fecha_fin and self.fecha_inicio and self.fecha_fin < self.fecha_inicio:
            raise ValidationError({
                'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio'
            })
    
    def save(self, *args, **kwargs):
        # Si este contrato se marca como activo, desactivar otros del mismo empleado
        if self.activo:
            Contrato.objects.filter(
                organization=self.organization,
                empleado=self.empleado,
                activo=True
            ).exclude(pk=self.pk).update(activo=False)
        
        super().save(*args, **kwargs)
    
    @property
    def ibc(self):
        """Calcula el Ingreso Base de Cotización según el tipo de contrato"""
        porcentaje = self.tipo_contrato.ibc_porcentaje / Decimal('100')
        return (self.salario * porcentaje).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: PARÁMETRO LEGAL
# ══════════════════════════════════════════════════════════════════════════════

class ParametroLegal(TenantAwareModel):
    """
    Tabla de configuración para porcentajes legales.
    
    Almacena todos los porcentajes de ley de forma configurable,
    evitando valores quemados en el código. Incluye control de vigencia.
    
    Conceptos típicos:
    - SALUD: 12.5% total (4% empleado, 8.5% empleador)
    - PENSION: 16% total (4% empleado, 12% empleador)
    - ARL: Variable según nivel (100% empleador)
    - CAJA: 4% (100% empleador)
    - SENA: 2% (100% empleador)
    - ICBF: 3% (100% empleador)
    """
    
    CONCEPTO_CHOICES = [
        # Seguridad Social
        ('SALUD', 'Salud'),
        ('PENSION', 'Pensión'),
        # ARL por niveles
        ('ARL_NIVEL_I', 'ARL Nivel I'),
        ('ARL_NIVEL_II', 'ARL Nivel II'),
        ('ARL_NIVEL_III', 'ARL Nivel III'),
        ('ARL_NIVEL_IV', 'ARL Nivel IV'),
        ('ARL_NIVEL_V', 'ARL Nivel V'),
        # Parafiscales
        ('CAJA_COMPENSACION', 'Caja de Compensación'),
        ('SENA', 'SENA'),
        ('ICBF', 'ICBF'),
        # Prestaciones sociales
        ('CESANTIAS', 'Cesantías'),
        ('INTERESES_CESANTIAS', 'Intereses sobre Cesantías'),
        ('PRIMA_SERVICIOS', 'Prima de Servicios'),
        ('VACACIONES', 'Vacaciones'),
        # Valores fijos
        ('SMMLV', 'Salario Mínimo'),
        ('AUXILIO_TRANSPORTE', 'Auxilio de Transporte'),
        ('TOPE_AUXILIO_TRANSPORTE', 'Tope Auxilio Transporte'),
        ('IBC_SERVICIOS', 'IBC Servicios'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    concepto = models.CharField(
        max_length=30,
        choices=CONCEPTO_CHOICES,
        verbose_name='Concepto'
    )
    
    descripcion = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Descripción'
    )
    
    # Porcentajes
    porcentaje_total = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[
            MinValueValidator(Decimal('0.000')),
            MaxValueValidator(Decimal('100.000'))
        ],
        verbose_name='Porcentaje Total (%)',
        help_text='Porcentaje total del aporte'
    )
    
    porcentaje_empleado = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[
            MinValueValidator(Decimal('0.000')),
            MaxValueValidator(Decimal('100.000'))
        ],
        verbose_name='Porcentaje Empleado (%)',
        help_text='Porcentaje que paga el empleado'
    )
    
    porcentaje_empleador = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[
            MinValueValidator(Decimal('0.000')),
            MaxValueValidator(Decimal('100.000'))
        ],
        verbose_name='Porcentaje Empleador (%)',
        help_text='Porcentaje que paga el empleador'
    )
    
    # Valores fijos (para SMMLV y Auxilio de Transporte)
    valor_fijo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor Fijo',
        help_text='Valor fijo (usado para SMMLV y Auxilio de Transporte)'
    )
    
    # Vigencia
    vigente_desde = models.DateField(
        verbose_name='Vigente Desde',
        help_text='Fecha desde la cual aplica este parámetro'
    )
    
    vigente_hasta = models.DateField(
        null=True,
        blank=True,
        verbose_name='Vigente Hasta',
        help_text='Fecha hasta la cual aplica (vacío = vigente indefinidamente)'
    )
    
    activo = models.BooleanField(default=True, verbose_name='Activo')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Parámetro Legal'
        verbose_name_plural = 'Parámetros Legales'
        ordering = ['concepto', '-vigente_desde']
        indexes = [
            models.Index(fields=['organization', 'concepto', 'activo']),
            models.Index(fields=['vigente_desde', 'vigente_hasta']),
        ]
    
    def __str__(self):
        return f"{self.get_concepto_display()} - {self.porcentaje_total}%"
    
    @classmethod
    def obtener_vigente(cls, organization, concepto, fecha=None):
        """
        Obtiene el parámetro vigente para un concepto en una fecha determinada.
        
        Args:
            organization: Organización
            concepto: Código del concepto (SALUD, PENSION, etc.)
            fecha: Fecha de consulta (por defecto hoy)
        
        Returns:
            ParametroLegal o None
        """
        if fecha is None:
            fecha = timezone.now().date()
        
        return cls.objects.filter(
            organization=organization,
            concepto=concepto,
            activo=True,
            vigente_desde__lte=fecha
        ).filter(
            models.Q(vigente_hasta__isnull=True) | models.Q(vigente_hasta__gte=fecha)
        ).order_by('-vigente_desde').first()


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: CONCEPTO LABORAL
# ══════════════════════════════════════════════════════════════════════════════

class ConceptoLaboral(TenantAwareModel):
    """
    Define conceptos de nómina que pueden ser devengados o deducciones.
    
    Tipos:
    - DEVENGADO: Aumenta el salario (bonificaciones, horas extra, comisiones)
    - DEDUCCION: Reduce el salario (retenciones, libranzas, embargos)
    
    Puede aplicar:
    - Porcentaje sobre el salario/IBC
    - Monto fijo
    """
    
    TIPO_CHOICES = [
        ('DEVENGADO', 'Devengado'),
        ('DEDUCCION', 'Deducción'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    codigo = models.CharField(
        max_length=20,
        verbose_name='Código',
        help_text='Código único del concepto'
    )
    
    nombre = models.CharField(
        max_length=100,
        verbose_name='Nombre'
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name='Descripción'
    )
    
    tipo = models.CharField(
        max_length=10,
        choices=TIPO_CHOICES,
        verbose_name='Tipo',
        help_text='Define si aumenta o reduce el salario'
    )
    
    # Configuración de cálculo
    aplica_porcentaje = models.BooleanField(
        default=False,
        verbose_name='Aplica Porcentaje',
        help_text='¿El valor se calcula como porcentaje?'
    )
    
    porcentaje = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=Decimal('0.000'),
        validators=[
            MinValueValidator(Decimal('0.000')),
            MaxValueValidator(Decimal('100.000'))
        ],
        verbose_name='Porcentaje (%)',
        help_text='Porcentaje a aplicar (si aplica_porcentaje=True)'
    )
    
    monto_fijo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Monto Fijo',
        help_text='Monto fijo a aplicar (si aplica_porcentaje=False)'
    )
    
    # Base de cálculo
    base_calculo = models.CharField(
        max_length=20,
        default='SALARIO',
        choices=[
            ('SALARIO', 'Salario'),
            ('IBC', 'Ingreso Base de Cotización'),
            ('DEVENGADO', 'Total Devengado'),
        ],
        verbose_name='Base de Cálculo',
        help_text='Sobre qué valor se calcula el porcentaje'
    )
    
    # Es concepto legal (salud, pensión, etc.)
    es_legal = models.BooleanField(
        default=False,
        verbose_name='Es Concepto Legal',
        help_text='¿Es un concepto de ley (salud, pensión)?'
    )
    
    # Orden de aplicación
    orden = models.PositiveIntegerField(
        default=100,
        verbose_name='Orden',
        help_text='Orden de aplicación en la nómina'
    )
    
    activo = models.BooleanField(default=True, verbose_name='Activo')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Concepto Laboral'
        verbose_name_plural = 'Conceptos Laborales'
        ordering = ['tipo', 'orden', 'nombre']
        unique_together = [['organization', 'codigo']]
        indexes = [
            models.Index(fields=['organization', 'tipo', 'activo']),
        ]
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre} ({self.get_tipo_display()})"
    
    def calcular_valor(self, base):
        """
        Calcula el valor del concepto según la base.
        
        Args:
            base: Valor base para el cálculo (salario, IBC, devengado)
        
        Returns:
            Decimal: Valor calculado
        """
        if self.aplica_porcentaje:
            return (base * self.porcentaje / Decimal('100')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
        return self.monto_fijo


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA SIMPLE
# ══════════════════════════════════════════════════════════════════════════════

class NominaSimple(TenantAwareModel):
    """
    Modelo principal de la nómina.
    
    Contiene los totales calculados y referencias al contrato y período.
    Los items y conceptos se manejan en tablas relacionadas.
    """
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('calculada', 'Calculada'),
        ('aprobada', 'Aprobada'),
        ('pagada', 'Pagada'),
        ('anulada', 'Anulada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Número consecutivo
    numero = models.CharField(
        max_length=20,
        verbose_name='Número',
        help_text='Número consecutivo de la nómina'
    )
    
    # Relación con contrato
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.PROTECT,
        related_name='nominas',
        verbose_name='Contrato'
    )
    
    # Período
    periodo_inicio = models.DateField(verbose_name='Inicio del Período')
    periodo_fin = models.DateField(verbose_name='Fin del Período')
    fecha_pago = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de Pago'
    )
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador',
        verbose_name='Estado'
    )
    
    # ══════════════════════════════════════════════════════════════════════════
    # VALORES CALCULADOS
    # ══════════════════════════════════════════════════════════════════════════
    
    # Salario base del período
    salario_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Salario Base'
    )
    
    # IBC calculado
    ibc = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='IBC (Ingreso Base de Cotización)'
    )
    
    # Totales de items de trabajo (producción)
    total_items = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total Items de Trabajo'
    )
    
    # Totales de conceptos
    total_devengado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total Devengado',
        help_text='Salario + Items + Devengados'
    )
    
    total_deducciones = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total Deducciones',
        help_text='Salud + Pensión + Otros descuentos'
    )
    
    # Descuentos de préstamos
    total_prestamos = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total Préstamos'
    )
    
    # Neto a pagar
    total_pagar = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Total a Pagar',
        help_text='Total Devengado - Total Deducciones - Préstamos'
    )
    
    # ══════════════════════════════════════════════════════════════════════════
    # APORTES EMPLEADOR (para información)
    # ══════════════════════════════════════════════════════════════════════════
    
    aporte_salud_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte Salud Empleador'
    )
    
    aporte_pension_empleador = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte Pensión Empleador'
    )
    
    aporte_arl = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte ARL'
    )
    
    aporte_caja = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte Caja de Compensación'
    )
    
    aporte_sena = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte SENA'
    )
    
    aporte_icbf = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Aporte ICBF'
    )
    
    # Observaciones
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    calculada_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Cálculo'
    )
    
    class Meta:
        verbose_name = 'Nómina'
        verbose_name_plural = 'Nóminas'
        ordering = ['-periodo_fin', '-numero']
        unique_together = [['organization', 'numero']]
        indexes = [
            models.Index(fields=['organization', 'contrato', 'periodo_inicio']),
            models.Index(fields=['estado']),
            models.Index(fields=['-periodo_fin']),
        ]
    
    def __str__(self):
        return f"Nómina {self.numero} - {self.contrato.empleado.nombre_completo}"
    
    def clean(self):
        """Validaciones de la nómina"""
        super().clean()
        
        if self.periodo_fin and self.periodo_inicio and self.periodo_fin < self.periodo_inicio:
            raise ValidationError({
                'periodo_fin': 'El fin del período debe ser posterior al inicio'
            })
    
    @property
    def empleado(self):
        """Acceso directo al empleado"""
        return self.contrato.empleado
    
    @property
    def costo_total_empleador(self):
        """Costo total para el empleador (incluye aportes)"""
        return (
            self.total_devengado +
            self.aporte_salud_empleador +
            self.aporte_pension_empleador +
            self.aporte_arl +
            self.aporte_caja +
            self.aporte_sena +
            self.aporte_icbf
        )


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA ITEM
# ══════════════════════════════════════════════════════════════════════════════

class NominaItem(TenantAwareModel):
    """
    Items de trabajo asociados a una nómina.
    
    Representa el trabajo realizado por el empleado (producción).
    El valor total se calcula automáticamente: cantidad × valor_unitario
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    nomina = models.ForeignKey(
        NominaSimple,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Nómina'
    )
    
    item = models.ForeignKey(
        'items.Item',
        on_delete=models.PROTECT,
        related_name='nomina_items',
        verbose_name='Item de Trabajo'
    )
    
    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Cantidad'
    )
    
    # El valor unitario se copia del item al momento de crear
    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor Unitario'
    )
    
    valor_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Valor Total'
    )
    
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Item de Nómina'
        verbose_name_plural = 'Items de Nómina'
        ordering = ['item__nombre']
    
    def __str__(self):
        return f"{self.item.nombre} × {self.cantidad}"
    
    def save(self, *args, **kwargs):
        """Calcula valor_total automáticamente"""
        self.valor_total = (self.cantidad * self.valor_unitario).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA CONCEPTO
# ══════════════════════════════════════════════════════════════════════════════

class NominaConcepto(TenantAwareModel):
    """
    Conceptos laborales aplicados a una nómina.
    
    Almacena los devengados y deducciones calculados para la nómina.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    nomina = models.ForeignKey(
        NominaSimple,
        on_delete=models.CASCADE,
        related_name='conceptos',
        verbose_name='Nómina'
    )
    
    concepto = models.ForeignKey(
        ConceptoLaboral,
        on_delete=models.PROTECT,
        related_name='nomina_conceptos',
        verbose_name='Concepto'
    )
    
    # Valores del cálculo
    base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Base de Cálculo'
    )
    
    porcentaje_aplicado = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        default=Decimal('0.000'),
        verbose_name='Porcentaje Aplicado'
    )
    
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Valor'
    )
    
    # Tipo (copiado del concepto para facilitar consultas)
    tipo = models.CharField(
        max_length=10,
        choices=ConceptoLaboral.TIPO_CHOICES,
        verbose_name='Tipo'
    )
    
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Concepto de Nómina'
        verbose_name_plural = 'Conceptos de Nómina'
        ordering = ['tipo', 'concepto__orden']
        unique_together = [['nomina', 'concepto']]
    
    def __str__(self):
        return f"{self.concepto.nombre}: ${self.valor}"
    
    def save(self, *args, **kwargs):
        """Copia el tipo del concepto"""
        if self.concepto_id and not self.tipo:
            self.tipo = self.concepto.tipo
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
# MODELO: NÓMINA PRÉSTAMO
# ══════════════════════════════════════════════════════════════════════════════

class NominaPrestamo(TenantAwareModel):
    """
    Préstamos descontados en una nómina.
    
    Registra qué cuotas de préstamos se descuentan en cada nómina.
    Integra con el módulo prestamos.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    nomina = models.ForeignKey(
        NominaSimple,
        on_delete=models.CASCADE,
        related_name='prestamos',
        verbose_name='Nómina'
    )
    
    prestamo = models.ForeignKey(
        'prestamos.Prestamo',
        on_delete=models.PROTECT,
        related_name='descuentos_nomina',
        verbose_name='Préstamo'
    )
    
    valor_cuota = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Valor de la Cuota'
    )
    
    numero_cuota = models.PositiveIntegerField(
        default=1,
        verbose_name='Número de Cuota'
    )
    
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Descuento de Préstamo'
        verbose_name_plural = 'Descuentos de Préstamos'
        ordering = ['prestamo__created_at']
    
    def __str__(self):
        return f"Préstamo {self.prestamo_id} - Cuota {self.numero_cuota}: ${self.valor_cuota}"
