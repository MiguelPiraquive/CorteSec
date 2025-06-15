from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('', lambda request: redirect('dashboard:contratista_lista'), name='home'),
    path('admin/', admin.site.urls),
    path('dashboard/', include('dashboard.urls')),
    path('payroll/', include('payroll.urls')),
    path('items/', include('items.urls')),
    path('locations/', include('locations.urls')),
]