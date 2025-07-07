from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm

# Perfil del usuario
@login_required
def perfil_usuario(request):
    """Vista principal del perfil de usuario"""
    return render(request, 'perfil/usuario.html')

@login_required
def editar_perfil(request):
    """Editar perfil del usuario"""
    return render(request, 'perfil/editar.html')

# Configuración personal
@login_required
def configuracion_personal(request):
    """Configuración personal del usuario"""
    return render(request, 'perfil/configuracion.html')

@login_required
def configuracion_notificaciones(request):
    """Configuración de notificaciones"""
    return render(request, 'perfil/notificaciones.html')

@login_required
def configuracion_privacidad(request):
    """Configuración de privacidad"""
    return render(request, 'perfil/privacidad.html')

# Seguridad
@login_required
def seguridad_cuenta(request):
    """Vista de seguridad de la cuenta"""
    return render(request, 'perfil/seguridad.html')

@login_required
def cambiar_password(request):
    """Cambiar contraseña"""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, 'Tu contraseña ha sido cambiada exitosamente.')
            return redirect('perfil:seguridad')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'perfil/cambiar_password.html', {'form': form})

@login_required
def configurar_2fa(request):
    """Configurar autenticación de dos factores"""
    return render(request, 'perfil/2fa.html')

# Actividad
@login_required
def actividad_usuario(request):
    """Actividad del usuario"""
    return render(request, 'perfil/actividad.html')

@login_required
def sesiones_activas(request):
    """Sesiones activas del usuario"""
    return render(request, 'perfil/sesiones.html')

# Preferencias
@login_required
def preferencias_usuario(request):
    """Preferencias del usuario"""
    return render(request, 'perfil/preferencias.html')

@login_required
def cambiar_idioma(request):
    """Cambiar idioma del usuario"""
    return render(request, 'perfil/idioma.html')

@login_required
def cambiar_tema(request):
    """Cambiar tema del usuario"""
    return render(request, 'perfil/tema.html')

# Datos personales
@login_required
def datos_personales(request):
    """Datos personales del usuario"""
    return render(request, 'perfil/datos.html')

@login_required
def exportar_datos(request):
    """Exportar datos del usuario"""
    messages.info(request, 'Funcionalidad de exportación en desarrollo')
    return redirect('perfil:datos')

@login_required
def eliminar_cuenta(request):
    """Eliminar cuenta del usuario"""
    return render(request, 'perfil/eliminar_cuenta.html')

# APIs
@login_required
def actualizar_foto_perfil(request):
    """API para actualizar foto de perfil"""
    return JsonResponse({'status': 'info', 'message': 'En desarrollo'})

@login_required
def cambiar_estado_usuario(request):
    """API para cambiar estado del usuario"""
    return JsonResponse({'status': 'info', 'message': 'En desarrollo'})
