import logging

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser

logger = logging.getLogger('login')


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
    """Serializer para login de usuario - solo valida formato"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer para registro - siempre crea nueva organización"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    organization_name = serializers.CharField(
        write_only=True,
        required=True,
        help_text="Nombre de la nueva organización"
    )
    organization_code = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Código de la organización (se auto-genera si no se provee)"
    )
    plan_code = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Código del plan seleccionado"
    )

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'full_name', 'phone',
            'organization_name', 'organization_code', 'plan_code'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return attrs

    def validate_organization_code(self, value):
        """Validar que el código de organización no exista ya"""
        if value:
            from core.models import Organizacion
            value = value.strip().upper()
            if Organizacion.objects.filter(codigo=value).exists():
                raise serializers.ValidationError("Ya existe una organización con este código.")
        return value

    def validate_organization_name(self, value):
        """Validar que el nombre de organización no exista ya"""
        if value:
            from core.models import Organizacion
            value = value.strip()
            if Organizacion.objects.filter(nombre=value).exists():
                raise serializers.ValidationError("Ya existe una organización con este nombre.")
        return value

    def create(self, validated_data):
        from core.models import Organizacion, Plan
        from django.utils.text import slugify
        from django.utils import timezone
        from django.db import transaction
        from datetime import timedelta

        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        organization_name = validated_data.pop('organization_name')
        organization_code = validated_data.pop('organization_code', '') or ''
        plan_code = validated_data.pop('plan_code', '') or ''

        # Auto-generar código si no se provee
        if not organization_code:
            organization_code = slugify(organization_name).upper().replace('-', '_')[:50]
            # Asegurar unicidad del código
            base_code = organization_code
            counter = 1
            while Organizacion.objects.filter(codigo=organization_code).exists():
                organization_code = f"{base_code}_{counter}"
                counter += 1

        # Generar slug único
        org_slug = slugify(organization_name)[:50]
        if not org_slug:
            org_slug = slugify(organization_code.lower())[:50] or 'org'
        base_slug = org_slug
        counter = 1
        while Organizacion.objects.filter(slug=org_slug).exists():
            org_slug = f"{base_slug}-{counter}"[:50]
            counter += 1

        with transaction.atomic():
            # Buscar plan seleccionado
            plan_obj = None
            if plan_code:
                plan_obj = Plan.objects.filter(code=plan_code, is_active=True).first()

            # Si no se encontró el plan, usar FREE
            if not plan_obj:
                plan_obj = Plan.objects.filter(code='FREE').first()

            # Determinar límites del plan
            plan_max_users = plan_obj.max_users if plan_obj else 5
            plan_max_storage = plan_obj.max_storage_mb if plan_obj else 1024

            # Trial de 14 días
            trial_end = timezone.now() + timedelta(days=14)

            # Crear organización
            org = Organizacion.objects.create(
                nombre=organization_name,
                codigo=organization_code,
                slug=org_slug,
                activa=True,
                plan=plan_obj,
                max_users=plan_max_users,
                max_storage_mb=plan_max_storage,
                is_trial=True,
                trial_ends_at=trial_end,
            )

            # Crear usuario como OWNER
            user = CustomUser.objects.create_user(
                password=password,
                organization=org,
                organization_role='OWNER',
                **validated_data
            )

            # Marcar creador de la org
            org.created_by = user
            org.save(update_fields=['created_by'])

            # ─── Asignar rol ADMIN al OWNER automáticamente ───
            # Sin esto, el usuario no tendría permisos RBAC y vería 403 en todo
            try:
                from roles.models import Rol, AsignacionRol
                admin_role = Rol.objects.filter(codigo='ADMIN', activo=True).first()
                if admin_role:
                    AsignacionRol.objects.create(
                        usuario=user,
                        rol=admin_role,
                        activa=True,
                        fecha_inicio=timezone.now(),
                        tenant_id=str(org.id),
                        asignado_por=user,
                        justificacion='Auto-asignado al crear organización como OWNER',
                    )
                    # También M2M directo para compatibilidad
                    user.roles.add(admin_role)
                    logger.info(f"Rol ADMIN asignado a {user.username} en org {org.codigo}")
                else:
                    logger.warning("No se encontró rol ADMIN activo para asignar al owner")
            except Exception as role_error:
                logger.error(f"Error asignando rol ADMIN al owner: {role_error}")
                raise serializers.ValidationError(
                    "Error al configurar permisos de la organización. Por favor intenta de nuevo."
                )

            # Asegurar que la Subscription de billing existe
            # (el signal auto_create_subscription la crea al crear org,
            # pero si falló, la creamos aquí como fallback)
            try:
                from billing.models import Subscription
                if not Subscription.objects.filter(organization=org).exists():
                    Subscription.objects.create(
                        organization=org,
                        plan=plan_obj,
                        status=Subscription.Status.TRIALING,
                        trial_start=timezone.now(),
                        trial_end=trial_end,
                        current_period_start=timezone.now(),
                        current_period_end=trial_end,
                        billing_cycle='monthly',
                    )
            except Exception:
                pass  # No bloquear registro si billing falla

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
        # Por seguridad no revelamos si el email existe o no
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
