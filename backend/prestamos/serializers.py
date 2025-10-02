"""
Serializadores del Sistema de Préstamos
======================================

Serializadores para la API REST del sistema de préstamos.
Incluye validaciones avanzadas y campos calculados.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

from .models import TipoPrestamo, Prestamo, PagoPrestamo

User = get_user_model()


class TipoPrestamoSerializer(serializers.ModelSerializer):
    """Serializador para tipos de préstamo"""
    
    prestamos_activos_count = serializers.ReadOnlyField()
    
    class Meta:
        model = TipoPrestamo
        fields = [
            'id', 'codigo', 'nombre', 'descripcion',
            'monto_minimo', 'monto_maximo',
            'tasa_interes_defecto', 'tasa_interes_minima', 'tasa_interes_maxima',
            'plazo_minimo_meses', 'plazo_maximo_meses',
            'requiere_garantia', 'requiere_aprobacion', 'permite_prepago',
            'configuracion_avanzada', 'activo', 'orden',
            'prestamos_activos_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'prestamos_activos_count', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validaciones personalizadas"""
        # Validar montos
        if data.get('monto_minimo') and data.get('monto_maximo'):
            if data['monto_minimo'] >= data['monto_maximo']:
                raise serializers.ValidationError({
                    'monto_maximo': _("El monto máximo debe ser mayor al mínimo")
                })
        
        # Validar plazos
        if data.get('plazo_minimo_meses') and data.get('plazo_maximo_meses'):
            if data['plazo_minimo_meses'] >= data['plazo_maximo_meses']:
                raise serializers.ValidationError({
                    'plazo_maximo_meses': _("El plazo máximo debe ser mayor al mínimo")
                })
        
        # Validar tasas de interés
        tasa_min = data.get('tasa_interes_minima')
        tasa_max = data.get('tasa_interes_maxima')
        tasa_def = data.get('tasa_interes_defecto')
        
        if tasa_min is not None and tasa_max is not None:
            if tasa_min > tasa_max:
                raise serializers.ValidationError({
                    'tasa_interes_maxima': _("La tasa máxima debe ser mayor o igual a la mínima")
                })
        
        if tasa_def is not None and tasa_min is not None and tasa_max is not None:
            if not (tasa_min <= tasa_def <= tasa_max):
                raise serializers.ValidationError({
                    'tasa_interes_defecto': _("La tasa por defecto debe estar entre la mínima y máxima")
                })
        
        return data


class TipoPrestamoListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listas de tipos de préstamo"""
    
    class Meta:
        model = TipoPrestamo
        fields = ['id', 'codigo', 'nombre', 'monto_minimo', 'monto_maximo', 'tasa_interes_defecto']


class EmpleadoBasicSerializer(serializers.Serializer):
    """Serializador básico para empleado (para evitar importación circular)"""
    id = serializers.UUIDField(read_only=True)
    nombres = serializers.CharField(read_only=True)
    apellidos = serializers.CharField(read_only=True)
    numero_identificacion = serializers.CharField(read_only=True)
    
    def to_representation(self, instance):
        return {
            'id': str(instance.id),
            'nombres': instance.nombres,
            'apellidos': instance.apellidos,
            'numero_identificacion': instance.numero_identificacion,
            'nombre_completo': f"{instance.nombres} {instance.apellidos}"
        }


class PrestamoSerializer(serializers.ModelSerializer):
    """Serializador completo para préstamos"""
    
    empleado_detail = EmpleadoBasicSerializer(source='empleado', read_only=True)
    tipo_prestamo_detail = TipoPrestamoListSerializer(source='tipo_prestamo', read_only=True)
    
    # Campos calculados
    monto_final = serializers.ReadOnlyField()
    dias_desde_solicitud = serializers.ReadOnlyField()
    dias_para_primer_pago = serializers.ReadOnlyField()
    calcular_cuota_mensual = serializers.SerializerMethodField()
    calcular_total_con_intereses = serializers.SerializerMethodField()
    calcular_porcentaje_pagado = serializers.SerializerMethodField()
    esta_vigente = serializers.SerializerMethodField()
    puede_recibir_pagos = serializers.SerializerMethodField()
    
    # Estados permitidos para transiciones
    estados_permitidos = serializers.SerializerMethodField()
    
    class Meta:
        model = Prestamo
        fields = [
            'id', 'numero_prestamo', 'empleado', 'empleado_detail',
            'tipo_prestamo', 'tipo_prestamo_detail',
            'monto_solicitado', 'monto_aprobado', 'tasa_interes', 'plazo_meses',
            'cuota_mensual', 'fecha_solicitud', 'fecha_aprobacion',
            'fecha_desembolso', 'fecha_primer_pago', 'fecha_ultimo_pago',
            'estado', 'tipo_garantia', 'garantia_descripcion',
            'observaciones', 'motivo_rechazo',
            'saldo_pendiente', 'total_pagado', 'total_intereses',
            'solicitado_por', 'aprobado_por', 'desembolsado_por',
            'created_at', 'updated_at',
            # Campos calculados
            'monto_final', 'dias_desde_solicitud', 'dias_para_primer_pago',
            'calcular_cuota_mensual', 'calcular_total_con_intereses',
            'calcular_porcentaje_pagado', 'esta_vigente', 'puede_recibir_pagos',
            'estados_permitidos'
        ]
        read_only_fields = [
            'id', 'numero_prestamo', 'cuota_mensual', 'saldo_pendiente',
            'total_pagado', 'total_intereses', 'created_at', 'updated_at',
            'empleado_detail', 'tipo_prestamo_detail'
        ]
    
    def get_calcular_cuota_mensual(self, obj):
        """Calcula la cuota mensual"""
        try:
            return float(obj.calcular_cuota_mensual())
        except:
            return 0.0
    
    def get_calcular_total_con_intereses(self, obj):
        """Calcula el total con intereses"""
        try:
            return float(obj.calcular_total_con_intereses())
        except:
            return 0.0
    
    def get_calcular_porcentaje_pagado(self, obj):
        """Calcula el porcentaje pagado"""
        try:
            return round(obj.calcular_porcentaje_pagado(), 2)
        except:
            return 0.0
    
    def get_esta_vigente(self, obj):
        """Verifica si está vigente"""
        return obj.esta_vigente()
    
    def get_puede_recibir_pagos(self, obj):
        """Verifica si puede recibir pagos"""
        return obj.puede_recibir_pagos()
    
    def get_estados_permitidos(self, obj):
        """Obtiene los estados a los que puede transicionar"""
        estados_map = {
            'borrador': ['solicitado'],
            'solicitado': ['en_revision', 'pendiente', 'rechazado'],
            'en_revision': ['pendiente', 'aprobado', 'rechazado'],
            'pendiente': ['aprobado', 'rechazado'],
            'aprobado': ['desembolsado', 'cancelado'],
            'rechazado': [],
            'desembolsado': ['activo', 'cancelado'],
            'activo': ['completado', 'en_mora', 'reestructurado'],
            'completado': [],
            'cancelado': [],
            'en_mora': ['activo', 'reestructurado'],
            'reestructurado': ['activo']
        }
        return estados_map.get(obj.estado, [])
    
    def validate(self, data):
        """Validaciones personalizadas"""
        tipo_prestamo = data.get('tipo_prestamo')
        monto_solicitado = data.get('monto_solicitado')
        plazo_meses = data.get('plazo_meses')
        tasa_interes = data.get('tasa_interes')
        
        if tipo_prestamo:
            # Validar monto
            if monto_solicitado:
                if monto_solicitado < tipo_prestamo.monto_minimo:
                    raise serializers.ValidationError({
                        'monto_solicitado': _(f"El monto debe ser al menos ${tipo_prestamo.monto_minimo}")
                    })
                if monto_solicitado > tipo_prestamo.monto_maximo:
                    raise serializers.ValidationError({
                        'monto_solicitado': _(f"El monto no puede exceder ${tipo_prestamo.monto_maximo}")
                    })
            
            # Validar plazo
            if plazo_meses:
                if plazo_meses < tipo_prestamo.plazo_minimo_meses:
                    raise serializers.ValidationError({
                        'plazo_meses': _(f"El plazo debe ser al menos {tipo_prestamo.plazo_minimo_meses} meses")
                    })
                if plazo_meses > tipo_prestamo.plazo_maximo_meses:
                    raise serializers.ValidationError({
                        'plazo_meses': _(f"El plazo no puede exceder {tipo_prestamo.plazo_maximo_meses} meses")
                    })
            
            # Validar tasa de interés
            if tasa_interes is not None:
                if not (tipo_prestamo.tasa_interes_minima <= tasa_interes <= tipo_prestamo.tasa_interes_maxima):
                    raise serializers.ValidationError({
                        'tasa_interes': _(f"La tasa debe estar entre {tipo_prestamo.tasa_interes_minima}% y {tipo_prestamo.tasa_interes_maxima}%")
                    })
        
        # Validar que el empleado no tenga préstamos activos (solo para nuevos)
        if not self.instance and data.get('empleado'):
            prestamos_activos = Prestamo.objects.filter(
                empleado=data['empleado'],
                estado__in=['aprobado', 'desembolsado', 'activo']
            )
            if prestamos_activos.exists():
                raise serializers.ValidationError({
                    'empleado': _("Este empleado ya tiene un préstamo activo")
                })
        
        return data


class PrestamoListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listas de préstamos"""
    
    empleado_nombre = serializers.SerializerMethodField()
    tipo_prestamo_nombre = serializers.StringRelatedField(source='tipo_prestamo.nombre')
    estado_display = serializers.CharField(source='get_estado_display')
    monto_final = serializers.ReadOnlyField()
    porcentaje_pagado = serializers.SerializerMethodField()
    
    class Meta:
        model = Prestamo
        fields = [
            'id', 'numero_prestamo', 'empleado_nombre', 'tipo_prestamo_nombre',
            'monto_solicitado', 'monto_aprobado', 'monto_final',
            'estado', 'estado_display', 'fecha_solicitud',
            'saldo_pendiente', 'total_pagado', 'porcentaje_pagado'
        ]
    
    def get_empleado_nombre(self, obj):
        """Obtiene el nombre completo del empleado"""
        return f"{obj.empleado.nombres} {obj.empleado.apellidos}"
    
    def get_porcentaje_pagado(self, obj):
        """Calcula el porcentaje pagado"""
        try:
            return round(obj.calcular_porcentaje_pagado(), 2)
        except:
            return 0.0


class PagoPrestamoSerializer(serializers.ModelSerializer):
    """Serializador para pagos de préstamos"""
    
    prestamo_numero = serializers.CharField(source='prestamo.numero_prestamo', read_only=True)
    empleado_nombre = serializers.SerializerMethodField(read_only=True)
    tipo_pago_display = serializers.CharField(source='get_tipo_pago_display', read_only=True)
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    
    class Meta:
        model = PagoPrestamo
        fields = [
            'id', 'numero_pago', 'prestamo', 'prestamo_numero', 'empleado_nombre',
            'fecha_pago', 'tipo_pago', 'tipo_pago_display',
            'metodo_pago', 'metodo_pago_display',
            'monto_pago', 'monto_capital', 'monto_interes', 'monto_mora',
            'saldo_anterior', 'saldo_nuevo',
            'observaciones', 'comprobante', 'registrado_por',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'numero_pago', 'saldo_anterior', 'saldo_nuevo',
            'prestamo_numero', 'empleado_nombre', 'tipo_pago_display',
            'metodo_pago_display', 'created_at', 'updated_at'
        ]
    
    def get_empleado_nombre(self, obj):
        """Obtiene el nombre del empleado del préstamo"""
        return f"{obj.prestamo.empleado.nombres} {obj.prestamo.empleado.apellidos}"
    
    def validate(self, data):
        """Validaciones personalizadas"""
        prestamo = data.get('prestamo')
        monto_pago = data.get('monto_pago')
        monto_capital = data.get('monto_capital', Decimal('0.00'))
        monto_interes = data.get('monto_interes', Decimal('0.00'))
        monto_mora = data.get('monto_mora', Decimal('0.00'))
        
        if prestamo:
            # Verificar que el préstamo pueda recibir pagos
            if not prestamo.puede_recibir_pagos():
                raise serializers.ValidationError({
                    'prestamo': _("Este préstamo no puede recibir pagos en su estado actual")
                })
            
            # Verificar que el monto no exceda el saldo pendiente
            if monto_pago and monto_pago > prestamo.saldo_pendiente:
                raise serializers.ValidationError({
                    'monto_pago': _("El monto del pago no puede exceder el saldo pendiente")
                })
        
        # Verificar que la suma de componentes no exceda el monto total
        suma_componentes = monto_capital + monto_interes + monto_mora
        if suma_componentes > monto_pago:
            raise serializers.ValidationError({
                'monto_pago': _("La suma de los componentes del pago excede el monto total")
            })
        
        return data


class PagoPrestamoListSerializer(serializers.ModelSerializer):
    """Serializador simplificado para listas de pagos"""
    
    prestamo_numero = serializers.CharField(source='prestamo.numero_prestamo')
    empleado_nombre = serializers.SerializerMethodField()
    tipo_pago_display = serializers.CharField(source='get_tipo_pago_display')
    
    class Meta:
        model = PagoPrestamo
        fields = [
            'id', 'numero_pago', 'prestamo_numero', 'empleado_nombre',
            'fecha_pago', 'tipo_pago', 'tipo_pago_display',
            'monto_pago', 'saldo_nuevo'
        ]
    
    def get_empleado_nombre(self, obj):
        """Obtiene el nombre del empleado"""
        return f"{obj.prestamo.empleado.nombres} {obj.prestamo.empleado.apellidos}"


# Serializadores para acciones específicas

class PrestamoAprobarSerializer(serializers.Serializer):
    """Serializador para aprobar préstamos"""
    monto_aprobado = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    def validate_monto_aprobado(self, value):
        """Valida el monto aprobado"""
        if value and value <= Decimal('0'):
            raise serializers.ValidationError(_("El monto aprobado debe ser mayor a cero"))
        return value


class PrestamoRechazarSerializer(serializers.Serializer):
    """Serializador para rechazar préstamos"""
    motivo = serializers.CharField(required=True)
    
    def validate_motivo(self, value):
        """Valida que se proporcione un motivo"""
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError(_("Debe proporcionar un motivo detallado (mínimo 10 caracteres)"))
        return value.strip()


class PrestamoDesembolsarSerializer(serializers.Serializer):
    """Serializador para desembolsar préstamos"""
    fecha_desembolso = serializers.DateField(required=False)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class PrestamoCalculadoraSerializer(serializers.Serializer):
    """Serializador para la calculadora de préstamos"""
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    tasa_interes = serializers.DecimalField(max_digits=5, decimal_places=2)
    plazo_meses = serializers.IntegerField(min_value=1, max_value=120)
    
    def to_representation(self, instance):
        """Calcula y retorna los resultados"""
        monto = self.validated_data['monto']
        tasa = self.validated_data['tasa_interes']
        plazo = self.validated_data['plazo_meses']
        
        if tasa == 0:
            cuota_mensual = monto / plazo
        else:
            tasa_mensual = tasa / 100 / 12
            factor = (1 + tasa_mensual) ** plazo
            cuota_mensual = monto * (tasa_mensual * factor) / (factor - 1)
        
        total_con_intereses = cuota_mensual * plazo
        total_intereses = total_con_intereses - monto
        
        return {
            'monto_prestamo': float(monto),
            'tasa_interes_anual': float(tasa),
            'plazo_meses': plazo,
            'cuota_mensual': round(float(cuota_mensual), 2),
            'total_con_intereses': round(float(total_con_intereses), 2),
            'total_intereses': round(float(total_intereses), 2)
        }
