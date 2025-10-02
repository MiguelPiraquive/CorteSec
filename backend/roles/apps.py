from django.apps import AppConfig


class RolesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roles'
    verbose_name = 'Gestión de Roles'

    def ready(self):
        """
        Configuración que se ejecuta cuando la app está lista
        """
        import roles.signals  # Importar signals
        
        # Inicializar datos por defecto
        from .utils import inicializar_estados_asignacion, crear_tipos_rol_default
        
        try:
            # Estas funciones se ejecutan de forma segura aunque ya existan los datos
            inicializar_estados_asignacion()
            crear_tipos_rol_default()
        except Exception as e:
            # En caso de error (por ejemplo, durante migraciones), no fallar
            pass
