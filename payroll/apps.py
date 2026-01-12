# payroll/apps.py

from django.apps import AppConfig


class PayrollConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payroll'
    verbose_name = 'Gestión de Nóminas'
    
    def ready(self):
        """
        Importar señales cuando la app esté lista.
        
        FASE 4: Signals HSE (hse_alerts)
        FASE 5: Signals contabilización (accounting_signals)
        FASE 6: Signals notificaciones (payroll_notifications)
        """
        try:
            # Importar todos los signals para registro automático
            import payroll.signals
            
            # Intentar conectar signals legacy si existen
            if hasattr(payroll.signals, 'conectar_senales'):
                payroll.signals.conectar_senales()
        
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error cargando signals de payroll: {str(e)}")
