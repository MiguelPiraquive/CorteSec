from rest_framework import serializers
from decimal import Decimal
from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    """Serializer para items de trabajo/servicios de construcción"""
    precio_formateado = serializers.ReadOnlyField()
    descripcion_completa = serializers.ReadOnlyField()
    tipo_cantidad_display = serializers.CharField(source='get_tipo_cantidad_display', read_only=True)
    
    class Meta:
        model = Item
        fields = [
            'id', 'organization', 'nombre', 'descripcion', 'precio_unitario',
            'tipo_cantidad', 'tipo_cantidad_display', 'codigo', 'activo', 
            'observaciones', 'precio_formateado', 'descripcion_completa',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'precio_formateado', 'descripcion_completa', 'tipo_cantidad_display',
            'created_at', 'updated_at'
        ]
    
    def validate_precio_unitario(self, value):
        """Validar que el precio sea positivo"""
        if value < 0:
            raise serializers.ValidationError("El precio unitario debe ser mayor o igual a cero")
        return value


class ItemSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de items"""
    precio_formateado = serializers.ReadOnlyField()
    tipo_cantidad_display = serializers.CharField(source='get_tipo_cantidad_display', read_only=True)
    
    class Meta:
        model = Item
        fields = [
            'id', 'nombre', 'precio_unitario', 'tipo_cantidad', 
            'tipo_cantidad_display', 'precio_formateado', 'activo'
        ]


class ItemTrabajoSerializer(serializers.ModelSerializer):
    """Serializer específico para cotizaciones y proyectos"""
    precio_formateado = serializers.ReadOnlyField()
    tipo_cantidad_display = serializers.CharField(source='get_tipo_cantidad_display', read_only=True)
    
    class Meta:
        model = Item
        fields = [
            'id', 'nombre', 'descripcion', 'precio_unitario', 'tipo_cantidad',
            'tipo_cantidad_display', 'precio_formateado', 'codigo'
        ]


# Serializers específicos para operaciones
class BusquedaItemsSerializer(serializers.Serializer):
    """Serializer para búsqueda de items de trabajo"""
    query = serializers.CharField(max_length=200, required=False)
    tipo_cantidad = serializers.ChoiceField(choices=Item.TIPO_CANTIDAD_CHOICES, required=False)
    precio_min = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    precio_max = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    solo_activos = serializers.BooleanField(default=True)
    
    def validate(self, data):
        """Validaciones de búsqueda"""
        precio_min = data.get('precio_min')
        precio_max = data.get('precio_max')
        
        if precio_min and precio_max and precio_min > precio_max:
            raise serializers.ValidationError(
                "El precio mínimo no puede ser mayor que el precio máximo"
            )
        
        return data


class ActualizarPreciosSerializer(serializers.Serializer):
    """Serializer para actualización masiva de precios"""
    items = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="Lista de IDs de items a actualizar"
    )
    tipo_actualizacion = serializers.ChoiceField(choices=[
        ('porcentaje', 'Por Porcentaje'),
        ('valor_fijo', 'Valor Fijo'),
        ('precio_nuevo', 'Precio Nuevo')
    ])
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    def validate_valor(self, value):
        """Valida el valor según el tipo de actualización"""
        tipo = self.initial_data.get('tipo_actualizacion')
        
        if tipo == 'porcentaje' and (value < -100 or value > 1000):
            raise serializers.ValidationError(
                "El porcentaje debe estar entre -100% y 1000%"
            )
        
        if tipo in ['valor_fijo', 'precio_nuevo'] and value < 0:
            raise serializers.ValidationError(
                "El valor debe ser mayor o igual a cero"
            )
        
        return value


class ReporteItemsSerializer(serializers.Serializer):
    """Serializer para reportes de items"""
    tipo_cantidad = serializers.ChoiceField(
        choices=Item.TIPO_CANTIDAD_CHOICES,
        required=False
    )
    solo_activos = serializers.BooleanField(default=True)
    formato = serializers.ChoiceField(
        choices=[('pdf', 'PDF'), ('excel', 'Excel'), ('json', 'JSON')],
        default='json'
    )
