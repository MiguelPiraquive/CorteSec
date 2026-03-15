"""
Serializers del Módulo de Usuarios - CorteSec
===========================================

Serializers para gestión completa de usuarios.

Autor: Sistema CorteSec
Versión: 1.0.0  
Fecha: 2026-01-01
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import HistorialUsuario

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios (información resumida)"""
    
    nombre_completo = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.nombre', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'nombre_completo',
            'phone', 'avatar', 'is_active', 'is_staff', 'is_superuser',
            'email_verified', 'organization', 'organization_name', 'organization_role',
            'roles', 'last_login', 'date_joined'
        ]
    
    def get_nombre_completo(self, obj):
        return obj.full_name or f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_roles(self, obj):
        """Obtener roles personalizados asignados al usuario"""
        from roles.models import AsignacionRol
        asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        return [{'id': a.rol.id, 'nombre': a.rol.nombre, 'codigo': a.rol.codigo} for a in asignaciones]


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle completo de usuario"""
    
    nombre_completo = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    permisos = serializers.SerializerMethodField()
    perfil_detalle = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.nombre', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'nombre_completo',
            'first_name', 'last_name', 'phone', 'birth_date', 'avatar',
            'bio', 'address', 'city', 'country',
            'is_active', 'is_staff', 'is_superuser',
            'email_verified', 'two_factor_enabled',
            'organization', 'organization_name', 'organization_role',
            'roles', 'permisos', 'perfil_detalle',
            'last_login', 'date_joined', 'updated_at',
            'last_ip', 'last_location', 'failed_login_attempts'
        ]
    
    def get_nombre_completo(self, obj):
        return obj.full_name or f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_roles(self, obj):
        """Obtener roles personalizados asignados al usuario"""
        from roles.models import AsignacionRol
        asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol')
        return [{
            'id': a.rol.id,
            'nombre': a.rol.nombre,
            'codigo': a.rol.codigo,
            'descripcion': a.rol.descripcion,
            'fecha_asignacion': a.fecha_asignacion
        } for a in asignaciones]
    
    def get_permisos(self, obj):
        """Obtener todos los permisos del usuario a través de sus roles"""
        from roles.models import AsignacionRol
        permisos = []
        
        # Obtener permisos de roles asignados
        asignaciones = AsignacionRol.objects.filter(usuario=obj, activa=True).select_related('rol').prefetch_related('rol__permisos')
        
        permisos_set = set()
        for asignacion in asignaciones:
            for permiso in asignacion.rol.permisos.filter(activo=True):
                if permiso.codigo not in permisos_set:
                    permisos_set.add(permiso.codigo)
                    permisos.append({
                        'id': permiso.id,
                        'nombre': permiso.nombre,
                        'codigo': permiso.codigo,
                        'origen': f'rol:{asignacion.rol.nombre}'
                    })
        
        return permisos
    
    def get_perfil_detalle(self, obj):
        """Obtener datos completos del perfil para autocompletar empleados"""
        if hasattr(obj, 'perfil') and obj.perfil:
            perfil = obj.perfil
            return {
                'id': perfil.id,
                'telefono': perfil.telefono or '',
                'direccion_residencia': perfil.direccion_residencia or '',
                'ciudad_residencia': perfil.ciudad_residencia or '',
                'departamento_residencia': perfil.departamento_residencia or '',
                'genero': perfil.genero or '',
                'banco': perfil.banco or '',
                'tipo_cuenta': perfil.tipo_cuenta or '',
                'numero_cuenta': perfil.numero_cuenta or '',
                'numero_cedula': perfil.numero_cedula or '',
                'fecha_nacimiento': perfil.fecha_nacimiento.isoformat() if perfil.fecha_nacimiento else '',
                'profesion': perfil.profesion or '',
                'foto': perfil.foto.url if perfil.foto else None,
                # Datos del usuario
                'first_name': obj.first_name or '',
                'last_name': obj.last_name or '',
            }
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para creación de usuarios con multi-tenancy"""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'full_name', 'first_name', 'last_name', 'phone',
            'is_active', 'is_staff', 'is_superuser',
            'organization', 'organization_role',
            'roles_ids'
        ]
    
    def validate(self, attrs):
        """Validar que las contraseñas coincidan"""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
        
        # Validar username único
        username = attrs.get('username')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({
                'username': 'Este nombre de usuario ya está en uso.'
            })
        
        # Validar email único
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                'email': 'Este email ya está registrado.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Crear usuario con contraseña encriptada y asignar organización"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        roles_ids = validated_data.pop('roles_ids', [])
        
        # Si no se especifica organización, usar la del usuario que crea
        request = self.context.get('request')
        if request and not validated_data.get('organization'):
            validated_data['organization'] = request.user.organization
        
        # Crear usuario
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Asignar roles personalizados
        if roles_ids:
            from roles.models import Rol, AsignacionRol
            for rol_id in roles_ids:
                try:
                    rol = Rol.objects.get(id=rol_id, organization=user.organization)
                    AsignacionRol.objects.create(
                        usuario=user,
                        rol=rol,
                        asignado_por=request.user if request else None,
                        organization=user.organization
                    )
                except Rol.DoesNotExist:
                    pass
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de usuarios"""
    
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'full_name', 'first_name', 'last_name',
            'phone', 'birth_date', 'bio', 'address', 'city', 'country',
            'is_active', 'is_staff', 'is_superuser',
            'organization_role',
            'roles_ids'
        ]
    
    def validate_username(self, value):
        """Validar username único (excepto el mismo usuario)"""
        if value:
            user = self.instance
            if User.objects.filter(username=value).exclude(id=user.id).exists():
                raise serializers.ValidationError('Este nombre de usuario ya está en uso.')
        return value
    
    def validate_email(self, value):
        """Validar email único (excepto el mismo usuario)"""
        if value:
            user = self.instance
            if User.objects.filter(email=value).exclude(id=user.id).exists():
                raise serializers.ValidationError('Este email ya está registrado.')
        return value
    
    def update(self, instance, validated_data):
        """Actualizar usuario y sus roles"""
        roles_ids = validated_data.pop('roles_ids', None)
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Actualizar roles si se proporcionaron
        if roles_ids is not None:
            from roles.models import Rol, AsignacionRol
            request = self.context.get('request')
            
            # Desactivar asignaciones actuales
            AsignacionRol.objects.filter(usuario=instance, activa=True).update(activa=False)
            
            # Crear nuevas asignaciones
            for rol_id in roles_ids:
                try:
                    rol = Rol.objects.get(id=rol_id, organization=instance.organization)
                    AsignacionRol.objects.create(
                        usuario=instance,
                        rol=rol,
                        asignado_por=request.user if request else None,
                        organization=instance.organization
                    )
                except Rol.DoesNotExist:
                    pass
        
        return instance


class CambiarContrasenaSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña por admin"""
    
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Las contraseñas no coinciden.'
            })
        return attrs


class AsignarRolesSerializer(serializers.Serializer):
    """Serializer para asignación de roles personalizados a usuario"""
    
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    
    def validate_roles_ids(self, value):
        """Validar que los roles existan y pertenezcan a la organización"""
        if not value:
            return []
        
        from roles.models import Rol
        request = self.context.get('request')
        
        if request and request.user.organization:
            roles_count = Rol.objects.filter(
                id__in=value,
                organization=request.user.organization
            ).count()
            if roles_count != len(value):
                raise serializers.ValidationError('Algunos roles no son válidos o no pertenecen a tu organización.')
        
        return value


class UserStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de usuarios"""
    
    total_usuarios = serializers.IntegerField()
    usuarios_activos = serializers.IntegerField()
    usuarios_inactivos = serializers.IntegerField()
    administradores = serializers.IntegerField()


class HistorialUsuarioSerializer(serializers.ModelSerializer):
    """Serializer para historial de actividad"""
    
    class Meta:
        model = HistorialUsuario
        fields = ['id', 'accion', 'descripcion', 'ip_address', 'user_agent', 'fecha']


class VerificarDisponibilidadSerializer(serializers.Serializer):
    """Serializer para verificar disponibilidad de username/email"""
    
    disponible = serializers.BooleanField()
    mensaje = serializers.CharField(required=False)
