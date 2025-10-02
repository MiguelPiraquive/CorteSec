"""
Serializers del Sistema de Permisos Avanzado
============================================

Serializers para la API REST del sistema de permisos.
Incluye serializers específicos para diferentes casos de uso.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.utils import timezone

from .models import (
    ModuloSistema, TipoPermiso, CondicionPermiso, Permiso, 
    PermisoDirecto, AuditoriaPermisos, PermisoI18N, ConfiguracionEntorno
)

User = get_user_model()


# ==================== SERIALIZERS BÁSICOS ====================

class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para usuarios"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active']
        read_only_fields = ['id', 'username']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class ContentTypeSerializer(serializers.ModelSerializer):
    """Serializer para tipos de contenido"""
    
    class Meta:
        model = ContentType
        fields = ['id', 'app_label', 'model']


# ==================== SERIALIZERS DE MÓDULOS ====================

class ModuloSistemaSerializer(serializers.ModelSerializer):
    """Serializer completo para módulos del sistema"""
    
    ruta_completa = serializers.ReadOnlyField(source='get_ruta_completa')
    hijos = serializers.SerializerMethodField()
    permisos_count = serializers.SerializerMethodField()
    padre_nombre = serializers.CharField(source='padre.nombre', read_only=True)
    
    class Meta:
        model = ModuloSistema
        fields = [
            'id', 'nombre', 'codigo', 'descripcion', 'version', 'icono', 'color',
            'orden', 'url_base', 'padre', 'padre_nombre', 'nivel', 'activo', 
            'es_sistema', 'requiere_licencia', 'configuracion_avanzada',
            'ruta_completa', 'hijos', 'permisos_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'nivel', 'created_at', 'updated_at']
    
    def get_hijos(self, obj):
        """Obtiene los módulos hijos"""
        hijos = obj.get_hijos_activos()
        return ModuloSistemaBasicSerializer(hijos, many=True).data
    
    def get_permisos_count(self, obj):
        """Cuenta los permisos del módulo"""
        return obj.permisos.filter(activo=True).count()


class ModuloSistemaBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para módulos (sin relaciones)"""
    
    class Meta:
        model = ModuloSistema
        fields = ['id', 'nombre', 'codigo', 'icono', 'color', 'nivel', 'activo']


class ModuloSistemaTreeSerializer(serializers.ModelSerializer):
    """Serializer para árbol jerárquico de módulos"""
    
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = ModuloSistema
        fields = ['id', 'nombre', 'codigo', 'icono', 'color', 'nivel', 'children']
    
    def get_children(self, obj):
        """Obtiene los hijos recursivamente"""
        children = obj.hijos.filter(activo=True).order_by('orden', 'nombre')
        return ModuloSistemaTreeSerializer(children, many=True).data


# ==================== SERIALIZERS DE TIPOS DE PERMISO ====================

class TipoPermisoSerializer(serializers.ModelSerializer):
    """Serializer para tipos de permiso"""
    
    permisos_count = serializers.SerializerMethodField()
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    
    class Meta:
        model = TipoPermiso
        fields = [
            'id', 'nombre', 'codigo', 'descripcion', 'categoria', 'categoria_display',
            'icono', 'color', 'es_critico', 'requiere_auditoria', 'activo',
            'permisos_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permisos_count(self, obj):
        """Cuenta los permisos de este tipo"""
        return obj.permisos.filter(activo=True).count()


class TipoPermisoBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para tipos de permiso"""
    
    class Meta:
        model = TipoPermiso
        fields = ['id', 'nombre', 'codigo', 'categoria', 'icono', 'color']


# ==================== SERIALIZERS DE CONDICIONES ====================

class CondicionPermisoSerializer(serializers.ModelSerializer):
    """Serializer para condiciones de permiso"""
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    permisos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CondicionPermiso
        fields = [
            'id', 'nombre', 'codigo', 'tipo', 'tipo_display', 'descripcion',
            'configuracion', 'codigo_evaluacion', 'cacheable', 'tiempo_cache',
            'activa', 'permisos_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permisos_count(self, obj):
        """Cuenta los permisos que usan esta condición"""
        return obj.permisos.filter(activo=True).count()


class CondicionPermisoBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para condiciones"""
    
    class Meta:
        model = CondicionPermiso
        fields = ['id', 'nombre', 'codigo', 'tipo', 'activa']


class CondicionPermisoEvaluationSerializer(serializers.Serializer):
    """Serializer para evaluar condiciones"""
    
    usuario_id = serializers.IntegerField()
    contexto = serializers.JSONField(required=False, allow_null=True)
    
    def validate_usuario_id(self, value):
        """Valida que el usuario exista"""
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")


# ==================== SERIALIZERS DE PERMISOS ====================

class PermisoSerializer(serializers.ModelSerializer):
    """Serializer completo para permisos"""
    
    modulo_info = ModuloSistemaBasicSerializer(source='modulo', read_only=True)
    tipo_permiso_info = TipoPermisoBasicSerializer(source='tipo_permiso', read_only=True)
    condiciones_info = CondicionPermisoBasicSerializer(source='condiciones', many=True, read_only=True)
    content_type_info = ContentTypeSerializer(source='content_type', read_only=True)
    
    ambito_display = serializers.CharField(source='get_ambito_display', read_only=True)
    esta_vigente = serializers.ReadOnlyField(source='esta_vigente')
    organizacion_nombre = serializers.CharField(source='organizacion.nombre', read_only=True)
    
    class Meta:
        model = Permiso
        fields = [
            'id', 'nombre', 'codigo', 'descripcion', 'modulo', 'modulo_info',
            'tipo_permiso', 'tipo_permiso_info', 'organizacion', 'organizacion_nombre',
            'ambito', 'ambito_display', 'content_type', 'content_type_info',
            'object_id', 'condiciones', 'condiciones_info', 'es_heredable',
            'es_revocable', 'prioridad', 'vigencia_inicio', 'vigencia_fin',
            'activo', 'es_sistema', 'esta_vigente', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validaciones personalizadas"""
        if data.get('vigencia_inicio') and data.get('vigencia_fin'):
            if data['vigencia_inicio'] >= data['vigencia_fin']:
                raise serializers.ValidationError({
                    'vigencia_fin': 'La fecha de fin debe ser posterior a la fecha de inicio'
                })
        return data


class PermisoBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para permisos"""
    
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    tipo_nombre = serializers.CharField(source='tipo_permiso.nombre', read_only=True)
    
    class Meta:
        model = Permiso
        fields = [
            'id', 'nombre', 'codigo', 'modulo_nombre', 'tipo_nombre', 'activo'
        ]


class PermisoCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar permisos"""
    
    class Meta:
        model = Permiso
        fields = [
            'nombre', 'codigo', 'descripcion', 'modulo', 'tipo_permiso',
            'organizacion', 'ambito', 'content_type', 'object_id', 'condiciones',
            'es_heredable', 'es_revocable', 'prioridad', 'vigencia_inicio',
            'vigencia_fin', 'activo'
        ]
    
    def validate_codigo(self, value):
        """Valida que el código sea único"""
        instance = getattr(self, 'instance', None)
        if instance and instance.codigo == value:
            return value
        
        if Permiso.objects.filter(codigo=value).exists():
            raise serializers.ValidationError("Ya existe un permiso con este código")
        
        return value


class PermisoEvaluationSerializer(serializers.Serializer):
    """Serializer para evaluación de permisos"""
    
    usuario_id = serializers.IntegerField()
    accion = serializers.CharField(max_length=50, required=False)
    recurso = serializers.JSONField(required=False, allow_null=True)
    contexto = serializers.JSONField(required=False, allow_null=True)
    
    def validate_usuario_id(self, value):
        """Valida que el usuario exista"""
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")


# ==================== SERIALIZERS DE PERMISOS DIRECTOS ====================

class PermisoDirectoSerializer(serializers.ModelSerializer):
    """Serializer para permisos directos"""
    
    usuario_info = UserBasicSerializer(source='usuario', read_only=True)
    permiso_info = PermisoBasicSerializer(source='permiso', read_only=True)
    asignado_por_info = UserBasicSerializer(source='asignado_por', read_only=True)
    
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    esta_vigente = serializers.ReadOnlyField(source='esta_vigente')
    es_efectivo = serializers.ReadOnlyField(source='es_efectivo')
    
    class Meta:
        model = PermisoDirecto
        fields = [
            'id', 'usuario', 'usuario_info', 'permiso', 'permiso_info',
            'tipo', 'tipo_display', 'fecha_inicio', 'fecha_fin',
            'asignado_por', 'asignado_por_info', 'motivo', 'activo',
            'esta_vigente', 'es_efectivo', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validaciones personalizadas"""
        if data.get('fecha_fin') and data.get('fecha_inicio'):
            if data['fecha_fin'] <= data['fecha_inicio']:
                raise serializers.ValidationError({
                    'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio'
                })
        return data


class PermisoDirectoCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear permisos directos"""
    
    class Meta:
        model = PermisoDirecto
        fields = [
            'usuario', 'permiso', 'tipo', 'fecha_inicio', 'fecha_fin',
            'asignado_por', 'motivo', 'activo'
        ]
    
    def validate(self, data):
        """Validaciones para creación"""
        # Verificar duplicados
        if PermisoDirecto.objects.filter(
            usuario=data['usuario'], 
            permiso=data['permiso'],
            activo=True
        ).exists():
            raise serializers.ValidationError(
                "Ya existe un permiso directo activo para este usuario y permiso"
            )
        
        return super().validate(data)


# ==================== SERIALIZERS DE AUDITORÍA ====================

class AuditoriaPermisosSerializer(serializers.ModelSerializer):
    """Serializer para auditoría de permisos"""
    
    usuario_info = UserBasicSerializer(source='usuario', read_only=True)
    permiso_info = PermisoBasicSerializer(source='permiso', read_only=True)
    
    class Meta:
        model = AuditoriaPermisos
        fields = [
            'id', 'accion', 'permiso', 'permiso_info', 'usuario', 'usuario_info',
            'fecha', 'detalles'
        ]
        read_only_fields = ['id', 'fecha']


# ==================== SERIALIZERS DE INTERNACIONALIZACIÓN ====================

class PermisoI18NSerializer(serializers.ModelSerializer):
    """Serializer para traducciones de permisos"""
    
    class Meta:
        model = PermisoI18N
        fields = ['id', 'permiso', 'idioma', 'nombre', 'descripcion']


class ConfiguracionEntornoSerializer(serializers.ModelSerializer):
    """Serializer para configuraciones por entorno"""
    
    permiso_info = PermisoBasicSerializer(source='permiso', read_only=True)
    
    class Meta:
        model = ConfiguracionEntorno
        fields = ['id', 'entorno', 'permiso', 'permiso_info', 'configuracion']


# ==================== SERIALIZERS DE ESTADÍSTICAS ====================

class EstadisticasPermisosSerializer(serializers.Serializer):
    """Serializer para estadísticas del sistema de permisos"""
    
    total_usuarios = serializers.IntegerField()
    total_permisos = serializers.IntegerField()
    permisos_activos = serializers.IntegerField()
    tipos_permiso = serializers.IntegerField()
    organizaciones = serializers.IntegerField()
    modulos = serializers.IntegerField()
    condiciones = serializers.IntegerField()
    permisos_directos = serializers.IntegerField()
    
    # Estadísticas por categoría
    permisos_por_tipo = serializers.DictField()
    permisos_por_modulo = serializers.DictField()
    usuarios_con_permisos_directos = serializers.IntegerField()


class UsuarioPermisosSerializer(serializers.Serializer):
    """Serializer para permisos de un usuario específico"""
    
    usuario = UserBasicSerializer()
    permisos_directos = PermisoDirectoSerializer(many=True)
    total_permisos = serializers.IntegerField()
    permisos_vigentes = serializers.IntegerField()
    ultimo_acceso = serializers.DateTimeField(allow_null=True)


# ==================== SERIALIZERS DE VERIFICACIÓN ====================

class VerificacionPermisoSerializer(serializers.Serializer):
    """Serializer para verificar permisos de usuario"""
    
    usuario_id = serializers.IntegerField()
    codigo_permiso = serializers.CharField(max_length=100)
    contexto = serializers.JSONField(required=False, allow_null=True)
    
    def validate_usuario_id(self, value):
        """Valida que el usuario exista"""
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")
    
    def validate_codigo_permiso(self, value):
        """Valida que el permiso exista"""
        try:
            Permiso.objects.get(codigo=value, activo=True)
            return value
        except Permiso.DoesNotExist:
            raise serializers.ValidationError("Permiso no encontrado o inactivo")


class ResultadoVerificacionSerializer(serializers.Serializer):
    """Serializer para resultado de verificación"""
    
    tiene_permiso = serializers.BooleanField()
    motivo = serializers.CharField(max_length=200)
    permiso_info = PermisoBasicSerializer(allow_null=True)
    evaluado_en = serializers.DateTimeField()
    cache_usado = serializers.BooleanField()


# ==================== SERIALIZERS DE CACHÉ ====================

class CacheLimpiezaSerializer(serializers.Serializer):
    """Serializer para limpiar caché"""
    
    usuario_id = serializers.IntegerField(required=False, allow_null=True)
    tipo = serializers.ChoiceField(
        choices=[
            ('all', 'Todo el caché'),
            ('user', 'Caché de usuario específico'),
            ('permissions', 'Solo permisos'),
            ('conditions', 'Solo condiciones')
        ],
        default='all'
    )
    
    def validate_usuario_id(self, value):
        """Valida usuario si se especifica"""
        if value:
            try:
                User.objects.get(id=value)
                return value
            except User.DoesNotExist:
                raise serializers.ValidationError("Usuario no encontrado")
        return value
