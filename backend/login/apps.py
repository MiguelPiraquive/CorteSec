"""
Aplicación de Login/Autenticación
=================================

Sistema de autenticación customizado para CorteSec.
Maneja usuarios, roles y permisos.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.apps import AppConfig


class LoginConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'login'
    verbose_name = "Sistema de Autenticación"
    
    def ready(self):
        # Importar señales cuando la aplicación esté lista
        try:
            from . import signals
        except ImportError:
            pass
