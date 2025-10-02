"""
URLs del Sistema de Autenticación API
=====================================

URLs EXCLUSIVAS para API endpoints de autenticación.
Este proyecto usa React frontend, NO necesita templates Django.

Autor: Sistema CorteSec
Versión: 3.0.0 - API FIRST
Fecha: 2025-07-12
"""

from django.urls import path, include

app_name = "login"

urlpatterns = [
    # ==================== API ENDPOINTS ÚNICAMENTE ====================
    path('api/', include('login.api_urls')),
]
