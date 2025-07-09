from django.shortcuts import render
from django.db.models import Q
from .models import Notificacion
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.conf import settings
from django.conf import settings

def buscar(request):
    q = request.GET.get('q', '').strip()
    resultados = []
    if q:
        usuarios = User.objects.filter(Q(username__icontains=q) | Q(email__icontains=q))
        notificaciones = Notificacion.objects.filter(mensaje__icontains=q)
        resultados = {
            'usuarios': usuarios,
            'notificaciones': notificaciones,
        }
    return render(request, 'core/buscar_resultados.html', {'query': q, 'resultados': resultados})


@login_required
def notificaciones(request):
    """
    Vista para mostrar las notificaciones del usuario
    """
    # Obtener notificaciones del usuario actual
    notificaciones = Notificacion.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion')[:20]  # Últimas 20 notificaciones
    
    context = {
        'notificaciones': notificaciones,
        'title': 'Notificaciones'
    }
    
    return render(request, 'core/notificaciones.html', context)

@csrf_exempt
@require_http_methods(["HEAD", "GET"])
def health_check(request):
    """
    Vista simple para verificar el estado del servidor
    Responde con 200 OK si el servidor está funcionando
    """
    if request.method == 'HEAD':
        return HttpResponse(status=200)
    
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0'
    })

@login_required
def system_check(request):
    """
    Vista para verificar el estado visual del sistema
    """
    context = {
        'title': 'Verificación del Sistema',
        'current_time': timezone.now(),
        'debug': getattr(settings, 'DEBUG', False)
    }
    return render(request, 'system_check.html', context)

def test_sticky(request):
    """
    Vista de prueba para verificar el header sticky
    """
    return render(request, 'test_sticky.html', {
        'title': 'Prueba Header Sticky'
    })
