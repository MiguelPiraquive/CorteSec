"""
ASOGAN - App Usuarios
Configuracion de la aplicacion de gestion de usuarios
"""

from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    """Configuracion de la app Usuarios"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'usuarios'
    verbose_name = 'Gestion de Usuarios'

