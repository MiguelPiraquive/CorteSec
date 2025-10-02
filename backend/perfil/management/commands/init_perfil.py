from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from perfil.models import PerfilUsuario


class Command(BaseCommand):
    help = 'Inicializa perfiles de usuarios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Crea perfiles para usuarios que no los tengan',
        )

    def handle(self, *args, **options):
        if options['create_missing']:
            users_without_profile = User.objects.filter(perfil__isnull=True)
            
            for user in users_without_profile:
                perfil, created = PerfilUsuario.objects.get_or_create(
                    usuario=user,
                    defaults={
                        'telefono': '',
                        'direccion': '',
                        'fecha_nacimiento': None,
                        'documento_identidad': '',
                        'tipo_documento': 'CC',
                    }
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Creado perfil para usuario: {user.username}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Ya existe perfil para usuario: {user.username}')
                    )
            
            if not users_without_profile.exists():
                self.stdout.write(
                    self.style.SUCCESS('Todos los usuarios ya tienen perfil')
                )
        else:
            # Mostrar estadísticas de perfiles
            total_users = User.objects.count()
            users_with_profile = User.objects.filter(perfil__isnull=False).count()
            users_without_profile = total_users - users_with_profile
            
            self.stdout.write(f'Total de usuarios: {total_users}')
            self.stdout.write(f'Usuarios con perfil: {users_with_profile}')
            self.stdout.write(f'Usuarios sin perfil: {users_without_profile}')
            
            if users_without_profile > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'Ejecute con --create-missing para crear perfiles faltantes'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS('Comando de inicialización de perfiles completado')
        )
