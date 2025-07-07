from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages

# Centro de ayuda principal
@login_required
def centro_ayuda(request):
    """Centro de ayuda principal"""
    return render(request, 'ayuda/centro.html')

# Categorías
@login_required
def ayuda_categoria(request, categoria):
    """Artículos por categoría"""
    return render(request, 'ayuda/categoria.html', {'categoria': categoria})

@login_required
def articulo_ayuda(request, articulo_id):
    """Detalle de artículo de ayuda"""
    return render(request, 'ayuda/articulo.html', {'articulo_id': articulo_id})

# FAQ
@login_required
def preguntas_frecuentes(request):
    """Preguntas frecuentes"""
    return render(request, 'ayuda/faq.html')

@login_required
def faq_categoria(request, categoria):
    """FAQ por categoría"""
    return render(request, 'ayuda/faq_categoria.html', {'categoria': categoria})

# Tutoriales
@login_required
def tutoriales(request):
    """Lista de tutoriales"""
    return render(request, 'ayuda/tutoriales.html')

@login_required
def tutorial_detalle(request, tutorial_id):
    """Detalle de tutorial"""
    return render(request, 'ayuda/tutorial_detalle.html', {'tutorial_id': tutorial_id})

# Videos
@login_required
def videos_ayuda(request):
    """Videos de ayuda"""
    return render(request, 'ayuda/videos.html')

@login_required
def video_detalle(request, video_id):
    """Detalle de video"""
    return render(request, 'ayuda/video_detalle.html', {'video_id': video_id})

# Búsqueda
@login_required
def buscar_ayuda(request):
    """Buscar en ayuda"""
    query = request.GET.get('q', '')
    return render(request, 'ayuda/buscar.html', {'query': query})

# Soporte
@login_required
def contacto_soporte(request):
    """Contacto con soporte"""
    return render(request, 'ayuda/contacto.html')

@login_required
def crear_ticket(request):
    """Crear ticket de soporte"""
    return render(request, 'ayuda/crear_ticket.html')

@login_required
def mis_tickets(request):
    """Mis tickets de soporte"""
    return render(request, 'ayuda/mis_tickets.html')

@login_required
def ticket_detalle(request, ticket_id):
    """Detalle de ticket"""
    return render(request, 'ayuda/ticket_detalle.html', {'ticket_id': ticket_id})

# Feedback
@login_required
def enviar_feedback(request):
    """Enviar feedback"""
    return render(request, 'ayuda/feedback.html')

@login_required
def valorar_articulo(request, articulo_id):
    """Valorar artículo"""
    return JsonResponse({'status': 'success', 'message': 'Valoración guardada'})

# APIs
@login_required
def api_buscar_ayuda(request):
    """API para búsqueda de ayuda"""
    return JsonResponse({'results': []})

@login_required
def api_sugerencias(request):
    """API para sugerencias"""
    return JsonResponse({'suggestions': []})
