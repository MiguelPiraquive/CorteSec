"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   SERIALIZERS DE NÓMINA - CORTESEC                            ║
║                Sistema de Nómina para Construcción                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Serializers DRF para todos los modelos de nómina.
Incluyen validaciones, campos anidados y campos calculados.

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: Enero 2026
"""

from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal

from .models import (
    Empleado,
    TipoContrato,
    Contrato,
    ParametroLegal,
    ConceptoLaboral,
    NominaSimple,
    NominaItem,
    NominaConcepto,
    NominaPrestamo,
)
from locations.models import Departamento, Municipio


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: UBICACIÓN (Departamentos y Municipios)
# ══════════════════════════════════════════════════════════════════════════════

class DepartamentoSerializer(serializers.ModelSerializer):
    """Serializer para departamentos"""
    
    class Meta:
        model = Departamento
        fields = ['id', 'nombre', 'codigo']


class MunicipioSerializer(serializers.ModelSerializer):
    """Serializer para municipios"""
    
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    
    class Meta:
        model = Municipio
        fields = ['id', 'nombre', 'codigo', 'departamento', 'departamento_nombre']


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: EMPLEADO
# ══════════════════════════════════════════════════════════════════════════════

class EmpleadoListSerializer(serializers.ModelSerializer):
    """Serializer para listado de empleados"""
    
    nombre_completo = serializers.CharField(read_only=True)
    contrato_activo = serializers.SerializerMethodField()
    cargo_actual = serializers.SerializerMethodField()
    
    # Campos anidados para departamento y ciudad
    departamento_detail = DepartamentoSerializer(source='departamento', read_only=True)
    ciudad_detail = MunicipioSerializer(source='ciudad', read_only=True)
    
    # Aliases para compatibilidad con frontend
    nombres = serializers.CharField(source='nombre_completo', read_only=True)
    apellidos = serializers.CharField(source='primer_apellido', read_only=True)
    documento = serializers.CharField(source='numero_documento', read_only=True)
    correo = serializers.CharField(source='email', read_only=True)
    municipio = serializers.CharField(source='ciudad', read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'tipo_documento', 'numero_documento',
            'nombre_completo', 'primer_nombre', 'primer_apellido',
            'email', 'telefono', 'estado', 'fecha_ingreso',
            'genero', 'fecha_nacimiento', 'departamento', 'ciudad', 'foto',
            'departamento_detail', 'ciudad_detail',
            'contrato_activo', 'cargo_actual',
            # Aliases
            'nombres', 'apellidos', 'documento', 'correo', 'municipio',
        ]
    
    def get_cargo_actual(self, obj):
        """Retorna el cargo del contrato activo"""
        contrato = obj.contrato_activo
        if contrato:
            return contrato.cargo
        return None
    
    def get_contrato_activo(self, obj):
        """Retorna información básica del contrato activo"""
        contrato = obj.contrato_activo
        if contrato:
            return {
                'id': str(contrato.id),
                'tipo_contrato': contrato.tipo_contrato.nombre,
                'salario': str(contrato.salario),
                'cargo': contrato.cargo,
            }
        return None


class EmpleadoDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de empleado"""
    
    nombre_completo = serializers.CharField(read_only=True)
    contrato_activo = serializers.SerializerMethodField()
    cargo_actual = serializers.SerializerMethodField()
    
    # Campos anidados para departamento y ciudad
    departamento_detail = DepartamentoSerializer(source='departamento', read_only=True)
    ciudad_detail = MunicipioSerializer(source='ciudad', read_only=True)
    
    # Aliases para compatibilidad con frontend
    nombres = serializers.CharField(source='nombre_completo', read_only=True)
    apellidos = serializers.CharField(source='primer_apellido', read_only=True)
    documento = serializers.CharField(source='numero_documento', read_only=True)
    correo = serializers.CharField(source='email', read_only=True)
    municipio = serializers.CharField(source='ciudad', read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'tipo_documento', 'numero_documento',
            'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
            'nombre_completo', 'fecha_nacimiento', 'genero',
            'email', 'telefono', 'direccion', 'departamento', 'ciudad',
            'departamento_detail', 'ciudad_detail',
            'estado', 'fecha_ingreso', 'fecha_retiro',
            'banco', 'tipo_cuenta', 'numero_cuenta',
            'foto', 'observaciones', 'contrato_activo', 'cargo_actual',
            'created_at', 'updated_at',
            # Aliases
            'nombres', 'apellidos', 'documento', 'correo', 'municipio',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
    
    def get_cargo_actual(self, obj):
        """Retorna el cargo del contrato activo"""
        contrato = obj.contrato_activo
        if contrato:
            return contrato.cargo
        return None
    
    def get_contrato_activo(self, obj):
        """Retorna información del contrato activo"""
        contrato = obj.contrato_activo
        if contrato:
            return ContratoSerializer(contrato).data
        return None


class EmpleadoCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear/editar empleados"""
    
    class Meta:
        model = Empleado
        fields = [
            'tipo_documento', 'numero_documento',
            'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
            'fecha_nacimiento', 'genero',
            'email', 'telefono', 'direccion', 'departamento', 'ciudad',
            'estado', 'fecha_ingreso', 'fecha_retiro',
            'banco', 'tipo_cuenta', 'numero_cuenta',
            'foto', 'observaciones',
        ]
    
    def validate_numero_documento(self, value):
        """Valida que el documento no exista"""
        organization = self.context['request'].user.organization
        queryset = Empleado.objects.filter(
            organization=organization,
            numero_documento=value
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un empleado con este documento.')
        return value


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: TIPO DE CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

class TipoContratoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de contrato"""
    
    class Meta:
        model = TipoContrato
        fields = [
            'id', 'nombre', 'codigo', 'descripcion',
            'aplica_salud', 'aplica_pension', 'aplica_arl', 'aplica_parafiscales',
            'ibc_porcentaje', 'requiere_fecha_fin', 'activo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: CONTRATO
# ══════════════════════════════════════════════════════════════════════════════

class ContratoSerializer(serializers.ModelSerializer):
    """Serializer para contratos"""
    
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    tipo_contrato_nombre = serializers.CharField(source='tipo_contrato.nombre', read_only=True)
    ibc = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Contrato
        fields = [
            'id', 'empleado', 'empleado_nombre',
            'tipo_contrato', 'tipo_contrato_nombre',
            'salario', 'nivel_arl', 'cargo',
            'fecha_inicio', 'fecha_fin', 'activo',
            'ibc', 'observaciones',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ContratoCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear/editar contratos"""
    
    class Meta:
        model = Contrato
        fields = [
            'empleado', 'tipo_contrato', 'salario', 'nivel_arl',
            'fecha_inicio', 'fecha_fin', 'activo', 'cargo', 'observaciones',
        ]
    
    def validate(self, attrs):
        """Validaciones del contrato"""
        tipo_contrato = attrs.get('tipo_contrato')
        fecha_fin = attrs.get('fecha_fin')
        fecha_inicio = attrs.get('fecha_inicio')
        
        # Validar fecha fin si el tipo lo requiere
        if tipo_contrato and tipo_contrato.requiere_fecha_fin and not fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': 'Este tipo de contrato requiere fecha de finalización.'
            })
        
        # Validar que fecha_fin > fecha_inicio
        if fecha_fin and fecha_inicio and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio.'
            })
        
        return attrs


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: PARÁMETRO LEGAL
# ══════════════════════════════════════════════════════════════════════════════

class ParametroLegalSerializer(serializers.ModelSerializer):
    """Serializer para parámetros legales"""
    
    concepto_display = serializers.CharField(source='get_concepto_display', read_only=True)
    
    class Meta:
        model = ParametroLegal
        fields = [
            'id', 'concepto', 'concepto_display', 'descripcion',
            'porcentaje_total', 'porcentaje_empleado', 'porcentaje_empleador',
            'valor_fijo', 'vigente_desde', 'vigente_hasta', 'activo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validar consistencia de porcentajes"""
        porcentaje_total = attrs.get('porcentaje_total', Decimal('0'))
        porcentaje_empleado = attrs.get('porcentaje_empleado', Decimal('0'))
        porcentaje_empleador = attrs.get('porcentaje_empleador', Decimal('0'))
        
        # El total debe ser igual a empleado + empleador
        suma = porcentaje_empleado + porcentaje_empleador
        if suma > Decimal('0') and abs(porcentaje_total - suma) > Decimal('0.001'):
            raise serializers.ValidationError({
                'porcentaje_total': f'El total ({porcentaje_total}%) debe ser igual a empleado ({porcentaje_empleado}%) + empleador ({porcentaje_empleador}%).'
            })
        
        return attrs


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: CONCEPTO LABORAL
# ══════════════════════════════════════════════════════════════════════════════

class ConceptoLaboralSerializer(serializers.ModelSerializer):
    """Serializer para conceptos laborales"""
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    base_calculo_display = serializers.CharField(source='get_base_calculo_display', read_only=True)
    
    class Meta:
        model = ConceptoLaboral
        fields = [
            'id', 'codigo', 'nombre', 'descripcion',
            'tipo', 'tipo_display',
            'aplica_porcentaje', 'porcentaje', 'monto_fijo',
            'base_calculo', 'base_calculo_display',
            'es_legal', 'orden', 'activo',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: NÓMINA ITEM
# ══════════════════════════════════════════════════════════════════════════════

class NominaItemSerializer(serializers.ModelSerializer):
    """Serializer para items de nómina"""
    
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_tipo_cantidad = serializers.CharField(source='item.tipo_cantidad', read_only=True)
    
    class Meta:
        model = NominaItem
        fields = [
            'id', 'item', 'item_nombre', 'item_tipo_cantidad',
            'cantidad', 'valor_unitario', 'valor_total',
            'observaciones',
        ]
        read_only_fields = ['id', 'organization', 'valor_total']


class NominaItemCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear items de nómina"""
    
    class Meta:
        model = NominaItem
        fields = ['item', 'cantidad', 'valor_unitario', 'observaciones']
    
    def validate_item(self, value):
        """Validar que el item esté activo"""
        if not value.activo:
            raise serializers.ValidationError('Este item no está activo.')
        return value


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: NÓMINA CONCEPTO
# ══════════════════════════════════════════════════════════════════════════════

class NominaConceptoSerializer(serializers.ModelSerializer):
    """Serializer para conceptos de nómina"""
    
    concepto_codigo = serializers.CharField(source='concepto.codigo', read_only=True)
    concepto_nombre = serializers.CharField(source='concepto.nombre', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = NominaConcepto
        fields = [
            'id', 'concepto', 'concepto_codigo', 'concepto_nombre',
            'tipo', 'tipo_display',
            'base', 'porcentaje_aplicado', 'valor',
            'observaciones',
        ]
        read_only_fields = ['id', 'organization']


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: NÓMINA PRÉSTAMO
# ══════════════════════════════════════════════════════════════════════════════

class NominaPrestamoSerializer(serializers.ModelSerializer):
    """Serializer para préstamos en nómina"""
    
    prestamo_tipo = serializers.CharField(source='prestamo.tipo_prestamo.nombre', read_only=True)
    prestamo_saldo = serializers.DecimalField(
        source='prestamo.saldo_pendiente',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = NominaPrestamo
        fields = [
            'id', 'prestamo', 'prestamo_tipo', 'prestamo_saldo',
            'valor_cuota', 'numero_cuota', 'observaciones',
        ]
        read_only_fields = ['id', 'organization']


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: NÓMINA SIMPLE
# ══════════════════════════════════════════════════════════════════════════════

class NominaSimpleListSerializer(serializers.ModelSerializer):
    """Serializer para listado de nóminas"""
    
    empleado_nombre = serializers.CharField(source='contrato.empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='contrato.empleado.numero_documento', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'numero', 'contrato',
            'empleado_nombre', 'empleado_documento',
            'periodo_inicio', 'periodo_fin', 'fecha_pago',
            'estado', 'estado_display',
            'total_devengado', 'total_deducciones', 'total_pagar',
            'created_at',
        ]


class NominaSimpleDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de nómina"""
    
    empleado_nombre = serializers.CharField(source='contrato.empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='contrato.empleado.numero_documento', read_only=True)
    tipo_contrato = serializers.CharField(source='contrato.tipo_contrato.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    costo_total_empleador = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Relaciones anidadas
    items = NominaItemSerializer(many=True, read_only=True)
    conceptos = NominaConceptoSerializer(many=True, read_only=True)
    prestamos = NominaPrestamoSerializer(many=True, read_only=True)
    
    # Agrupación de conceptos
    devengados = serializers.SerializerMethodField()
    deducciones = serializers.SerializerMethodField()
    
    class Meta:
        model = NominaSimple
        fields = [
            'id', 'numero', 'contrato',
            'empleado_nombre', 'empleado_documento', 'tipo_contrato',
            'periodo_inicio', 'periodo_fin', 'fecha_pago',
            'estado', 'estado_display',
            # Valores calculados
            'salario_base', 'ibc',
            'total_items', 'total_devengado', 'total_deducciones',
            'total_prestamos', 'total_pagar',
            # Aportes empleador
            'aporte_salud_empleador', 'aporte_pension_empleador',
            'aporte_arl', 'aporte_caja', 'aporte_sena', 'aporte_icbf',
            'costo_total_empleador',
            # Relaciones
            'items', 'conceptos', 'prestamos',
            'devengados', 'deducciones',
            # Metadatos
            'observaciones', 'created_at', 'updated_at', 'calculada_at',
        ]
    
    def get_devengados(self, obj):
        """Retorna solo los conceptos de tipo DEVENGADO"""
        conceptos = obj.conceptos.filter(tipo='DEVENGADO')
        return NominaConceptoSerializer(conceptos, many=True).data
    
    def get_deducciones(self, obj):
        """Retorna solo los conceptos de tipo DEDUCCION"""
        conceptos = obj.conceptos.filter(tipo='DEDUCCION')
        return NominaConceptoSerializer(conceptos, many=True).data


class NominaSimpleCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nóminas"""
    
    items = NominaItemCreateSerializer(many=True, required=False)
    
    class Meta:
        model = NominaSimple
        fields = [
            'contrato', 'periodo_inicio', 'periodo_fin',
            'fecha_pago', 'observaciones', 'items',
        ]
    
    def validate(self, attrs):
        """Validaciones de la nómina"""
        contrato = attrs.get('contrato')
        periodo_inicio = attrs.get('periodo_inicio')
        periodo_fin = attrs.get('periodo_fin')
        
        # Validar que el contrato esté activo
        if contrato and not contrato.activo:
            raise serializers.ValidationError({
                'contrato': 'El contrato no está activo.'
            })
        
        # Validar período
        if periodo_fin and periodo_inicio and periodo_fin < periodo_inicio:
            raise serializers.ValidationError({
                'periodo_fin': 'El fin del período debe ser posterior al inicio.'
            })
        
        # Validar que no exista nómina para el mismo período
        organization = self.context['request'].user.organization
        if contrato and periodo_inicio and periodo_fin:
            existe = NominaSimple.objects.filter(
                organization=organization,
                contrato=contrato,
                periodo_inicio=periodo_inicio,
                periodo_fin=periodo_fin,
            ).exclude(estado='anulada')
            
            if self.instance:
                existe = existe.exclude(pk=self.instance.pk)
            
            if existe.exists():
                raise serializers.ValidationError(
                    'Ya existe una nómina para este contrato y período.'
                )
        
        return attrs
    
    def create(self, validated_data):
        """Crear nómina con items"""
        items_data = validated_data.pop('items', [])
        
        # Generar número consecutivo
        organization = self.context['request'].user.organization
        anio = timezone.now().year
        ultimo = NominaSimple.objects.filter(
            organization=organization,
            numero__startswith=f'NOM-{anio}'
        ).count()
        numero = f'NOM-{anio}-{ultimo + 1:06d}'
        
        # Crear nómina
        nomina = NominaSimple.objects.create(
            organization=organization,
            numero=numero,
            salario_base=validated_data['contrato'].salario,
            **validated_data
        )
        
        # Crear items
        for item_data in items_data:
            NominaItem.objects.create(
                organization=organization,
                nomina=nomina,
                **item_data
            )
        
        return nomina


# ══════════════════════════════════════════════════════════════════════════════
# SERIALIZERS: CÁLCULO DE NÓMINA
# ══════════════════════════════════════════════════════════════════════════════

class CalculoNominaSerializer(serializers.Serializer):
    """Serializer para el endpoint de cálculo de nómina"""
    
    nomina_id = serializers.UUIDField(required=True)
    
    def validate_nomina_id(self, value):
        """Validar que la nómina existe"""
        organization = self.context['request'].user.organization
        try:
            nomina = NominaSimple.objects.get(
                organization=organization,
                id=value
            )
            if nomina.estado not in ['borrador', 'calculada']:
                raise serializers.ValidationError(
                    'Solo se pueden calcular nóminas en estado borrador o calculada.'
                )
            return nomina
        except NominaSimple.DoesNotExist:
            raise serializers.ValidationError('Nómina no encontrada.')


class ResumenNominaSerializer(serializers.Serializer):
    """Serializer para resumen de cálculo"""
    
    # Información general
    numero = serializers.CharField()
    empleado = serializers.CharField()
    periodo = serializers.CharField()
    
    # Ingresos
    salario_base = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_items = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_otros_devengados = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_devengado = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Deducciones
    salud_empleado = serializers.DecimalField(max_digits=12, decimal_places=2)
    pension_empleado = serializers.DecimalField(max_digits=12, decimal_places=2)
    otras_deducciones = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_deducciones = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Préstamos
    total_prestamos = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Neto
    total_pagar = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Aportes empleador
    aportes_empleador = serializers.DictField()
