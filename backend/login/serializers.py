from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer para el modelo CustomUser"""
    avatar_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    organization_role = serializers.CharField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'full_name', 'first_name', 'last_name',
            'phone', 'birth_date', 'avatar', 'avatar_url', 'bio', 'address',
            'city', 'country', 'email_verified', 'is_active', 'is_staff',
            'is_superuser', 'date_joined', 'last_login', 'display_name',
            'organization', 'organization_role'
        ]
        read_only_fields = [
            'id', 'date_joined', 'last_login', 'is_staff', 'is_superuser',
            'avatar_url', 'display_name'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def get_avatar_url(self, obj):
        return obj.get_avatar_url()
    
    def get_display_name(self, obj):
        return obj.display_name

    def get_organization(self, obj):
        org = getattr(obj, 'organization', None)
        if not org:
            return None
        return {
            'id': str(org.pk),
            'name': org.nombre,
            'slug': org.codigo
        }


class LoginSerializer(serializers.Serializer):
    """Serializer para login de usuario"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Credenciales inválidas.')
            if not user.is_active:
                raise serializers.ValidationError('Esta cuenta está desactivada.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Debe proporcionar email y contraseña.')


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer para registro de usuario con soporte multitenant"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    tenant_code = serializers.CharField(write_only=True, required=True, help_text="Código de la organización")
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'full_name', 'phone', 'tenant_code'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return attrs
    
    def validate_tenant_code(self, value):
        """Validar que el código de organización tenga formato válido"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("El código de organización es requerido.")
        return value.strip().upper()
    
    def create(self, validated_data):
        from core.models import Organizacion
        
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        tenant_code = validated_data.pop('tenant_code')
        
        # Buscar la organización
        try:
            organization = Organizacion.objects.get(codigo=tenant_code, activa=True)
        except Organizacion.DoesNotExist:
            raise serializers.ValidationError({
                'tenant_code': f'La organización con código {tenant_code} no existe o no está activa.'
            })
        
        # Crear usuario y asignar organización
        user = CustomUser.objects.create_user(password=password, **validated_data)
        user.organization = organization
        user.save()
        
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Las nuevas contraseñas no coinciden.")
        return attrs
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de perfil"""
    
    class Meta:
        model = CustomUser
        fields = [
            'full_name', 'first_name', 'last_name', 'phone', 'birth_date',
            'avatar', 'bio', 'address', 'city', 'country'
        ]
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer para solicitud de reset de contraseña"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            CustomUser.objects.get(email=value)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("No existe un usuario con este email.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer para confirmación de reset de contraseña"""
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    token = serializers.CharField()
    uid = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return attrs
