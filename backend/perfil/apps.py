from django.apps import AppConfig


class PerfilConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'perfil'
    verbose_name = 'Gestión de Perfiles'
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        import perfil.models  # Esto carga los signals
