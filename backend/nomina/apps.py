from django.apps import AppConfig


class NominaConfig(AppConfig):
    """Configuración de la app Nómina"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'nomina'
    verbose_name = 'Gestión de Nómina'
    
    def ready(self):
        """Registrar signals al iniciar la app"""
        try:
            import nomina.signals  # noqa
        except ImportError:
            pass
