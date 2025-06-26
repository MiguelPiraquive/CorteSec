from django.shortcuts import render
from django.db.models import Q
from .models import Notificacion
from django.contrib.auth.models import User

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
