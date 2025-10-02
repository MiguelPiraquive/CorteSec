from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Perfil, ConfiguracionNotificaciones


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined']


class ConfiguracionNotificacionesSerializer(serializers.ModelSerializer):
    """Serializer para ConfiguracionNotificaciones"""
    
    class Meta:
        model = ConfiguracionNotificaciones
        fields = [
            'id', 'notif_prestamos', 'notif_nomina', 'notif_documentos', 
            'notif_sistema', 'via_email', 'via_sms', 'via_plataforma',
            'horario_inicio', 'horario_fin'
        ]


class PerfilSerializer(serializers.ModelSerializer):
    """Serializer completo para Perfil"""
    
    usuario = UserBasicSerializer(read_only=True)
    config_notificaciones = ConfiguracionNotificacionesSerializer(read_only=True)
    edad = serializers.ReadOnlyField()
    nombre_completo = serializers.ReadOnlyField()
    foto_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Perfil
        fields = [
            'id', 'usuario', 'foto', 'foto_url', 'fecha_nacimiento', 'genero', 
            'estado_civil', 'nacionalidad', 'telefono', 'telefono_emergencia',
            'contacto_emergencia', 'direccion_residencia', 'ciudad_residencia',
            'departamento_residencia', 'codigo_postal', 'tipo_sangre', 'alergias',
            'medicamentos', 'condiciones_medicas', 'nivel_educacion', 'profesion',
            'habilidades', 'experiencia_laboral', 'certificaciones', 'banco',
            'numero_cuenta', 'tipo_cuenta', 'numero_cedula', 'lugar_expedicion_cedula',
            'tema_preferido', 'idioma_preferido', 'zona_horaria', 'perfil_completado',
            'privacidad_publica', 'ultima_actualizacion_perfil', 'fecha_creacion',
            'edad', 'nombre_completo', 'config_notificaciones'
        ]
        read_only_fields = [
            'id', 'perfil_completado', 'ultima_actualizacion_perfil', 
            'fecha_creacion', 'edad', 'nombre_completo'
        ]

    def get_foto_url(self, obj):
        """Obtiene la URL de la foto de perfil"""
        return obj.get_foto_url()


class PerfilCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar perfiles (sin usuario)"""
    
    class Meta:
        model = Perfil
        fields = [
            'foto', 'fecha_nacimiento', 'genero', 'estado_civil', 'nacionalidad',
            'telefono', 'telefono_emergencia', 'contacto_emergencia', 
            'direccion_residencia', 'ciudad_residencia', 'departamento_residencia',
            'codigo_postal', 'tipo_sangre', 'alergias', 'medicamentos',
            'condiciones_medicas', 'nivel_educacion', 'profesion', 'habilidades',
            'experiencia_laboral', 'certificaciones', 'banco', 'numero_cuenta',
            'tipo_cuenta', 'numero_cedula', 'lugar_expedicion_cedula',
            'tema_preferido', 'idioma_preferido', 'zona_horaria', 'privacidad_publica'
        ]


class PerfilPublicoSerializer(serializers.ModelSerializer):
    """Serializer para información pública del perfil"""
    
    usuario = UserBasicSerializer(read_only=True)
    nombre_completo = serializers.ReadOnlyField()
    foto_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Perfil
        fields = [
            'id', 'usuario', 'foto_url', 'nombre_completo', 'profesion', 
            'habilidades', 'fecha_creacion'
        ]

    def get_foto_url(self, obj):
        """Obtiene la URL de la foto de perfil"""
        return obj.get_foto_url()


class PerfilResumenSerializer(serializers.ModelSerializer):
    """Serializer de resumen para listas de perfiles"""
    
    usuario = UserBasicSerializer(read_only=True)
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    foto_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Perfil
        fields = [
            'id', 'usuario', 'foto_url', 'nombre_completo', 'edad', 'profesion',
            'ciudad_residencia', 'telefono', 'perfil_completado', 'fecha_creacion'
        ]

    def get_foto_url(self, obj):
        """Obtiene la URL de la foto de perfil"""
        return obj.get_foto_url()


class UserConPerfilSerializer(serializers.ModelSerializer):
    """Serializer para User con información de perfil"""
    
    perfil = PerfilSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'is_active', 'date_joined', 'perfil'
        ]
        read_only_fields = ['id', 'username', 'date_joined']


class EstadisticasPerfilSerializer(serializers.Serializer):
    """Serializer para estadísticas de perfiles"""
    
    total_perfiles = serializers.IntegerField()
    perfiles_completados = serializers.IntegerField()
    perfiles_incompletos = serializers.IntegerField()
    porcentaje_completitud = serializers.FloatField()
    por_genero = serializers.DictField()
    por_estado_civil = serializers.DictField()
    por_profesion = serializers.DictField()
    por_ciudad = serializers.DictField()
