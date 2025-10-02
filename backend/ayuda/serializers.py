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
            'archivo', 'tamaño', 'formato', 'fecha_creacion', 'descargas'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'descargas']


class ArticuloAyudaSerializer(serializers.ModelSerializer):
    """Serializer para artículos de ayuda"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    recursos = RecursoAyudaSerializer(many=True, read_only=True)
    rating_promedio = serializers.ReadOnlyField()
    tiempo_lectura = serializers.ReadOnlyField()
    
    class Meta:
        model = ArticuloAyuda
        fields = [
            'id', 'categoria', 'categoria_nombre', 'titulo', 'slug', 'resumen',
            'contenido', 'estado', 'dificultad', 'autor', 'autor_nombre',
            'fecha_creacion', 'fecha_actualizacion', 'fecha_publicacion',
            'visualizaciones', 'valoraciones_positivas', 'valoraciones_negativas',
            'rating_promedio', 'tiempo_lectura', 'tags', 'palabras_clave',
            'meta_descripcion', 'meta_keywords', 'recursos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_creacion', 'fecha_actualizacion', 
            'fecha_publicacion', 'visualizaciones', 'valoraciones_positivas',
            'valoraciones_negativas', 'categoria_nombre', 'autor_nombre',
            'rating_promedio', 'tiempo_lectura', 'recursos'
        ]


class FAQSerializer(serializers.ModelSerializer):
    """Serializer para FAQs"""
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    
    class Meta:
        model = FAQ
        fields = [
            'id', 'organization', 'categoria', 'categoria_display', 'pregunta',
            'respuesta', 'orden', 'activo', 'autor', 'autor_nombre',
            'fecha_creacion', 'fecha_actualizacion', 'visualizaciones',
            'es_util_si', 'es_util_no'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_actualizacion', 'visualizaciones',
            'es_util_si', 'es_util_no', 'categoria_display', 'autor_nombre'
        ]


class RespuestaSoporteSerializer(serializers.ModelSerializer):
    """Serializer para respuestas de soporte"""
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = RespuestaSoporte
        fields = [
            'id', 'solicitud', 'tipo', 'tipo_display', 'contenido',
            'es_solucion', 'es_publica', 'autor', 'autor_nombre',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_actualizacion', 
            'autor_nombre', 'tipo_display'
        ]


class SolicitudSoporteSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de soporte"""
    solicitante_nombre = serializers.CharField(source='solicitante.get_full_name', read_only=True)
    asignado_a_nombre = serializers.CharField(source='asignado_a.get_full_name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    respuestas = RespuestaSoporteSerializer(many=True, read_only=True)
    
    class Meta:
        model = SolicitudSoporte
        fields = [
            'id', 'organization', 'solicitante', 'solicitante_nombre',
            'tipo', 'tipo_display', 'prioridad', 'prioridad_display',
            'estado', 'estado_display', 'asunto', 'descripcion',
            'pasos_reproducir', 'resultado_esperado', 'resultado_actual',
            'navegador', 'sistema_operativo', 'url_problema',
            'asignado_a', 'asignado_a_nombre', 'fecha_creacion',
            'fecha_actualizacion', 'fecha_resolucion', 'valoracion',
            'comentario_valoracion', 'respuestas'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'fecha_actualizacion', 'fecha_resolucion',
            'solicitante_nombre', 'asignado_a_nombre', 'tipo_display',
            'prioridad_display', 'estado_display', 'respuestas'
        ]


class PasoTutorialSerializer(serializers.ModelSerializer):
    """Serializer para pasos de tutorial"""
    
    class Meta:
        model = PasoTutorial
        fields = [
            'id', 'tutorial', 'numero', 'titulo', 'contenido',
            'imagen_url', 'video_url', 'codigo_ejemplo', 'notas'
        ]
        read_only_fields = ['id']


class ProgresoTutorialSerializer(serializers.ModelSerializer):
    """Serializer para progreso de tutorial"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    tutorial_titulo = serializers.CharField(source='tutorial.titulo', read_only=True)
    porcentaje_completado = serializers.ReadOnlyField()
    
    class Meta:
        model = ProgresoTutorial
        fields = [
            'id', 'usuario', 'usuario_nombre', 'tutorial', 'tutorial_titulo',
            'paso_actual', 'completado', 'fecha_inicio', 'fecha_completado',
            'tiempo_total', 'valoracion', 'porcentaje_completado'
        ]
        read_only_fields = [
            'id', 'fecha_inicio', 'usuario_nombre', 'tutorial_titulo',
            'porcentaje_completado'
        ]


class TutorialSerializer(serializers.ModelSerializer):
    """Serializer para tutoriales"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    dificultad_display = serializers.CharField(source='get_dificultad_display', read_only=True)
    pasos = PasoTutorialSerializer(many=True, read_only=True)
    recursos = RecursoAyudaSerializer(many=True, read_only=True)
    total_pasos = serializers.SerializerMethodField()
    
    class Meta:
        model = Tutorial
        fields = [
            'id', 'categoria', 'categoria_nombre', 'titulo', 'slug',
            'descripcion', 'tipo', 'tipo_display', 'dificultad', 'dificultad_display',
            'objetivos', 'prerequisitos', 'duracion_estimada', 'video_url',
            'imagen_portada', 'publicado', 'destacado', 'autor', 'autor_nombre',
            'fecha_creacion', 'fecha_actualizacion', 'visualizaciones',
            'completados', 'valoracion_promedio', 'pasos', 'recursos', 'total_pasos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_creacion', 'fecha_actualizacion',
            'visualizaciones', 'completados', 'valoracion_promedio',
            'categoria_nombre', 'autor_nombre', 'tipo_display',
            'dificultad_display', 'pasos', 'recursos', 'total_pasos'
        ]
    
    def get_total_pasos(self, obj):
        return obj.pasos.count()


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para lista de tutoriales"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    dificultad_display = serializers.CharField(source='get_dificultad_display', read_only=True)
    total_pasos = serializers.SerializerMethodField()
    
    class Meta:
        model = Tutorial
        fields = [
            'id', 'categoria_nombre', 'titulo', 'slug', 'descripcion',
            'tipo', 'tipo_display', 'dificultad', 'dificultad_display',
            'duracion_estimada', 'imagen_portada', 'publicado', 'destacado',
            'autor_nombre', 'fecha_actualizacion', 'visualizaciones',
            'completados', 'valoracion_promedio', 'total_pasos'
        ]
        read_only_fields = [
            'id', 'slug', 'fecha_actualizacion', 'visualizaciones',
            'completados', 'valoracion_promedio', 'categoria_nombre',
            'autor_nombre', 'tipo_display', 'dificultad_display', 'total_pasos'
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
