from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class TiposCantidadConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tipos_cantidad'
    verbose_name = 'Tipos de Cantidad'

    def ready(self):
        """
        Configuración que se ejecuta cuando la app está lista
        """
        # Aquí se pueden importar signals o realizar configuraciones iniciales
        logger.debug('TiposCantidadConfig listo sin acciones iniciales')
