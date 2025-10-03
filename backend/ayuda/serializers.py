from rest_framework import serializers
from .models import (
    TipoAyuda, CategoriaAyuda, ArticuloAyuda, FAQ, 
    SolicitudSoporte, RespuestaSoporte, Tutorial, 
    PasoTutorial, ProgresoTutorial, RecursoAyuda
)


class TipoAyudaSerializer(serializers.ModelSerializer):
    """Serializer para tipos de ayuda"""
    
    class Meta:
        model = TipoAyuda
        fields = [
            'id', 'nombre', 'tipo', 'descripcion', 'icono', 
            'color', 'orden', 'activo', 'fecha_creacion'
        ]
        read_only_fields = ['id', 'fecha_creacion']


class CategoriaAyudaSerializer(serializers.ModelSerializer):
    """Serializer para categorías de ayuda"""
    
    class Meta:
        model = CategoriaAyuda
        fields = [
            'id', 'nombre', 'descripcion', 'icono', 'orden', 'activa'
        ]
        read_only_fields = ['id']


class RecursoAyudaSerializer(serializers.ModelSerializer):
    """Serializer para recursos de ayuda"""
    
    class Meta:
        model = RecursoAyuda
        fields = [
            'id', 'tipo', 'nombre', 'descripcion', 'url', 
            'archivo', 'orden', 'activo', 'fecha_creacion'
        ]
        read_only_fields = ['id', 'fecha_creacion']


class ArticuloAyudaSerializer(serializers.ModelSerializer):
    """Serializer para artículos de ayuda"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    recursos = RecursoAyudaSerializer(many=True, read_only=True)
    
    class Meta:
        model = ArticuloAyuda
        fields = [
            'id', 'categoria', 'categoria_nombre', 'titulo', 'slug', 
            'contenido', 'tags', 'es_faq', 'orden', 'publicado', 'activo', 
            'vistas', 'autor', 'autor_nombre', 'fecha_creacion', 
            'fecha_modificacion', 'recursos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_creacion', 'fecha_modificacion',
            'categoria_nombre', 'autor_nombre', 'recursos', 'vistas'
        ]


class FAQSerializer(serializers.ModelSerializer):
    """Serializer para FAQs"""
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    
    class Meta:
        model = FAQ
        fields = [
            'id', 'pregunta', 'respuesta', 'categoria', 'categoria_display', 
            'orden', 'activo', 'vistas', 'util_si', 'util_no', 
            'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_modificacion', 'vistas',
            'util_si', 'util_no', 'categoria_display'
        ]


class RespuestaSoporteSerializer(serializers.ModelSerializer):
    """Serializer para respuestas de soporte"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    
    class Meta:
        model = RespuestaSoporte
        fields = [
            'id', 'solicitud', 'respuesta', 'es_interna', 
            'usuario', 'usuario_nombre', 'fecha_respuesta'
        ]
        read_only_fields = [
            'id', 'fecha_respuesta', 'usuario_nombre'
        ]


class SolicitudSoporteSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de soporte"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    asignado_a_nombre = serializers.CharField(source='asignado_a.get_full_name', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    respuestas = RespuestaSoporteSerializer(many=True, read_only=True)
    
    class Meta:
        model = SolicitudSoporte
        fields = [
            'id', 'usuario', 'usuario_nombre', 'asunto', 'descripcion',
            'prioridad', 'prioridad_display', 'estado', 'estado_display', 
            'categoria', 'asignado_a', 'asignado_a_nombre', 
            'fecha_creacion', 'fecha_modificacion', 'respuestas'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_modificacion',
            'usuario_nombre', 'asignado_a_nombre', 
            'prioridad_display', 'estado_display', 'respuestas'
        ]


class PasoTutorialSerializer(serializers.ModelSerializer):
    """Serializer para pasos de tutorial"""
    
    class Meta:
        model = PasoTutorial
        fields = [
            'id', 'tutorial', 'numero_paso', 'titulo', 'contenido',
            'imagen', 'video_url', 'codigo_ejemplo'
        ]
        read_only_fields = ['id']


class ProgresoTutorialSerializer(serializers.ModelSerializer):
    """Serializer para progreso de tutorial"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    tutorial_titulo = serializers.CharField(source='tutorial.titulo', read_only=True)
    
    class Meta:
        model = ProgresoTutorial
        fields = [
            'id', 'usuario', 'usuario_nombre', 'tutorial', 'tutorial_titulo',
            'paso_actual', 'completado', 'fecha_inicio', 'fecha_completado',
            'tiempo_total'
        ]
        read_only_fields = [
            'id', 'fecha_inicio', 'usuario_nombre', 'tutorial_titulo'
        ]


class TutorialSerializer(serializers.ModelSerializer):
    """Serializer para tutoriales"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    dificultad_display = serializers.CharField(source='get_dificultad_display', read_only=True)
    pasos = PasoTutorialSerializer(many=True, read_only=True)
    recursos = RecursoAyudaSerializer(many=True, read_only=True)
    total_pasos = serializers.SerializerMethodField()
    
    class Meta:
        model = Tutorial
        fields = [
            'id', 'titulo', 'descripcion', 'slug', 'categoria', 'categoria_nombre',
            'dificultad', 'dificultad_display', 'tiempo_estimado', 'imagen_portada',
            'tags', 'publicado', 'destacado', 'vistas', 'autor', 'autor_nombre',
            'fecha_creacion', 'fecha_modificacion', 'pasos', 'recursos', 'total_pasos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_creacion', 'fecha_modificacion', 'vistas',
            'categoria_nombre', 'autor_nombre', 'dificultad_display',
            'pasos', 'recursos', 'total_pasos'
        ]
    
    def get_total_pasos(self, obj):
        return obj.pasos.count()


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para lista de tutoriales"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    dificultad_display = serializers.CharField(source='get_dificultad_display', read_only=True)
    total_pasos = serializers.SerializerMethodField()
    
    class Meta:
        model = Tutorial
        fields = [
            'id', 'categoria_nombre', 'titulo', 'slug', 'descripcion',
            'dificultad', 'dificultad_display', 'tiempo_estimado', 
            'imagen_portada', 'publicado', 'destacado', 'autor_nombre', 
            'fecha_modificacion', 'vistas', 'total_pasos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_modificacion', 'vistas',
            'categoria_nombre', 'autor_nombre', 'dificultad_display', 'total_pasos'
        ]
    
    def get_total_pasos(self, obj):
        return obj.pasos.count()


# === SERIALIZERS PARA ESTADÍSTICAS ===

class EstadisticasAyudaSerializer(serializers.Serializer):
    """Serializer para estadísticas del centro de ayuda"""
    articulos = serializers.DictField()
    faqs = serializers.DictField()
    soporte = serializers.DictField()
    tutoriales = serializers.DictField()


class BusquedaRapidaSerializer(serializers.Serializer):
    """Serializer para resultados de búsqueda rápida"""
    tipo = serializers.CharField()
    titulo = serializers.CharField()
    url = serializers.CharField()
    descripcion = serializers.CharField()


class ResultadoBusquedaSerializer(serializers.Serializer):
    """Serializer para resultados de búsqueda completa"""
    results = BusquedaRapidaSerializer(many=True)
    total = serializers.IntegerField()
    query = serializers.CharField()


# === SERIALIZERS PARA INFORMES ===

class InformeSoporteSerializer(serializers.Serializer):
    """Serializer para informes de soporte"""
    periodo = serializers.CharField()
    total_solicitudes = serializers.IntegerField()
    nuevas = serializers.IntegerField()
    en_proceso = serializers.IntegerField()
    resueltas = serializers.IntegerField()
    cerradas = serializers.IntegerField()
    tiempo_promedio_resolucion = serializers.FloatField()
    satisfaccion_promedio = serializers.FloatField()
    por_tipo = serializers.ListField()
    por_prioridad = serializers.ListField()


class InformeContenidoSerializer(serializers.Serializer):
    """Serializer para informes de contenido"""
    articulos_mas_vistos = ArticuloAyudaSerializer(many=True)
    faqs_mas_utiles = FAQSerializer(many=True)
    tutoriales_mas_populares = TutorialListSerializer(many=True)
    contenido_nuevo = serializers.DictField()
    engagement = serializers.DictField()


# === SERIALIZERS PARA WIDGETS ===

class WidgetAyudaSerializer(serializers.Serializer):
    """Serializer para widget de ayuda"""
    articulos_destacados = ArticuloAyudaSerializer(many=True)
    faqs_populares = FAQSerializer(many=True)
    tutoriales_recomendados = TutorialListSerializer(many=True)
    solicitudes_pendientes = serializers.IntegerField()
    tips_del_dia = serializers.ListField()


class NotificacionAyudaSerializer(serializers.Serializer):
    """Serializer para notificaciones de ayuda"""
    tipo = serializers.CharField()
    titulo = serializers.CharField()
    mensaje = serializers.CharField()
    url = serializers.CharField()
    fecha = serializers.DateTimeField()
    leida = serializers.BooleanField()
    icono = serializers.CharField()
    color = serializers.CharField()
