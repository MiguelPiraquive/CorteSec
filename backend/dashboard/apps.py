"""
Aplicación Dashboard
====================

Panel principal del sistema CorteSec.
Proporciona estadísticas, gráficos y accesos rápidos.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.apps import AppConfig


class DashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dashboard'
    verbose_name = "Panel de Control"
    
    def ready(self):
        # Importar señales cuando la aplicación esté lista
        try:
            from . import signals
        except ImportError:
            pass
