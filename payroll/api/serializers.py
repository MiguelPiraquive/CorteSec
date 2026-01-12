"""
Serializers API REST para módulo Payroll (FASE 7)

Serializers completos para Django REST Framework que exponen:
- Modelos fundacionales (FASE 1)
- Cálculo de nómina (FASE 2)
- Legal/Fiscal (FASE 3)
- HSE (FASE 4)
- Integraciones (FASE 5)
- Notificaciones (FASE 6)

Características:
- Validaciones de negocio integradas
- Campos calculados (read-only)
- Nested serializers para relaciones
- Permisos por organización (tenant-aware)
"""

from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone

from payroll.models import (
    # Catálogos
    TipoDocumento,
    TipoTrabajador,
    TipoContrato,
    ConceptoLaboral,
    
    # Empleados y Contratos
    Empleado,
    Contrato,
    
    # Nóminas
    PeriodoNomina,
    NominaBase,
    NominaSimple,
    NominaElectronica,
    
    # Detalles
    DetalleConceptoBase,
    DetalleConceptoNominaSimple,
    DetalleConceptoNominaElectronica,
    
    # FASE 1: Estructurales
    CentroCosto,
    DistribucionCostoNomina,
    TipoNovedad,
    NovedadCalendario,
    EntidadExterna,
    AsientoNomina,
    DetalleAsientoNomina,
    
    # FASE 3: Legal/Fiscal
    EmbargoJudicial,
    TablaRetencionFuente,
    LiquidacionFIC,
    
    # FASE 4: HSE
    CertificadoEmpleado,
    EntregaDotacion,
    
    # FASE 5: Integraciones
    NominaAjuste,
    DetalleAjuste,
)


# ============================================================================
# SERIALIZERS CATÁLOGOS
# ============================================================================

class TipoDocumentoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de documento."""
    
    class Meta:
        model = TipoDocumento
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'activo']
        read_only_fields = ['id']


class TipoTrabajadorSerializer(serializers.ModelSerializer):
    """Serializer para tipos de trabajador."""
    
    class Meta:
        model = TipoTrabajador
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'requiere_nomina_electronica', 'activo']
        read_only_fields = ['id']


class TipoContratoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de contrato."""
    
    class Meta:
        model = TipoContrato
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'requiere_fecha_fin', 'activo']
        read_only_fields = ['id']


class ConceptoLaboralSerializer(serializers.ModelSerializer):
    """Serializer para conceptos laborales."""
    
    tipo_concepto_display = serializers.CharField(source='get_tipo_concepto_display', read_only=True)
    tipo_formula_display = serializers.CharField(source='get_tipo_formula_display', read_only=True)
    
    class Meta:
        model = ConceptoLaboral
        fields = [
            'id', 'organization', 'codigo', 'nombre', 'descripcion',
            'tipo_concepto', 'tipo_concepto_display',
            'es_salarial', 'aplica_seguridad_social', 'es_item_construccion',
            'tipo_formula', 'tipo_formula_display', 'valor_fijo', 'formula',
            'afecta_ibc', 'afecta_parafiscales', 'es_provision',
            'orden', 'activo', 'codigo_dian',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_modificacion']


# ============================================================================
# SERIALIZERS EMPLEADOS Y CONTRATOS
# ============================================================================

class EmpleadoListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados de empleados."""
    
    nombre_completo = serializers.CharField(read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'documento', 'nombres', 'apellidos', 'nombre_completo',
            'correo', 'activo', 'cargo'
        ]


class EmpleadoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para empleado con detalles."""
    
    nombre_completo = serializers.CharField(read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)
    
    # Nested
    contratos = serializers.SerializerMethodField()
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'organization', 'documento', 'tipo_documento', 'tipo_documento_nombre',
            'nombres', 'apellidos', 'nombre_completo',
            'fecha_nacimiento', 'genero',
            'direccion', 'telefono', 'correo',
            'cargo', 'cargo_nombre', 'departamento', 'municipio',
            'fecha_ingreso', 'tipo_vinculacion', 'ibc_default',
            'activo', 'foto',
            'contratos',
            'creado_el', 'actualizado_el'
        ]
        read_only_fields = ['id', 'nombre_completo', 'creado_el', 'actualizado_el']
    
    def get_contratos(self, obj):
        """Retorna contratos activos del empleado."""
        contratos = obj.contratos.filter(estado='ACT')[:5]
        return ContratoSerializer(contratos, many=True).data

class ContratoSerializer(serializers.ModelSerializer):
    """Serializer para contratos laborales."""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_contrato_nombre = serializers.CharField(source='tipo_contrato.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    dias_restantes = serializers.SerializerMethodField()
    
    class Meta:
        model = Contrato
        fields = [
            'id', 'organization', 'empleado', 'empleado_nombre',
            'tipo_contrato', 'tipo_contrato_nombre',
            'fecha_inicio', 'fecha_fin', 'dias_restantes',
            'salario_base', 'tipo_salario', 'jornada', 'auxilio_transporte',
            'nivel_riesgo_arl',
            'estado', 'estado_display', 'motivo_terminacion', 'fecha_terminacion_real',
            'creado_el', 'actualizado_el'
        ]
        read_only_fields = ['id', 'creado_el', 'actualizado_el']
    
    def get_dias_restantes(self, obj):
        """Calcula días restantes si tiene fecha_fin."""
        if obj.fecha_fin and obj.estado == 'ACT':
            delta = obj.fecha_fin - timezone.now().date()
            return delta.days if delta.days > 0 else 0
        return None


# ============================================================================
# SERIALIZERS NÓMINAS
# ============================================================================

class PeriodoNominaSerializer(serializers.ModelSerializer):
    """Serializer para períodos de nómina."""
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    dias_periodo = serializers.SerializerMethodField()
    
    class Meta:
        model = PeriodoNomina
        fields = [
            'id', 'organization', 'nombre', 'observaciones',
            'fecha_inicio', 'fecha_fin', 'fecha_pago', 'dias_periodo',
            'tipo', 'tipo_display',
            'estado', 'estado_display',
            'creado_el', 'actualizado_el'
        ]
        read_only_fields = ['id', 'dias_periodo', 'creado_el', 'actualizado_el']
    
    def get_dias_periodo(self, obj):
        """Calcula días del período."""
        if obj.fecha_inicio and obj.fecha_fin:
            return (obj.fecha_fin - obj.fecha_inicio).days + 1
        return 0


class DetalleConceptoSerializer(serializers.ModelSerializer):
    """Serializer para detalles de conceptos en nómina."""
    
    concepto_nombre = serializers.CharField(source='concepto.nombre', read_only=True)
    concepto_naturaleza = serializers.CharField(source='concepto.naturaleza', read_only=True)
    
    class Meta:
        model = DetalleConceptoBase
        fields = [
            'id', 'concepto', 'concepto_nombre', 'concepto_naturaleza',
            'cantidad', 'valor', 'observaciones'
        ]
        read_only_fields = ['id']


class EmpleadoInfoSerializer(serializers.ModelSerializer):
    """Serializer simplificado de empleado para nómina."""
    
    nombre_completo = serializers.CharField(read_only=True)
    cargo_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Empleado
        fields = ['id', 'documento', 'nombre_completo', 'cargo_info']
        read_only_fields = ['id', 'documento', 'nombre_completo']
    
    def get_cargo_info(self, obj):
        if obj.cargo:
            return {'id': obj.cargo.id, 'nombre': obj.cargo.nombre}
        return None


class DetalleItemNominaSerializer(serializers.Serializer):
    """Serializer para detalles de items en nómina."""
    
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_precio = serializers.DecimalField(source='item.precio_unitario', max_digits=12, decimal_places=2, read_only=True)
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_unitario = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(source='valor_total', max_digits=12, decimal_places=2, read_only=True)


class NominaBaseSerializer(serializers.ModelSerializer):
    """Serializer base para nóminas - compatible con frontend."""
    
    # Campos que espera el frontend
    empleado_info = EmpleadoInfoSerializer(source='empleado', read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    # Campos calculados para el frontend
    produccion = serializers.DecimalField(source='total_items', max_digits=12, decimal_places=2, read_only=True)
    seguridad = serializers.SerializerMethodField()
    prestamos = serializers.DecimalField(source='deduccion_prestamos', max_digits=12, decimal_places=2, read_only=True)
    restaurante = serializers.DecimalField(source='deduccion_restaurante', max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(source='neto_pagar', max_digits=12, decimal_places=2, read_only=True)
    
    # Detalles
    detalles = DetalleItemNominaSerializer(source='detalles_items', many=True, read_only=True)
    detalles_conceptos = DetalleConceptoSerializer(many=True, read_only=True)
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'organization', 'numero_interno',
            'empleado', 'empleado_info', 'empleado_nombre',
            'periodo', 'periodo_nombre',
            'periodo_inicio', 'periodo_fin',
            'dias_trabajados', 'salario_base_contrato',
            # Campos originales
            'total_items', 'total_deducciones', 'neto_pagar',
            # Campos frontend
            'produccion', 'seguridad', 'prestamos', 'restaurante', 'total',
            # Seguridad social detallada
            'aporte_salud_empleado', 'aporte_pension_empleado',
            'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
            # Estado
            'estado', 'estado_display',
            'observaciones', 'fecha_aprobacion',
            # Detalles
            'detalles', 'detalles_conceptos',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = [
            'id', 'numero_interno', 'total_items', 'total_deducciones', 'neto_pagar',
            'produccion', 'seguridad', 'prestamos', 'restaurante', 'total',
            'aporte_salud_empleado', 'aporte_pension_empleado',
            'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
            'fecha_aprobacion', 'fecha_creacion', 'fecha_actualizacion'
        ]
    
    def get_seguridad(self, obj):
        """Retorna el total de seguridad social del empleado."""
        return obj.aporte_salud_empleado + obj.aporte_pension_empleado
    
    def validate(self, data):
        """Validaciones de negocio."""
        # Validar que el empleado esté activo
        if 'empleado' in data and data['empleado'].estado != 'ACTIVO':
            raise serializers.ValidationError({
                'empleado': 'El empleado debe estar en estado ACTIVO para generar nómina'
            })
        
        # Validar que el período esté abierto
        if 'periodo' in data and data['periodo'].estado != 'ABIERTO':
            raise serializers.ValidationError({
                'periodo': 'El período debe estar ABIERTO para generar nóminas'
            })
        
        return data


class NominaElectronicaSerializer(NominaBaseSerializer):
    """Serializer para nóminas electrónicas DIAN."""
    
    cune = serializers.CharField(read_only=True)
    estado_dian_display = serializers.CharField(source='get_estado_dian_display', read_only=True)
    tiene_xml = serializers.SerializerMethodField()
    
    class Meta(NominaBaseSerializer.Meta):
        model = NominaElectronica
        fields = NominaBaseSerializer.Meta.fields + [
            'numero_documento', 'cune', 'cufe',
            'estado_dian', 'estado_dian_display', 'tiene_xml',
            'fecha_envio_dian', 'fecha_respuesta_dian',
            'codigo_respuesta_dian', 'mensaje_respuesta_dian'
        ]
        read_only_fields = NominaBaseSerializer.Meta.read_only_fields + [
            'numero_documento', 'cune', 'cufe', 'estado_dian',
            'fecha_envio_dian', 'fecha_respuesta_dian'
        ]
    
    def get_tiene_xml(self, obj):
        """Indica si tiene XML generado."""
        return bool(obj.xml_contenido)


# ============================================================================
# SERIALIZERS FASE 1: ESTRUCTURALES
# ============================================================================

class CentroCostoSerializer(serializers.ModelSerializer):
    """Serializer para centros de costo."""
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    director_nombre = serializers.CharField(source='director_obra.get_full_name', read_only=True)
    
    class Meta:
        model = CentroCosto
        fields = [
            'id', 'organization', 'codigo', 'nombre', 'descripcion',
            'tipo', 'tipo_display', 'parent', 'nivel', 'ruta_completa',
            'presupuesto_mano_obra', 'costo_acumulado_mano_obra',
            'ciudad', 'direccion',
            'fecha_inicio_planificada', 'fecha_fin_planificada',
            'fecha_inicio_real', 'fecha_fin_real',
            'estado', 'estado_display', 'activo',
            'director_obra', 'director_nombre',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'nivel', 'ruta_completa', 'costo_acumulado_mano_obra', 
                          'fecha_creacion', 'fecha_actualizacion']


class NovedadCalendarioSerializer(serializers.ModelSerializer):
    """Serializer para novedades de calendario."""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_novedad_nombre = serializers.CharField(source='tipo_novedad.nombre', read_only=True)
    
    class Meta:
        model = NovedadCalendario
        fields = [
            'id', 'organization', 'empleado', 'empleado_nombre',
            'tipo_novedad', 'tipo_novedad_nombre',
            'fecha_inicio', 'fecha_fin', 'dias_calendario', 'dias_habiles',
            'centro_costo', 'documento_soporte', 'numero_documento', 'entidad_emisora',
            'valor_pagado_empleador', 'valor_pagado_eps_arl',
            'estado', 'aprobada_por', 'fecha_aprobacion', 'motivo_rechazo',
            'observaciones',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'dias_calendario', 'dias_habiles', 
                          'fecha_creacion', 'fecha_actualizacion']


class AsientoNominaSerializer(serializers.ModelSerializer):
    """Serializer para asientos contables de nómina."""
    
    nomina_empleado = serializers.SerializerMethodField()
    cuadra = serializers.SerializerMethodField()
    
    class Meta:
        model = AsientoNomina
        fields = [
            'id', 'organization', 'nomina_simple', 'nomina_electronica', 'nomina_empleado',
            'numero_comprobante', 'fecha_asiento', 'descripcion',
            'total_debitos', 'total_creditos', 'diferencia', 'cuadra',
            'estado',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = [
            'id', 'numero_comprobante', 'total_debitos', 'total_creditos', 'diferencia',
            'fecha_creacion', 'fecha_actualizacion'
        ]
    
    def get_nomina_empleado(self, obj):
        """Obtiene el nombre del empleado de la nómina asociada."""
        if obj.nomina_simple:
            return obj.nomina_simple.empleado.nombre_completo
        elif obj.nomina_electronica:
            return obj.nomina_electronica.empleado.nombre_completo
        return None
    
    def get_cuadra(self, obj):
        """Verifica si el asiento cuadra."""
        return abs(obj.total_debitos - obj.total_creditos) <= Decimal('0.01')


# ============================================================================
# SERIALIZERS FASE 3: LEGAL/FISCAL
# ============================================================================

class EmbargoJudicialSerializer(serializers.ModelSerializer):
    """Serializer para embargos judiciales."""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = EmbargoJudicial
        fields = [
            'id', 'organization', 'empleado', 'empleado_nombre',
            'tipo_embargo', 'numero_proceso', 'juzgado',
            'fecha_notificacion', 'fecha_inicio_descuento', 'fecha_fin',
            'valor_total_deuda', 'porcentaje_descuento', 'valor_fijo_mensual',
            'saldo_pendiente', 'total_descontado',
            'beneficiario', 'numero_cuenta', 'banco',
            'estado', 'estado_display', 'observaciones',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['id', 'total_descontado', 'fecha_creacion', 'fecha_modificacion']


class TablaRetencionFuenteSerializer(serializers.ModelSerializer):
    """Serializer para tabla de retención en la fuente."""
    
    class Meta:
        model = TablaRetencionFuente
        fields = [
            'id', 'vigencia_desde', 'vigencia_hasta',
            'numero_tramo', 'uvt_desde', 'uvt_hasta',
            'tarifa_marginal', 'impuesto_tramo_anterior',
            'activa', 'fecha_creacion'
        ]
        read_only_fields = ['id', 'fecha_creacion']


# ============================================================================
# SERIALIZERS FASE 4: HSE
# ============================================================================

class CertificadoEmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para certificados HSE."""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    estado_display = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    esta_vencido = serializers.SerializerMethodField()
    
    class Meta:
        model = CertificadoEmpleado
        fields = [
            'id', 'organization', 'empleado', 'empleado_nombre',
            'tipo_certificado', 'numero_certificado',
            'entidad_emisora', 'fecha_emision', 'fecha_vencimiento',
            'dias_restantes', 'esta_vencido',
            'obligatorio_para_nomina', 'estado_display', 'alerta_enviada',
            'observaciones',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['id', 'alerta_enviada', 'fecha_creacion', 'fecha_modificacion']
    
    def get_estado_display(self, obj):
        """Retorna estado calculado del certificado."""
        return obj.estado  # estado es @property en el modelo
    
    def get_dias_restantes(self, obj):
        """Calcula días restantes hasta vencimiento."""
        if obj.fecha_vencimiento:
            delta = obj.fecha_vencimiento - timezone.now().date()
            return delta.days
        return None
    
    def get_esta_vencido(self, obj):
        """Indica si el certificado está vencido."""
        if obj.fecha_vencimiento:
            return timezone.now().date() > obj.fecha_vencimiento
        return False


class EntregaDotacionSerializer(serializers.ModelSerializer):
    """Serializer para entregas de dotación."""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_dotacion_display = serializers.CharField(source='get_tipo_dotacion_display', read_only=True)
    periodo_display = serializers.CharField(source='get_periodo_dotacion_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = EntregaDotacion
        fields = [
            'id', 'organization', 'empleado', 'empleado_nombre',
            'tipo_dotacion', 'tipo_dotacion_display',
            'periodo_dotacion', 'periodo_display', 'anio',
            'descripcion_elementos', 'cantidad', 'talla',
            'valor_unitario', 'valor_total',
            'fecha_programada', 'fecha_entrega_real',
            'estado', 'estado_display',
            'recibido_por', 'documento_recibido', 'firma_digital', 'archivo_adjunto',
            'observaciones', 'entregado_por',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_modificacion']


# ============================================================================
# SERIALIZERS FASE 5: INTEGRACIONES
# ============================================================================

class NominaAjusteSerializer(serializers.ModelSerializer):
    """Serializer para ajustes de nómina electrónica DIAN."""
    
    nomina_original_numero = serializers.CharField(source='nomina_original.numero_documento', read_only=True)
    tipo_ajuste_display = serializers.CharField(source='get_tipo_ajuste_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    diferencia_neto = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = NominaAjuste
        fields = [
            'id', 'organization', 'nomina_original', 'nomina_original_numero',
            'numero_ajuste', 'fecha_ajuste',
            'tipo_ajuste', 'tipo_ajuste_display', 'motivo_ajuste',
            'total_devengado_ajustado', 'diferencia_neto',
            'cune', 'estado', 'estado_display',
            'fecha_envio_dian', 'fecha_respuesta_dian',
            'codigo_respuesta_dian', 'mensaje_respuesta_dian',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = [
            'id', 'numero_ajuste', 'cune',
            'fecha_envio_dian', 'fecha_respuesta_dian',
            'fecha_creacion', 'fecha_modificacion'
        ]
    
    def validate(self, data):
        """Validaciones de negocio para ajustes."""
        # Validar que la nómina original esté aprobada
        if 'nomina_original' in data:
            if data['nomina_original'].estado not in ['aprobado', 'aceptado']:
                raise serializers.ValidationError({
                    'nomina_original': 'La nómina original debe estar aprobada o aceptada'
                })
        
        # Si es tipo ELIMINAR, todos los valores deben ser 0
        if data.get('tipo_ajuste') == 'ELIMINAR':
            if (data.get('total_devengado_ajustado', 0) != 0 or
                data.get('total_deducido_ajustado', 0) != 0 or
                data.get('neto_ajustado', 0) != 0):
                raise serializers.ValidationError({
                    'tipo_ajuste': 'Para tipo ELIMINAR todos los valores ajustados deben ser 0'
                })
        
        return data


class DetalleAjusteSerializer(serializers.ModelSerializer):
    """Serializer para detalles de ajustes."""
    
    concepto_nombre = serializers.CharField(source='concepto.nombre', read_only=True)
    diferencia = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = DetalleAjuste
        fields = [
            'id', 'ajuste', 'concepto', 'concepto_nombre',
            'valor_original', 'valor_ajustado', 'diferencia'
        ]
        read_only_fields = ['id', 'diferencia']


# ============================================================================
# SERIALIZERS DE ESCRITURA (CREATE/UPDATE)
# ============================================================================

class NominaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nóminas con validaciones."""
    
    class Meta:
        model = NominaBase
        fields = [
            'organization', 'empleado', 'periodo',
            'fecha_inicio', 'fecha_fin',
            'dias_trabajados', 'horas_trabajadas',
            'observaciones'
        ]
    
    def validate(self, data):
        """Validaciones antes de crear."""
        # Validar empleado activo
        if data['empleado'].estado != 'ACTIVO':
            raise serializers.ValidationError('El empleado debe estar ACTIVO')
        
        # Validar período abierto
        if data['periodo'].estado != 'ABIERTO':
            raise serializers.ValidationError('El período debe estar ABIERTO')
        
        # Validar que no exista nómina previa para ese empleado/período
        existe = NominaBase.objects.filter(
            organization=data['organization'],
            empleado=data['empleado'],
            periodo=data['periodo']
        ).exists()
        
        if existe:
            raise serializers.ValidationError(
                f'Ya existe una nómina para {data["empleado"].nombre_completo} en el período {data["periodo"].nombre}'
            )
        
        return data
