from django.urls import path
from . import views

app_name = 'ayuda'

urlpatterns = [
    # Centro de ayuda principal
    path('', views.centro_ayuda, name='centro'),
    
    # Categorías de ayuda
    path('categoria/<str:categoria>/', views.ayuda_categoria, name='categoria'),
    
    # Artículos específicos
    path('articulo/<int:articulo_id>/', views.articulo_ayuda, name='articulo'),
    
    # FAQ
    path('faq/', views.preguntas_frecuentes, name='faq'),
    path('faq/categoria/<str:categoria>/', views.faq_categoria, name='faq_categoria'),
    
    # Tutoriales
    path('tutoriales/', views.tutoriales, name='tutoriales'),
    path('tutorial/<int:tutorial_id>/', views.tutorial_detalle, name='tutorial_detalle'),
    
    # Videos de ayuda
    path('videos/', views.videos_ayuda, name='videos'),
    path('video/<int:video_id>/', views.video_detalle, name='video_detalle'),
    
    # Búsqueda
    path('buscar/', views.buscar_ayuda, name='buscar'),
    
    # Contacto y soporte
    path('contacto/', views.contacto_soporte, name='contacto'),
    path('ticket/', views.crear_ticket, name='crear_ticket'),
    path('tickets/', views.mis_tickets, name='mis_tickets'),
    path('ticket/<int:ticket_id>/', views.ticket_detalle, name='ticket_detalle'),
    
    # Feedback
    path('feedback/', views.enviar_feedback, name='feedback'),
    path('valorar/<int:articulo_id>/', views.valorar_articulo, name='valorar_articulo'),
    
    # APIs
    path('api/buscar/', views.api_buscar_ayuda, name='api_buscar'),
    path('api/sugerencias/', views.api_sugerencias, name='api_sugerencias'),
]
