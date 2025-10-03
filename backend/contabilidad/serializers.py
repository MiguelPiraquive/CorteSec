from rest_framework import serializers
from decimal import Decimal
from .models import (
    PlanCuentas, ComprobanteContable, MovimientoContable, FlujoCaja,
    CentroCosto, BalanceComprobacion
)


class PlanCuentasSerializer(serializers.ModelSerializer):
    """Serializer para Plan de Cuentas"""
    cuenta_padre_nombre = serializers.CharField(source='cuenta_padre.nombre', read_only=True)
    saldo_actual = serializers.ReadOnlyField()
    jerarquia_completa = serializers.ReadOnlyField()
    tiene_subcuentas = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanCuentas
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'cuenta_padre',
            'cuenta_padre_nombre', 'nivel', 'tipo_cuenta', 'naturaleza',
            'acepta_movimientos', 'requiere_tercero', 'activa',
            'saldo_actual', 'jerarquia_completa', 'tiene_subcuentas',
            'fecha_creacion'
        ]
        read_only_fields = ['nivel', 'fecha_creacion']
    
    def get_tiene_subcuentas(self, obj):
        """Indica si la cuenta tiene subcuentas"""
        return obj.subcuentas.exists()


class ComprobanteContableSerializer(serializers.ModelSerializer):
    """Serializer para Comprobantes Contables"""
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)
    contabilizado_por_nombre = serializers.CharField(source='contabilizado_por.get_full_name', read_only=True)
    total_debitos = serializers.ReadOnlyField()
    total_creditos = serializers.ReadOnlyField()
    esta_cuadrado = serializers.ReadOnlyField()
    movimientos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ComprobanteContable
        fields = [
            'id', 'numero', 'tipo_comprobante', 'fecha', 'descripcion',
            'estado', 'total_debito', 'total_credito', 'nomina_relacionada', 'prestamo_relacionado',
            'creado_por', 'creado_por_nombre', 'fecha_creacion',
            'contabilizado_por', 'contabilizado_por_nombre', 'fecha_contabilizacion',
            'total_debitos', 'total_creditos', 'esta_cuadrado', 'movimientos_count'
        ]
        read_only_fields = [
            'numero', 'creado_por', 'fecha_creacion', 'contabilizado_por',
            'fecha_contabilizacion', 'total_debitos', 'total_creditos',
            'esta_cuadrado', 'movimientos_count'
        ]
    
    def get_movimientos_count(self, obj):
        """Cuenta el número de movimientos del comprobante"""
        return obj.movimientos.count()


class MovimientoContableSerializer(serializers.ModelSerializer):
    """Serializer para Movimientos Contables"""
    comprobante_numero = serializers.CharField(source='comprobante.numero', read_only=True)
    cuenta_codigo = serializers.CharField(source='cuenta.codigo', read_only=True)
    cuenta_nombre = serializers.CharField(source='cuenta.nombre', read_only=True)
    
    class Meta:
        model = MovimientoContable
        fields = [
            'id', 'comprobante', 'comprobante_numero', 'cuenta', 'cuenta_codigo',
            'cuenta_nombre', 'descripcion', 'valor_debito', 'valor_credito', 
            'tercero', 'centro_costo'
        ]
        read_only_fields = ['comprobante_numero', 'cuenta_codigo', 'cuenta_nombre']
    
    def validate(self, data):
        """Validaciones del movimiento contable"""
        valor_debito = data.get('valor_debito', Decimal('0'))
        valor_credito = data.get('valor_credito', Decimal('0'))
        
        # Un movimiento debe tener valor en débito O crédito, pero no ambos
        if valor_debito > 0 and valor_credito > 0:
            raise serializers.ValidationError(
                "Un movimiento no puede tener valor tanto en débito como en crédito"
            )
        
        if valor_debito == 0 and valor_credito == 0:
            raise serializers.ValidationError(
                "El movimiento debe tener un valor en débito o crédito"
            )
        
        # Validar que la cuenta acepta movimientos
        cuenta = data.get('cuenta')
        if cuenta and not cuenta.acepta_movimientos:
            raise serializers.ValidationError(
                f"La cuenta {cuenta.codigo} - {cuenta.nombre} no acepta movimientos directos"
            )
        
        # Validar tercero si es requerido
        if cuenta and cuenta.requiere_tercero:
            if not data.get('tercero_identificacion') or not data.get('tercero_nombre'):
                raise serializers.ValidationError(
                    f"La cuenta {cuenta.codigo} requiere información del tercero"
                )
        
        return data


class CentroCostoSerializer(serializers.ModelSerializer):
    """Serializer para Centros de Costo"""
    centro_padre_nombre = serializers.CharField(source='centro_padre.nombre', read_only=True)
    responsable_nombre = serializers.CharField(source='responsable.get_full_name', read_only=True)
    total_movimientos = serializers.SerializerMethodField()
    saldo_periodo = serializers.SerializerMethodField()
    
    class Meta:
        model = CentroCosto
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'centro_padre',
            'centro_padre_nombre', 'nivel', 'responsable', 'responsable_nombre',
            'presupuesto_anual', 'activo', 'total_movimientos', 'saldo_periodo',
            'fecha_creacion'
        ]
        read_only_fields = ['nivel', 'fecha_creacion']
    
    def get_total_movimientos(self, obj):
        """Cuenta total de movimientos del centro de costo"""
        return obj.movimientos.count()
    
    def get_saldo_periodo(self, obj):
        """Calcula saldo del período actual"""
        from datetime import date
        inicio_año = date(date.today().year, 1, 1)
        
        movimientos = obj.movimientos.filter(fecha_movimiento__gte=inicio_año)
        total_debitos = movimientos.aggregate(
            total=serializers.models.Sum('valor_debito')
        )['total'] or Decimal('0')
        total_creditos = movimientos.aggregate(
            total=serializers.models.Sum('valor_credito')
        )['total'] or Decimal('0')
        
        return float(total_debitos - total_creditos)


class AsientoContableSerializer(serializers.ModelSerializer):
    """Serializer para Asientos Contables (con movimientos incluidos)"""
    movimientos = MovimientoContableSerializer(many=True, read_only=True)
    total_debitos = serializers.ReadOnlyField()
    total_creditos = serializers.ReadOnlyField()
    
    class Meta:
        model = ComprobanteContable
        fields = [
            'id', 'numero', 'tipo', 'fecha', 'descripcion', 'estado',
            'valor_total', 'movimientos', 'total_debitos', 'total_creditos'
        ]


class BalanceComprobacionSerializer(serializers.ModelSerializer):
    """Serializer para Balance de Comprobación"""
    cuenta_codigo = serializers.CharField(source='cuenta.codigo', read_only=True)
    cuenta_nombre = serializers.CharField(source='cuenta.nombre', read_only=True)
    
    class Meta:
        model = BalanceComprobacion
        fields = [
            'id', 'periodo', 'cuenta', 'cuenta_codigo', 'cuenta_nombre',
            'saldo_inicial_debito', 'saldo_inicial_credito',
            'movimiento_debito', 'movimiento_credito',
            'saldo_final_debito', 'saldo_final_credito',
            'fecha_generacion'
        ]
        read_only_fields = ['fecha_generacion']


# Serializers específicos para operaciones
class CrearComprobanteSerializer(serializers.Serializer):
    """Serializer para crear comprobante con movimientos"""
    tipo = serializers.ChoiceField(choices=ComprobanteContable.TIPO_COMPROBANTE_CHOICES)
    fecha = serializers.DateField()
    descripcion = serializers.CharField(max_length=500)
    observaciones = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    movimientos = serializers.ListField(
        child=serializers.DictField(),
        min_length=2,
        help_text="Lista de movimientos contables"
    )
    
    def validate_movimientos(self, value):
        """Valida que los movimientos estén cuadrados"""
        total_debitos = Decimal('0')
        total_creditos = Decimal('0')
        
        for movimiento in value:
            total_debitos += Decimal(str(movimiento.get('valor_debito', 0)))
            total_creditos += Decimal(str(movimiento.get('valor_credito', 0)))
        
        if total_debitos != total_creditos:
            raise serializers.ValidationError(
                f"Los débitos ({total_debitos}) no cuadran con los créditos ({total_creditos})"
            )
        
        return value


class FlujoCajaSerializer(serializers.ModelSerializer):
    """Serializer para Flujo de Caja"""
    valor_formateado = serializers.SerializerMethodField()
    
    class Meta:
        model = FlujoCaja
        fields = [
            'id', 'fecha', 'tipo_movimiento', 'concepto',
            'valor', 'valor_formateado', 'comprobante', 
            'observaciones'
        ]
        read_only_fields = ['id']
    
    def get_valor_formateado(self, obj):
        """Formatear valor con símbolo de moneda"""
        return f"${obj.valor:,.2f}"
    
    def validate_valor(self, value):
        """Validar que el valor sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El valor debe ser mayor a cero")
        return value


class ConsultaSaldosSerializer(serializers.Serializer):
    """Serializer para consulta de saldos"""
    cuenta = serializers.CharField(max_length=20, help_text="Código de cuenta")
    fecha_desde = serializers.DateField(required=False)
    fecha_hasta = serializers.DateField(required=False)
    centro_costo = serializers.CharField(max_length=20, required=False)
    incluir_subcuentas = serializers.BooleanField(default=False)


class ReporteContableSerializer(serializers.Serializer):
    """Serializer para generación de reportes contables"""
    tipo_reporte = serializers.ChoiceField(choices=[
        ('balance_general', 'Balance General'),
        ('estado_resultados', 'Estado de Resultados'),
        ('balance_comprobacion', 'Balance de Comprobación'),
        ('mayor_auxiliar', 'Mayor y Auxiliares'),
    ])
    fecha_desde = serializers.DateField()
    fecha_hasta = serializers.DateField()
    centro_costo = serializers.CharField(max_length=20, required=False)
    formato = serializers.ChoiceField(
        choices=[('pdf', 'PDF'), ('excel', 'Excel'), ('json', 'JSON')],
        default='pdf'
    )
    
    def validate(self, data):
        """Valida fechas del reporte"""
        if data['fecha_desde'] > data['fecha_hasta']:
            raise serializers.ValidationError(
                "La fecha desde no puede ser mayor que la fecha hasta"
            )
        return data
