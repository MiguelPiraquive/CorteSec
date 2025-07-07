from django.urls import path
from . import views

app_name = 'roles'

urlpatterns = [
    # Vistas principales
    path('', views.lista_roles, name='lista'),
    path('crear/', views.crear_rol, name='crear'),
    path('<int:pk>/', views.detalle_rol, name='detalle'),
    path('<int:pk>/editar/', views.editar_rol, name='editar'),
    path('<int:pk>/eliminar/', views.eliminar_rol, name='eliminar'),
    path('<int:pk>/toggle-activo/', views.toggle_activo_rol, name='toggle_activo'),
    
    # APIs
    path('api/', views.api_roles, name='api'),
]
