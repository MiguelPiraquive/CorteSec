from django.urls import path
from . import views

app_name = 'prestamos'

urlpatterns = [
    # Vistas principales
    path('', views.lista_prestamos, name='lista'),
    path('crear/', views.crear_prestamo, name='crear'),
    path('<int:pk>/', views.detalle_prestamo, name='detalle'),
    path('<int:pk>/editar/', views.editar_prestamo, name='editar'),
    path('<int:pk>/eliminar/', views.eliminar_prestamo, name='eliminar'),
    
    # Acciones de préstamos
    path('<int:pk>/aprobar/', views.aprobar_prestamo, name='aprobar'),
    path('<int:pk>/rechazar/', views.rechazar_prestamo, name='rechazar'),
    path('<int:pk>/desembolsar/', views.desembolsar_prestamo, name='desembolsar'),
    
    # Gestión de cuotas
    path('<int:prestamo_pk>/cuota/<int:cuota_pk>/pagar/', views.pagar_cuota, name='pagar_cuota'),
    
    # APIs
    path('api/', views.api_prestamos, name='api'),
]
