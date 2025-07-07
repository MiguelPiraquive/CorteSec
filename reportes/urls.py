from django.urls import path
from . import views

app_name = 'reportes'

urlpatterns = [
    # Dashboard de reportes
    path('', views.lista_reportes, name='dashboard'),
    
    # Reportes Excel
    path('empleados/excel/', views.reporte_empleados_excel, name='empleados_excel'),
    
    # Reportes PDF
    path('empleados/pdf/', views.reporte_empleados_pdf, name='empleados_pdf'),
    
    # API para reportes
    path('api/generar/', views.api_generar_reporte, name='api_generar'),
]
