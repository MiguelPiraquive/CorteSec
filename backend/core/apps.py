"""
Configuración de la aplicación Core
===================================

Configuración principal de la app core del sistema.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-12
"""

from django.apps import AppConfig
import logging
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


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
        except ImportError as exc:
            logger.debug('No se pudieron cargar signals de core: %s', exc)
        
        # Importar signals de notificaciones automáticas
        try:
            from . import notification_signals  # noqa
            logger.info('Signals de notificaciones automáticas cargados correctamente')
        except ImportError as exc:
            logger.debug('No se pudieron cargar notification_signals: %s', exc)
        
        # Registrar handlers o configuraciones adicionales
        self.setup_system_defaults()
    
    def setup_system_defaults(self):
        """Configura valores por defecto del sistema"""
        # Aquí se pueden configurar valores por defecto
        # cuando la aplicación esté lista
        logger.debug('setup_system_defaults ejecutado sin acciones configuradas')
