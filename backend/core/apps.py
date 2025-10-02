"""
Configuración de la aplicación Core
===================================

Configuración principal de la app core del sistema.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    """Configuración de la aplicación Core"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = _('Sistema Core')
    
    def ready(self):
        """Se ejecuta cuando la app está lista"""
        # Importar signals si los hay
        try:
            from . import signals  # noqa
        except ImportError:
            pass
        
        # Registrar handlers o configuraciones adicionales
        self.setup_system_defaults()
    
    def setup_system_defaults(self):
        """Configura valores por defecto del sistema"""
        # Aquí se pueden configurar valores por defecto
        # cuando la aplicación esté lista
        pass
