from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Organizacion, LogAuditoria, Notificacion, ConfiguracionSistema, Plan, PlanChangeLog, Invitacion

User = get_user_model()


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
    plan = serializers.SlugRelatedField(
        slug_field='code',
        queryset=Plan.objects.all(),
        help_text='Código del plan (ej: FREE, BASIC, PRO, ENTERPRISE)',
    )
    
    class Meta:
        model = Organizacion
        fields = [
            'id', 'nombre', 'codigo', 'slug', 'razon_social', 'nit',
            'email', 'telefono', 'website', 'direccion', 'city', 'state',
            'country', 'postal_code',
            'activa', 'plan', 'max_users', 'max_storage_mb',
            'is_trial', 'trial_ends_at',
            'logo', 'primary_color',
            'configuracion', 'settings', 'metadata',
            'usuarios_count', 'created_at', 'updated_at', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlanSerializer(serializers.ModelSerializer):
    """Serializer para planes SaaS"""

    class Meta:
        model = Plan
        fields = [
            'id', 'code', 'name', 'description',
            'price_monthly_cop', 'price_yearly_cop',
            'max_users', 'max_storage_mb',
            'features', 'is_public', 'is_active',
            'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlanChangeLogSerializer(serializers.ModelSerializer):
    """Serializer para historial de cambios de plan"""
    organization_name = serializers.CharField(source='organization.nombre', read_only=True)
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = PlanChangeLog
        fields = [
            'id', 'organization', 'organization_name',
            'changed_by', 'changed_by_username',
            'previous_plan', 'new_plan',
            'previous_limits', 'new_limits',
            'note', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LogAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para logs de auditoría"""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    fecha_formatted = serializers.DateTimeField(source='created_at', format='%d/%m/%Y %H:%M:%S', read_only=True)
    
    class Meta:
        model = LogAuditoria
        fields = [
            'id', 'usuario', 'usuario_username', 'accion', 'modelo',
            'objeto_id', 'ip_address', 'user_agent', 'datos_antes',
            'datos_despues', 'metadata', 'created_at', 'fecha_formatted'
        ]
        read_only_fields = ['created_at']


class NotificacionSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones"""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    fecha_formatted = serializers.DateTimeField(
        source='fecha', 
        format='%d/%m/%Y %H:%M:%S', 
        read_only=True
    )
    esta_expirada = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Notificacion
        fields = [
            'id', 'organization', 'usuario', 'usuario_username',
            'titulo', 'mensaje', 'tipo', 'categoria', 'prioridad',
            'leida', 'fecha', 'fecha_formatted', 'fecha_leida',
            'url_accion', 'texto_accion', 'icono', 'datos_adicionales',
            'origen_tipo', 'origen_id', 'expires_at', 'esta_expirada'
        ]
        read_only_fields = ['fecha', 'fecha_leida', 'organization', 'usuario', 'url_accion']


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


# ==================== INVITACIONES ====================

class InvitacionSerializer(serializers.ModelSerializer):
    """Serializer completo para admins - listar y ver detalle de invitaciones"""
    organization_nombre = serializers.CharField(source='organization.nombre', read_only=True)
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True, default=None)
    accepted_by_username = serializers.CharField(source='accepted_by.username', read_only=True, default=None)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    rbac_rol_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Invitacion
        fields = [
            'id', 'organization', 'organization_nombre', 'email', 'role',
            'rbac_rol_id', 'rbac_rol_nombre',
            'estado', 'mensaje',
            'invited_by', 'invited_by_username',
            'accepted_by', 'accepted_by_username',
            'expires_at', 'accepted_at',
            'is_expired', 'is_valid',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'organization', 'invited_by',
            'accepted_by', 'accepted_at', 'created_at', 'updated_at'
        ]

    def get_rbac_rol_nombre(self, obj):
        if obj.rbac_rol_id:
            try:
                from roles.models import Rol
                rol = Rol.objects.get(id=obj.rbac_rol_id)
                return rol.nombre
            except Exception:
                return None
        return None


class InvitacionCreateSerializer(serializers.Serializer):
    """Serializer para crear invitaciones"""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Invitacion.ROLE_CHOICES, default='MEMBER')
    rbac_rol_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    mensaje = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_rbac_rol_id(self, value):
        if value is not None:
            try:
                from roles.models import Rol
                Rol.objects.get(id=value, activo=True)
            except Exception:
                raise serializers.ValidationError("El rol seleccionado no existe o no está activo.")
        return value

    def validate_email(self, value):
        organization = self.context.get('organization')
        if not organization:
            raise serializers.ValidationError("Organización no disponible.")

        # Verificar si ya existe una invitación pendiente para este email en esta org
        existing = Invitacion.objects.filter(
            organization=organization,
            email=value,
            estado='PENDING'
        ).exists()
        if existing:
            raise serializers.ValidationError("Ya existe una invitación pendiente para este email.")

        # Verificar si el usuario ya pertenece a la org
        from login.models import CustomUser
        if CustomUser.objects.filter(email=value, organization=organization).exists():
            raise serializers.ValidationError("Este usuario ya pertenece a la organización.")

        return value


class InvitacionPublicSerializer(serializers.ModelSerializer):
    """Serializer público para validar invitación (sin datos sensibles)"""
    organization_nombre = serializers.CharField(source='organization.nombre', read_only=True)
    organization_logo = serializers.SerializerMethodField()
    invited_by_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitacion
        fields = [
            'email', 'role', 'estado', 'mensaje',
            'organization_nombre', 'organization_logo',
            'invited_by_name',
            'expires_at', 'is_expired', 'is_valid'
        ]

    def get_organization_logo(self, obj):
        if obj.organization.logo:
            return obj.organization.logo.url
        return None

    def get_invited_by_name(self, obj):
        if obj.invited_by:
            return obj.invited_by.get_full_name() or obj.invited_by.username
        return None


class AcceptInvitacionSerializer(serializers.Serializer):
    """Serializer para aceptar una invitación y registrarse"""
    token = serializers.CharField()
    username = serializers.CharField(min_length=3, max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    def validate_token(self, value):
        try:
            invitacion = Invitacion.objects.select_related('organization').get(token=value)
        except Invitacion.DoesNotExist:
            raise serializers.ValidationError("Invitación no encontrada.")

        if invitacion.estado != 'PENDING':
            raise serializers.ValidationError("Esta invitación ya fue utilizada o cancelada.")

        if invitacion.is_expired:
            raise serializers.ValidationError("Esta invitación ha expirado.")

        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs
