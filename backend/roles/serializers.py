"""
Serializers para el Sistema de Roles
====================================

Serializers completos para todas las funcionalidades del sistema de roles.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Rol, AsignacionRol, TipoRol, EstadoAsignacion, PlantillaRol,
    MetaRol, RolCondicional, AuditoriaRol, ConfiguracionRol, HistorialAsignacion
)
# Importar modelo de Permiso
try:
    from permisos.models import Permiso
    from permisos.serializers import PermisoSimpleSerializer
except ImportError:
    # Si no existe el modelo de permisos, crear un serializer simple
    Permiso = None
    class PermisoSimpleSerializer(serializers.Serializer):
        id = serializers.IntegerField(read_only=True)
        nombre = serializers.CharField(read_only=True)
        codigo = serializers.CharField(read_only=True)
        descripcion = serializers.CharField(read_only=True)

User = get_user_model()


# ==================== SERIALIZERS BÁSICOS ====================

class TipoRolSerializer(serializers.ModelSerializer):
    """Serializer para Tipos de Rol"""
    
    class Meta:
        model = TipoRol
        fields = ['id', 'nombre', 'descripcion', 'activo', 'orden', 'fecha_creacion']
        read_only_fields = ['fecha_creacion']


class EstadoAsignacionSerializer(serializers.ModelSerializer):
    """Serializer para Estados de Asignación"""
    
    class Meta:
        model = EstadoAsignacion
        fields = ['id', 'nombre', 'descripcion', 'activo', 'color']


class UsuarioSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para usuarios"""

    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'nombre_completo']
        read_only_fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name']

    def get_nombre_completo(self, obj):
        # Intenta varios formatos para máxima compatibilidad
        if hasattr(obj, 'full_name') and obj.full_name:
            return obj.full_name
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.username or obj.email


# ==================== SERIALIZERS DE ROL ====================

class RolListSerializer(serializers.ModelSerializer):
    """Serializer para lista de roles (optimizado)"""
    
    tipo_rol_nombre = serializers.CharField(source='tipo_rol.nombre', read_only=True)
    rol_padre_nombre = serializers.CharField(source='rol_padre.nombre', read_only=True)
    total_usuarios = serializers.IntegerField(source='asignaciones_activas', read_only=True)
    
    class Meta:
        model = Rol
        fields = [
            'id', 'uuid', 'nombre', 'codigo', 'descripcion', 'activo',
            'nivel_jerarquico', 'prioridad', 'fecha_creacion', 'tipo_rol_nombre',
            'rol_padre_nombre', 'total_usuarios', 'color', 'icono'
        ]
        read_only_fields = ['uuid', 'fecha_creacion']


class RolSerializer(serializers.ModelSerializer):
    """Serializer completo para roles"""
    
    tipo_rol_detalle = TipoRolSerializer(source='tipo_rol', read_only=True)
    rol_padre_detalle = RolListSerializer(source='rol_padre', read_only=True)
    usuarios_asignados = serializers.SerializerMethodField()
    permisos_efectivos = serializers.SerializerMethodField()
    estadisticas = serializers.SerializerMethodField()
    jerarquia_completa = serializers.SerializerMethodField()
    
    class Meta:
        model = Rol
        fields = [
            'id', 'uuid', 'nombre', 'codigo', 'descripcion', 'tipo_rol', 'tipo_rol_detalle',
            'rol_padre', 'rol_padre_detalle', 'nivel_jerarquico', 'hereda_permisos',
            'categoria', 'activo', 'es_sistema', 'es_publico', 'requiere_aprobacion',
            'tiene_restriccion_horario', 'hora_inicio', 'hora_fin', 'dias_semana',
            'fecha_inicio_vigencia', 'fecha_fin_vigencia', 'prioridad', 'peso',
            'color', 'icono', 'metadatos', 'configuracion', 'fecha_creacion',
            'fecha_modificacion', 'total_asignaciones', 'asignaciones_activas',
            'ultima_asignacion', 'usuarios_asignados', 'permisos_efectivos',
            'estadisticas', 'jerarquia_completa'
        ]
        read_only_fields = [
            'uuid', 'nivel_jerarquico', 'fecha_creacion', 'fecha_modificacion',
            'total_asignaciones', 'asignaciones_activas', 'ultima_asignacion'
        ]
    
    def get_usuarios_asignados(self, obj):
        """Obtiene usuarios asignados al rol"""
        asignaciones = obj.asignaciones.filter(activa=True).select_related('usuario')[:10]
        return UsuarioSimpleSerializer([a.usuario for a in asignaciones], many=True).data
    
    def get_permisos_efectivos(self, obj):
        """Obtiene permisos efectivos del rol"""
        try:
            permisos = obj.get_permisos_efectivos()
            return PermisoSimpleSerializer(permisos, many=True).data
        except AttributeError:
            # Si el método no existe en el modelo
            return []
    
    def get_estadisticas(self, obj):
        """Obtiene estadísticas del rol"""
        return {
            'total_asignaciones': obj.total_asignaciones,
            'asignaciones_activas': obj.asignaciones_activas,
            'usuarios_unicos': obj.asignaciones.filter(activa=True).values('usuario').distinct().count(),
            'asignaciones_pendientes': obj.asignaciones.filter(
                estado__nombre='PENDIENTE'
            ).count() if hasattr(obj, 'asignaciones') else 0
        }
    
    def get_jerarquia_completa(self, obj):
        """Obtiene la jerarquía completa del rol"""
        jerarquia = obj.get_jerarquia_completa()
        return RolListSerializer(jerarquia, many=True).data


class RolCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear roles"""
    
    class Meta:
        model = Rol
        fields = [
            'nombre', 'codigo', 'descripcion', 'tipo_rol', 'rol_padre',
            'categoria', 'activo', 'es_publico', 'requiere_aprobacion',
            'tiene_restriccion_horario', 'hora_inicio', 'hora_fin', 'dias_semana',
            'fecha_inicio_vigencia', 'fecha_fin_vigencia', 'prioridad', 'peso',
            'color', 'icono', 'metadatos', 'configuracion'
        ]
    
    def validate_codigo(self, value):
        """Valida que el código sea único"""
        if Rol.objects.filter(codigo=value).exists():
            raise serializers.ValidationError("Este código ya existe")
        return value
    
    def validate(self, data):
        """Validaciones personalizadas"""
        # Validar restricción de horario
        if data.get('tiene_restriccion_horario'):
            if not data.get('hora_inicio') or not data.get('hora_fin'):
                raise serializers.ValidationError(
                    "Debe especificar hora de inicio y fin si tiene restricción de horario"
                )
        
        # Validar vigencia
        if data.get('fecha_inicio_vigencia') and data.get('fecha_fin_vigencia'):
            if data['fecha_inicio_vigencia'] > data['fecha_fin_vigencia']:
                raise serializers.ValidationError(
                    "La fecha de inicio debe ser menor que la fecha de fin"
                )
        
        return data


class RolUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar roles"""
    
    class Meta:
        model = Rol
        fields = [
            'nombre', 'descripcion', 'tipo_rol', 'rol_padre', 'categoria',
            'activo', 'es_publico', 'requiere_aprobacion', 'tiene_restriccion_horario',
            'hora_inicio', 'hora_fin', 'dias_semana', 'fecha_inicio_vigencia',
            'fecha_fin_vigencia', 'prioridad', 'peso', 'color', 'icono',
            'metadatos', 'configuracion'
        ]
    
    def validate_codigo(self, value):
        """Valida que el código sea único (excluyendo el actual)"""
        if Rol.objects.filter(codigo=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("Este código ya existe")
        return value


# ==================== SERIALIZERS DE ASIGNACIÓN ====================

class AsignacionRolSerializer(serializers.ModelSerializer):
    """Serializer para asignaciones de rol"""
    
    usuario_detalle = UsuarioSimpleSerializer(source='usuario', read_only=True)
    rol_detalle = RolListSerializer(source='rol', read_only=True)
    estado_detalle = EstadoAsignacionSerializer(source='estado', read_only=True)
    asignado_por_detalle = UsuarioSimpleSerializer(source='asignado_por', read_only=True)
    aprobado_por_detalle = UsuarioSimpleSerializer(source='aprobado_por', read_only=True)
    tiempo_restante = serializers.SerializerMethodField()
    es_vigente = serializers.SerializerMethodField()
    
    class Meta:
        model = AsignacionRol
        fields = [
            'id', 'usuario', 'usuario_detalle', 'rol', 'rol_detalle',
            'estado', 'estado_detalle', 'activa', 'fecha_inicio', 'fecha_fin',
            'justificacion', 'observaciones', 'prioridad', 'fecha_asignacion',
            'fecha_aprobacion', 'fecha_revocacion', 'asignado_por', 'asignado_por_detalle',
            'aprobado_por', 'aprobado_por_detalle', 'razon_revocacion',
            'tiempo_restante', 'es_vigente'
        ]
        read_only_fields = [
            'fecha_asignacion', 'fecha_aprobacion', 'fecha_revocacion',
            'asignado_por', 'aprobado_por'
        ]
    
    def get_tiempo_restante(self, obj):
        """Obtiene el tiempo restante de la asignación"""
        tiempo = obj.get_tiempo_restante()
        if tiempo:
            return {
                'dias': tiempo.days,
                'segundos': tiempo.seconds,
                'total_segundos': tiempo.total_seconds()
            }
        return None
    
    def get_es_vigente(self, obj):
        """Verifica si la asignación está vigente"""
        return obj.esta_vigente()


class AsignacionRolCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear asignaciones"""
    
    class Meta:
        model = AsignacionRol
        fields = [
            'usuario', 'rol', 'fecha_inicio', 'fecha_fin',
            'justificacion', 'observaciones', 'prioridad'
        ]
    
    def validate_usuario(self, value):
        """Validar que el usuario existe y está activo"""
        import logging
        logger = logging.getLogger(__name__)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        logger.info(f"Validando usuario: {value} (tipo: {type(value)})")
        
        try:
            # Manejar tanto UUIDs como enteros
            if isinstance(value, str):
                # Caso UUID
                user = User.objects.get(id=value, eliminado=False)
                logger.info(f"Usuario encontrado: {user.email} (ID: {value})")
                return value  # Devolver el UUID como string
            elif isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
                # Caso entero (compatibilidad)
                user_id = int(value)
                user = User.objects.get(id=user_id, eliminado=False)
                logger.info(f"Usuario encontrado: {user.email} (ID: {user_id})")
                return user_id
            elif hasattr(value, 'id'):
                # Ya es una instancia de usuario
                if hasattr(value, 'eliminado') and value.eliminado:
                    raise serializers.ValidationError("Usuario inactivo")
                return value.id
        except User.DoesNotExist:
            logger.error(f"Usuario con ID {value} no encontrado o está eliminado")
            raise serializers.ValidationError("Usuario no encontrado o inactivo")
        except ValueError:
            logger.error(f"ID de usuario inválido: {value}")
            raise serializers.ValidationError("ID de usuario inválido")
        
        return value
    
    def create(self, validated_data):
        """Crear la asignación convirtiendo el UUID del usuario en instancia"""
        import logging
        logger = logging.getLogger(__name__)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Obtener el ID del usuario y convertirlo en instancia
        usuario_id = validated_data.get('usuario')
        logger.info(f"Creando asignación - Usuario ID: {usuario_id} (tipo: {type(usuario_id)})")
        
        try:
            # Obtener la instancia del usuario
            usuario_instance = User.objects.get(id=usuario_id, eliminado=False)
            logger.info(f"Instancia de usuario obtenida: {usuario_instance.email}")
            
            # Reemplazar el ID con la instancia
            validated_data['usuario'] = usuario_instance
            
            # Crear la asignación
            logger.info(f"Datos finales para crear asignación: {validated_data}")
            return super().create(validated_data)
            
        except User.DoesNotExist:
            logger.error(f"Usuario con ID {usuario_id} no encontrado al crear asignación")
            raise serializers.ValidationError("Usuario no encontrado")
        except Exception as e:
            logger.error(f"Error al crear asignación: {str(e)}")
            raise
    
    def validate(self, data):
        """Validaciones personalizadas"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Validando datos de asignación: {data}")
        
        # Verificar que el usuario no tenga ya el rol asignado
        usuario_id = data['usuario']
        rol_obj = data['rol']
        
        # Obtener el ID del rol
        rol_id = rol_obj.id if hasattr(rol_obj, 'id') else rol_obj
        
        logger.info(f"Verificando duplicados para usuario {usuario_id} y rol {rol_id}")
        
        # Buscar asignaciones existentes
        asignacion_existente = AsignacionRol.objects.filter(
            usuario_id=usuario_id, 
            rol_id=rol_id, 
            activa=True
        ).exists()
        
        if asignacion_existente:
            logger.warning(f"Usuario {usuario_id} ya tiene el rol {rol_id} asignado")
            raise serializers.ValidationError("El usuario ya tiene este rol asignado")
        
        # Validar fechas
        if data.get('fecha_inicio') and data.get('fecha_fin'):
            if data['fecha_inicio'] >= data['fecha_fin']:
                raise serializers.ValidationError(
                    "La fecha de inicio debe ser menor que la fecha de fin"
                )
        
        logger.info("Validación de datos completada exitosamente")
        return data


# ==================== SERIALIZERS DE AUDITORÍA ====================

class AuditoriaRolSerializer(serializers.ModelSerializer):
    """Serializer para auditoría de roles"""
    
    rol_detalle = RolListSerializer(source='rol', read_only=True)
    usuario_ejecutor_detalle = UsuarioSimpleSerializer(source='usuario_ejecutor', read_only=True)
    usuario_afectado_detalle = UsuarioSimpleSerializer(source='usuario_afectado', read_only=True)
    
    class Meta:
        model = AuditoriaRol
        fields = [
            'id', 'rol', 'rol_detalle', 'usuario_afectado', 'usuario_afectado_detalle',
            'accion', 'usuario_ejecutor', 'usuario_ejecutor_detalle', 'timestamp',
            'ip_address', 'user_agent', 'detalles_anterior', 'detalles_nuevo',
            'contexto_adicional', 'justificacion'
        ]
        read_only_fields = ['timestamp']


# ==================== SERIALIZERS ADICIONALES ====================

class PlantillaRolSerializer(serializers.ModelSerializer):
    """Serializer para plantillas de rol"""
    
    tipo_rol_detalle = TipoRolSerializer(source='tipo_rol', read_only=True)
    creado_por_detalle = UsuarioSimpleSerializer(source='creado_por', read_only=True)
    
    class Meta:
        model = PlantillaRol
        fields = [
            'id', 'nombre', 'descripcion', 'tipo_rol', 'tipo_rol_detalle',
            'configuracion_base', 'permisos_incluidos', 'activa', 'es_sistema',
            'fecha_creacion', 'fecha_modificacion', 'creado_por', 'creado_por_detalle'
        ]
        read_only_fields = ['fecha_creacion', 'fecha_modificacion']


class ConfiguracionRolSerializer(serializers.ModelSerializer):
    """Serializer para configuración de roles"""
    
    class Meta:
        model = ConfiguracionRol
        fields = [
            'id', 'rol', 'configuracion_ui', 'configuracion_seguridad',
            'configuracion_notificaciones', 'configuracion_integraciones',
            'fecha_actualizacion'
        ]
        read_only_fields = ['fecha_actualizacion']


class RolStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de roles"""
    
    total_roles = serializers.IntegerField()
    roles_activos = serializers.IntegerField()
    roles_inactivos = serializers.IntegerField()
    tipos_rol = serializers.IntegerField()
    total_asignaciones = serializers.IntegerField()
    asignaciones_activas = serializers.IntegerField()
    usuarios_con_roles = serializers.IntegerField()
    por_tipo = serializers.ListField()
    por_nivel = serializers.ListField()


# ==================== SERIALIZERS DE VALIDACIÓN ====================

class ValidarCodigoSerializer(serializers.Serializer):
    """Serializer para validar códigos"""
    
    codigo = serializers.CharField(max_length=50)
    
    def validate_codigo(self, value):
        """Valida formato del código"""
        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "El código solo puede contener letras, números, guiones y guiones bajos"
            )
        return value


class AsignacionMasivaSerializer(serializers.Serializer):
    """Serializer para asignación masiva"""
    
    usuarios = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    roles = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    fecha_inicio = serializers.DateTimeField(required=False)
    fecha_fin = serializers.DateTimeField(required=False)
    justificacion = serializers.CharField(max_length=500, required=False)
    
    def validate(self, data):
        """Validaciones para asignación masiva"""
        if data.get('fecha_inicio') and data.get('fecha_fin'):
            if data['fecha_inicio'] >= data['fecha_fin']:
                raise serializers.ValidationError(
                    "La fecha de inicio debe ser menor que la fecha de fin"
                )
        return data


# ==================== SERIALIZERS DE PERMISOS ====================

class RolPermisosSerializer(serializers.ModelSerializer):
    """Serializer para roles con información detallada de permisos"""
    
    permisos_directos = serializers.SerializerMethodField()
    permisos_heredados = serializers.SerializerMethodField()
    permisos_efectivos = serializers.SerializerMethodField()
    permisos_por_modulo = serializers.SerializerMethodField()
    
    class Meta:
        model = Rol
        fields = [
            'id', 'uuid', 'nombre', 'codigo', 'descripcion',
            'permisos_directos', 'permisos_heredados', 
            'permisos_efectivos', 'permisos_por_modulo'
        ]
    
    def get_permisos_directos(self, obj):
        """Obtiene permisos asignados directamente al rol"""
        return PermisoSimpleSerializer(obj.permisos.all(), many=True).data
    
    def get_permisos_heredados(self, obj):
        """Obtiene permisos heredados de roles padre"""
        if not obj.hereda_permisos or not obj.rol_padre:
            return []
        
        permisos_heredados = set()
        rol_actual = obj.rol_padre
        
        while rol_actual:
            permisos_heredados.update(rol_actual.permisos.all())
            if rol_actual.hereda_permisos and rol_actual.rol_padre:
                rol_actual = rol_actual.rol_padre
            else:
                break
                
        return PermisoSimpleSerializer(list(permisos_heredados), many=True).data
    
    def get_permisos_efectivos(self, obj):
        """Obtiene todos los permisos efectivos del rol"""
        try:
            permisos = obj.get_permisos_efectivos()
            return PermisoSimpleSerializer(permisos, many=True).data
        except AttributeError:
            return []
    
    def get_permisos_por_modulo(self, obj):
        """Obtiene permisos organizados por módulo"""
        try:
            return obj.get_permisos_por_modulo()
        except AttributeError:
            return {}


class AsignarPermisosSerializer(serializers.Serializer):
    """Serializer para asignar permisos a un rol"""
    
    permisos_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    reemplazar = serializers.BooleanField(default=False)
    justificacion = serializers.CharField(
        max_length=500, 
        required=False,
        help_text="Justificación para la asignación de permisos"
    )
    
    def validate_permisos_ids(self, value):
        """Valida que los permisos existan"""
        if Permiso:
            permisos_existentes = Permiso.objects.filter(id__in=value).count()
            if permisos_existentes != len(value):
                raise serializers.ValidationError(
                    "Uno o más permisos especificados no existen"
                )
        return value


class RevocarPermisosSerializer(serializers.Serializer):
    """Serializer para revocar permisos de un rol"""
    
    permisos_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    justificacion = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Justificación para la revocación de permisos"
    )
    
    def validate_permisos_ids(self, value):
        """Valida que los permisos existan"""
        if Permiso:
            permisos_existentes = Permiso.objects.filter(id__in=value).count()
            if permisos_existentes != len(value):
                raise serializers.ValidationError(
                    "Uno o más permisos especificados no existen"
                )
        return value


class SincronizarPermisosSerializer(serializers.Serializer):
    """Serializer para sincronizar permisos entre roles"""
    
    rol_origen_id = serializers.IntegerField()
    mantener_existentes = serializers.BooleanField(default=True)
    justificacion = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Justificación para la sincronización de permisos"
    )
    
    def validate_rol_origen_id(self, value):
        """Valida que el rol origen exista"""
        if not Rol.objects.filter(id=value).exists():
            raise serializers.ValidationError("El rol origen especificado no existe")
        return value


class CopiarPermisosSerializer(serializers.Serializer):
    """Serializer para copiar permisos entre roles"""
    
    rol_destino_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    reemplazar = serializers.BooleanField(default=False)
    justificacion = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Justificación para copiar permisos"
    )
    
    def validate_rol_destino_ids(self, value):
        """Valida que los roles destino existan"""
        roles_existentes = Rol.objects.filter(id__in=value).count()
        if roles_existentes != len(value):
            raise serializers.ValidationError(
                "Uno o más roles destino especificados no existen"
            )
        return value


class ComparacionRolesSerializer(serializers.Serializer):
    """Serializer para mostrar comparación entre roles"""
    
    rol_base = RolPermisosSerializer(read_only=True)
    rol_comparacion = RolPermisosSerializer(read_only=True)
    permisos_comunes = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    permisos_solo_base = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    permisos_solo_comparacion = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    estadisticas = serializers.DictField(read_only=True)


class PermisoDisponibleSerializer(serializers.Serializer):
    """Serializer para mostrar permisos disponibles por módulo"""
    
    modulo = serializers.CharField()
    permisos = serializers.ListField(
        child=serializers.DictField()
    )
    total_permisos = serializers.IntegerField()


# ==================== SERIALIZERS MEJORADOS ====================

class RolConPermisosSerializer(RolSerializer):
    """Versión extendida del RolSerializer con información completa de permisos"""
    
    permisos_directos = serializers.SerializerMethodField()
    total_permisos = serializers.SerializerMethodField()
    
    class Meta(RolSerializer.Meta):
        fields = RolSerializer.Meta.fields + ['permisos_directos', 'total_permisos']
    
    def get_permisos_directos(self, obj):
        """Obtiene permisos directos del rol"""
        return PermisoSimpleSerializer(obj.permisos.all(), many=True).data
    
    def get_total_permisos(self, obj):
        """Obtiene el total de permisos efectivos"""
        try:
            return obj.get_permisos_efectivos().count()
        except AttributeError:
            return 0


# ==================== SERIALIZERS DE HISTORIAL ====================

class HistorialAsignacionSerializer(serializers.ModelSerializer):
    """Serializer para historial de asignaciones"""

    usuario_nombre = serializers.CharField(source='asignacion.usuario.full_name', read_only=True, default='')
    usuario_email = serializers.CharField(source='asignacion.usuario.email', read_only=True, default='')
    rol_nombre = serializers.CharField(source='asignacion.rol.nombre', read_only=True, default='')
    usuario_ejecutor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = HistorialAsignacion
        fields = [
            'id', 'asignacion', 'accion', 'usuario_nombre', 'usuario_email',
            'rol_nombre', 'estado_anterior', 'estado_nuevo', 'usuario',
            'usuario_ejecutor_nombre', 'detalles', 'fecha'
        ]
        read_only_fields = ['id', 'fecha']

    def get_usuario_ejecutor_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.full_name or obj.usuario.username or obj.usuario.email
        return 'Sistema'

