from rest_framework import serializers


# Serializers básicos para documentación
class DocumentacionSerializer(serializers.Serializer):
    """Serializer básico para documentación del sistema"""
    titulo = serializers.CharField(max_length=200)
    contenido = serializers.CharField()
    categoria = serializers.CharField(max_length=100)
    autor = serializers.CharField(max_length=100)
    fecha_creacion = serializers.DateTimeField(read_only=True)
    activo = serializers.BooleanField(default=True)
