from rest_framework import serializers


# Serializers básicos para roles
class RolSerializer(serializers.Serializer):
    """Serializer básico para roles del sistema"""
    nombre = serializers.CharField(max_length=100)
    descripcion = serializers.CharField()
    nivel = serializers.IntegerField()
    activo = serializers.BooleanField(default=True)
    fecha_creacion = serializers.DateTimeField(read_only=True)


class AsignacionRolSerializer(serializers.Serializer):
    """Serializer para asignación de roles"""
    usuario_id = serializers.IntegerField()
    rol_id = serializers.IntegerField()
    fecha_asignacion = serializers.DateTimeField(read_only=True)
    asignado_por = serializers.CharField(max_length=100, read_only=True)
