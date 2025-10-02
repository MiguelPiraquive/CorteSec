from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Organizacion, LogAuditoria, Notificacion, ConfiguracionSistema
from .models_tenant import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer para organizaciones multi-tenant
    
    Maneja la serialización/deserialización de organizaciones
    incluyendo sus configuraciones y estado.
    """
    class Meta:
        model = Organization
        fields = [
            'id',
            'name',
            'slug',
            'display_name',
            'description',
            'email',
            'is_active',
            'settings',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        
    def validate_slug(self, value):
        """Valida que el slug sea único"""
        instance = getattr(self, 'instance', None)
        if instance and instance.slug == value:
            return value
            
        if value and Organization.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Este slug ya está en uso")
        return value


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para usuarios"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']


class OrganizacionSerializer(serializers.ModelSerializer):
    """Serializer para organizaciones"""
    usuarios_count = serializers.IntegerField(read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Organizacion
        fields = [
            'id', 'nombre', 'codigo', 'razon_social', 'nit',
            'email', 'telefono', 'direccion', 'activa', 'logo',
            'configuracion', 'metadata', 'usuarios_count',
            'created_at', 'updated_at', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LogSistemaSerializer(serializers.ModelSerializer):
    """Serializer para logs del sistema"""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    fecha_formatted = serializers.DateTimeField(source='fecha', format='%d/%m/%Y %H:%M:%S', read_only=True)
    
    class Meta:
        model = LogAuditoria
        fields = [
            'id', 'usuario', 'usuario_username', 'accion', 'descripcion',
            'ip_address', 'user_agent', 'fecha', 'fecha_formatted'
        ]
        read_only_fields = ['fecha']


class NotificacionSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones"""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    fecha_creacion_formatted = serializers.DateTimeField(
        source='fecha_creacion', 
        format='%d/%m/%Y %H:%M:%S', 
        read_only=True
    )
    
    class Meta:
        model = Notificacion
        fields = [
            'id', 'usuario', 'usuario_username', 'titulo', 'mensaje', 'tipo',
            'leida', 'fecha_creacion', 'fecha_creacion_formatted', 'fecha_lectura'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_lectura']


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    """Serializer para configuraciones del sistema"""
    valor_typed = serializers.SerializerMethodField()
    
    class Meta:
        model = ConfiguracionSistema
        fields = [
            'id', 'clave', 'valor', 'valor_typed', 'descripcion', 'tipo',
            'activa', 'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']
    
    def get_valor_typed(self, obj):
        """Retorna el valor con el tipo correcto"""
        return obj.get_valor_typed()
