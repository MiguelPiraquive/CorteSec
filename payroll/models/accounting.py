"""
╔══════════════════════════════════════════════════════════════════════════════╗
║            MODELOS DE INTEGRACIÓN CONTABLE Y ENTIDADES EXTERNAS              ║
║                        Sistema de Nómina para Construcción                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Modelos para integración con contabilidad y gestión de terceros
(EPS, AFP, ARL, Bancos, Cooperativas, etc.).

CONTEXTO:
La nómina no termina en el pago, termina en la contabilidad.
Estos modelos permiten:
- Registrar entidades externas (EPS, Fondos, Bancos)
- Generar asientos contables automáticos
- Diferenciar Costo (Clase 7) vs Gasto (Clase 5)
- Trazabilidad de pagos a terceros

AUTOR: Sistema CorteSec
FECHA: Enero 2026
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

from core.mixins import TenantAwareModel


# ══════════════════════════════════════════════════════════════════════════════
# ENTIDAD EXTERNA (TERCEROS)
# ══════════════════════════════════════════════════════════════════════════════

class EntidadExterna(TenantAwareModel):
    """
    Representa terceros relacionados con la nómina:
    - EPS (Entidades Promotoras de Salud)
    - AFP (Administradoras de Fondos de Pensión)
    - ARL (Aseguradoras de Riesgos Laborales)
    - CCF (Cajas de Compensación Familiar)
    - Bancos (para libranzas)
    - Cooperativas
    - Juzgados (para embargos)
    - ICBF, SENA
    
    Almacena información legal, financiera y de contacto.
    """
    
    TIPO_ENTIDAD_CHOICES = [
        ('EPS', 'EPS - Entidad Promotora de Salud'),
        ('AFP', 'AFP - Fondo de Pensión'),
        ('ARL', 'ARL - Aseguradora de Riesgos Laborales'),
        ('CCF', 'CCF - Caja de Compensación Familiar'),
        ('BAN', 'Banco'),
        ('COO', 'Cooperativa'),
        ('JUZ', 'Juzgado'),
        ('GOB', 'Entidad Gubernamental (ICBF, SENA, etc.)'),
        ('OTR', 'Otra'),
    ]
    
    # Identificación
    tipo_entidad = models.CharField(
        max_length=3,
        choices=TIPO_ENTIDAD_CHOICES,
        help_text="Tipo de entidad"
    )
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Código único interno (ej: EPS001, AFP002)"
    )
    razon_social = models.CharField(
        max_length=250,
        help_text="Razón social completa"
    )
    nombre_comercial = models.CharField(
        max_length=200,
        blank=True,
        help_text="Nombre comercial o sigla"
    )
    
    # Identificación Tributaria
    nit = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="NIT sin dígito de verificación"
    )
    digito_verificacion = models.CharField(
        max_length=1,
        help_text="Dígito de verificación del NIT"
    )
    
    # Códigos Especiales
    codigo_superintendencia = models.CharField(
        max_length=20,
        blank=True,
        help_text="Código ante Superintendencia (Salud/Financiera)"
    )
    codigo_pila = models.CharField(
        max_length=20,
        blank=True,
        help_text="Código para archivo PILA"
    )
    
    # Información de Contacto
    direccion = models.TextField(
        blank=True,
        help_text="Dirección física"
    )
    ciudad = models.CharField(
        max_length=100,
        blank=True
    )
    telefono = models.CharField(
        max_length=50,
        blank=True
    )
    email = models.EmailField(
        blank=True,
        help_text="Email principal de contacto"
    )
    sitio_web = models.URLField(
        blank=True,
        help_text="Sitio web"
    )
    
    # Información Bancaria (Para pagos)
    banco = models.CharField(
        max_length=100,
        blank=True,
        help_text="Banco donde recibe pagos"
    )
    tipo_cuenta = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('AHO', 'Ahorros'),
            ('COR', 'Corriente'),
        ],
        help_text="Tipo de cuenta bancaria"
    )
    numero_cuenta = models.CharField(
        max_length=50,
        blank=True,
        help_text="Número de cuenta bancaria"
    )
    
    # Configuración para PILA
    aplica_para_pila = models.BooleanField(
        default=False,
        help_text="Si debe incluirse en la planilla PILA"
    )
    
    # Contacto Específico
    nombre_contacto = models.CharField(
        max_length=200,
        blank=True,
        help_text="Nombre del contacto principal"
    )
    cargo_contacto = models.CharField(
        max_length=100,
        blank=True
    )
    telefono_contacto = models.CharField(
        max_length=50,
        blank=True
    )
    email_contacto = models.EmailField(
        blank=True
    )
    
    # Estado
    activo = models.BooleanField(
        default=True,
        help_text="Si está activa para nuevas operaciones"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entidades_externas_creadas'
    )
    observaciones = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Entidad Externa"
        verbose_name_plural = "Entidades Externas"
        ordering = ['tipo_entidad', 'razon_social']
        unique_together = [['organization', 'nit']]
        indexes = [
            models.Index(fields=['organization', 'tipo_entidad', 'activo']),
            models.Index(fields=['nit']),
            models.Index(fields=['codigo']),
        ]
    
    def __str__(self):
        return f"{self.get_tipo_entidad_display()} - {self.razon_social} (NIT: {self.nit}-{self.digito_verificacion})"
    
    def clean(self):
        """Validaciones de negocio"""
        # Validar dígito de verificación
        if self.nit and self.digito_verificacion:
            dv_calculado = self._calcular_digito_verificacion(self.nit)
            if str(dv_calculado) != str(self.digito_verificacion):
                raise ValidationError(
                    f"El dígito de verificación no es correcto. Debería ser: {dv_calculado}"
                )
    
    @staticmethod
    def _calcular_digito_verificacion(nit: str) -> int:
        """
        Calcula el dígito de verificación de un NIT colombiano.
        Algoritmo estándar DIAN.
        """
        nit = nit.replace('-', '').replace('.', '').strip()
        if not nit.isdigit():
            return 0
        
        vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
        suma = 0
        
        for i, digit in enumerate(reversed(nit)):
            suma += int(digit) * vpri[i % len(vpri)]
        
        residuo = suma % 11
        
        if residuo in [0, 1]:
            return residuo
        else:
            return 11 - residuo
    
    @property
    def nit_completo(self) -> str:
        """Retorna NIT con dígito de verificación"""
        return f"{self.nit}-{self.digito_verificacion}"
    
    @property
    def es_eps(self) -> bool:
        return self.tipo_entidad == 'EPS'
    
    @property
    def es_afp(self) -> bool:
        return self.tipo_entidad == 'AFP'
    
    @property
    def es_arl(self) -> bool:
        return self.tipo_entidad == 'ARL'
    
    @property
    def es_ccf(self) -> bool:
        return self.tipo_entidad == 'CCF'


# ══════════════════════════════════════════════════════════════════════════════
# ASIENTO CONTABLE DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

class AsientoNomina(TenantAwareModel):
    """
    Asiento contable generado automáticamente a partir de una nómina cerrada.
    
    Integra con el módulo de contabilidad (contabilidad.ComprobanteContable)
    o funciona de forma independiente.
    
    Discrimina automáticamente:
    - Operativos → Clase 7 (Costo de Producción)
    - Administrativos → Clase 5 (Gasto Administración)
    """
    
    ESTADO_CHOICES = [
        ('BOR', 'Borrador'),
        ('CON', 'Contabilizado'),
        ('ANU', 'Anulado'),
    ]
    
    # Relación con Nómina
    nomina_simple = models.OneToOneField(
        'payroll.NominaSimple',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='asiento_contable',
        help_text="Nómina simple asociada"
    )
    nomina_electronica = models.OneToOneField(
        'payroll.NominaElectronica',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='asiento_contable',
        help_text="Nómina electrónica asociada"
    )
    
    # Identificación del Asiento
    numero_comprobante = models.CharField(
        max_length=50,
        unique=True,
        help_text="Número único del comprobante contable"
    )
    fecha_asiento = models.DateField(
        default=timezone.now,
        help_text="Fecha del asiento contable"
    )
    
    # Descripción
    descripcion = models.TextField(
        help_text="Descripción del asiento (generada automáticamente)"
    )
    
    # Valores Totales
    total_debitos = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Suma total de débitos"
    )
    total_creditos = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Suma total de créditos"
    )
    diferencia = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        editable=False,
        help_text="Diferencia (debe ser 0.00 para cuadrar)"
    )
    
    # Estado
    estado = models.CharField(
        max_length=3,
        choices=ESTADO_CHOICES,
        default='BOR',
        help_text="Estado del asiento"
    )
    cuadrado = models.BooleanField(
        default=False,
        editable=False,
        help_text="True si débitos == créditos"
    )
    
    # Integración con módulo contabilidad (opcional)
    # TODO FASE 5: Descomentar cuando exista contabilidad.ComprobanteContable
    # comprobante_contable = models.ForeignKey(
    #     'contabilidad.ComprobanteContable',
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='asientos_nomina',
    #     help_text="Comprobante en módulo contabilidad (si existe)"
    # )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asientos_nomina_creados'
    )
    contabilizado_por = models.ForeignKey(
        'login.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asientos_nomina_contabilizados'
    )
    fecha_contabilizacion = models.DateTimeField(
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = "Asiento Contable de Nómina"
        verbose_name_plural = "Asientos Contables de Nómina"
        ordering = ['-fecha_asiento', '-numero_comprobante']
        indexes = [
            models.Index(fields=['organization', 'fecha_asiento']),
            models.Index(fields=['numero_comprobante']),
            models.Index(fields=['estado', 'cuadrado']),
        ]
    
    def __str__(self):
        return f"Asiento {self.numero_comprobante} - {self.fecha_asiento}"
    
    def clean(self):
        """Validaciones de negocio"""
        # Debe tener una nómina asociada
        if not self.nomina_simple and not self.nomina_electronica:
            raise ValidationError(
                "Debe asociarse a una Nómina Simple o Nómina Electrónica."
            )
        
        # No puede tener ambas
        if self.nomina_simple and self.nomina_electronica:
            raise ValidationError(
                "No puede estar asociado a ambas nóminas simultáneamente."
            )
    
    def save(self, *args, **kwargs):
        """Override save para validar cuadre"""
        self.diferencia = self.total_debitos - self.total_creditos
        self.cuadrado = abs(self.diferencia) < Decimal('0.01')  # Tolerancia de 1 centavo
        super().save(*args, **kwargs)
    
    def generar_numero_comprobante(self):
        """Genera número de comprobante único"""
        if not self.numero_comprobante:
            from datetime import datetime
            año = datetime.now().year
            ultimo = AsientoNomina.objects.filter(
                organization=self.organization,
                numero_comprobante__startswith=f"NOM-{año}"
            ).count()
            self.numero_comprobante = f"NOM-{año}-{ultimo + 1:06d}"
    
    def contabilizar(self, usuario):
        """Marca el asiento como contabilizado"""
        if not self.cuadrado:
            raise ValidationError(
                f"No se puede contabilizar. Diferencia: ${self.diferencia}"
            )
        
        self.estado = 'CON'
        self.contabilizado_por = usuario
        self.fecha_contabilizacion = timezone.now()
        self.save()
    
    def anular(self, usuario, motivo):
        """Anula el asiento contable"""
        if self.estado == 'ANU':
            raise ValidationError("El asiento ya está anulado.")
        
        self.estado = 'ANU'
        self.descripcion += f"\n\nANULADO por {usuario}: {motivo}"
        self.save()


# ══════════════════════════════════════════════════════════════════════════════
# DETALLE DE ASIENTO CONTABLE
# ══════════════════════════════════════════════════════════════════════════════

class DetalleAsientoNomina(TenantAwareModel):
    """
    Línea individual de un asiento contable de nómina.
    
    Cada línea representa un débito o crédito a una cuenta del PUC.
    """
    
    NATURALEZA_CHOICES = [
        ('DB', 'Débito'),
        ('CR', 'Crédito'),
    ]
    
    # Asiento
    asiento = models.ForeignKey(
        AsientoNomina,
        on_delete=models.CASCADE,
        related_name='detalles',
        help_text="Asiento contable al que pertenece"
    )
    
    # Cuenta Contable
    # TODO FASE 5: Descomentar cuando exista contabilidad.PlanCuentas
    # cuenta = models.ForeignKey(
    #     'contabilidad.PlanCuentas',
    #     on_delete=models.PROTECT,
    #     help_text="Cuenta del Plan Único de Cuentas (PUC)"
    # )
    # Campo temporal para referencia manual:
    cuenta_codigo = models.CharField(
        max_length=20,
        help_text="Código de cuenta PUC (temporal)"
    )
    
    # Centro de Costo (Opcional)
    centro_costo = models.ForeignKey(
        'payroll.CentroCosto',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_contables',
        help_text="Centro de costo para análisis de costos"
    )
    
    # Tercero (Opcional)
    entidad_externa = models.ForeignKey(
        EntidadExterna,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_contables',
        help_text="Tercero (EPS, AFP, etc.) si aplica"
    )
    
    # Movimiento
    naturaleza = models.CharField(
        max_length=2,
        choices=NATURALEZA_CHOICES,
        help_text="Naturaleza del movimiento"
    )
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Valor del movimiento"
    )
    
    # Descripción
    descripcion = models.CharField(
        max_length=500,
        help_text="Descripción del movimiento"
    )
    
    # Orden
    orden = models.PositiveSmallIntegerField(
        default=0,
        help_text="Orden de presentación en el asiento"
    )
    
    class Meta:
        verbose_name = "Detalle de Asiento Contable"
        verbose_name_plural = "Detalles de Asientos Contables"
        ordering = ['asiento', 'orden', 'naturaleza']
        indexes = [
            models.Index(fields=['asiento', 'naturaleza']),
            # models.Index(fields=['cuenta']),  # TODO FASE 5: Descomentar
        ]
    
    def __str__(self):
        # TODO FASE 5: Restaurar cuando exista FK cuenta
        # return f"{self.get_naturaleza_display()} - {self.cuenta.codigo} - ${self.valor:,.2f}"
        return f"{self.get_naturaleza_display()} - {self.cuenta_codigo} - ${self.valor:,.2f}"
    
    @property
    def es_debito(self) -> bool:
        return self.naturaleza == 'DB'
    
    @property
    def es_credito(self) -> bool:
        return self.naturaleza == 'CR'
