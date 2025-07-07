from django.urls import path
from . import views
from . import search_apis

app_name = 'core'

urlpatterns = [
    # Búsqueda básica (legacy)
    path('buscar/', views.buscar, name='buscar'),
    
    # APIs de búsqueda ultra profesional
    path('api/search/', search_apis.search_global, name='search_global'),
    path('api/search/counts/', search_apis.search_counts, name='search_counts'),
    path('api/search/suggestions/', search_apis.search_suggestions, name='search_suggestions'),
    path('api/search/track-click/', search_apis.search_track_click, name='search_track_click'),
    path('api/search/history/', search_apis.search_history, name='search_history'),
    
    # Página de prueba para header sticky
    path('test-sticky/', views.test_sticky, name='test_sticky'),
    
    # Otras APIs
    path('notificaciones/', views.notificaciones, name='notificaciones'),
    path('api/health/', views.health_check, name='health_check'),
    path('health/', views.health_check, name='health_simple'),  # URL alternativa más simple
]