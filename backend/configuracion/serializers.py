from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ConfiguracionGeneral, ParametroSistema, ConfiguracionModulo, LogConfiguracion,
    ConfiguracionSeguridad, ConfiguracionEmail
)

User = get_user_model()


class ConfiguracionGeneralSerializer(serializers.ModelSerializer):
    """Serializer para configuración general"""
    
    class Meta:
        model = ConfiguracionGeneral
        fields = [
            'id', 'nombre_empresa', 'nit', 'direccion', 'telefono', 'email',
            'sitio_web', 'logo', 'moneda', 'simbolo_moneda', 'zona_horaria',
            'formato_fecha', 'dia_pago_nomina', 'periodo_nomina',
            'cuenta_efectivo_defecto', 'cuenta_nomina_defecto',
            'sesion_timeout_minutos', 'max_intentos_login', 'requiere_cambio_password',
            'dias_cambio_password', 'servidor_email', 'puerto_email', 'email_usuario',
            'usar_tls', 'fecha_modificacion', 'modificado_por'
        ]
        read_only_fields = ['fecha_modificacion']


class ParametroSistemaSerializer(serializers.ModelSerializer):
    """Serializer para ParametroSistema"""
    
    class Meta:
        model = ParametroSistema
        fields = [
            'id',
            'codigo',
            'nombre',
            'descripcion',
            'tipo_valor',
            'valor',
            'valor_defecto',
            'es_sistema',
            'activo',
            'fecha_creacion',
            'fecha_modificacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_modificacion']


class ConfiguracionModuloSerializer(serializers.ModelSerializer):
    """Serializer para ConfiguracionModulo"""
    
    class Meta:
        model = ConfiguracionModulo
        fields = [
            'id',
            'modulo',
            'activo',
            'version',
            'configuracion_json',
            'orden_menu',
            'icono',
            'color',
            'fecha_modificacion',
        ]
        read_only_fields = ['id', 'fecha_modificacion']


class LogConfiguracionSerializer(serializers.ModelSerializer):
    """Serializer para LogConfiguracion"""
    usuario_nombre = serializers.SerializerMethodField()
    fecha_creacion_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = LogConfiguracion
        fields = [
            'id',
            'usuario',
            'usuario_nombre',
            'accion',
            'descripcion',
            'nivel',
            'ip_address',
            'user_agent',
            'fecha_creacion',
            'fecha_creacion_formatted',
        ]
        read_only_fields = ['id']
    
    def get_usuario_nombre(self, obj):
        """Obtener nombre completo del usuario"""
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.username
        return "Sistema"
    
    def get_fecha_creacion_formatted(self, obj):
        """Formatear fecha de creación"""
        if obj.fecha_creacion:
            return obj.fecha_creacion.strftime("%d/%m/%Y %H:%M:%S")
        return None


# Serializers específicos para operaciones
class CalculoDeduccionesSerializer(serializers.Serializer):
    """Serializer para cálculo de deducciones"""
    salario_base = serializers.DecimalField(max_digits=12, decimal_places=2)
    incluir_auxilio_transporte = serializers.BooleanField(default=True)
    
    def validate_salario_base(self, value):
        """Valida que el salario sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El salario debe ser mayor a cero")
        return value


class ConfiguracionPublicaSerializer(serializers.Serializer):
    """Serializer para configuración pública (sin datos sensibles)"""
    nombre_empresa = serializers.CharField()
    moneda = serializers.CharField()
    simbolo_moneda = serializers.CharField()
    zona_horaria = serializers.CharField()


# Serializers para respuestas de API
class ModulosStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de módulos"""
    total_modulos = serializers.IntegerField()
    modulos_activos = serializers.IntegerField()
    modulos_configurados = serializers.IntegerField()
    porcentaje_configuracion = serializers.DecimalField(max_digits=5, decimal_places=2)


class ParametrosStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de parámetros"""
    total_parametros = serializers.IntegerField()
    parametros_activos = serializers.IntegerField()
    parametros_publicos = serializers.IntegerField()
    parametros_editables = serializers.IntegerField()
    porcentaje_activos = serializers.DecimalField(max_digits=5, decimal_places=2)


class ConfiguracionSeguridadSerializer(serializers.ModelSerializer):
    """Serializer para configuración de seguridad"""
    modificado_por_nombre = serializers.CharField(source='modificado_por.get_full_name', read_only=True)
    
    class Meta:
        model = ConfiguracionSeguridad
        fields = [
            'id', 'tiempo_sesion', 'max_intentos_login', 'tiempo_bloqueo',
            'longitud_minima_password', 'requiere_mayusculas', 'requiere_minusculas',
            'requiere_numeros', 'requiere_simbolos', 'dias_expiracion_password',
            'historial_passwords', 'habilitar_auditoria', 'dias_retencion_logs',
            'permitir_multiples_sesiones', 'ips_permitidas', 'notificar_login_fallido',
            'notificar_cambio_password', 'fecha_creacion', 'fecha_modificacion',
            'modificado_por', 'modificado_por_nombre'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion', 'modificado_por']

    def validate_longitud_minima_password(self, value):
        """Valida que la longitud mínima sea razonable"""
        if value < 4:
            raise serializers.ValidationError("La longitud mínima debe ser al menos 4 caracteres")
        if value > 50:
            raise serializers.ValidationError("La longitud mínima no puede ser mayor a 50 caracteres")
        return value

    def validate_tiempo_sesion(self, value):
        """Valida que el tiempo de sesión sea razonable"""
        if value < 5:
            raise serializers.ValidationError("El tiempo de sesión debe ser al menos 5 minutos")
        if value > 480:  # 8 horas
            raise serializers.ValidationError("El tiempo de sesión no puede ser mayor a 8 horas")
        return value


class ConfiguracionEmailSerializer(serializers.ModelSerializer):
    """Serializer para configuración de email"""
    modificado_por_nombre = serializers.CharField(source='modificado_por.get_full_name', read_only=True)
    password_smtp_oculto = serializers.SerializerMethodField()
    
    class Meta:
        model = ConfiguracionEmail
        fields = [
            'id', 'servidor_smtp', 'puerto_smtp', 'usuario_smtp', 'password_smtp',
            'password_smtp_oculto', 'usar_tls', 'usar_ssl', 'email_remitente',
            'nombre_remitente', 'email_respuesta', 'plantilla_header', 'plantilla_footer',
            'limite_emails_hora', 'limite_emails_dia', 'notificar_error_envio',
            'email_administrador', 'servicio_activo', 'fecha_creacion',
            'fecha_modificacion', 'modificado_por', 'modificado_por_nombre'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion', 'modificado_por']
        extra_kwargs = {
            'password_smtp': {'write_only': True}
        }

    def get_password_smtp_oculto(self, obj):
        """Retorna la contraseña oculta para mostrar en el frontend"""
        if obj.password_smtp:
            return '*' * len(obj.password_smtp)
        return ''

    def validate_puerto_smtp(self, value):
        """Valida que el puerto SMTP sea válido"""
        if value < 1 or value > 65535:
            raise serializers.ValidationError("El puerto debe estar entre 1 y 65535")
        return value

    def validate_limite_emails_hora(self, value):
        """Valida que el límite de emails por hora sea razonable"""
        if value < 1:
            raise serializers.ValidationError("El límite debe ser al menos 1 email por hora")
        if value > 10000:
            raise serializers.ValidationError("El límite no puede ser mayor a 10,000 emails por hora")
        return value


# Serializers para operaciones específicas
class TestEmailSerializer(serializers.Serializer):
    """Serializer para probar configuración de email"""
    email_destino = serializers.EmailField(
        help_text="Email al que se enviará el correo de prueba"
    )
    asunto = serializers.CharField(
        max_length=200,
        default="Prueba de configuración de email",
        help_text="Asunto del correo de prueba"
    )
    mensaje = serializers.CharField(
        default="Este es un correo de prueba para verificar la configuración del sistema de email.",
        help_text="Mensaje del correo de prueba"
    )


class ValidacionSeguridadSerializer(serializers.Serializer):
    """Serializer para validar configuración de seguridad"""
    password = serializers.CharField(help_text="Contraseña a validar")
    usuario_id = serializers.IntegerField(required=False, help_text="ID del usuario (opcional)")


class BackupConfiguracionSerializer(serializers.Serializer):
    """Serializer para backup de configuración"""
    incluir_general = serializers.BooleanField(default=True)
    incluir_parametros = serializers.BooleanField(default=True)
    incluir_modulos = serializers.BooleanField(default=True)
    incluir_seguridad = serializers.BooleanField(default=False)
    incluir_email = serializers.BooleanField(default=False)
    password_proteccion = serializers.CharField(
        required=False,
        help_text="Contraseña para proteger el backup (opcional)"
    )
