"""
ASOGAN - Comando para inicializar roles del sistema
"""

from django.core.management.base import BaseCommand
from roles.services import RolService


class Command(BaseCommand):
    help = 'Inicializa los roles básicos del sistema'

    def handle(self, *args, **options):
        self.stdout.write('Inicializando roles del sistema...')
        
        try:
            RolService.inicializar_roles_sistema()
            self.stdout.write(
                self.style.SUCCESS('Roles del sistema inicializados exitosamente')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error inicializando roles: {str(e)}')
            )
