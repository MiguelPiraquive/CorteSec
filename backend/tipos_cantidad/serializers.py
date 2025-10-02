from rest_framework import serializers
from .models import TipoCantidad


class TipoCantidadSerializer(serializers.ModelSerializer):
    """Serializer completo para tipos de cantidad"""
    
    descripcion_completa = serializers.ReadOnlyField()
    puede_eliminarse = serializers.ReadOnlyField()
    
    class Meta:
        model = TipoCantidad
        fields = [
            'id', 'codigo', 'descripcion', 'simbolo', 'activo', 
            'es_sistema', 'orden', 'fecha_creacion', 'fecha_modificacion',
            'descripcion_completa', 'puede_eliminarse'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']

    def validate_codigo(self, value):
        """Validar formato del código"""
        import re
        value = value.lower().strip()
        
        if ' ' in value:
            raise serializers.ValidationError("El código no debe contener espacios")
        
        if not re.match(r'^[a-z0-9_-]+$', value):
            raise serializers.ValidationError(
                "El código solo puede contener letras, números, guiones y guiones bajos"
            )
        
        return value

    def validate_simbolo(self, value):
        """Validar longitud del símbolo"""
        if value and len(value) > 10:
            raise serializers.ValidationError("El símbolo no puede tener más de 10 caracteres")
        return value

    def validate_orden(self, value):
        """Validar que el orden no sea negativo"""
        if value is not None and value < 0:
            raise serializers.ValidationError("El orden no puede ser negativo")
        return value


class TipoCantidadListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas"""
    
    descripcion_completa = serializers.ReadOnlyField()
    
    class Meta:
        model = TipoCantidad
        fields = ['id', 'codigo', 'descripcion', 'simbolo', 'descripcion_completa', 'activo']


class TipoCantidadSelectSerializer(serializers.ModelSerializer):
    """Serializer para selects/dropdowns"""
    
    text = serializers.SerializerMethodField()
    value = serializers.CharField(source='id')
    
    class Meta:
        model = TipoCantidad
        fields = ['value', 'text', 'codigo', 'descripcion', 'simbolo']
    
    def get_text(self, obj):
        """Texto para mostrar en el select"""
        return f"{obj.codigo} - {obj.descripcion}"
