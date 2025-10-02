"""
URLs del Sistema de Ayuda API
=============================

URLs EXCLUSIVAS para API endpoints de ayuda.
Este proyecto usa React frontend, NO necesita templates Django.

Autor: Sistema CorteSec
Versión: 3.0.0 - API FIRST
Fecha: 2025-07-29
"""

from django.urls import path, include

app_name = "ayuda"

urlpatterns = [
    # ==================== API ENDPOINTS ÚNICAMENTE ====================
    path('api/', include('ayuda.api_urls')),
]
