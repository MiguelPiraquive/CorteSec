from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Perfil, ConfiguracionNotificaciones


class UserBasicSerializer(serializers.Serializer):
    """Serializer básico para User model - Usando Serializer base para evitar problemas de introspección"""
    
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)


class ConfiguracionNotificacionesSerializer(serializers.Serializer):
    """Serializer para ConfiguracionNotificaciones - Usando Serializer base"""
    
    id = serializers.IntegerField(read_only=True)
    notif_prestamos = serializers.BooleanField(default=True)
    notif_nomina = serializers.BooleanField(default=True)
    notif_documentos = serializers.BooleanField(default=True)
    notif_sistema = serializers.BooleanField(default=True)
    via_email = serializers.BooleanField(default=True)
    via_sms = serializers.BooleanField(default=False)
    via_plataforma = serializers.BooleanField(default=True)
    horario_inicio = serializers.TimeField(default='08:00')
    horario_fin = serializers.TimeField(default='18:00')
    
    def update(self, instance, validated_data):
        """Actualizar instancia existente"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class PerfilSerializer(serializers.ModelSerializer):
    """Serializer completo para Perfil"""
    
    usuario = UserBasicSerializer(read_only=True)
    # NO incluir config_notificaciones como campo del modelo
    # Lo agregaremos manualmente en to_representation
    edad = serializers.ReadOnlyField()
    nombre_completo = serializers.ReadOnlyField()
    foto_url = serializers.SerializerMethodField()
    config_notificaciones = serializers.SerializerMethodField()
    
    class Meta:
        model = Perfil
        fields = [
            'id', 'usuario', 'foto', 'foto_url', 'fecha_nacimiento', 'genero', 
            'estado_civil', 'nacionalidad', 'telefono', 'telefono_emergencia',
            'contacto_emergencia', 'direccion_residencia', 'ciudad_residencia',
            'departamento_residencia', 'codigo_postal', 'tipo_sangre', 'alergias',
            'medicamentos', 'condiciones_medicas', 'nivel_educacion', 'profesion',
            'habilidades', 'experiencia_laboral', 'certificaciones', 'banco',
            'numero_cuenta', 'tipo_cuenta', 'numero_cedula', 'departamento_expedicion_cedula',
            'lugar_expedicion_cedula', 'tema_preferido', 'idioma_preferido', 'zona_horaria',
            'perfil_completado', 'privacidad_publica', 'ultima_actualizacion_perfil',
            'fecha_creacion', 'edad', 'nombre_completo', 'config_notificaciones'
        ]
        read_only_fields = [
            'id', 'perfil_completado', 'ultima_actualizacion_perfil', 
            'fecha_creacion', 'edad', 'nombre_completo'
        ]

    def get_foto_url(self, obj):
        """Obtiene la URL de la foto de perfil"""
        return obj.get_foto_url()
    
    def get_config_notificaciones(self, obj):
        """Obtiene la configuración de notificaciones, creándola si no existe"""
        try:
            if hasattr(obj, 'config_notificaciones'):
                return ConfiguracionNotificacionesSerializer(obj.config_notificaciones).data
            else:
                # Crear la configuración si no existe
                config, created = ConfiguracionNotificaciones.objects.get_or_create(perfil=obj)
                return ConfiguracionNotificacionesSerializer(config).data
        except Exception as e:
            # Si falla, devolver estructura por defecto
            return {
                'id': None,
                'notif_prestamos': True,
                'notif_nomina': True,
                'notif_documentos': True,
                'notif_sistema': True,
                'via_email': True,
                'via_sms': False,
                'via_plataforma': True,
                'horario_inicio': '08:00:00',
                'horario_fin': '18:00:00'
            }


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
            'tipo_cuenta', 'numero_cedula', 'departamento_expedicion_cedula',
            'lugar_expedicion_cedula', 'tema_preferido', 'idioma_preferido',
            'zona_horaria', 'privacidad_publica'
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
