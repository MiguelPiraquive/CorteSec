from django.urls import path, include

app_name = 'configuracion'

urlpatterns = [
    # API routes (para React frontend)
    path('api/', include('configuracion.api_urls')),
]