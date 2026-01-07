"""
Serializadores del Sistema de Roles
====================================

Serializadores completos para la API REST del sistema de roles.
Incluye validaciones avanzadas, campos calculados y representaciones jerárquicas.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from .models import TipoRol, Rol, AsignacionRol

User = get_user_model()


# ============================================================================
# SERIALIZERS PARA TIPO DE ROL
# ============================================================================

class TipoRolSerializer(serializers.ModelSerializer):
    """Serializer completo para TipoRol"""
    
    class Meta:
        model = TipoRol
        fields = [
            'id', 'nombre', 'descripcion', 'activo', 'orden',
            'fecha_creacion', 'organization'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'organization']


# ============================================================================
# SERIALIZERS PARA ROL
# ============================================================================

class RolBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Rol (para referencias)"""
    
    class Meta:
        model = Rol
        fields = ['id', 'uuid', 'codigo', 'nombre', 'nivel_jerarquico', 'activo']


class RolListSerializer(serializers.ModelSerializer):
    """Serializer para listado de roles (vista resumida)"""
    
    tipo_rol_nombre = serializers.CharField(source='tipo_rol.nombre', read_only=True)
    rol_padre_nombre = serializers.CharField(source='rol_padre.nombre', read_only=True)
    
    class Meta:
        model = Rol
        fields = [
            'id', 'uuid', 'codigo', 'nombre', 'descripcion',
            'tipo_rol', 'tipo_rol_nombre',
            'rol_padre', 'rol_padre_nombre',
            'nivel_jerarquico', 'categoria',
            'activo', 'es_sistema', 'es_publico',
            'color', 'icono',
            'total_asignaciones', 'asignaciones_activas',
            'fecha_creacion'
        ]


class RolSerializer(serializers.ModelSerializer):
    """Serializer completo para Rol"""
    
    tipo_rol_nombre = serializers.CharField(source='tipo_rol.nombre', read_only=True)
    rol_padre_nombre = serializers.CharField(source='rol_padre.nombre', read_only=True)
    creado_por_nombre = serializers.SerializerMethodField()
    modificado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Rol
        fields = [
            # Identificación
            'id', 'uuid', 'codigo', 'nombre', 'descripcion',
            
            # Jerarquía
            'rol_padre', 'rol_padre_nombre', 'nivel_jerarquico', 'hereda_permisos',
            
            # Clasificación
            'tipo_rol', 'tipo_rol_nombre', 'categoria',
            
            # Estados
            'activo', 'es_sistema', 'es_publico', 'requiere_aprobacion',
            
            # Control de horarios
            'tiene_restriccion_horario', 'hora_inicio', 'hora_fin', 'dias_semana',
            
            # Vigencia
            'fecha_inicio_vigencia', 'fecha_fin_vigencia',
            
            # Metadatos
            'prioridad', 'peso', 'color', 'icono',
            'metadatos', 'configuracion',
            
            # Multi-tenant
            'tenant_id', 'organization',
            
            # Auditoría
            'fecha_creacion', 'fecha_modificacion',
            'creado_por', 'creado_por_nombre',
            'modificado_por', 'modificado_por_nombre',
            
            # Estadísticas
            'total_asignaciones', 'asignaciones_activas', 'ultima_asignacion'
        ]
        read_only_fields = [
            'id', 'uuid', 'nivel_jerarquico', 'organization', 'tenant_id',
            'fecha_creacion', 'fecha_modificacion',
            'creado_por', 'modificado_por',
            'total_asignaciones', 'asignaciones_activas', 'ultima_asignacion'
        ]
    
    def get_creado_por_nombre(self, obj):
        if obj.creado_por:
            return f"{obj.creado_por.first_name} {obj.creado_por.last_name}".strip() or obj.creado_por.username
        return None
    
    def get_modificado_por_nombre(self, obj):
        if obj.modificado_por:
            return f"{obj.modificado_por.first_name} {obj.modificado_por.last_name}".strip() or obj.modificado_por.username
        return None
    
    def validate_codigo(self, value):
        """Validar que el código sea alfanumérico"""
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError(
                _("El código solo puede contener letras, números y guiones bajos")
            )
        return value.upper()
    
    def validate_color(self, value):
        """Validar formato de color hexadecimal"""
        if value and not value.startswith('#'):
            raise serializers.ValidationError(
                _("El color debe ser un código hexadecimal válido (#FFFFFF)")
            )
        return value
    
    def validate(self, data):
        """Validaciones cruzadas"""
        # Validar horarios
        if data.get('tiene_restriccion_horario'):
            if not data.get('hora_inicio') or not data.get('hora_fin'):
                raise serializers.ValidationError({
                    'hora_inicio': _("Debe especificar hora de inicio y fin si tiene restricción de horario")
                })
            
            if data['hora_inicio'] >= data['hora_fin']:
                raise serializers.ValidationError({
                    'hora_fin': _("La hora de fin debe ser posterior a la hora de inicio")
                })
        
        # Validar vigencia
        if data.get('fecha_inicio_vigencia') and data.get('fecha_fin_vigencia'):
            if data['fecha_inicio_vigencia'] > data['fecha_fin_vigencia']:
                raise serializers.ValidationError({
                    'fecha_fin_vigencia': _("La fecha de fin debe ser posterior a la fecha de inicio")
                })
        
        return data


class RolDetailSerializer(RolSerializer):
    """Serializer detallado con información adicional"""
    
    jerarquia_completa = serializers.SerializerMethodField()
    roles_hijo = RolBasicSerializer(many=True, read_only=True)
    puede_acceder_ahora = serializers.SerializerMethodField()
    
    class Meta(RolSerializer.Meta):
        fields = RolSerializer.Meta.fields + [
            'jerarquia_completa', 'roles_hijo', 'puede_acceder_ahora'
        ]
    
    def get_jerarquia_completa(self, obj):
        """Obtiene la jerarquía completa desde la raíz"""
        jerarquia = obj.get_jerarquia_completa()
        return [{'id': str(rol.id), 'codigo': rol.codigo, 'nombre': rol.nombre} for rol in jerarquia]
    
    def get_puede_acceder_ahora(self, obj):
        """Verifica si el rol puede ser usado ahora mismo"""
        return obj.puede_acceder_ahora()


class RolJerarquiaSerializer(serializers.ModelSerializer):
    """Serializer para vista de jerarquía (árbol)"""
    
    children = serializers.SerializerMethodField()
    tipo_rol_nombre = serializers.CharField(source='tipo_rol.nombre', read_only=True)
    
    class Meta:
        model = Rol
        fields = [
            'id', 'uuid', 'codigo', 'nombre', 'descripcion',
            'tipo_rol_nombre', 'nivel_jerarquico',
            'activo', 'es_sistema', 'color', 'icono',
            'total_asignaciones', 'children'
        ]
    
    def get_children(self, obj):
        """Obtiene roles hijos recursivamente"""
        hijos = obj.roles_hijo.filter(activo=True).order_by('orden', 'nombre')
        return RolJerarquiaSerializer(hijos, many=True).data


# ============================================================================
# SERIALIZERS PARA ASIGNACIÓN DE ROL
# ============================================================================

class UsuarioBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Usuario"""
    
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nombre_completo']
    
    def get_nombre_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class AsignacionRolListSerializer(serializers.ModelSerializer):
    """Serializer para listado de asignaciones"""
    
    usuario_detalle = UsuarioBasicSerializer(source='usuario', read_only=True)
    rol_detalle = RolBasicSerializer(source='rol', read_only=True)
    estado_nombre = serializers.CharField(source='estado.nombre', read_only=True)
    asignado_por_nombre = serializers.SerializerMethodField()
    aprobado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = AsignacionRol
        fields = [
            'id', 'usuario', 'usuario_detalle',
            'rol', 'rol_detalle',
            'estado', 'estado_nombre',
            'activa', 'fecha_inicio', 'fecha_fin',
            'fecha_asignacion', 'fecha_aprobacion',
            'asignado_por', 'asignado_por_nombre',
            'aprobado_por', 'aprobado_por_nombre',
            'justificacion', 'observaciones',
            'prioridad'
        ]
    
    def get_asignado_por_nombre(self, obj):
        if not obj.asignado_por:
            return None
        return f"{obj.asignado_por.first_name} {obj.asignado_por.last_name}".strip() or obj.asignado_por.username
    
    def get_aprobado_por_nombre(self, obj):
        if not obj.aprobado_por:
            return None
        return f"{obj.aprobado_por.first_name} {obj.aprobado_por.last_name}".strip() or obj.aprobado_por.username


class AsignacionRolSerializer(serializers.ModelSerializer):
    """Serializer completo para AsignacionRol"""
    
    usuario_detalle = UsuarioBasicSerializer(source='usuario', read_only=True)
    rol_detalle = RolBasicSerializer(source='rol', read_only=True)
    estado_nombre = serializers.CharField(source='estado.nombre', read_only=True)
    asignado_por_nombre = serializers.SerializerMethodField()
    aprobado_por_nombre = serializers.SerializerMethodField()
    revocado_por_nombre = serializers.SerializerMethodField()
    puede_ser_revocada = serializers.SerializerMethodField()
    tiempo_restante = serializers.SerializerMethodField()
    
    class Meta:
        model = AsignacionRol
        fields = [
            'id', 'usuario', 'usuario_detalle',
            'rol', 'rol_detalle',
            'estado', 'estado_nombre', 'activa',
            'fecha_inicio', 'fecha_fin',
            'contexto_tipo', 'contexto_id',
            'justificacion', 'observaciones',
            'metadatos', 'prioridad', 'configuracion',
            'tenant_id', 'organization',
            'asignado_por', 'asignado_por_nombre',
            'aprobado_por', 'aprobado_por_nombre',
            'fecha_asignacion', 'fecha_aprobacion',
            'fecha_revocacion', 'revocado_por', 'revocado_por_nombre',
            'puede_ser_revocada', 'tiempo_restante'
        ]
        read_only_fields = [
            'id', 'organization', 'tenant_id',
            'fecha_asignacion', 'fecha_aprobacion', 'fecha_revocacion',
            'asignado_por', 'aprobado_por', 'revocado_por',
            'estado'  # El estado se asigna automáticamente en perform_create
        ]
    
    def get_asignado_por_nombre(self, obj):
        if obj.asignado_por:
            return f"{obj.asignado_por.first_name} {obj.asignado_por.last_name}".strip() or obj.asignado_por.username
        return None
    
    def get_aprobado_por_nombre(self, obj):
        if obj.aprobado_por:
            return f"{obj.aprobado_por.first_name} {obj.aprobado_por.last_name}".strip() or obj.aprobado_por.username
        return None
    
    def get_revocado_por_nombre(self, obj):
        if obj.revocado_por:
            return f"{obj.revocado_por.first_name} {obj.revocado_por.last_name}".strip() or obj.revocado_por.username
        return None
    
    def get_puede_ser_revocada(self, obj):
        return obj.puede_ser_revocada()
    
    def get_tiempo_restante(self, obj):
        return obj.get_tiempo_restante()
    
    def validate(self, data):
        """Validaciones"""
        # Validar fechas
        if data.get('fecha_inicio') and data.get('fecha_fin'):
            if data['fecha_inicio'] > data['fecha_fin']:
                raise serializers.ValidationError({
                    'fecha_fin': _("La fecha de fin debe ser posterior a la fecha de inicio")
                })
        
        # Validar que el rol esté activo
        rol = data.get('rol')
        if rol and not rol.activo:
            raise serializers.ValidationError({
                'rol': _("No se puede asignar un rol inactivo")
            })
        
        return data
