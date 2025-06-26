from .models import Notificacion

def notificaciones(request):
    if request.user.is_authenticated:
        return {
            'notificaciones': Notificacion.objects.filter(usuario=request.user, leida=False)
        }
    return {}