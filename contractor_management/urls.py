from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', lambda request: redirect('dashboard:principal'), name='home'),
    path('admin/', admin.site.urls),
    path('dashboard/', include('dashboard.urls')),
    path('payroll/', include('payroll.urls')),
    path('items/', include('items.urls')),
    path('locations/', include('locations.urls')),
    path('tipos-cantidad/', include('tipos_cantidad.urls')),
    path('roles/', include('roles.urls')),
    path('prestamos/', include('prestamos.urls')),
    path('permisos/', include('permisos.urls')),
    path('cargos/', include('cargos.urls')),
    path('contabilidad/', include('contabilidad.urls')),
    path('configuracion/', include('configuracion.urls')),  # App de configuración
    path('reportes/', include('reportes.urls')),  # App de reportes
    path('perfil/', include('perfil.urls')),  # App de perfil de usuario
    path('ayuda/', include('ayuda.urls')),  # App de ayuda y documentación
    path('documentacion/', include('documentacion.urls')),  # App de documentación
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

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)