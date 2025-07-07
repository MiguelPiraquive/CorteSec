from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.contrib import messages

# Documentación principal
@login_required
def documentacion_index(request):
    """Índice de documentación"""
    return render(request, 'documentacion/index.html')

# Manual de usuario
@login_required
def manual_usuario(request):
    """Manual de usuario"""
    return render(request, 'documentacion/manual/index.html')

@login_required
def manual_seccion(request, seccion):
    """Sección específica del manual"""
    return render(request, 'documentacion/manual/seccion.html', {'seccion': seccion})

# Documentación técnica
@login_required
def documentacion_tecnica(request):
    """Documentación técnica"""
    return render(request, 'documentacion/tecnica/index.html')

@login_required
def documentacion_api(request):
    """Documentación de API"""
    return render(request, 'documentacion/tecnica/api.html')

@login_required
def documentacion_bd(request):
    """Documentación de base de datos"""
    return render(request, 'documentacion/tecnica/base_datos.html')

# Instalación
@login_required
def guias_instalacion(request):
    """Guías de instalación"""
    return render(request, 'documentacion/instalacion/index.html')

@login_required
def guia_instalacion_detalle(request, tipo):
    """Detalle de guía de instalación"""
    return render(request, 'documentacion/instalacion/detalle.html', {'tipo': tipo})

# Changelog
@login_required
def changelog(request):
    """Registro de cambios"""
    return render(request, 'documentacion/changelog.html')

@login_required
def version_detalle(request, version):
    """Detalle de versión"""
    return render(request, 'documentacion/version_detalle.html', {'version': version})

# Políticas
@login_required
def politicas(request):
    """Políticas generales"""
    return render(request, 'documentacion/politicas/index.html')

@login_required
def politica_privacidad(request):
    """Política de privacidad"""
    return render(request, 'documentacion/politicas/privacidad.html')

@login_required
def terminos_uso(request):
    """Términos de uso"""
    return render(request, 'documentacion/politicas/terminos.html')

# Descargas
@login_required
def documentos_descarga(request):
    """Documentos para descarga"""
    return render(request, 'documentacion/descargas.html')

@login_required
def descargar_documento(request, documento_id):
    """Descargar documento específico"""
    messages.info(request, 'Funcionalidad de descarga en desarrollo')
    return HttpResponse("Documento no disponible")

# Glosario
@login_required
def glosario(request):
    """Glosario de términos"""
    return render(request, 'documentacion/glosario/index.html')

@login_required
def glosario_letra(request, letra):
    """Glosario por letra"""
    return render(request, 'documentacion/glosario/letra.html', {'letra': letra})

# APIs
@login_required
def api_contenido(request, tipo):
    """API para contenido"""
    return JsonResponse({'content': [], 'type': tipo})

@login_required
def api_buscar_documentacion(request):
    """API para búsqueda en documentación"""
    return JsonResponse({'results': []})
