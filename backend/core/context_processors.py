from django.conf import settings


def empresa_context(request):
    """Context processor para datos de la empresa"""
    return {
        'EMPRESA_NOMBRE': getattr(settings, 'EMPRESA_NOMBRE', 'CorteSec'),
        'EMPRESA_VERSION': getattr(settings, 'EMPRESA_VERSION', '1.0.0'),
        'EMPRESA_LOGO': getattr(settings, 'EMPRESA_LOGO', '/static/img/logo.png'),
    }


def notificaciones_context(request):
    """Context processor para notificaciones del usuario"""
    if request.user.is_authenticated:
        from core.models import Notificacion
        notificaciones_no_leidas = Notificacion.objects.filter(
            usuario=request.user,
            leida=False
        ).count()
        return {
            'notificaciones_no_leidas': notificaciones_no_leidas
        }
    return {}


def sistema_context(request):
    """Context processor para información del sistema"""
    return {
        'SISTEMA_MANTENIMIENTO': getattr(settings, 'SISTEMA_MANTENIMIENTO', False),
        'SISTEMA_DEBUG': getattr(settings, 'DEBUG', False),
    }
