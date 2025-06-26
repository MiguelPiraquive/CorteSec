from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import views as auth_views  # <-- Agrega esto

urlpatterns = [
    path('', lambda request: redirect('dashboard:contratista_lista'), name='home'),
    path('admin/', admin.site.urls),
    path('dashboard/', include('dashboard.urls')),
    path('payroll/', include('payroll.urls')),
    path('items/', include('items.urls')),
    path('locations/', include('locations.urls')),
    path('', include('core.urls')),
    path('i18n/', include('django.conf.urls.i18n')),  # Para idiomas

    # --- Password reset sin namespace ---
    path('login/password_reset/', auth_views.PasswordResetView.as_view(template_name='login/password_reset.html'), name='password_reset'),
    path('login/password_reset/done/', auth_views.PasswordResetDoneView.as_view(template_name='login/password_reset_done.html'), name='password_reset_done'),
    path('login/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='login/password_reset_confirm.html'), name='password_reset_confirm'),
    path('login/reset/done/', auth_views.PasswordResetCompleteView.as_view(template_name='login/password_reset_complete.html'), name='password_reset_complete'),

    # --- Incluye tus rutas con namespace al final ---
    path('login/', include('login.urls', namespace='login')),
    
]