from rest_framework import serializers
from .models import Cargo, HistorialCargo


class CargoSerializer(serializers.ModelSerializer):
    cargo_superior_nombre = serializers.CharField(source='cargo_superior.nombre', read_only=True)
    empleados_count = serializers.ReadOnlyField()
    jerarquia_completa = serializers.ReadOnlyField()
    subordinados_count = serializers.SerializerMethodField()
    
    # Aliases para compatibilidad con frontend
    salario_base_min = serializers.DecimalField(source='salario_base_minimo', max_digits=12, decimal_places=2, required=False)
    salario_base_max = serializers.DecimalField(source='salario_base_maximo', max_digits=12, decimal_places=2, required=False)
    salario_base = serializers.DecimalField(source='salario_base_minimo', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Cargo
        fields = [
            'id', 'nombre', 'codigo', 'descripcion', 'cargo_superior', 
            'cargo_superior_nombre', 'nivel_jerarquico', 'salario_base_minimo', 
            'salario_base_maximo', 'limite_aprobacion', 'requiere_aprobacion', 
            'puede_aprobar', 'es_temporal', 'activo', 'fecha_creacion', 
            'fecha_modificacion', 'empleados_count', 'jerarquia_completa', 
            'subordinados_count', 'salario_base_min', 'salario_base_max', 'salario_base'
        ]
    
    def get_subordinados_count(self, obj):
        """Retorna el número de subordinados directos."""
        return obj.get_subordinados_directos().count()
    
    def validate(self, data):
        """Validación personalizada del serializer."""
        # Validar que el salario mínimo no sea mayor que el máximo
        salario_min = data.get('salario_base_minimo')
        salario_max = data.get('salario_base_maximo')
        
        if salario_min and salario_max and salario_min > salario_max:
            raise serializers.ValidationError(
                "El salario mínimo no puede ser mayor que el salario máximo"
            )
        
        # Validar que no sea su propio superior
        cargo_superior = data.get('cargo_superior')
        if cargo_superior and self.instance and cargo_superior == self.instance:
            raise serializers.ValidationError(
                "Un cargo no puede ser superior de sí mismo"
            )
        
        return data


class HistorialCargoSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.get_full_name', read_only=True)
    cargo_anterior_nombre = serializers.CharField(source='cargo_anterior.nombre', read_only=True)
    cargo_nuevo_nombre = serializers.CharField(source='cargo_nuevo.nombre', read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)
    duracion_en_cargo = serializers.ReadOnlyField()
    esta_activo = serializers.ReadOnlyField()
    
    class Meta:
        model = HistorialCargo
        fields = [
            'id', 'empleado', 'empleado_nombre', 'cargo_anterior', 
            'cargo_anterior_nombre', 'cargo_nuevo', 'cargo_nuevo_nombre',
            'fecha_inicio', 'fecha_fin', 'salario_asignado', 'motivo_cambio',
            'observaciones', 'creado_por', 'creado_por_nombre', 'fecha_registro',
            'duracion_en_cargo', 'esta_activo'
        ]
        read_only_fields = ['fecha_registro', 'duracion_en_cargo', 'esta_activo']
    
    def validate(self, data):
        """Validación personalizada del historial."""
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        
        if fecha_fin and fecha_inicio and fecha_inicio > fecha_fin:
            raise serializers.ValidationError(
                "La fecha de inicio no puede ser mayor que la fecha de fin"
            )
        
        # Validar que el salario esté en el rango del cargo
        cargo_nuevo = data.get('cargo_nuevo')
        salario_asignado = data.get('salario_asignado')
        
        if cargo_nuevo and salario_asignado:
            if not cargo_nuevo.esta_en_rango_salarial(salario_asignado):
                raise serializers.ValidationError(
                    "El salario asignado no está en el rango permitido para este cargo"
                )
        
        return data
