from rest_framework import serializers
from .models import Empleado, Nomina, DetalleNomina
from cargos.models import Cargo


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
    
    # Campos relacionados simples para evitar dependencias circulares
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    municipio_nombre = serializers.CharField(source='municipio.nombre', read_only=True)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'id', 'nombres', 'apellidos', 'documento', 'correo', 'telefono', 
            'direccion', 'fecha_nacimiento', 'genero', 'departamento', 'municipio', 
            'cargo', 'foto', 'activo', 'creado_el', 'actualizado_el',
            'nombre_completo', 'edad', 'departamento_nombre', 'municipio_nombre', 
            'cargo_nombre', 'cargo_info'
        ]
        
    def get_edad(self, obj):
        if obj.fecha_nacimiento:
            from datetime import date
            today = date.today()
            return today.year - obj.fecha_nacimiento.year - ((today.month, today.day) < (obj.fecha_nacimiento.month, obj.fecha_nacimiento.day))
        return None


class DetalleNominaSerializer(serializers.ModelSerializer):
    total = serializers.ReadOnlyField()
    item_nombre = serializers.CharField(source='item.nombre', read_only=True)
    item_precio = serializers.DecimalField(source='item.precio_unitario', read_only=True, max_digits=10, decimal_places=2)
    
    class Meta:
        model = DetalleNomina
        fields = ['id', 'nomina', 'item', 'cantidad', 'total', 'item_nombre', 'item_precio', 'creado_el', 'actualizado_el']


class NominaSerializer(serializers.ModelSerializer):
    empleado_info = EmpleadoSerializer(source='empleado', read_only=True)
    detalles = DetalleNominaSerializer(source='detallenomina_set', many=True, read_only=True)
    produccion = serializers.ReadOnlyField()
    total = serializers.ReadOnlyField()
    
    class Meta:
        model = Nomina
        fields = '__all__'


class NominaCreateSerializer(serializers.ModelSerializer):
    detalles = DetalleNominaSerializer(many=True, write_only=True)
    
    class Meta:
        model = Nomina
        fields = ['empleado', 'periodo_inicio', 'periodo_fin', 'seguridad', 'prestamos', 'restaurante', 'detalles']
        
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        nomina = Nomina.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            DetalleNomina.objects.create(nomina=nomina, **detalle_data)
            
        return nomina
        
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        
        # Actualizar la nómina
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Eliminar detalles existentes y crear nuevos
        instance.detallenomina_set.all().delete()
        for detalle_data in detalles_data:
            DetalleNomina.objects.create(nomina=instance, **detalle_data)
            
        return instance


class EmpleadoExportSerializer(serializers.ModelSerializer):
    """Serializer específico para exportar empleados a Excel"""
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    municipio_nombre = serializers.CharField(source='municipio.nombre', read_only=True)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = [
            'documento', 'nombres', 'apellidos', 'correo', 'telefono',
            'direccion', 'fecha_nacimiento', 'genero', 'departamento_nombre',
            'municipio_nombre', 'cargo_nombre', 'activo'
        ]


class NominaExportSerializer(serializers.ModelSerializer):
    """Serializer específico para exportar nóminas a Excel"""
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    empleado_documento = serializers.CharField(source='empleado.documento', read_only=True)
    cargo_nombre = serializers.CharField(source='empleado.cargo.nombre', read_only=True)
    produccion = serializers.ReadOnlyField()
    total = serializers.ReadOnlyField()
    
    class Meta:
        model = Nomina
        fields = [
            'empleado_documento', 'empleado_nombre', 'cargo_nombre',
            'periodo_inicio', 'periodo_fin', 'produccion', 'seguridad',
            'prestamos', 'restaurante', 'total'
        ]
