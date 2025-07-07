from django.urls import path
from . import views

app_name = 'perfil'

urlpatterns = [
    # Perfil del usuario
    path('', views.perfil_usuario, name='usuario'),
    path('editar/', views.editar_perfil, name='editar'),
    
    # Configuración personal
    path('configuracion/', views.configuracion_personal, name='configuracion'),
    path('configuracion/notificaciones/', views.configuracion_notificaciones, name='notificaciones'),
    path('configuracion/privacidad/', views.configuracion_privacidad, name='privacidad'),
    
    # Seguridad
    path('seguridad/', views.seguridad_cuenta, name='seguridad'),
    path('seguridad/cambiar-password/', views.cambiar_password, name='cambiar_password'),
    path('seguridad/2fa/', views.configurar_2fa, name='configurar_2fa'),
    
    # Actividad
    path('actividad/', views.actividad_usuario, name='actividad'),
    path('actividad/sesiones/', views.sesiones_activas, name='sesiones'),
    
    # Preferencias
    path('preferencias/', views.preferencias_usuario, name='preferencias'),
    path('preferencias/idioma/', views.cambiar_idioma, name='cambiar_idioma'),
    path('preferencias/tema/', views.cambiar_tema, name='cambiar_tema'),
    
    # Datos personales
    path('datos/', views.datos_personales, name='datos'),
    path('datos/exportar/', views.exportar_datos, name='exportar_datos'),
    path('datos/eliminar/', views.eliminar_cuenta, name='eliminar_cuenta'),
    
    # APIs
    path('api/foto/', views.actualizar_foto_perfil, name='api_foto'),
    path('api/estado/', views.cambiar_estado_usuario, name='api_estado'),
]
