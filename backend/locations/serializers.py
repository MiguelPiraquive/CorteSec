from rest_framework import serializers
from .models import Departamento, Municipio


class DepartamentoSerializer(serializers.ModelSerializer):
    """Serializer para departamentos"""
    municipios_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Departamento
        fields = [
            'id', 'nombre', 'codigo', 'capital', 'region',
            'municipios_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['municipios_count', 'created_at', 'updated_at']


class DepartamentoSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplificado para departamentos"""
    
    class Meta:
        model = Departamento
        fields = ['id', 'nombre', 'codigo']


class MunicipioSerializer(serializers.ModelSerializer):
    """Serializer para municipios"""
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    nombre_completo = serializers.ReadOnlyField()
    
    class Meta:
        model = Municipio
        fields = [
            'id', 'departamento', 'departamento_nombre',
            'nombre', 'codigo', 'nombre_completo', 'created_at', 'updated_at'
        ]
        read_only_fields = ['departamento_nombre', 'nombre_completo', 'created_at', 'updated_at']


class MunicipioSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplificado para municipios"""
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True)
    
    class Meta:
        model = Municipio
        fields = ['id', 'nombre', 'departamento_nombre']


class MunicipioConDepartamentoSerializer(serializers.ModelSerializer):
    """Serializer para municipios que incluye información del departamento"""
    departamento = DepartamentoSimpleSerializer(read_only=True, allow_null=True)
    nombre_completo = serializers.ReadOnlyField()
    
    class Meta:
        model = Municipio
        fields = [
            'id', 'departamento', 'nombre', 'codigo', 'nombre_completo',
            'created_at', 'updated_at'
        ]


# Serializers específicos para operaciones
class BusquedaUbicacionSerializer(serializers.Serializer):
    """Serializer para búsqueda de ubicaciones"""
    query = serializers.CharField(max_length=200, required=False)
    departamento = serializers.UUIDField(required=False)
    
    def validate(self, data):
        """Validaciones de búsqueda"""
        query = data.get('query')
        departamento = data.get('departamento')
        
        if not query and not departamento:
            raise serializers.ValidationError(
                "Debe proporcionar al menos un criterio de búsqueda"
            )
        
        return data


class UbicacionHierarcaSerializer(serializers.Serializer):
    """Serializer para estructura jerárquica de ubicaciones"""
    departamento = DepartamentoSimpleSerializer()
    municipios = MunicipioSimpleSerializer(many=True)


class ImportacionExcelSerializer(serializers.Serializer):
    """Serializer para importación desde Excel"""
    archivo = serializers.FileField(
        help_text="Archivo Excel (.xlsx o .xls) con los datos a importar"
    )
    
    def validate_archivo(self, value):
        """Validar formato del archivo"""
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError(
                "El archivo debe ser de formato Excel (.xlsx o .xls)"
            )
        
        # Validar tamaño (máximo 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "El archivo no puede superar los 5MB"
            )
        
        return value


class ExportacionSerializer(serializers.Serializer):
    """Serializer para opciones de exportación"""
    formato = serializers.ChoiceField(
        choices=[('excel', 'Excel'), ('csv', 'CSV')],
        default='excel'
    )
    incluir_inactivos = serializers.BooleanField(default=False)
    departamento = serializers.UUIDField(required=False, help_text="Filtrar por departamento específico")
