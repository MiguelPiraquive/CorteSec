"""
Configuración de la aplicación de Reportes
=========================================

Configuración de la aplicación Django para el sistema de reportes
multi-módulo de CorteSec.

Autor: Sistema CorteSec
"""

from django.apps import AppConfig


class ReportesConfig(AppConfig):
    """
    Configuración de la aplicación de reportes
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reportes'
    verbose_name = 'Sistema de Reportes'
    
    def ready(self):
        """
        Configuración que se ejecuta cuando la aplicación está lista
        """
        # Importar señales si las hay
        try:
            from . import signals
        except ImportError:
            pass
