from django.urls import path
from . import views

app_name = 'documentacion'

urlpatterns = [
    # Documentación principal
    path('', views.documentacion_index, name='index'),
    
    # Manual de usuario
    path('manual/', views.manual_usuario, name='manual'),
    path('manual/<str:seccion>/', views.manual_seccion, name='manual_seccion'),
    
    # Documentación técnica
    path('tecnica/', views.documentacion_tecnica, name='tecnica'),
    path('tecnica/api/', views.documentacion_api, name='api'),
    path('tecnica/base-datos/', views.documentacion_bd, name='base_datos'),
    
    # Guías de instalación
    path('instalacion/', views.guias_instalacion, name='instalacion'),
    path('instalacion/<str:tipo>/', views.guia_instalacion_detalle, name='instalacion_detalle'),
    
    # Changelog y versiones
    path('changelog/', views.changelog, name='changelog'),
    path('version/<str:version>/', views.version_detalle, name='version_detalle'),
    
    # Políticas y términos
    path('politicas/', views.politicas, name='politicas'),
    path('politicas/privacidad/', views.politica_privacidad, name='privacidad'),
    path('politicas/terminos/', views.terminos_uso, name='terminos'),
    
    # Documentos descargables
    path('descargas/', views.documentos_descarga, name='descargas'),
    path('descargar/<int:documento_id>/', views.descargar_documento, name='descargar'),
    
    # Glosario
    path('glosario/', views.glosario, name='glosario'),
    path('glosario/<str:letra>/', views.glosario_letra, name='glosario_letra'),
    
    # APIs para documentación
    path('api/contenido/<str:tipo>/', views.api_contenido, name='api_contenido'),
    path('api/buscar/', views.api_buscar_documentacion, name='api_buscar'),
]
