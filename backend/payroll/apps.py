# payroll/apps.py

from django.apps import AppConfig


class PayrollConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payroll'
    verbose_name = 'Gestión de Nóminas'
    
    def ready(self):
        """Importar señales cuando la app esté lista"""
        try:
            import payroll.signals
            payroll.signals.conectar_senales()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"No se pudieron conectar las señales de payroll: {str(e)}")
