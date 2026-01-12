"""
Módulo HSE (Health, Safety & Environment)
Sistema de Gestión de Seguridad y Salud en el Trabajo

Este módulo gestiona:
- Certificados de empleados (formación, médicos, competencias)
- Entregas de dotación (uniformes, EPP, herramientas)
- Validaciones y bloqueos por vencimientos
- Alertas automáticas de renovación

Normatividad:
- Resolución 2400/1979: Estatuto Seguridad Industrial
- Ley 1562/2012: Sistema de Riesgos Laborales
- Resolución 0312/2019: Estándares Mínimos SG-SST
- Decreto 1072/2015: Decreto Único Reglamentario Sector Trabajo
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal
from dateutil.relativedelta import relativedelta

from core.mixins import TenantAwareModel


# ============================================================================
# CERTIFICADO EMPLEADO
# ============================================================================

class CertificadoEmpleado(TenantAwareModel):
    """
    Gestión de certificados y documentos obligatorios por empleado.
    
    Controla:
    - Certificados médicos de aptitud laboral
    - Formaciones en SST obligatorias
    - Certificados de competencia por cargo
    - Licencias y permisos especiales
    - Alertas automáticas de vencimiento
    - Bloqueos para nómina si vencido
    
    Normatividad:
    - Resolución 2346/2007: Exámenes médicos ocupacionales
    - Resolución 0312/2019: Capacitaciones SST
    """
    
    # Tipos de certificado
    TIPO_MEDICO_INGRESO = 'MEDICO_INGRESO'
    TIPO_MEDICO_PERIODICO = 'MEDICO_PERIODICO'
    TIPO_MEDICO_EGRESO = 'MEDICO_EGRESO'
    TIPO_ALTURA = 'ALTURA'
    TIPO_ESPACIOS_CONFINADOS = 'ESPACIOS_CONFINADOS'
    TIPO_MANIPULACION_ALIMENTOS = 'MANIPULACION_ALIMENTOS'
    TIPO_OPERACION_VEHICULOS = 'OPERACION_VEHICULOS'
    TIPO_OPERACION_MAQUINARIA = 'OPERACION_MAQUINARIA'
    TIPO_SST_BASICO = 'SST_BASICO'
    TIPO_SST_50_HORAS = 'SST_50_HORAS'
    TIPO_SST_COORDINADOR = 'SST_COORDINADOR'
    TIPO_BRIGADA_EMERGENCIAS = 'BRIGADA_EMERGENCIAS'
    TIPO_PRIMEROS_AUXILIOS = 'PRIMEROS_AUXILIOS'
    TIPO_MANEJO_EXTINTORES = 'MANEJO_EXTINTORES'
    TIPO_RIESGO_ELECTRICO = 'RIESGO_ELECTRICO'
    TIPO_RIESGO_QUIMICO = 'RIESGO_QUIMICO'
    TIPO_RIESGO_BIOLOGICO = 'RIESGO_BIOLOGICO'
    TIPO_LICENCIA_CONDUCCION = 'LICENCIA_CONDUCCION'
    TIPO_CERTIFICADO_COMPETENCIA = 'CERTIFICADO_COMPETENCIA'
    TIPO_OTRO = 'OTRO'
    
    TIPOS_CERTIFICADO = [
        ('MEDICOS', (
            (TIPO_MEDICO_INGRESO, 'Examen Médico de Ingreso'),
            (TIPO_MEDICO_PERIODICO, 'Examen Médico Periódico'),
            (TIPO_MEDICO_EGRESO, 'Examen Médico de Egreso'),
        )),
        ('TRABAJO EN ALTURAS', (
            (TIPO_ALTURA, 'Trabajo en Alturas'),
            (TIPO_ESPACIOS_CONFINADOS, 'Espacios Confinados'),
        )),
        ('FORMACION SST', (
            (TIPO_SST_BASICO, 'Capacitación SST Básica'),
            (TIPO_SST_50_HORAS, 'Curso SST 50 Horas'),
            (TIPO_SST_COORDINADOR, 'Certificado Coordinador SST'),
        )),
        ('EMERGENCIAS', (
            (TIPO_BRIGADA_EMERGENCIAS, 'Brigada de Emergencias'),
            (TIPO_PRIMEROS_AUXILIOS, 'Primeros Auxilios'),
            (TIPO_MANEJO_EXTINTORES, 'Manejo de Extintores'),
        )),
        ('OPERACION', (
            (TIPO_OPERACION_VEHICULOS, 'Operación de Vehículos'),
            (TIPO_OPERACION_MAQUINARIA, 'Operación de Maquinaria'),
            (TIPO_MANIPULACION_ALIMENTOS, 'Manipulación de Alimentos'),
        )),
        ('RIESGOS', (
            (TIPO_RIESGO_ELECTRICO, 'Riesgo Eléctrico'),
            (TIPO_RIESGO_QUIMICO, 'Riesgo Químico'),
            (TIPO_RIESGO_BIOLOGICO, 'Riesgo Biológico'),
        )),
        ('LICENCIAS', (
            (TIPO_LICENCIA_CONDUCCION, 'Licencia de Conducción'),
            (TIPO_CERTIFICADO_COMPETENCIA, 'Certificado de Competencia'),
        )),
        ('OTROS', (
            (TIPO_OTRO, 'Otro Certificado'),
        )),
    ]
    
    # Estados del certificado
    ESTADO_VIGENTE = 'VIGENTE'
    ESTADO_POR_VENCER = 'POR_VENCER'  # Dentro de 30 días
    ESTADO_VENCIDO = 'VENCIDO'
    ESTADO_NO_APLICABLE = 'NO_APLICABLE'
    
    ESTADOS = [
        (ESTADO_VIGENTE, 'Vigente'),
        (ESTADO_POR_VENCER, 'Por Vencer (< 30 días)'),
        (ESTADO_VENCIDO, 'Vencido'),
        (ESTADO_NO_APLICABLE, 'No Aplicable'),
    ]
    
    # Relaciones
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.CASCADE,
        related_name='certificados',
        verbose_name='Empleado'
    )
    
    # Información del certificado
    tipo_certificado = models.CharField(
        'Tipo de Certificado',
        max_length=50,
        choices=TIPOS_CERTIFICADO
    )
    
    numero_certificado = models.CharField(
        'Número de Certificado',
        max_length=100,
        blank=True,
        null=True,
        help_text='Número de registro o identificación del certificado'
    )
    
    entidad_emisora = models.CharField(
        'Entidad Emisora',
        max_length=200,
        help_text='Empresa, institución o profesional que emitió el certificado'
    )
    
    descripcion = models.TextField(
        'Descripción',
        blank=True,
        help_text='Detalles adicionales del certificado'
    )
    
    # Fechas
    fecha_emision = models.DateField(
        'Fecha de Emisión',
        help_text='Fecha en que fue expedido el certificado'
    )
    
    fecha_vencimiento = models.DateField(
        'Fecha de Vencimiento',
        help_text='Fecha límite de vigencia del certificado'
    )
    
    dias_alerta_vencimiento = models.PositiveIntegerField(
        'Días de Alerta',
        default=30,
        help_text='Días antes del vencimiento para enviar alerta (default: 30)'
    )
    
    # Control
    obligatorio_para_nomina = models.BooleanField(
        'Obligatorio para Nómina',
        default=False,
        help_text='Si TRUE, bloquea procesamiento de nómina si está vencido'
    )
    
    alerta_enviada = models.BooleanField(
        'Alerta Enviada',
        default=False,
        help_text='Control para evitar enviar múltiples alertas'
    )
    
    fecha_alerta_enviada = models.DateTimeField(
        'Fecha Alerta Enviada',
        blank=True,
        null=True
    )
    
    archivo_pdf = models.FileField(
        'Archivo PDF',
        upload_to='certificados/%Y/%m/',
        blank=True,
        null=True,
        help_text='Escaneo o PDF del certificado'
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Notas adicionales o comentarios'
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(
        'Fecha de Creación',
        auto_now_add=True
    )
    
    fecha_modificacion = models.DateTimeField(
        'Fecha de Modificación',
        auto_now=True
    )
    
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificados_creados',
        verbose_name='Creado Por'
    )
    
    class Meta:
        verbose_name = 'Certificado de Empleado'
        verbose_name_plural = 'Certificados de Empleados'
        ordering = ['-fecha_vencimiento']
        indexes = [
            models.Index(fields=['organization', 'empleado', 'tipo_certificado']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['obligatorio_para_nomina']),
        ]
    
    def __str__(self):
        return f"{self.empleado} - {self.get_tipo_certificado_display()} - Vence: {self.fecha_vencimiento}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Fecha de vencimiento debe ser posterior a emisión
        if self.fecha_vencimiento and self.fecha_emision:
            if self.fecha_vencimiento <= self.fecha_emision:
                raise ValidationError({
                    'fecha_vencimiento': 'La fecha de vencimiento debe ser posterior a la fecha de emisión.'
                })
        
        # Días de alerta válidos
        if self.dias_alerta_vencimiento < 0:
            raise ValidationError({
                'dias_alerta_vencimiento': 'Los días de alerta no pueden ser negativos.'
            })
    
    @property
    def estado(self):
        """
        Calcula el estado actual del certificado.
        
        Returns:
            str: Estado (VIGENTE, POR_VENCER, VENCIDO)
        """
        hoy = timezone.now().date()
        
        if hoy > self.fecha_vencimiento:
            return self.ESTADO_VENCIDO
        
        dias_restantes = (self.fecha_vencimiento - hoy).days
        
        if dias_restantes <= self.dias_alerta_vencimiento:
            return self.ESTADO_POR_VENCER
        
        return self.ESTADO_VIGENTE
    
    @property
    def dias_para_vencimiento(self):
        """
        Calcula días restantes hasta el vencimiento.
        
        Returns:
            int: Días restantes (negativo si ya venció)
        """
        hoy = timezone.now().date()
        return (self.fecha_vencimiento - hoy).days
    
    @property
    def esta_vigente(self):
        """
        Verifica si el certificado está vigente.
        
        Returns:
            bool: True si está vigente
        """
        return self.estado == self.ESTADO_VIGENTE
    
    @property
    def esta_vencido(self):
        """
        Verifica si el certificado está vencido.
        
        Returns:
            bool: True si está vencido
        """
        return self.estado == self.ESTADO_VENCIDO
    
    @property
    def requiere_alerta(self):
        """
        Verifica si debe enviarse alerta de vencimiento.
        
        Returns:
            bool: True si debe alertarse
        """
        return (
            self.estado in [self.ESTADO_POR_VENCER, self.ESTADO_VENCIDO] and
            not self.alerta_enviada
        )
    
    def marcar_alerta_enviada(self):
        """Marca la alerta como enviada"""
        self.alerta_enviada = True
        self.fecha_alerta_enviada = timezone.now()
        self.save(update_fields=['alerta_enviada', 'fecha_alerta_enviada'])
    
    def renovar_certificado(self, nueva_fecha_emision, nueva_fecha_vencimiento, nuevo_numero=None, nuevo_archivo=None):
        """
        Crea una renovación del certificado (mantiene histórico).
        
        Args:
            nueva_fecha_emision (date): Nueva fecha de emisión
            nueva_fecha_vencimiento (date): Nueva fecha de vencimiento
            nuevo_numero (str, optional): Nuevo número de certificado
            nuevo_archivo (File, optional): Nuevo archivo PDF
        
        Returns:
            CertificadoEmpleado: Nuevo certificado creado
        """
        nuevo_certificado = CertificadoEmpleado.objects.create(
            organization=self.organization,
            empleado=self.empleado,
            tipo_certificado=self.tipo_certificado,
            numero_certificado=nuevo_numero or self.numero_certificado,
            entidad_emisora=self.entidad_emisora,
            descripcion=f"Renovación de certificado anterior #{self.id}",
            fecha_emision=nueva_fecha_emision,
            fecha_vencimiento=nueva_fecha_vencimiento,
            dias_alerta_vencimiento=self.dias_alerta_vencimiento,
            obligatorio_para_nomina=self.obligatorio_para_nomina,
            archivo_pdf=nuevo_archivo or self.archivo_pdf,
            observaciones=f"Renovación de certificado ID {self.id}",
            creado_por=self.creado_por,
        )
        
        return nuevo_certificado
    
    @staticmethod
    def verificar_empleado_apto_nomina(empleado):
        """
        Verifica si el empleado tiene todos los certificados obligatorios vigentes.
        
        Args:
            empleado (Empleado): Empleado a verificar
        
        Returns:
            dict: {
                'apto': bool,
                'certificados_vencidos': List[CertificadoEmpleado],
                'mensaje': str
            }
        """
        certificados_obligatorios = CertificadoEmpleado.objects.filter(
            organization=empleado.organization,
            empleado=empleado,
            obligatorio_para_nomina=True
        )
        
        certificados_vencidos = [
            cert for cert in certificados_obligatorios
            if cert.esta_vencido
        ]
        
        if certificados_vencidos:
            tipos = ', '.join([cert.get_tipo_certificado_display() for cert in certificados_vencidos])
            return {
                'apto': False,
                'certificados_vencidos': certificados_vencidos,
                'mensaje': f"Certificados vencidos: {tipos}"
            }
        
        return {
            'apto': True,
            'certificados_vencidos': [],
            'mensaje': 'Todos los certificados obligatorios están vigentes'
        }


# ============================================================================
# ENTREGA DOTACION
# ============================================================================

class EntregaDotacion(TenantAwareModel):
    """
    Control de entregas de dotación a empleados.
    
    Gestiona:
    - Entregas de uniformes (3 al año)
    - Entrega de EPP (Elementos de Protección Personal)
    - Entrega de herramientas de trabajo
    - Control de periodicidad
    - Paz y salvos por dotación pendiente
    
    Normatividad:
    - Código Sustantivo del Trabajo Art. 230:
      * 3 dotaciones al año (Enero-Abril / Mayo-Agosto / Septiembre-Diciembre)
      * Para empleados que devenguen hasta 2 SMMLV
    - Resolución 2400/1979: EPP según riesgo
    - Ley 1562/2012: Obligación empleador EPP
    """
    
    # Tipos de dotación
    TIPO_UNIFORME = 'UNIFORME'
    TIPO_CALZADO = 'CALZADO'
    TIPO_EPP_BASICO = 'EPP_BASICO'  # Casco, guantes, botas
    TIPO_EPP_ALTURA = 'EPP_ALTURA'  # Arnés, línea de vida
    TIPO_EPP_RESPIRATORIO = 'EPP_RESPIRATORIO'
    TIPO_EPP_VISUAL = 'EPP_VISUAL'
    TIPO_EPP_AUDITIVO = 'EPP_AUDITIVO'
    TIPO_HERRAMIENTAS = 'HERRAMIENTAS'
    TIPO_OTRO = 'OTRO'
    
    TIPOS_DOTACION = [
        ('VESTUARIO', (
            (TIPO_UNIFORME, 'Uniforme Completo'),
            (TIPO_CALZADO, 'Calzado de Seguridad'),
        )),
        ('EPP', (
            (TIPO_EPP_BASICO, 'EPP Básico (Casco, Guantes, Botas)'),
            (TIPO_EPP_ALTURA, 'EPP Trabajo en Alturas'),
            (TIPO_EPP_RESPIRATORIO, 'Protección Respiratoria'),
            (TIPO_EPP_VISUAL, 'Protección Visual'),
            (TIPO_EPP_AUDITIVO, 'Protección Auditiva'),
        )),
        ('HERRAMIENTAS', (
            (TIPO_HERRAMIENTAS, 'Herramientas de Trabajo'),
            (TIPO_OTRO, 'Otros Elementos'),
        )),
    ]
    
    # Períodos de dotación (Art. 230 CST)
    PERIODO_1 = 'PERIODO_1'  # Enero - Abril
    PERIODO_2 = 'PERIODO_2'  # Mayo - Agosto
    PERIODO_3 = 'PERIODO_3'  # Septiembre - Diciembre
    
    PERIODOS = [
        (PERIODO_1, 'Período 1 (Enero - Abril)'),
        (PERIODO_2, 'Período 2 (Mayo - Agosto)'),
        (PERIODO_3, 'Período 3 (Septiembre - Diciembre)'),
    ]
    
    # Estados de la entrega
    ESTADO_PENDIENTE = 'PENDIENTE'
    ESTADO_ENTREGADO = 'ENTREGADO'
    ESTADO_DEVUELTO = 'DEVUELTO'  # EPP reutilizable
    ESTADO_EXTRAVIADO = 'EXTRAVIADO'
    
    ESTADOS = [
        (ESTADO_PENDIENTE, 'Pendiente de Entrega'),
        (ESTADO_ENTREGADO, 'Entregado'),
        (ESTADO_DEVUELTO, 'Devuelto'),
        (ESTADO_EXTRAVIADO, 'Extraviado/Perdido'),
    ]
    
    # Relaciones
    empleado = models.ForeignKey(
        'payroll.Empleado',
        on_delete=models.CASCADE,
        related_name='dotaciones',
        verbose_name='Empleado'
    )
    
    # Información de la dotación
    tipo_dotacion = models.CharField(
        'Tipo de Dotación',
        max_length=30,
        choices=TIPOS_DOTACION
    )
    
    periodo_dotacion = models.CharField(
        'Período de Dotación',
        max_length=20,
        choices=PERIODOS,
        blank=True,
        null=True,
        help_text='Aplica solo para uniformes (Art. 230 CST)'
    )
    
    anio = models.PositiveIntegerField(
        'Año',
        help_text='Año de la dotación'
    )
    
    descripcion_elementos = models.TextField(
        'Descripción de Elementos',
        help_text='Detalle de los elementos entregados'
    )
    
    cantidad = models.PositiveIntegerField(
        'Cantidad',
        default=1,
        help_text='Cantidad de unidades entregadas'
    )
    
    talla = models.CharField(
        'Talla',
        max_length=20,
        blank=True,
        help_text='Talla del uniforme o EPP (XS, S, M, L, XL, etc.)'
    )
    
    # Costos
    valor_unitario = models.DecimalField(
        'Valor Unitario',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Costo unitario del elemento'
    )
    
    valor_total = models.DecimalField(
        'Valor Total',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Costo total de la entrega (cantidad * valor_unitario)'
    )
    
    # Fechas
    fecha_programada = models.DateField(
        'Fecha Programada',
        help_text='Fecha en que debería entregarse'
    )
    
    fecha_entrega_real = models.DateField(
        'Fecha de Entrega Real',
        blank=True,
        null=True,
        help_text='Fecha efectiva de entrega al empleado'
    )
    
    # Control de entrega
    estado = models.CharField(
        'Estado',
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_PENDIENTE
    )
    
    recibido_por = models.CharField(
        'Recibido Por',
        max_length=200,
        blank=True,
        help_text='Nombre de quien recibió (generalmente el empleado)'
    )
    
    documento_recibido = models.CharField(
        'Documento',
        max_length=50,
        blank=True,
        help_text='Cédula de quien recibió'
    )
    
    firma_digital = models.ImageField(
        'Firma Digital',
        upload_to='dotaciones/firmas/%Y/%m/',
        blank=True,
        null=True,
        help_text='Captura de firma al recibir'
    )
    
    archivo_adjunto = models.FileField(
        'Archivo Adjunto',
        upload_to='dotaciones/docs/%Y/%m/',
        blank=True,
        null=True,
        help_text='Acta de entrega, fotos, etc.'
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Notas adicionales sobre la entrega'
    )
    
    # Auditoría
    fecha_creacion = models.DateTimeField(
        'Fecha de Creación',
        auto_now_add=True
    )
    
    fecha_modificacion = models.DateTimeField(
        'Fecha de Modificación',
        auto_now=True
    )
    
    entregado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dotaciones_entregadas',
        verbose_name='Entregado Por'
    )
    
    class Meta:
        verbose_name = 'Entrega de Dotación'
        verbose_name_plural = 'Entregas de Dotación'
        ordering = ['-fecha_programada']
        indexes = [
            models.Index(fields=['organization', 'empleado', 'anio']),
            models.Index(fields=['periodo_dotacion', 'anio']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_programada']),
        ]
        unique_together = [
            ['organization', 'empleado', 'tipo_dotacion', 'periodo_dotacion', 'anio']
        ]
    
    def __str__(self):
        periodo = f" - {self.get_periodo_dotacion_display()}" if self.periodo_dotacion else ""
        return f"{self.empleado} - {self.get_tipo_dotacion_display()}{periodo} {self.anio}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Período obligatorio solo para uniformes
        if self.tipo_dotacion == self.TIPO_UNIFORME and not self.periodo_dotacion:
            raise ValidationError({
                'periodo_dotacion': 'El período es obligatorio para entregas de uniforme (Art. 230 CST).'
            })
        
        # Fecha de entrega real debe ser >= fecha programada
        if self.fecha_entrega_real and self.fecha_programada:
            if self.fecha_entrega_real < self.fecha_programada:
                raise ValidationError({
                    'fecha_entrega_real': 'La fecha de entrega real no puede ser anterior a la fecha programada.'
                })
        
        # Si está entregado, debe tener fecha de entrega
        if self.estado == self.ESTADO_ENTREGADO and not self.fecha_entrega_real:
            raise ValidationError({
                'fecha_entrega_real': 'Debe especificar la fecha de entrega para estado ENTREGADO.'
            })
        
        # Validar valor_total = cantidad * valor_unitario
        if self.cantidad and self.valor_unitario:
            valor_calculado = self.cantidad * self.valor_unitario
            if self.valor_total != valor_calculado:
                self.valor_total = valor_calculado
    
    def save(self, *args, **kwargs):
        """Calcula valor_total automáticamente"""
        if self.cantidad and self.valor_unitario:
            self.valor_total = self.cantidad * self.valor_unitario
        super().save(*args, **kwargs)
    
    @property
    def dias_retraso(self):
        """
        Calcula días de retraso si no se ha entregado.
        
        Returns:
            int: Días de retraso (0 si no hay retraso o ya se entregó)
        """
        if self.estado != self.ESTADO_PENDIENTE:
            return 0
        
        hoy = timezone.now().date()
        if hoy <= self.fecha_programada:
            return 0
        
        return (hoy - self.fecha_programada).days
    
    @property
    def esta_vencida(self):
        """
        Verifica si la entrega está vencida (pendiente y fecha pasada).
        
        Returns:
            bool: True si está vencida
        """
        return self.dias_retraso > 0
    
    def marcar_entregada(self, fecha_entrega=None, recibido_por=None, documento_recibido=None, usuario=None):
        """
        Marca la dotación como entregada.
        
        Args:
            fecha_entrega (date, optional): Fecha de entrega (default: hoy)
            recibido_por (str, optional): Nombre de quien recibió
            documento_recibido (str, optional): Documento de quien recibió
            usuario (User, optional): Usuario que registra la entrega
        """
        self.estado = self.ESTADO_ENTREGADO
        self.fecha_entrega_real = fecha_entrega or timezone.now().date()
        
        if recibido_por:
            self.recibido_por = recibido_por
        else:
            self.recibido_por = f"{self.empleado.nombres} {self.empleado.apellidos}"
        
        if documento_recibido:
            self.documento_recibido = documento_recibido
        else:
            self.documento_recibido = self.empleado.numero_documento
        
        if usuario:
            self.entregado_por = usuario
        
        self.save()
    
    @staticmethod
    def crear_dotaciones_periodo(organization, periodo, anio, tipo_dotacion=None):
        """
        Crea dotaciones masivas para un período.
        
        Args:
            organization (Organization): Organización
            periodo (str): PERIODO_1, PERIODO_2 o PERIODO_3
            anio (int): Año de la dotación
            tipo_dotacion (str, optional): Tipo específico (default: UNIFORME)
        
        Returns:
            dict: {
                'creadas': int,
                'duplicadas': int,
                'errores': List[str]
            }
        """
        from payroll.models import Empleado
        from payroll.constants import SMMLV_2026
        
        tipo = tipo_dotacion or EntregaDotacion.TIPO_UNIFORME
        
        # Determinar fecha programada según período
        if periodo == EntregaDotacion.PERIODO_1:
            fecha_programada = date(anio, 4, 30)  # Fin abril
        elif periodo == EntregaDotacion.PERIODO_2:
            fecha_programada = date(anio, 8, 31)  # Fin agosto
        else:  # PERIODO_3
            fecha_programada = date(anio, 12, 31)  # Fin diciembre
        
        # Empleados elegibles (hasta 2 SMMLV según Art. 230 CST)
        empleados = Empleado.objects.filter(
            organization=organization,
            activo=True,
            salario_base__lte=SMMLV_2026 * 2
        )
        
        creadas = 0
        duplicadas = 0
        errores = []
        
        for empleado in empleados:
            try:
                # Verificar si ya existe
                existe = EntregaDotacion.objects.filter(
                    organization=organization,
                    empleado=empleado,
                    tipo_dotacion=tipo,
                    periodo_dotacion=periodo,
                    anio=anio
                ).exists()
                
                if existe:
                    duplicadas += 1
                    continue
                
                # Crear dotación
                EntregaDotacion.objects.create(
                    organization=organization,
                    empleado=empleado,
                    tipo_dotacion=tipo,
                    periodo_dotacion=periodo,
                    anio=anio,
                    descripcion_elementos=f"Dotación {periodo} {anio}",
                    cantidad=1,
                    fecha_programada=fecha_programada,
                    estado=EntregaDotacion.ESTADO_PENDIENTE,
                )
                
                creadas += 1
                
            except Exception as e:
                errores.append(f"Error con empleado {empleado.numero_documento}: {str(e)}")
        
        return {
            'creadas': creadas,
            'duplicadas': duplicadas,
            'errores': errores
        }
    
    @staticmethod
    def reporte_entregas_pendientes(organization, anio=None):
        """
        Genera reporte de entregas pendientes.
        
        Args:
            organization (Organization): Organización
            anio (int, optional): Año específico (default: año actual)
        
        Returns:
            dict: Reporte con pendientes por período
        """
        if not anio:
            anio = timezone.now().year
        
        pendientes = EntregaDotacion.objects.filter(
            organization=organization,
            anio=anio,
            estado=EntregaDotacion.ESTADO_PENDIENTE
        )
        
        reporte = {
            'anio': anio,
            'total_pendientes': pendientes.count(),
            'por_periodo': {},
            'vencidas': pendientes.filter(fecha_programada__lt=timezone.now().date()).count(),
        }
        
        for periodo, nombre in EntregaDotacion.PERIODOS:
            cantidad = pendientes.filter(periodo_dotacion=periodo).count()
            reporte['por_periodo'][periodo] = {
                'nombre': nombre,
                'pendientes': cantidad
            }
        
        return reporte
