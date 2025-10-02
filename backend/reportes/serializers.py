"""
Serializers del Sistema de Reportes Multi-Módulo
===============================================

Serializers para la API REST del sistema de reportes que permite
generar reportes de cualquier módulo del sistema.

Autor: Sistema CorteSec
"""

from rest_framework import serializers
from django.apps import apps
from django.utils import timezone
from django.contrib.auth import get_user_model
import json

from .models import ModuloReporte, ReporteGenerado, ConfiguracionReporte, LogReporte

User = get_user_model()


class ModuloReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para módulos de reporte
    """
    
    total_reportes = serializers.SerializerMethodField()
    ultimo_reporte = serializers.SerializerMethodField()
    model_disponible = serializers.SerializerMethodField()
    
    class Meta:
        model = ModuloReporte
        fields = [
            'id', 'nombre', 'codigo', 'descripcion', 'app_name', 'model_name',
            'icono', 'color', 'campos_disponibles', 'campos_por_defecto',
            'filtros_disponibles', 'relaciones_disponibles', 'activo', 'orden',
            'requiere_permiso', 'created_at', 'updated_at', 'total_reportes',
            'ultimo_reporte', 'model_disponible'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_reportes', 
                           'ultimo_reporte', 'model_disponible']
    
    def get_total_reportes(self, obj):
        """Número total de reportes generados para este módulo"""
        return obj.reportes_generados.count()
    
    def get_ultimo_reporte(self, obj):
        """Fecha del último reporte generado"""
        ultimo = obj.reportes_generados.order_by('-created_at').first()
        return ultimo.created_at if ultimo else None
    
    def get_model_disponible(self, obj):
        """Verifica si el modelo está disponible"""
        return obj.get_model_class() is not None
    
    def validate(self, data):
        """Validación personalizada"""
        app_name = data.get('app_name')
        model_name = data.get('model_name')
        
        if app_name and model_name:
            try:
                apps.get_model(app_name, model_name)
            except LookupError:
                raise serializers.ValidationError(
                    f"No se encontró el modelo '{model_name}' en la app '{app_name}'"
                )
        
        return data


class ModuloReporteDetalleSerializer(ModuloReporteSerializer):
    """
    Serializer detallado para módulos de reporte
    """
    
    campos_modelo = serializers.SerializerMethodField()
    estadisticas = serializers.SerializerMethodField()
    reportes_recientes = serializers.SerializerMethodField()
    
    class Meta(ModuloReporteSerializer.Meta):
        fields = ModuloReporteSerializer.Meta.fields + [
            'campos_modelo', 'estadisticas', 'reportes_recientes'
        ]
    
    def get_campos_modelo(self, obj):
        """Obtiene información de los campos del modelo"""
        model_class = obj.get_model_class()
        if not model_class:
            return {}
        
        campos = {}
        for field in model_class._meta.get_fields():
            if hasattr(field, 'verbose_name'):
                field_type = type(field).__name__
                
                campos[field.name] = {
                    'label': str(field.verbose_name),
                    'type': field_type,
                    'filtrable': field_type in [
                        'CharField', 'DateField', 'DateTimeField', 
                        'BooleanField', 'IntegerField', 'DecimalField',
                        'ForeignKey'
                    ],
                    'ordenable': True,
                    'required': not field.blank if hasattr(field, 'blank') else False
                }
        
        return campos
    
    def get_estadisticas(self, obj):
        """Estadísticas del módulo"""
        reportes = obj.reportes_generados.all()
        
        return {
            'total_reportes': reportes.count(),
            'reportes_completados': reportes.filter(estado='completado').count(),
            'reportes_error': reportes.filter(estado='error').count(),
            'reportes_mes': reportes.filter(
                created_at__month=timezone.now().month,
                created_at__year=timezone.now().year
            ).count(),
            'total_registros_modelo': obj.get_queryset_base().count() if obj.get_queryset_base() else 0
        }
    
    def get_reportes_recientes(self, obj):
        """Reportes recientes del módulo"""
        reportes = obj.reportes_generados.order_by('-created_at')[:5]
        return ReporteGeneradoListSerializer(reportes, many=True).data


class ReporteGeneradoSerializer(serializers.ModelSerializer):
    """
    Serializer para reportes generados
    """
    
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    modulo_codigo = serializers.CharField(source='modulo.codigo', read_only=True)
    generado_por_nombre = serializers.CharField(source='generado_por.get_full_name', read_only=True)
    formato_display = serializers.CharField(source='get_formato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tamaño_legible = serializers.CharField(read_only=True)
    esta_disponible = serializers.BooleanField(read_only=True)
    download_url = serializers.CharField(source='get_download_url', read_only=True)
    
    class Meta:
        model = ReporteGenerado
        fields = [
            'id', 'titulo', 'descripcion', 'formato', 'formato_display',
            'estado', 'estado_display', 'progreso', 'filtros_aplicados',
            'columnas_seleccionadas', 'ordenamiento', 'fecha_inicio', 'fecha_fin',
            'archivo', 'nombre_archivo', 'tamaño_archivo', 'tamaño_legible',
            'total_registros', 'tiempo_generacion', 'mensaje_error',
            'es_publico', 'fecha_expiracion', 'veces_descargado', 'ultimo_acceso',
            'created_at', 'updated_at', 'modulo_nombre', 'modulo_codigo',
            'generado_por_nombre', 'esta_disponible', 'download_url'
        ]
        read_only_fields = [
            'id', 'estado', 'progreso', 'archivo', 'nombre_archivo', 
            'tamaño_archivo', 'total_registros', 'tiempo_generacion', 
            'mensaje_error', 'veces_descargado', 'ultimo_acceso',
            'created_at', 'updated_at'
        ]


class ReporteGeneradoListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listas de reportes
    """
    
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    generado_por_nombre = serializers.CharField(source='generado_por.get_full_name', read_only=True)
    formato_display = serializers.CharField(source='get_formato_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tamaño_legible = serializers.CharField(read_only=True)
    esta_disponible = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ReporteGenerado
        fields = [
            'id', 'titulo', 'formato', 'formato_display', 'estado', 'estado_display',
            'progreso', 'total_registros', 'tamaño_legible', 'veces_descargado',
            'created_at', 'modulo_nombre', 'generado_por_nombre', 'esta_disponible'
        ]


class ReporteGeneradoCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear reportes
    """
    
    class Meta:
        model = ReporteGenerado
        fields = [
            'modulo', 'titulo', 'descripcion', 'formato', 'filtros_aplicados',
            'columnas_seleccionadas', 'ordenamiento', 'fecha_inicio', 'fecha_fin'
        ]
    
    def validate_modulo(self, value):
        """Validar que el módulo esté activo y disponible"""
        if not value.activo:
            raise serializers.ValidationError("El módulo está inactivo")
        
        if not value.get_model_class():
            raise serializers.ValidationError("El modelo del módulo no está disponible")
        
        return value
    
    def validate_columnas_seleccionadas(self, value):
        """Validar que las columnas existan en el modelo"""
        if not value:
            return value
        
        modulo = self.initial_data.get('modulo')
        if modulo:
            try:
                modulo_obj = ModuloReporte.objects.get(id=modulo)
                model_class = modulo_obj.get_model_class()
                
                if model_class:
                    campos_disponibles = [f.name for f in model_class._meta.get_fields()]
                    for columna in value:
                        if columna not in campos_disponibles:
                            raise serializers.ValidationError(
                                f"El campo '{columna}' no existe en el modelo"
                            )
            except ModuloReporte.DoesNotExist:
                pass
        
        return value
    
    def create(self, validated_data):
        """Crear reporte con usuario actual"""
        validated_data['generado_por'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.profile.organizacion
        return super().create(validated_data)


class ConfiguracionReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para configuraciones de reporte
    """
    
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    created_by_nombre = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ConfiguracionReporte
        fields = [
            'id', 'nombre', 'descripcion', 'filtros', 'columnas', 'ordenamiento',
            'formato_preferido', 'es_publica', 'es_favorita', 'veces_usada',
            'created_at', 'updated_at', 'modulo_nombre', 'created_by_nombre'
        ]
        read_only_fields = ['id', 'veces_usada', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Crear configuración con usuario actual"""
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.profile.organizacion
        return super().create(validated_data)


class LogReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para logs de reportes
    """
    
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    reporte_titulo = serializers.CharField(source='reporte.titulo', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    
    class Meta:
        model = LogReporte
        fields = [
            'id', 'accion', 'accion_display', 'descripcion', 'detalles',
            'ip_address', 'timestamp', 'usuario_nombre', 'modulo_nombre',
            'reporte_titulo'
        ]
        read_only_fields = ['id', 'timestamp']


class EstadisticasReporteSerializer(serializers.Serializer):
    """
    Serializer para estadísticas del sistema de reportes
    """
    
    total_modulos = serializers.IntegerField()
    total_reportes = serializers.IntegerField()
    reportes_hoy = serializers.IntegerField()
    reportes_mes = serializers.IntegerField()
    reportes_completados = serializers.IntegerField()
    reportes_error = serializers.IntegerField()
    reportes_pendientes = serializers.IntegerField()
    
    # Estadísticas por formato
    reportes_por_formato = serializers.DictField()
    
    # Estadísticas por módulo
    reportes_por_modulo = serializers.DictField()
    
    # Actividad reciente
    actividad_reciente = LogReporteSerializer(many=True)
    
    # Reportes más descargados
    reportes_populares = ReporteGeneradoListSerializer(many=True)


class FiltrosDinamicosSerializer(serializers.Serializer):
    """
    Serializer para manejar filtros dinámicos
    """
    
    campo = serializers.CharField()
    operador = serializers.ChoiceField(choices=[
        ('exact', 'Igual'),
        ('icontains', 'Contiene'),
        ('gt', 'Mayor que'),
        ('gte', 'Mayor o igual'),
        ('lt', 'Menor que'),
        ('lte', 'Menor o igual'),
        ('in', 'En lista'),
        ('range', 'Entre'),
        ('isnull', 'Es nulo'),
    ])
    valor = serializers.CharField(required=False, allow_blank=True)
    valores = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    def validate(self, data):
        """Validar que se proporcione el valor correcto según el operador"""
        operador = data.get('operador')
        valor = data.get('valor')
        valores = data.get('valores')
        
        if operador in ['in'] and not valores:
            raise serializers.ValidationError(
                "El operador 'in' requiere una lista de valores"
            )
        
        if operador not in ['in', 'isnull'] and not valor:
            raise serializers.ValidationError(
                f"El operador '{operador}' requiere un valor"
            )
        
        return data


class GenerarReporteRequestSerializer(serializers.Serializer):
    """
    Serializer para solicitudes de generación de reportes
    """
    
    modulo_id = serializers.UUIDField()
    titulo = serializers.CharField(max_length=200)
    descripcion = serializers.CharField(required=False, allow_blank=True)
    formato = serializers.ChoiceField(choices=ReporteGenerado.FORMATO_CHOICES)
    
    # Filtros
    filtros = serializers.DictField(required=False, allow_empty=True)
    
    # Columnas
    columnas = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    # Ordenamiento
    ordenamiento = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    
    # Período
    fecha_inicio = serializers.DateField(required=False, allow_null=True)
    fecha_fin = serializers.DateField(required=False, allow_null=True)
    
    def validate_modulo_id(self, value):
        """Validar que el módulo existe y está activo"""
        try:
            modulo = ModuloReporte.objects.get(
                id=value,
                organizacion=self.context['request'].user.profile.organizacion,
                activo=True
            )
            return value
        except ModuloReporte.DoesNotExist:
            raise serializers.ValidationError("Módulo no encontrado o inactivo")
    
    def validate(self, data):
        """Validación cruzada"""
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError(
                "La fecha de inicio no puede ser mayor que la fecha de fin"
            )
        
        return data


class CamposModeloSerializer(serializers.Serializer):
    """
    Serializer para información de campos de modelo
    """
    
    nombre = serializers.CharField()
    label = serializers.CharField()
    tipo = serializers.CharField()
    filtrable = serializers.BooleanField()
    ordenable = serializers.BooleanField()
    requerido = serializers.BooleanField()
    opciones = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
