from django.core.management.base import BaseCommand
from login.models import IntentosLogin
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Inicializa configuraciones del sistema de login'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-intentos',
            action='store_true',
            help='Resetea todos los intentos de login bloqueados',
        )
        parser.add_argument(
            '--crear-admin',
            action='store_true',
            help='Crea usuario administrador por defecto',
        )

    def handle(self, *args, **options):
        if options['reset_intentos']:
            # Resetear intentos de login
            intentos_reseteados = IntentosLogin.objects.filter(bloqueado=True).count()
            IntentosLogin.objects.filter(bloqueado=True).delete()
            
            self.stdout.write(
                self.style.SUCCESS(f'Reseteados {intentos_reseteados} intentos de login bloqueados')
            )

        if options['crear_admin']:
            # Crear usuario administrador
            admin_user, created = User.objects.get_or_create(
                username='admin',
                defaults={
                    'email': 'admin@cortesec.com',
                    'first_name': 'Administrador',
                    'last_name': 'Sistema',
                    'is_staff': True,
                    'is_superuser': True,
                    'is_active': True
                }
            )
            
            if created:
                admin_user.set_password('admin123')  # Contraseña temporal
                admin_user.save()
                
                self.stdout.write(
                    self.style.SUCCESS('Usuario administrador creado exitosamente')
                )
                self.stdout.write(
                    self.style.WARNING('IMPORTANTE: Cambiar la contraseña por defecto (admin123)')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('El usuario administrador ya existe')
                )

        # Mostrar estadísticas de login
        total_usuarios = User.objects.filter(is_active=True).count()
        usuarios_bloqueados = IntentosLogin.objects.filter(bloqueado=True).count()
        
        self.stdout.write(f'\n=== Estadísticas del Sistema de Login ===')
        self.stdout.write(f'Total usuarios activos: {total_usuarios}')
        self.stdout.write(f'IPs bloqueadas: {usuarios_bloqueados}')
        
        if usuarios_bloqueados > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'Ejecute con --reset-intentos para desbloquear IPs'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS('Configuración del sistema de login verificada')
        )
