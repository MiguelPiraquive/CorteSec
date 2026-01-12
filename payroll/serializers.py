from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import (
    TipoDocumento, TipoTrabajador, TipoContrato,
    Empleado, Contrato, PeriodoNomina,
    ConceptoLaboral,
    NominaSimple, NominaElectronica,
    DetalleItemNominaSimple, DetalleItemNominaElectronica,
    DetalleConceptoNominaSimple, DetalleConceptoNominaElectronica,
    ConfiguracionNominaElectronica, WebhookConfig, WebhookLog
)
from cargos.models import Cargo
from items.models import Item

# Alias para compatibilidad
Nomina = NominaSimple
DetalleNomina = DetalleItemNominaSimple


# ============================================
# SERIALIZERS PARA CATÁLOGOS
# ============================================

class TipoDocumentoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de documento"""
    class Meta:
        model = TipoDocumento
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'activo']


class TipoTrabajadorSerializer(serializers.ModelSerializer):
    """Serializer para tipos de trabajador"""
    class Meta:
        model = TipoTrabajador
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'requiere_nomina_electronica', 'activo']


class TipoContratoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de contrato"""
    class Meta:
        model = TipoContrato
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'requiere_fecha_fin', 'activo']


# ============================================
# SERIALIZERS PARA CONCEPTO LABORAL
# ============================================

class ConceptoLaboralSerializer(serializers.ModelSerializer):
    """Serializer completo para conceptos laborales"""
    tipo_concepto_display = serializers.CharField(source='get_tipo_concepto_display', read_only=True)
    
    class Meta:
        model = ConceptoLaboral
        fields = [
            'id', 'codigo', 'nombre', 'descripcion',
            'tipo_concepto', 'tipo_concepto_display',
            'es_salarial', 'aplica_seguridad_social', 'es_item_construccion',
            'codigo_dian', 'activo', 'orden',
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']


class ConceptoLaboralListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listados"""
    tipo_concepto_display = serializers.CharField(source='get_tipo_concepto_display', read_only=True)
    
    class Meta:
        model = ConceptoLaboral
        fields = ['id', 'codigo', 'nombre', 'tipo_concepto', 'tipo_concepto_display', 'activo']


# ============================================
# SERIALIZERS BÁSICOS
# ============================================


class CargoBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Cargo"""
    class Meta:
        model = Cargo
        fields = ['id', 'nombre', 'codigo']


class EmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para empleados con campos relacionados simples"""
    cargo_info = CargoBasicSerializer(source='cargo', read_only=True)
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.SerializerMethodField()
    usa_nomina_electronica = serializers.ReadOnlyField()
    es_subcontratista = serializers.ReadOnlyField()
    
    # Campos relacionados simples para evitar dependencias circulares
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    municipio_nombre = serializers.CharField(source='municipio.nombre', read_only=True)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    tipo_vinculacion_nombre = serializers.CharField(source='tipo_vinculacion.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'nombres', 'apellidos', 'tipo_documento', 'documento', 
            'correo', 'telefono', 'direccion', 'fecha_nacimiento', 'genero', 
            'departamento', 'municipio', 'cargo', 'tipo_vinculacion',
            'fecha_ingreso', 'ibc_default', 'foto', 'activo', 
            'creado_el', 'actualizado_el',
            'nombre_completo', 'edad', 'usa_nomina_electronica', 'es_subcontratista',
            'departamento_nombre', 'municipio_nombre', 'cargo_nombre', 'cargo_info',
            'tipo_documento_nombre', 'tipo_vinculacion_nombre'
        ]
        
    def get_edad(self, obj):
        if obj.fecha_nacimiento:
            from datetime import date
            today = date.today()
            return today.year - obj.fecha_nacimiento.year - ((today.month, today.day) < (obj.fecha_nacimiento.month, obj.fecha_nacimiento.day))
        return None


# ============================================
# SERIALIZERS PARA CONTRATO
# ============================================

class ContratoSerializer(serializers.ModelSerializer):
    """Serializer completo para contratos"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_contrato_nombre = serializers.CharField(source='tipo_contrato.nombre', read_only=True)
    esta_activo = serializers.ReadOnlyField()
    requiere_nomina_electronica = serializers.ReadOnlyField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_salario_display = serializers.CharField(source='get_tipo_salario_display', read_only=True)
    
    class Meta:
        model = Contrato
        fields = [
            'id', 'empleado', 'empleado_nombre', 'tipo_contrato', 'tipo_contrato_nombre',
            'tipo_salario', 'tipo_salario_display', 'salario_base', 'jornada',
            'auxilio_transporte', 'nivel_riesgo_arl', 'fecha_inicio', 'fecha_fin',
            'estado', 'estado_display', 'motivo_terminacion', 'fecha_terminacion_real',
            'esta_activo', 'requiere_nomina_electronica', 'creado_el', 'actualizado_el'
        ]


class ContratoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de contratos"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_contrato_nombre = serializers.CharField(source='tipo_contrato.nombre', read_only=True)
    esta_activo = serializers.ReadOnlyField()
    
    class Meta:
        model = Contrato
        fields = [
            'id', 'empleado', 'empleado_nombre', 'tipo_contrato_nombre',
            'salario_base', 'fecha_inicio', 'fecha_fin', 'estado', 'esta_activo'
        ]


# ============================================
# SERIALIZERS PARA PERIODO NÓMINA
# ============================================

class PeriodoNominaSerializer(serializers.ModelSerializer):
    """Serializer completo para periodos de nómina"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    cantidad_nominas = serializers.SerializerMethodField()
    
    class Meta:
        model = PeriodoNomina
        fields = [
            'id', 'nombre', 'tipo', 'tipo_display', 'fecha_inicio', 'fecha_fin',
            'fecha_pago', 'fecha_pago_real', 'estado', 'estado_display',
            'observaciones', 'cantidad_nominas', 'creado_el', 'actualizado_el',
            'cerrado_por', 'fecha_cierre'
        ]
    
    def get_cantidad_nominas(self, obj):
        return obj.nomina_set.count()


class PeriodoNominaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de periodos"""
    cantidad_nominas = serializers.SerializerMethodField()
    
    class Meta:
        model = PeriodoNomina
        fields = [
            'id', 'nombre', 'tipo', 'fecha_inicio', 'fecha_fin',
            'fecha_pago', 'estado', 'cantidad_nominas'
        ]
    
    def get_cantidad_nominas(self, obj):
        return obj.nomina_set.count()


# ============================================
# SERIALIZERS PARA DETALLE NÓMINA
# ============================================

class DetalleItemNominaSimpleSerializer(serializers.ModelSerializer):
    """Serializer para items de nómina simple"""
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_codigo = serializers.CharField(source='item.codigo', read_only=True)
    item_unidad = serializers.CharField(source='item.unidad_medida', read_only=True)
    
    class Meta:
        model = DetalleItemNominaSimple
        fields = [
            'id', 'nomina', 'item', 'item_nombre', 'item_codigo', 'item_unidad',
            'cantidad', 'valor_unitario', 'valor_total', 'observaciones'
        ]
        read_only_fields = ['valor_total']


class DetalleItemNominaElectronicaSerializer(serializers.ModelSerializer):
    """Serializer para items de nómina electrónica"""
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_codigo = serializers.CharField(source='item.codigo', read_only=True)
    item_unidad = serializers.CharField(source='item.unidad_medida', read_only=True)
    
    class Meta:
        model = DetalleItemNominaElectronica
        fields = [
            'id', 'nomina', 'item', 'item_nombre', 'item_codigo', 'item_unidad',
            'cantidad', 'valor_unitario', 'valor_total', 'codigo_dian', 'observaciones'
        ]
        read_only_fields = ['valor_total']


# ============================================
# SERIALIZERS PARA DETALLE CONCEPTOS
# ============================================

class DetalleConceptoNominaSimpleSerializer(serializers.ModelSerializer):
    """
    Serializer para conceptos de nómina simple.
    Maneja devengados y deducciones adicionales (auxilio transporte, bonos, etc.)
    """
    concepto_info = ConceptoLaboralListSerializer(source='concepto', read_only=True)
    concepto_nombre = serializers.CharField(source='concepto.nombre', read_only=True)
    concepto_codigo = serializers.CharField(source='concepto.codigo', read_only=True)
    concepto_tipo = serializers.CharField(source='concepto.tipo_concepto', read_only=True)
    es_devengado = serializers.BooleanField(source='concepto.es_devengado', read_only=True)
    es_deduccion = serializers.BooleanField(source='concepto.es_deduccion', read_only=True)
    
    class Meta:
        model = DetalleConceptoNominaSimple
        fields = [
            'id', 'nomina', 'concepto', 'concepto_info', 
            'concepto_nombre', 'concepto_codigo', 'concepto_tipo',
            'es_devengado', 'es_deduccion',
            'cantidad', 'valor_unitario', 'valor_total', 'observaciones'
        ]
        read_only_fields = ['valor_total']
    
    def validate_concepto(self, value):
        """Validar que el concepto esté activo"""
        if not value.activo:
            raise serializers.ValidationError(
                f"El concepto '{value.nombre}' no está activo."
            )
        return value
    
    def validate(self, data):
        """Validaciones adicionales"""
        if data.get('cantidad') and data['cantidad'] <= 0:
            raise serializers.ValidationError({
                'cantidad': 'La cantidad debe ser mayor a cero.'
            })
        if data.get('valor_unitario') and data['valor_unitario'] < 0:
            raise serializers.ValidationError({
                'valor_unitario': 'El valor unitario no puede ser negativo.'
            })
        return data


class DetalleConceptoNominaElectronicaSerializer(serializers.ModelSerializer):
    """
    Serializer para conceptos de nómina electrónica.
    Incluye código DIAN para integración con XML.
    """
    concepto_info = ConceptoLaboralListSerializer(source='concepto', read_only=True)
    concepto_nombre = serializers.CharField(source='concepto.nombre', read_only=True)
    concepto_codigo = serializers.CharField(source='concepto.codigo', read_only=True)
    concepto_tipo = serializers.CharField(source='concepto.tipo_concepto', read_only=True)
    es_devengado = serializers.BooleanField(source='concepto.es_devengado', read_only=True)
    es_deduccion = serializers.BooleanField(source='concepto.es_deduccion', read_only=True)
    
    class Meta:
        model = DetalleConceptoNominaElectronica
        fields = [
            'id', 'nomina', 'concepto', 'concepto_info',
            'concepto_nombre', 'concepto_codigo', 'concepto_tipo',
            'es_devengado', 'es_deduccion',
            'cantidad', 'valor_unitario', 'valor_total', 
            'codigo_dian', 'observaciones'
        ]
        read_only_fields = ['valor_total']
    
    def validate_concepto(self, value):
        """Validar que el concepto esté activo"""
        if not value.activo:
            raise serializers.ValidationError(
                f"El concepto '{value.nombre}' no está activo."
            )
        return value
    
    def validate(self, data):
        """Validaciones adicionales"""
        if data.get('cantidad') and data['cantidad'] <= 0:
            raise serializers.ValidationError({
                'cantidad': 'La cantidad debe ser mayor a cero.'
            })
        if data.get('valor_unitario') and data['valor_unitario'] < 0:
            raise serializers.ValidationError({
                'valor_unitario': 'El valor unitario no puede ser negativo.'
            })
        return data


# Alias para compatibilidad temporal
DetalleNominaSerializer = DetalleItemNominaSimpleSerializer


class NominaSimpleSerializer(serializers.ModelSerializer):
    """Serializer completo para nómina simple con items y conceptos"""
    empleado_info = EmpleadoSerializer(source='empleado', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)
    detalles_items = DetalleItemNominaSimpleSerializer(many=True, read_only=True)
    detalles_conceptos = DetalleConceptoNominaSimpleSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    # Estadísticas calculadas
    total_devengados_conceptos = serializers.SerializerMethodField()
    total_deducciones_conceptos = serializers.SerializerMethodField()
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'numero_interno', 'estado', 'estado_display',
            'empleado', 'empleado_info', 'periodo', 'periodo_nombre',
            'periodo_inicio', 'periodo_fin', 'dias_trabajados',
            
            # Detalles
            'detalles_items', 'detalles_conceptos',
            
            # Devengados
            'total_items', 'salario_base_contrato',
            'total_devengados_conceptos',
            
            # Seguridad Social
            'base_cotizacion', 'excedente_no_salarial',
            'aporte_salud_empleado', 'aporte_pension_empleado',
            'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
            
            # Parafiscales
            'aporte_sena', 'aporte_icbf', 'aporte_caja_compensacion',
            
            # Provisiones
            'provision_cesantias', 'provision_intereses_cesantias',
            'provision_prima', 'provision_vacaciones',
            
            # Deducciones
            'deduccion_prestamos', 'deduccion_restaurante', 
            'deduccion_anticipos', 'otras_deducciones',
            'total_deducciones_conceptos', 'total_deducciones',
            
            # Resultado
            'neto_pagar',
            
            # Metadata
            'aprobada_por', 'fecha_aprobacion', 'fecha_pago', 'comprobante_pago',
            'observaciones', 'fecha_creacion', 'fecha_actualizacion', 'creado_por'
        ]
    
    def get_total_devengados_conceptos(self, obj):
        """Suma de conceptos tipo devengado"""
        return sum(
            detalle.valor_total 
            for detalle in obj.detalles_conceptos.filter(concepto__tipo_concepto='DEV')
        )
    
    def get_total_deducciones_conceptos(self, obj):
        """Suma de conceptos tipo deducción"""
        return sum(
            detalle.valor_total 
            for detalle in obj.detalles_conceptos.filter(concepto__tipo_concepto='DED')
        )


# Alias para compatibilidad temporal
NominaSerializer = NominaSimpleSerializer


class NominaSimpleListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listado de nóminas simples"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='empleado.documento', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'numero_interno',
            'empleado_nombre', 'empleado_documento',
            'periodo_nombre', 'estado', 'estado_display',
            'total_items', 'total_deducciones', 'neto_pagar',
            'fecha_creacion', 'fecha_pago'
        ]


# Alias para compatibilidad temporal  
NominaListSerializer = NominaSimpleListSerializer


class NominaSimpleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para creación de nómina simple con detalles anidados.
    Soporta creación transaccional de nómina + items + conceptos en una sola operación.
    """
    detalles_items = DetalleItemNominaSimpleSerializer(many=True, required=False)
    detalles_conceptos = DetalleConceptoNominaSimpleSerializer(many=True, required=False)
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'empleado', 'periodo', 'periodo_inicio', 'periodo_fin',
            'dias_trabajados', 'salario_base_contrato', 'observaciones',
            'detalles_items', 'detalles_conceptos'
        ]
    
    def validate(self, data):
        """Validaciones de negocio"""
        # Validar que el empleado esté activo
        if not data['empleado'].activo:
            raise serializers.ValidationError({
                'empleado': f"El empleado {data['empleado'].nombre_completo} no está activo."
            })
        
        # Validar que el periodo esté abierto
        if data['periodo'].estado != 'ABI':
            raise serializers.ValidationError({
                'periodo': f"El periodo {data['periodo'].nombre} no está abierto."
            })
        
        # Validar fechas
        if data['periodo_inicio'] > data['periodo_fin']:
            raise serializers.ValidationError({
                'periodo_fin': 'La fecha fin debe ser mayor o igual a la fecha inicio.'
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Crea nómina con detalles de forma transaccional"""
        detalles_items_data = validated_data.pop('detalles_items', [])
        detalles_conceptos_data = validated_data.pop('detalles_conceptos', [])
        
        # Crear nómina
        nomina = NominaSimple.objects.create(**validated_data)
        
        # Generar número interno
        nomina.generar_numero_interno()
        nomina.save()
        
        # Crear detalles de items
        total_items = Decimal('0.00')
        for detalle_data in detalles_items_data:
            detalle_data['nomina'] = nomina
            detalle = DetalleItemNominaSimple.objects.create(**detalle_data)
            total_items += detalle.valor_total
        
        # Crear detalles de conceptos
        total_conceptos_devengados = Decimal('0.00')
        total_conceptos_deducciones = Decimal('0.00')
        
        for detalle_data in detalles_conceptos_data:
            detalle_data['nomina'] = nomina
            detalle = DetalleConceptoNominaSimple.objects.create(**detalle_data)
            
            if detalle.concepto.tipo_concepto == 'DEV':
                total_conceptos_devengados += detalle.valor_total
            elif detalle.concepto.tipo_concepto == 'DED':
                total_conceptos_deducciones += detalle.valor_total
        
        # Actualizar total_items (incluye items de construcción + conceptos devengados)
        nomina.total_items = total_items + total_conceptos_devengados
        
        # Actualizar otras_deducciones con conceptos de deducción
        nomina.otras_deducciones = total_conceptos_deducciones
        
        # Procesar cálculos completos
        try:
            nomina.procesar_completo()
        except Exception as e:
            # Si hay error en cálculos, revertir transacción
            raise serializers.ValidationError({
                'error': f'Error al procesar nómina: {str(e)}'
            })
        
        return nomina


# Alias para compatibilidad temporal
NominaCreateSerializer = NominaSimpleCreateSerializer


# ============================================
# SERIALIZERS PARA NÓMINA ELECTRÓNICA
# ============================================


# ============================================
# SERIALIZERS COMENTADOS - Usan modelos eliminados en arquitectura v3.0
# ============================================
"""
class TipoDeduccionSerializer(serializers.ModelSerializer):
    '''Serializer para tipos de deducción'''
    class Meta:
        model = TipoDeduccion
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'porcentaje_defecto',
            'es_obligatoria', 'aplica_sobre_ibc', 'afecta_prestaciones',
            'requiere_autorizacion', 'activo', 'orden', 
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']


class DetalleDeduccionSerializer(serializers.ModelSerializer):
    '''Serializer para detalle de deducciones de nómina'''
    tipo_info = TipoDeduccionSerializer(source='tipo_deduccion', read_only=True)
    prestamo_numero = serializers.CharField(source='prestamo.numero_prestamo', read_only=True)
    pago_numero = serializers.CharField(source='pago_prestamo.numero_pago', read_only=True)
    
    class Meta:
        model = DetalleDeduccion
        fields = [
            'id', 'nomina', 'tipo_deduccion', 'tipo_info',
            'valor', 'base_calculo', 'porcentaje_aplicado',
            'prestamo', 'prestamo_numero', 
            'pago_prestamo', 'pago_numero',
            'observaciones', 'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion']
    
    def validate(self, data):
        '''Validaciones de negocio'''
        # Si es deducción de préstamo, debe tener prestamo
        if data.get('tipo_deduccion') and data['tipo_deduccion'].codigo == 'PRESTAMO':
            if not data.get('prestamo'):
                raise serializers.ValidationError(
                    "Las deducciones de tipo PRESTAMO deben tener un préstamo asociado"
                )
        
        # Validar que el valor sea positivo
        if data.get('valor') and data['valor'] <= 0:
            raise serializers.ValidationError("El valor debe ser mayor a cero")
        
        return data


class ComprobanteContableNominaSerializer(serializers.ModelSerializer):
    '''Serializer para comprobantes contables de nómina'''
    comprobante_numero = serializers.CharField(source='comprobante_contable.numero_comprobante', read_only=True)
    comprobante_estado = serializers.CharField(source='comprobante_contable.estado', read_only=True)
    nomina_numero = serializers.CharField(source='nomina.numero_nomina', read_only=True)
    
    class Meta:
        model = ComprobanteContableNomina
        fields = [
            'id', 'nomina', 'nomina_numero',
            'comprobante_contable', 'comprobante_numero', 'comprobante_estado',
            'observaciones', 'fecha_generacion'
        ]
        read_only_fields = ['fecha_generacion']


class HistorialNominaSerializer(serializers.ModelSerializer):
    '''Serializer para historial de cambios en nóminas'''
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    nomina_numero = serializers.CharField(source='nomina.numero_nomina', read_only=True)
    
    class Meta:
        model = HistorialNomina
        fields = [
            'id', 'nomina', 'nomina_numero',
            'usuario', 'usuario_nombre',
            'accion', 'datos_anteriores', 'datos_nuevos',
            'campos_modificados', 'observaciones',
            'fecha_accion'
        ]
        read_only_fields = ['fecha_accion']


class NominaDetalladaSerializer(serializers.ModelSerializer):
    '''Serializer completo de nómina incluyendo deducciones detalladas'''
    empleado_info = EmpleadoSerializer(source='empleado', read_only=True)
    deducciones_detalladas = DetalleDeduccionSerializer(source='detalles_deducciones', many=True, read_only=True)
    comprobante_info = ComprobanteContableNominaSerializer(source='comprobante_nomina', read_only=True)
    produccion = serializers.SerializerMethodField()
    total_deducciones = serializers.SerializerMethodField()
    neto_pagar = serializers.SerializerMethodField()
    
    class Meta:
        model = Nomina
        fields = [
            'id', 'numero_nomina', 'empleado', 'empleado_info',
            'periodo_inicio', 'periodo_fin', 'dias_trabajados',
            'ingreso_real_periodo', 'ibc_cotizacion', 'excedente_no_salarial',
            'deduccion_salud', 'deduccion_pension', 
            'prestamos', 'restaurante', 'otras_deducciones',
            'deducciones_detalladas',
            'produccion', 'total_deducciones', 'neto_pagar',
            'comprobante_info',
            'estado', 'observaciones', 
            'fecha_creacion', 'fecha_pago'
        ]
        read_only_fields = ['numero_nomina', 'fecha_creacion']
    
    def get_produccion(self, obj):
        '''Obtiene el valor de producción'''
        return obj.produccion
    
    def get_total_deducciones(self, obj):
        '''Obtiene el total de deducciones'''
        return obj.total_deducciones
    
    def get_neto_pagar(self, obj):
        '''Obtiene el neto a pagar'''
        return obj.neto_pagar


# ============================================
# SERIALIZERS PARA FASE 2B - NÓMINA ELECTRÓNICA
# ============================================


# COMENTADO - DevengadoNominaElectronica eliminado en arquitectura v3.0
# class DevengadoNominaElectronicaSerializer(serializers.ModelSerializer):
#     '''Serializer para devengados de nómina electrónica'''
#     tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
#     
#     class Meta:
#         model = DevengadoNominaElectronica
#         fields = [
#             'id', 'tipo', 'tipo_display', 'concepto',
#             'cantidad', 'valor_unitario', 'valor_total',
#             'es_salarial'
#         ]
#     
#     def validate(self, data):
#         '''Validaciones de negocio'''
#         # Si tiene cantidad y valor unitario, calcular total
#         if data.get('cantidad') and data.get('valor_unitario'):
#             data['valor_total'] = data['cantidad'] * data['valor_unitario']
#         
#         # Validar que el valor total sea positivo
#         if data.get('valor_total') and data['valor_total'] <= 0:
#             raise serializers.ValidationError("El valor total debe ser mayor a cero")
#         
#         return data


# COMENTADO - DeduccionNominaElectronica eliminado en arquitectura v3.0
# class DeduccionNominaElectronicaSerializer(serializers.ModelSerializer):
#     '''Serializer para deducciones de nómina electrónica'''
#     tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
#     
#     class Meta:
#         model = DeduccionNominaElectronica
#         fields = [
#             'id', 'tipo', 'tipo_display', 'concepto',
#             'porcentaje', 'valor'
#         ]
#     
#     def validate_valor(self, value):
#         '''Validar que el valor sea positivo'''
#         if value <= 0:
#             raise serializers.ValidationError("El valor debe ser mayor a cero")
#         return value
"""

# FIN SERIALIZERS COMENTADOS
# ============================================


class NominaElectronicaSerializer(serializers.ModelSerializer):
    """Serializer completo para nómina electrónica con items y conceptos"""
    empleado_info = EmpleadoSerializer(source='empleado', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)
    detalles_items = DetalleItemNominaElectronicaSerializer(many=True, read_only=True)
    detalles_conceptos = DetalleConceptoNominaElectronicaSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    # Estadísticas calculadas
    total_devengados_conceptos = serializers.SerializerMethodField()
    total_deducciones_conceptos = serializers.SerializerMethodField()
    
    class Meta:
        model = NominaElectronica
        fields = [
            'id', 'numero_documento', 'estado', 'estado_display',
            'empleado', 'empleado_info', 'periodo', 'periodo_nombre',
            'periodo_inicio', 'periodo_fin', 'dias_trabajados',
            
            # Detalles
            'detalles_items', 'detalles_conceptos',
            
            # Devengados
            'total_items', 'salario_base_contrato',
            'total_devengados_conceptos',
            
            # Seguridad Social
            'base_cotizacion', 'excedente_no_salarial',
            'aporte_salud_empleado', 'aporte_pension_empleado',
            'aporte_salud_empleador', 'aporte_pension_empleador', 'aporte_arl',
            
            # Parafiscales
            'aporte_sena', 'aporte_icbf', 'aporte_caja_compensacion',
            
            # Provisiones
            'provision_cesantias', 'provision_intereses_cesantias',
            'provision_prima', 'provision_vacaciones',
            
            # Deducciones
            'deduccion_prestamos', 'deduccion_restaurante',
            'deduccion_anticipos', 'otras_deducciones',
            'total_deducciones_conceptos', 'total_deducciones',
            
            # Resultado
            'neto_pagar',
            
            # DIAN
            'cune', 'xml_contenido',
            'codigo_respuesta_dian', 'mensaje_respuesta_dian',
            'fecha_envio_dian', 'fecha_respuesta_dian',
            
            # Vinculación opcional
            'nomina_simple',
            
            # Metadata
            'observaciones', 'fecha_creacion', 'fecha_actualizacion', 'creado_por'
        ]
    
    def get_total_devengados_conceptos(self, obj):
        """Suma de conceptos tipo devengado"""
        return sum(
            detalle.valor_total 
            for detalle in obj.detalles_conceptos.filter(concepto__tipo_concepto='DEV')
        )
    
    def get_total_deducciones_conceptos(self, obj):
        """Suma de conceptos tipo deducción"""
        return sum(
            detalle.valor_total 
            for detalle in obj.detalles_conceptos.filter(concepto__tipo_concepto='DED')
        )


class NominaElectronicaListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listado de nóminas electrónicas"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='empleado.documento', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = NominaElectronica
        fields = [
            'id', 'numero_documento',
            'empleado_nombre', 'empleado_documento',
            'periodo_nombre', 'estado', 'estado_display',
            'total_items', 'total_deducciones', 'neto_pagar',
            'cune', 'fecha_envio_dian', 'fecha_creacion'
        ]


class NominaElectronicaCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para creación de nómina electrónica con detalles anidados.
    Soporta creación transaccional de nómina + items + conceptos en una sola operación.
    """
    detalles_items = DetalleItemNominaElectronicaSerializer(many=True, required=False)
    detalles_conceptos = DetalleConceptoNominaElectronicaSerializer(many=True, required=False)
    
    class Meta:
        model = NominaElectronica
        fields = [
            'id', 'empleado', 'periodo', 'periodo_inicio', 'periodo_fin',
            'dias_trabajados', 'salario_base_contrato', 'observaciones',
            'nomina_simple',  # Vinculación opcional
            'detalles_items', 'detalles_conceptos'
        ]
    
    def validate(self, data):
        """Validaciones de negocio"""
        # Validar que el empleado esté activo
        if not data['empleado'].activo:
            raise serializers.ValidationError({
                'empleado': f"El empleado {data['empleado'].nombre_completo} no está activo."
            })
        
        # Validar que el periodo esté abierto
        if data['periodo'].estado not in ['ABI', 'CER']:
            raise serializers.ValidationError({
                'periodo': f"El periodo {data['periodo'].nombre} no permite crear nóminas."
            })
        
        # Validar fechas
        if data['periodo_inicio'] > data['periodo_fin']:
            raise serializers.ValidationError({
                'periodo_fin': 'La fecha fin debe ser mayor o igual a la fecha inicio.'
            })
        
        # Validar que el empleado requiera nómina electrónica
        if not data['empleado'].usa_nomina_electronica:
            raise serializers.ValidationError({
                'empleado': f"El empleado {data['empleado'].nombre_completo} no requiere nómina electrónica."
            })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Crea nómina electrónica con detalles de forma transaccional"""
        detalles_items_data = validated_data.pop('detalles_items', [])
        detalles_conceptos_data = validated_data.pop('detalles_conceptos', [])
        
        # Crear nómina electrónica
        nomina = NominaElectronica.objects.create(**validated_data)
        
        # Generar número de documento
        nomina.generar_numero_documento()
        nomina.save()
        
        # Crear detalles de items
        total_items = Decimal('0.00')
        for detalle_data in detalles_items_data:
            detalle_data['nomina'] = nomina
            detalle = DetalleItemNominaElectronica.objects.create(**detalle_data)
            total_items += detalle.valor_total
        
        # Crear detalles de conceptos
        total_conceptos_devengados = Decimal('0.00')
        total_conceptos_deducciones = Decimal('0.00')
        
        for detalle_data in detalles_conceptos_data:
            detalle_data['nomina'] = nomina
            detalle = DetalleConceptoNominaElectronica.objects.create(**detalle_data)
            
            if detalle.concepto.tipo_concepto == 'DEV':
                total_conceptos_devengados += detalle.valor_total
            elif detalle.concepto.tipo_concepto == 'DED':
                total_conceptos_deducciones += detalle.valor_total
        
        # Actualizar total_items (incluye items de construcción + conceptos devengados)
        nomina.total_items = total_items + total_conceptos_devengados
        
        # Actualizar otras_deducciones con conceptos de deducción
        nomina.otras_deducciones = total_conceptos_deducciones
        
        # Procesar cálculos completos
        try:
            nomina.procesar_completo()
        except Exception as e:
            # Si hay error en cálculos, revertir transacción
            raise serializers.ValidationError({
                'error': f'Error al procesar nómina electrónica: {str(e)}'
            })
        
        return nomina


# COMENTADO - usa DevengadoNominaElectronica y DeduccionNominaElectronica (eliminados en v3.0)
# class NominaElectronicaCreateSerializer(serializers.ModelSerializer):
#     """Serializer para crear nómina electrónica con devengados y deducciones"""
#     devengados = DevengadoNominaElectronicaSerializer(many=True, required=False)
#     deducciones = DeduccionNominaElectronicaSerializer(many=True, required=False)
#     
#     class Meta:
#         model = NominaElectronica
#         fields = [
#             'nomina', 'tipo_documento', 'prefijo',
#             'fecha_emision', 'observaciones',
#             'devengados', 'deducciones'
#         ]
#     
#     def create(self, validated_data):
#         devengados_data = validated_data.pop('devengados', [])
#         deducciones_data = validated_data.pop('deducciones', [])
#         
#         # Crear nómina electrónica
#         nomina_electronica = NominaElectronica.objects.create(**validated_data)
#         
#         # Generar número de documento
#         nomina_electronica.generar_numero_documento()
#         
#         # Crear devengados
#         for devengado_data in devengados_data:
#             DevengadoNominaElectronica.objects.create(
#                 organization=nomina_electronica.organization,
#                 nomina_electronica=nomina_electronica,
#                 **devengado_data
#             )
#         
#         # Crear deducciones
#         for deduccion_data in deducciones_data:
#             DeduccionNominaElectronica.objects.create(
#                 organization=nomina_electronica.organization,
#                 nomina_electronica=nomina_electronica,
#                 **deduccion_data
#             )
#         
#         nomina_electronica.save()
#         return nomina_electronica


class NominaElectronicaListSerializer(serializers.ModelSerializer):
    """Serializer compacto para listado de nóminas electrónicas"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='empleado.documento', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    periodo_display = serializers.CharField(source='periodo.__str__', read_only=True)
    
    class Meta:
        model = NominaElectronica
        fields = [
            'id', 'numero_documento', 'cune',
            'empleado_nombre', 'empleado_documento',
            'periodo', 'periodo_display',
            'estado', 'estado_display',
            'total_items', 'total_deducciones', 'neto_pagar',
            'fecha_envio_dian', 'fecha_respuesta_dian',
            'codigo_respuesta_dian'
        ]


class ConfiguracionNominaElectronicaSerializer(serializers.ModelSerializer):
    """Serializer para configuración de nómina electrónica - COMPLETO DIAN"""
    ambiente_display = serializers.CharField(source='get_ambiente_display', read_only=True)
    tipo_ambiente_id_display = serializers.CharField(source='get_tipo_ambiente_id_display', read_only=True)
    tipo_regimen_display = serializers.CharField(source='get_tipo_regimen_display', read_only=True)
    
    class Meta:
        model = ConfiguracionNominaElectronica
        fields = [
            # Configuración general
            'id', 'activa', 'ambiente', 'ambiente_display',
            'tipo_ambiente_id', 'tipo_ambiente_id_display',
            
            # Datos del empleador
            'razon_social', 'nombre_comercial', 'nit', 'dv',
            'tipo_regimen', 'tipo_regimen_display',
            'responsabilidades_tributarias',
            'codigo_actividad_economica',
            
            # Ubicación geográfica (DANE/DIVIPOLA)
            'pais_codigo', 'departamento_codigo', 'municipio_codigo',
            'direccion', 'telefono', 'email',
            
            # Numeración autorizada DIAN
            'prefijo', 'resolucion_numero', 'resolucion_fecha',
            'rango_inicio', 'rango_fin', 'consecutivo_actual',
            'fecha_vigencia_desde', 'fecha_vigencia_hasta',
            
            # Proveedor tecnológico
            'proveedor_razon_social', 'proveedor_nit',
            'proveedor_software_id',
            
            # Parámetros técnicos
            'identificador_software', 'clave_tecnica', 'test_set_id',
            
            # Certificado digital
            'certificado_archivo', 'certificado_password',
            'certificado_fecha_vencimiento', 'certificado_emisor',
            'certificado_numero_serie',
            
            # URLs servicios DIAN
            'url_webservice', 'url_validacion_previa',
            'url_recepcion', 'url_consulta',
            
            # Configuración de envío
            'envio_automatico', 'notificar_empleado',
            
            # Auditoría
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion', 'consecutivo_actual']
        extra_kwargs = {
            'certificado_password': {'write_only': True},
            'clave_tecnica': {'write_only': True}
        }
    
    def validate(self, data):
        """Validaciones de negocio según requisitos DIAN"""
        # Validar NIT (solo números)
        if data.get('nit'):
            nit = data['nit'].replace('.', '').replace('-', '')
            if not nit.isdigit():
                raise serializers.ValidationError({
                    'nit': 'El NIT debe contener solo números'
                })
            data['nit'] = nit
        
        # Validar DV (un solo dígito)
        if data.get('dv'):
            if not data['dv'].isdigit() or len(data['dv']) != 1:
                raise serializers.ValidationError({
                    'dv': 'El dígito de verificación debe ser un solo número'
                })
        
        # Validar código municipio DANE (5 dígitos)
        if data.get('municipio_codigo'):
            if len(data['municipio_codigo']) != 5:
                raise serializers.ValidationError({
                    'municipio_codigo': 'El código DANE del municipio debe tener 5 dígitos (ej: 11001)'
                })
        
        # Validar código departamento DANE (2 dígitos)
        if data.get('departamento_codigo'):
            if len(data['departamento_codigo']) != 2:
                raise serializers.ValidationError({
                    'departamento_codigo': 'El código DANE del departamento debe tener 2 dígitos (ej: 11)'
                })
        
        # Validar rangos de numeración
        if data.get('rango_inicio') and data.get('rango_fin'):
            if data['rango_inicio'] > data['rango_fin']:
                raise serializers.ValidationError({
                    'rango_fin': 'El rango final debe ser mayor o igual al rango inicial'
                })
            # Validar consecutivo actual dentro del rango
            if hasattr(self, 'instance') and self.instance:
                consecutivo = self.instance.consecutivo_actual
                if consecutivo < data['rango_inicio'] or consecutivo > data['rango_fin']:
                    raise serializers.ValidationError({
                        'rango_inicio': f'El consecutivo actual ({consecutivo}) está fuera del rango autorizado'
                    })
        
        # Validar fechas de vigencia
        if data.get('fecha_vigencia_desde') and data.get('fecha_vigencia_hasta'):
            if data['fecha_vigencia_desde'] > data['fecha_vigencia_hasta']:
                raise serializers.ValidationError({
                    'fecha_vigencia_hasta': 'La fecha final de vigencia debe ser posterior a la fecha inicial'
                })
        
        # Validar ambiente vs tipo_ambiente_id (deben coincidir)
        if data.get('ambiente') and data.get('tipo_ambiente_id'):
            if data['ambiente'] == 'produccion' and data['tipo_ambiente_id'] != 1:
                raise serializers.ValidationError({
                    'tipo_ambiente_id': 'Para ambiente de producción debe usar tipo_ambiente_id=1'
                })
            elif data['ambiente'] == 'pruebas' and data['tipo_ambiente_id'] != 2:
                raise serializers.ValidationError({
                    'tipo_ambiente_id': 'Para ambiente de pruebas debe usar tipo_ambiente_id=2'
                })
        
        return data


# ============================================
# SERIALIZERS PARA WEBHOOKS
# ============================================

class WebhookConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuración de webhooks"""
    evento_display = serializers.CharField(source='get_evento_display', read_only=True)
    
    class Meta:
        model = WebhookConfig
        fields = [
            'id', 'nombre', 'url', 'evento', 'evento_display',
            'metodo', 'headers', 'timeout', 'reintentos',
            'activo', 'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']


class WebhookLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de webhooks"""
    webhook_nombre = serializers.CharField(source='webhook.nombre', read_only=True)
    
    class Meta:
        model = WebhookLog
        fields = [
            'id', 'webhook', 'webhook_nombre',
            'nomina_electronica', 'evento',
            'url_llamada', 'metodo', 'payload',
            'codigo_respuesta', 'respuesta', 'exitoso',
            'tiempo_respuesta', 'error', 'fecha_envio'
        ]
        read_only_fields = ['fecha_envio']


