from django.urls import path
from . import views

app_name = 'tipos_cantidad'

urlpatterns = [
    path('', views.lista_tipos_cantidad, name='lista'),
    path('crear/', views.crear_tipo_cantidad, name='crear'),
    path('<int:pk>/', views.detalle_tipo_cantidad, name='detalle'),
    path('<int:pk>/editar/', views.editar_tipo_cantidad, name='editar'),
    path('<int:pk>/eliminar/', views.eliminar_tipo_cantidad, name='eliminar'),
    path('<int:pk>/toggle-activo/', views.toggle_activo, name='toggle_activo'),
    path('api/', views.api_tipos_cantidad, name='api'),
]
