"""
ASOGAN - Serializers de Usuarios
Serializers profesionales para gestión completa de usuarios
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
# from apps.roles.models import Rol  # COMENTADO - CustomUser no tiene campo 'rol'
from apps.profiles.models import UserProfile

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios (información resumida)"""
    
    # rol_nombre = serializers.CharField(source='rol.nombre', read_only=True, allow_null=True)  # COMENTADO
    # rol_id = serializers.IntegerField(source='rol.id', read_only=True, allow_null=True)  # COMENTADO
    nombre_completo = serializers.SerializerMethodField()
    tiene_perfil = serializers.SerializerMethodField()
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)
    foto_perfil = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'nombre', 'apellido', 'nombre_completo',
            'cedula', 'profesion', 'organizacion', 'foto_perfil',
            'is_active', 'is_staff', 'email_verified',
            # 'rol_nombre', 'rol_id',  # COMENTADO
            'tiene_perfil',
            'ultimo_acceso', 'fecha_creacion', 'actualizado'  # CORREGIDO: actualizado en vez de fecha_actualizacion
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()
    
    def get_tiene_perfil(self, obj):
        return hasattr(obj, 'profile') and obj.profile is not None
    
    def get_foto_perfil(self, obj):
        """Obtener foto de perfil desde UserProfile"""
        try:
            if hasattr(obj, 'profile') and obj.profile and obj.profile.profile_picture:
                url = obj.profile.profile_picture.url
                print(f"✅ Usuario {obj.email} tiene foto: {url}")
                return url
            else:
                print(f"❌ Usuario {obj.email} NO tiene foto - has profile: {hasattr(obj, 'profile')}")
                return None
        except Exception as e:
            print(f"⚠️ Error obteniendo foto para {obj.email}: {e}")
            return None


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle completo de usuario"""
    
    # rol_nombre = serializers.CharField(source='rol.nombre', read_only=True, allow_null=True)  # COMENTADO
    # rol_detalle = serializers.SerializerMethodField()  # COMENTADO
    nombre_completo = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()
    tiene_perfil = serializers.SerializerMethodField()
    perfil_detalle = serializers.SerializerMethodField()
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)
    total_sesiones = serializers.SerializerMethodField()
    foto_perfil = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'nombre', 'apellido', 'nombre_completo',
            'cedula', 'profesion', 'organizacion', 'foto_perfil',
            'is_active', 'is_staff', 'is_superuser', 'email_verified',
            # 'rol_nombre', 'rol_detalle',  # COMENTADO
            'permisos',
            'tiene_perfil', 'perfil_detalle',
            'ultimo_acceso', 'total_sesiones',
            'fecha_creacion', 'actualizado',  # CORREGIDO: actualizado en vez de fecha_actualizacion
            'email_verification_sent_at', 'password_reset_sent_at'
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()
    
    def get_foto_perfil(self, obj):
        """Obtener foto de perfil desde UserProfile"""
        try:
            if hasattr(obj, 'profile') and obj.profile and obj.profile.profile_picture:
                url = obj.profile.profile_picture.url
                print(f"✅ [DETAIL] Usuario {obj.email} tiene foto: {url}")
                return url
            else:
                print(f"❌ [DETAIL] Usuario {obj.email} NO tiene foto")
                return None
        except Exception as e:
            print(f"⚠️ [DETAIL] Error obteniendo foto para {obj.email}: {e}")
            return None
    
    # def get_rol_detalle(self, obj):  # COMENTADO - CustomUser no tiene campo 'rol'
    #     if hasattr(obj, 'rol') and obj.rol:
    #         return {
    #             'id': obj.rol.id,
    #             'nombre': obj.rol.nombre,
    #             'descripcion': obj.rol.descripcion,
    #             'nivel_acceso': obj.rol.nivel_acceso
    #         }
    #     return None
    
    def get_permisos(self, obj):
        """Obtener todos los permisos del usuario (del rol + personalizados)"""
        permisos = []
        
        # Permisos del rol - COMENTADO porque CustomUser no tiene campo 'rol'
        # if hasattr(obj, 'rol') and obj.rol:
        #     rol_permisos = obj.rol.permisos.all()
        #     for permiso in rol_permisos:
        #         permisos.append({
        #             'id': permiso.id,
        #             'nombre': permiso.nombre,
        #             'codigo': permiso.codigo,
        #             'origen': 'rol'
        #         })
        
        # Permisos personalizados directos (si los hubiera)
        permisos_directos = obj.user_permissions.all()
        for permiso in permisos_directos:
            permisos.append({
                'id': permiso.id,
                'nombre': permiso.name,
                'codigo': permiso.codename,
                'origen': 'directo'
            })
        
        return permisos
    
    def get_tiene_perfil(self, obj):
        return hasattr(obj, 'profile') and obj.profile is not None
    
    def get_perfil_detalle(self, obj):
        if hasattr(obj, 'profile') and obj.profile:
            return {
                'id': obj.profile.id,
                'numero_asociado': getattr(obj.profile, 'numero_asociado', None),
                'tipo_asociado': getattr(obj.profile, 'tipo_asociado', None)
            }
        return None
    
    def get_total_sesiones(self, obj):
        """Contar sesiones/actividad del usuario"""
        # Esto se puede mejorar con un modelo de sesiones
        return 0  # Placeholder


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para creación de usuarios con validaciones"""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    rol_id = serializers.IntegerField(required=False, allow_null=True)
    enviar_email_bienvenida = serializers.BooleanField(default=True, write_only=True)
    foto_perfil = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'nombre', 'apellido', 'cedula',
            'profesion', 'organizacion', 'foto_perfil',
            'is_active', 'is_staff',
            'rol_id', 'enviar_email_bienvenida'
        ]
    
    def validate(self, attrs):
        """Validar que las contraseñas coincidan"""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
        
        # Validar que el email no exista (incluyendo soft-deleted)
        email = attrs.get('email')
        if User.all_objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'Ya existe un usuario con este email.'
            })
        
        # Validar que la cédula no exista si se proporciona
        cedula = attrs.get('cedula')
        if cedula and User.all_objects.filter(cedula=cedula).exists():
            raise serializers.ValidationError({
                'cedula': 'Ya existe un usuario con esta cédula.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Crear usuario con contraseña encriptada"""
        validated_data.pop('password_confirm')
        validated_data.pop('enviar_email_bienvenida', None)
        
        rol_id = validated_data.pop('rol_id', None)  # Removido pero aún aceptado para compatibilidad
        password = validated_data.pop('password')
        foto_perfil = validated_data.pop('foto_perfil', None)  # Extraer foto
        
        # Crear usuario
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Si hay foto, crear o actualizar perfil
        if foto_perfil:
            from apps.profiles.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.profile_picture = foto_perfil
            profile.save()
        
        # Asignar rol si se proporcionó - COMENTADO porque CustomUser no tiene campo 'rol'
        # if rol_id:
        #     try:
        #         rol = Rol.objects.get(id=rol_id)
        #         user.rol = rol
        #         user.save()
        #     except Rol.DoesNotExist:
        #         pass
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de usuarios"""
    
    rol_id = serializers.IntegerField(required=False, allow_null=True)
    foto_perfil = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'nombre', 'apellido', 'cedula',
            'phone_number', 'profesion', 'organizacion',
            'is_active', 'is_staff',
            'rol_id', 'foto_perfil'
        ]
    
    def validate_email(self, value):
        """Validar que el email sea único"""
        if value:
            user = self.instance
            if User.all_objects.filter(email=value).exclude(id=user.id).exists():
                raise serializers.ValidationError('Ya existe un usuario con este email.')
        return value
    
    def validate_cedula(self, value):
        """Validar que la cédula sea única"""
        if value:
            user = self.instance
            if User.all_objects.filter(cedula=value).exclude(id=user.id).exists():
                raise serializers.ValidationError('Ya existe un usuario con esta cédula.')
        return value
    
    def update(self, instance, validated_data):
        """Actualizar usuario y su rol"""
        rol_id = validated_data.pop('rol_id', None)  # Removido pero aún aceptado
        foto_perfil = validated_data.pop('foto_perfil', None)  # Extraer foto
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar rol si se proporcionó - COMENTADO porque CustomUser no tiene campo 'rol'
        # if rol_id is not None:
        #     try:
        #         rol = Rol.objects.get(id=rol_id)
        #         instance.rol = rol
        #     except Rol.DoesNotExist:
        #         instance.rol = None
        
        instance.save()
        
        # Si hay foto, crear o actualizar perfil
        if foto_perfil:
            from apps.profiles.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(user=instance)
            profile.profile_picture = foto_perfil
            profile.save()
        
        return instance


class UserPasswordChangeSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña por admin"""
    
    nueva_password = serializers.CharField(required=True, validators=[validate_password])
    confirmar_password = serializers.CharField(required=True)
    enviar_email = serializers.BooleanField(default=True)
    
    def validate(self, attrs):
        if attrs['nueva_password'] != attrs['confirmar_password']:
            raise serializers.ValidationError({
                'confirmar_password': 'Las contraseñas no coinciden.'
            })
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfil público de usuario"""
    
    nombre_completo = serializers.SerializerMethodField()
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'nombre', 'apellido', 'nombre_completo',
            'profesion', 'organizacion', 'rol_nombre'
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()


class UserStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de usuarios"""
    
    total_usuarios = serializers.IntegerField()
    usuarios_activos = serializers.IntegerField()
    usuarios_inactivos = serializers.IntegerField()
    usuarios_verificados = serializers.IntegerField()
    usuarios_sin_verificar = serializers.IntegerField()
    usuarios_staff = serializers.IntegerField()
    usuarios_por_rol = serializers.DictField()
    usuarios_recientes = serializers.ListField()


class UserBulkActionSerializer(serializers.Serializer):
    """Serializer para acciones masivas"""
    
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False
    )
    
    def validate_user_ids(self, value):
        """Validar que los IDs sean válidos"""
        if not value:
            raise serializers.ValidationError('Debe proporcionar al menos un ID de usuario.')
        
        # Verificar que los usuarios existan
        users_count = User.objects.filter(id__in=value).count()
        if users_count != len(value):
            raise serializers.ValidationError('Algunos IDs de usuario no son válidos.')
        
        return value


class UserBulkRoleAssignSerializer(UserBulkActionSerializer):
    """Serializer para asignación masiva de roles - DESHABILITADO (CustomUser no tiene campo 'rol')"""
    
    rol_id = serializers.IntegerField(required=True)
    
    def validate_rol_id(self, value):
        """Validar que el rol exista"""
        # COMENTADO - CustomUser no tiene campo 'rol'
        # if not Rol.objects.filter(id=value).exists():
        #     raise serializers.ValidationError('El rol especificado no existe.')
        raise serializers.ValidationError('La asignación de roles no está disponible actualmente.')
        # return value

