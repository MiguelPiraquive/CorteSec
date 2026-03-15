"""
ASOGAN - Serializers de Usuarios
Serializers profesionales para gestión completa de usuarios
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from roles.models import AsignacionRol, Rol, EstadoAsignacion
from permisos.models import PermisoDirecto
from perfil.models import Perfil

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios (información resumida)"""
    
    nombre_completo = serializers.SerializerMethodField()
    tiene_perfil = serializers.SerializerMethodField()
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)
    foto_perfil = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'nombre_completo',
            'username', 'full_name', 'foto_perfil',
            'is_active', 'is_staff', 'email_verified',
            'organization_role', 'roles',
            'tiene_perfil',
            'ultimo_acceso', 'date_joined', 'updated_at',
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.full_name or obj.username
    
    def get_tiene_perfil(self, obj):
        return hasattr(obj, 'profile') and obj.profile is not None
    
    def get_foto_perfil(self, obj):
        """Obtener foto de perfil desde Perfil"""
        try:
            if hasattr(obj, 'perfil') and obj.perfil and obj.perfil.foto:
                return obj.perfil.foto.url
            return None
        except Exception:
            return None

    def get_roles(self, obj):
        """Obtener roles RBAC activos del usuario"""
        # Use prefetched data if available to avoid N+1 queries
        if hasattr(obj, '_active_asignaciones'):
            asignaciones = obj._active_asignaciones
        else:
            asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        roles = []
        for asignacion in asignaciones:
            if asignacion.esta_vigente():
                roles.append({
                    'id': asignacion.rol.id,
                    'nombre': asignacion.rol.nombre,
                })
        return roles




class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle completo de usuario"""
    
    nombre_completo = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()
    tiene_perfil = serializers.SerializerMethodField()
    perfil_detalle = serializers.SerializerMethodField()
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)
    total_sesiones = serializers.SerializerMethodField()
    foto_perfil = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'nombre_completo',
            'username', 'full_name', 'foto_perfil',
            'is_active', 'is_staff', 'is_superuser', 'email_verified',
            'roles', 'permisos',
            'tiene_perfil', 'perfil_detalle',
            'ultimo_acceso', 'total_sesiones',
            'date_joined', 'updated_at',
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.full_name or obj.username
    
    def get_foto_perfil(self, obj):
        """Obtener foto de perfil desde Perfil"""
        try:
            if hasattr(obj, 'perfil') and obj.perfil and obj.perfil.foto:
                return obj.perfil.foto.url
            return None
        except Exception:
            return None
    
    def get_roles(self, obj):
        # Use prefetched data if available to avoid N+1 queries
        if hasattr(obj, '_active_asignaciones'):
            asignaciones = obj._active_asignaciones
        else:
            asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        roles = []
        for asignacion in asignaciones:
            if asignacion.esta_vigente():
                roles.append({
                    'id': asignacion.rol.id,
                    'nombre': asignacion.rol.nombre,
                    'codigo': asignacion.rol.codigo,
                })
        return roles

    def get_permisos(self, obj):
        """Obtener permisos directos y por rol."""
        permisos = []
        permisos_set = set()

        # Permisos directos del usuario
        directos = PermisoDirecto.objects.filter(usuario=obj, activo=True).select_related('permiso')
        for asignacion in directos:
            if asignacion.es_efectivo() and asignacion.tipo in ['grant', 'temporary']:
                permiso = asignacion.permiso
                if permiso.id not in permisos_set:
                    permisos_set.add(permiso.id)
                    permisos.append({
                        'id': permiso.id,
                        'nombre': permiso.nombre,
                        'codigo': permiso.codigo,
                        'origen': 'directo'
                    })

        # Permisos por roles (use prefetched data if available)
        if hasattr(obj, '_active_asignaciones'):
            asignaciones_roles = obj._active_asignaciones
        else:
            asignaciones_roles = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        for asignacion in asignaciones_roles:
            if asignacion.esta_vigente():
                rol = asignacion.rol
                for permiso in rol.permisos.filter(activo=True):
                    if permiso.id not in permisos_set:
                        permisos_set.add(permiso.id)
                        permisos.append({
                            'id': permiso.id,
                            'nombre': permiso.nombre,
                            'codigo': permiso.codigo,
                            'origen': f"rol:{rol.nombre}"
                        })

        return permisos
    
    def get_tiene_perfil(self, obj):
        return hasattr(obj, 'perfil') and obj.perfil is not None
    
    def get_perfil_detalle(self, obj):
        """Obtener datos completos del perfil para autocompletar empleados"""
        if hasattr(obj, 'perfil') and obj.perfil:
            perfil = obj.perfil
            return {
                'id': perfil.id,
                'first_name': obj.first_name or '',
                'last_name': obj.last_name or '',
                'genero': perfil.genero or '',
                'telefono': perfil.telefono or '',
                'direccion_residencia': perfil.direccion_residencia or '',
                'ciudad_residencia': perfil.ciudad_residencia or '',
                'departamento_residencia': perfil.departamento_residencia or '',
                'banco': perfil.banco or '',
                'tipo_cuenta': perfil.tipo_cuenta or '',
                'numero_cuenta': perfil.numero_cuenta or '',
                'numero_cedula': perfil.numero_cedula or '',
                'fecha_nacimiento': perfil.fecha_nacimiento.isoformat() if perfil.fecha_nacimiento else '',
                'profesion': perfil.profesion or '',
                'foto': perfil.foto.url if perfil.foto else None,
            }
        return None
    
    def get_total_sesiones(self, obj):
        """Contar sesiones/actividad del usuario"""
        try:
            return obj.historial_actividad.count()
        except Exception:
            return 0


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para creación de usuarios con validaciones"""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    rol_id = serializers.IntegerField(required=False, allow_null=True)
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    enviar_email_bienvenida = serializers.BooleanField(default=True, write_only=True)
    foto_perfil = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'username',
            'full_name', 'foto_perfil',
            'is_active',
            'rol_id', 'roles_ids', 'enviar_email_bienvenida'
        ]

    def validate(self, attrs):
        """Validar que las contraseñas coincidan"""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })

        # Validar que el email no exista (incluyendo soft-deleted)
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'Ya existe un usuario con este email.'
            })

        # is_superuser e is_staff nunca se aceptan via API
        attrs.pop('is_superuser', None)
        attrs.pop('is_staff', None)

        return attrs
    
    def create(self, validated_data):
        """Crear usuario con contraseña encriptada"""
        validated_data.pop('password_confirm')
        validated_data.pop('enviar_email_bienvenida', None)
        
        rol_id = validated_data.pop('rol_id', None)
        roles_ids = validated_data.pop('roles_ids', [])
        password = validated_data.pop('password')
        foto_perfil = validated_data.pop('foto_perfil', None)  # Extraer foto
        
        # Crear usuario
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Si hay foto, crear o actualizar perfil
        if foto_perfil:
            profile, created = Perfil.objects.get_or_create(usuario=user)
            profile.foto = foto_perfil
            profile.save()
        
        # Asignar roles (compat: rol_id)
        if rol_id and not roles_ids:
            roles_ids = [rol_id]

        if roles_ids:
            estado_activo = EstadoAsignacion.objects.filter(nombre='Activa').first()
            request = self.context.get('request')
            org = request.user.organization if request else None
            org_tenant_id = str(org.id) if org else None
            roles = Rol.objects.filter(id__in=roles_ids, tenant_id=org_tenant_id)
            for rol in roles:
                AsignacionRol.objects.get_or_create(
                    usuario=user,
                    rol=rol,
                    defaults={
                        'activa': True,
                        'estado': estado_activo,
                        'asignado_por': user,
                        'organization': getattr(user, 'organization', None),
                    }
                )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de usuarios"""
    
    rol_id = serializers.IntegerField(required=False, allow_null=True)
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    foto_perfil = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'username',
            'phone', 'full_name',
            'is_active',
            'rol_id', 'roles_ids', 'foto_perfil'
        ]

    def validate_email(self, value):
        """Validar que el email sea único"""
        if value:
            user = self.instance
            if User.objects.filter(email=value).exclude(id=user.id).exists():
                raise serializers.ValidationError('Ya existe un usuario con este email.')
        return value

    def validate(self, attrs):
        # is_superuser e is_staff nunca se aceptan via API
        attrs.pop('is_superuser', None)
        attrs.pop('is_staff', None)
        return attrs
    
    def update(self, instance, validated_data):
        """Actualizar usuario y su rol"""
        rol_id = validated_data.pop('rol_id', None)
        roles_ids = validated_data.pop('roles_ids', [])
        foto_perfil = validated_data.pop('foto_perfil', None)  # Extraer foto
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar roles (compat: rol_id)
        if rol_id and not roles_ids:
            roles_ids = [rol_id]

        if roles_ids:
            AsignacionRol.objects.filter(usuario=instance, activa=True).update(activa=False)
            estado_activo = EstadoAsignacion.objects.filter(nombre='Activa').first()
            request = self.context.get('request')
            org = request.user.organization if request else None
            org_tenant_id = str(org.id) if org else None
            roles = Rol.objects.filter(id__in=roles_ids, tenant_id=org_tenant_id)
            for rol in roles:
                AsignacionRol.objects.update_or_create(
                    usuario=instance,
                    rol=rol,
                    defaults={
                        'activa': True,
                        'estado': estado_activo,
                        'asignado_por': instance,
                        'organization': getattr(instance, 'organization', None),
                    }
                )
        
        instance.save()
        
        # Si hay foto, crear o actualizar perfil
        if foto_perfil:
            profile, created = Perfil.objects.get_or_create(usuario=instance)
            profile.foto = foto_perfil
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
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'nombre', 'apellido', 'nombre_completo',
            'profesion', 'organizacion', 'roles'
        ]
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()

    def get_roles(self, obj):
        asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        return [a.rol.nombre for a in asignaciones if a.esta_vigente()]


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
        allow_empty=False,
        max_length=100  # Limitar operaciones masivas para evitar DoS
    )
    
    def validate_user_ids(self, value):
        """Validar que los IDs sean válidos y pertenezcan a la organización"""
        if not value:
            raise serializers.ValidationError('Debe proporcionar al menos un ID de usuario.')

        # Verificar que los usuarios existan y pertenezcan a la organización
        request = self.context.get('request')
        org = request.user.organization if request else None
        users_count = User.objects.filter(id__in=value, organization=org).count()
        if users_count != len(value):
            raise serializers.ValidationError('Algunos IDs no son válidos o no pertenecen a su organización.')
        
        return value


class UserBulkRoleAssignSerializer(UserBulkActionSerializer):
    """Serializer para asignación masiva de roles"""

    rol_id = serializers.IntegerField(required=True)

    def validate_rol_id(self, value):
        """Validar que el rol exista y pertenezca a la organización"""
        request = self.context.get('request')
        org = request.user.organization if request else None
        org_tenant_id = str(org.id) if org else None
        if not Rol.objects.filter(id=value, tenant_id=org_tenant_id).exists():
            raise serializers.ValidationError('El rol especificado no existe o no pertenece a su organización.')
        return value

