"""
Modelos para Nómina Electrónica DIAN - MOVIDOS

⚠️ IMPORTANTE: Este archivo fue vaciado. Todos los modelos de Nómina Electrónica
fueron movidos a: backend/nomina_electronica/models.py

Modelos movidos:
- NominaAjuste → nomina_electronica/models.py
- DetalleAjuste → nomina_electronica/models.py

Razón de la separación:
- Nómina Simple (payroll/): Gestión interna RRHH, cálculo de producción
- Nómina Electrónica (nomina_electronica/): Documento tributario DIAN

Ver documentación completa:
- backend/nomina_electronica/README.md
- backend/REORGANIZACION_NOMINA.md

Author: Sistema CorteSec
Date: Enero 2026
Version: 2.0.0 (Reorganización)
"""

# Este archivo se mantiene vacío para evitar errores de importación
# en código existente que pueda intentar importar de aquí.

# Si necesitas los modelos de Nómina Electrónica, importa desde:
# from nomina_electronica.models import NominaElectronica, NominaAjuste, etc.

    """
    Nota de ajuste a una nómina electrónica previamente enviada a la DIAN.
    
    Casos de uso:
    - Corrección de valores erróneos
    - Adición de conceptos omitidos
    - Reemplazo completo de nómina
    - Eliminación de nómina
    
    Normatividad:
    - Resolución 000013/2021 DIAN: Nómina electrónica
    - Art. 5: Notas de ajuste
    """
    
    # Tipos de ajuste
    TIPO_REEMPLAZAR = 'REEMPLAZAR'
    TIPO_ELIMINAR = 'ELIMINAR'
    TIPO_ADICIONAR = 'ADICIONAR'
    TIPO_CORREGIR = 'CORREGIR'
    
    TIPOS_AJUSTE = [
        (TIPO_REEMPLAZAR, 'Reemplazar - Reemplaza completamente la nómina original'),
        (TIPO_ELIMINAR, 'Eliminar - Anula la nómina original'),
        (TIPO_ADICIONAR, 'Adicionar - Agrega conceptos a la nómina original'),
        (TIPO_CORREGIR, 'Corregir - Corrige valores específicos'),
    ]
    
    # Estados
    ESTADO_BORRADOR = 'borrador'
    ESTADO_GENERADO = 'generado'
    ESTADO_ENVIADO = 'enviado'
    ESTADO_ACEPTADO = 'aceptado'
    ESTADO_RECHAZADO = 'rechazado'
    ESTADO_ERROR = 'error'
    
    ESTADOS = [
        (ESTADO_BORRADOR, 'Borrador'),
        (ESTADO_GENERADO, 'XML Generado'),
        (ESTADO_ENVIADO, 'Enviado a DIAN'),
        (ESTADO_ACEPTADO, 'Aceptado por DIAN'),
        (ESTADO_RECHAZADO, 'Rechazado por DIAN'),
        (ESTADO_ERROR, 'Error en Procesamiento'),
    ]
    
    # Relaciones
    nomina_original = models.ForeignKey(
        'payroll.NominaElectronica',
        on_delete=models.PROTECT,
        related_name='ajustes',
        verbose_name='Nómina Original'
    )
    
    # Información del ajuste
    tipo_ajuste = models.CharField(
        'Tipo de Ajuste',
        max_length=20,
        choices=TIPOS_AJUSTE
    )
    
    numero_ajuste = models.CharField(
        'Número de Ajuste',
        max_length=50,
        unique=True,
        help_text='Número consecutivo del ajuste (NADJ-2026-00001)'
    )
    
    fecha_ajuste = models.DateField(
        'Fecha de Ajuste',
        default=timezone.now
    )
    
    motivo_ajuste = models.TextField(
        'Motivo del Ajuste',
        help_text='Descripción detallada del motivo del ajuste'
    )
    
    # Datos DIAN
    cune = models.CharField(
        'CUNE',
        max_length=100,
        blank=True,
        null=True,
        help_text='Código Único de Nómina Electrónica (CUNE) del ajuste'
    )
    
    xml_contenido = models.TextField(
        'Contenido XML',
        blank=True,
        null=True,
        help_text='XML UBL 2.1 del ajuste generado'
    )
    
    xml_firmado = models.TextField(
        'XML Firmado',
        blank=True,
        null=True,
        help_text='XML con firma digital XMLDSIG'
    )
    
    # Estado
    estado = models.CharField(
        'Estado',
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_BORRADOR
    )
    
    # Respuesta DIAN
    codigo_respuesta_dian = models.CharField(
        'Código Respuesta DIAN',
        max_length=10,
        blank=True,
        null=True
    )
    
    mensaje_respuesta_dian = models.TextField(
        'Mensaje Respuesta DIAN',
        blank=True,
        null=True
    )
    
    fecha_envio_dian = models.DateTimeField(
        'Fecha Envío DIAN',
        blank=True,
        null=True
    )
    
    fecha_respuesta_dian = models.DateTimeField(
        'Fecha Respuesta DIAN',
        blank=True,
        null=True
    )
    
    # Valores ajustados (si aplica)
    total_devengado_ajustado = models.DecimalField(
        'Total Devengado Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    total_deducido_ajustado = models.DecimalField(
        'Total Deducido Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    neto_ajustado = models.DecimalField(
        'Neto Ajustado',
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
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
        related_name='ajustes_nomina_creados',
        verbose_name='Creado Por'
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Notas adicionales internas'
    )
    
    class Meta:
        verbose_name = 'Ajuste de Nómina Electrónica'
        verbose_name_plural = 'Ajustes de Nómina Electrónica'
        ordering = ['-fecha_ajuste', '-numero_ajuste']
        indexes = [
            models.Index(fields=['organization', 'nomina_original']),
            models.Index(fields=['numero_ajuste']),
            models.Index(fields=['cune']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_ajuste']),
        ]
    
    def __str__(self):
        return f"{self.numero_ajuste} - {self.get_tipo_ajuste_display()} - {self.nomina_original.numero_documento}"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Validar que la nómina original esté aceptada por DIAN
        if self.nomina_original.estado not in ['aprobado', 'aceptado']:
            raise ValidationError({
                'nomina_original': 'Solo se pueden ajustar nóminas aprobadas/aceptadas por DIAN'
            })
        
        # Validar valores según tipo de ajuste
        if self.tipo_ajuste == self.TIPO_ELIMINAR:
            # Al eliminar, todos los valores deben ser 0
            if any([self.total_devengado_ajustado, self.total_deducido_ajustado, self.neto_ajustado]):
                raise ValidationError({
                    'tipo_ajuste': 'Para ajustes tipo ELIMINAR, todos los valores deben ser cero'
                })
    
    @property
    def diferencia_neto(self):
        """
        Calcula la diferencia entre el neto ajustado y el neto original.
        
        Returns:
            Decimal: Diferencia (positiva o negativa)
        """
        neto_original = self.nomina_original.neto_pagar or Decimal('0.00')
        return self.neto_ajustado - neto_original
    
    def generar_numero_ajuste(self):
        """
        Genera número consecutivo de ajuste.
        
        Returns:
            str: Número de ajuste (NADJ-2026-00001)
        """
        anio_actual = timezone.now().year
        
        # Obtener último ajuste del año
        ultimo = NominaAjuste.objects.filter(
            organization=self.organization,
            fecha_ajuste__year=anio_actual
        ).order_by('-numero_ajuste').first()
        
        if ultimo and ultimo.numero_ajuste:
            try:
                partes = ultimo.numero_ajuste.split('-')
                ultimo_numero = int(partes[-1])
                nuevo_numero = ultimo_numero + 1
            except:
                nuevo_numero = 1
        else:
            nuevo_numero = 1
        
        return f"NADJ-{anio_actual}-{nuevo_numero:05d}"
    
    def save(self, *args, **kwargs):
        """Genera número automáticamente si no existe"""
        if not self.numero_ajuste:
            self.numero_ajuste = self.generar_numero_ajuste()
        super().save(*args, **kwargs)
    
    def generar_xml(self):
        """
        Genera el XML UBL 2.1 del ajuste.
        
        Returns:
            str: XML generado
        """
        # TODO: Implementar generador XML completo
        # Por ahora retorna estructura básica
        from payroll.services.dian_xml_enhanced import DIANXMLEnhancedGenerator
        
        generator = DIANXMLEnhancedGenerator(self.organization)
        xml_content = generator.generar_xml_ajuste(self)
        
        self.xml_contenido = xml_content
        self.estado = self.ESTADO_GENERADO
        self.save()
        
        return xml_content
    
    def firmar_xml(self):
        """
        Firma digitalmente el XML del ajuste.
        
        Returns:
            str: XML firmado
        """
        # TODO: Implementar firma digital XMLDSIG
        # Requiere certificado digital
        pass
    
    def enviar_dian(self):
        """
        Envía el ajuste a la DIAN.
        
        Returns:
            dict: Respuesta de la DIAN
        """
        # TODO: Implementar cliente API DIAN
        pass


class DetalleAjuste(TenantAwareModel):
    """
    Detalle de conceptos ajustados en una nota de ajuste.
    
    Almacena los conceptos laborales que cambian en el ajuste.
    """
    
    ajuste = models.ForeignKey(
        'payroll.NominaAjuste',
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Ajuste'
    )
    
    concepto = models.ForeignKey(
        'payroll.ConceptoLaboral',
        on_delete=models.PROTECT,
        verbose_name='Concepto Laboral'
    )
    
    # Valores originales (de la nómina original)
    valor_original = models.DecimalField(
        'Valor Original',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Valores ajustados (nuevos valores)
    valor_ajustado = models.DecimalField(
        'Valor Ajustado',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    observaciones = models.TextField(
        'Observaciones',
        blank=True,
        help_text='Motivo específico del ajuste de este concepto'
    )
    
    class Meta:
        verbose_name = 'Detalle de Ajuste'
        verbose_name_plural = 'Detalles de Ajuste'
        ordering = ['concepto__codigo']
        indexes = [
            models.Index(fields=['ajuste', 'concepto']),
        ]
        unique_together = [
            ['organization', 'ajuste', 'concepto']
        ]
    
    def __str__(self):
        return f"{self.ajuste.numero_ajuste} - {self.concepto.codigo}"
    
    @property
    def diferencia(self):
        """
        Calcula la diferencia entre valor ajustado y original.
        
        Returns:
            Decimal: Diferencia
        """
        return self.valor_ajustado - self.valor_original
