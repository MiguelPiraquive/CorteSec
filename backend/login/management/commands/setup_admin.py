"""
Script para verificar y configurar el usuario administrador del sistema.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from django.db import transaction
import getpass

User = get_user_model()


class Command(BaseCommand):
    help = 'Configura el usuario administrador del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email del administrador',
            default='admin@cortesec.com'
        )
        parser.add_argument(
            '--reset-password',
            action='store_true',
            help='Restablecer la contraseña del administrador',
        )
        parser.add_argument(
            '--create-token',
            action='store_true',
            help='Crear nuevo token de API para el administrador',
        )

    def handle(self, *args, **options):
        email = options['email']
        reset_password = options['reset_password']
        create_token = options['create_token']

        self.stdout.write(
            self.style.SUCCESS(f'Configurando usuario administrador: {email}')
        )

        try:
            with transaction.atomic():
                # Buscar o crear usuario administrador
                admin_user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': 'admin',
                        'full_name': 'Administrador del Sistema',
                        'first_name': 'Administrador',
                        'last_name': 'Sistema',
                        'is_staff': True,
                        'is_superuser': True,
                        'is_active': True,
                        'email_verified': True,
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS('✅ Usuario administrador creado exitosamente')
                    )
                    reset_password = True  # Forzar establecimiento de contraseña
                else:
                    self.stdout.write(
                        self.style.WARNING('⚠️  Usuario administrador ya existe')
                    )
                    # Asegurar que tenga permisos de admin
                    admin_user.is_staff = True
                    admin_user.is_superuser = True
                    admin_user.is_active = True
                    admin_user.save()

                # Configurar contraseña
                if reset_password:
                    self._set_admin_password(admin_user)

                # Crear token de API
                if create_token or created:
                    self._create_admin_token(admin_user)

                self.stdout.write(
                    self.style.SUCCESS('✅ Configuración de administrador completada')
                )

                # Mostrar información del usuario
                self._show_admin_info(admin_user)

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error configurando administrador: {e}')
            )

    def _set_admin_password(self, admin_user):
        """Establece la contraseña del administrador"""
        self.stdout.write('Configurando contraseña del administrador...')
        
        # En modo interactivo, pedir contraseña
        password = None
        confirm_password = None
        
        while not password or password != confirm_password:
            try:
                password = getpass.getpass('Nueva contraseña: ')
                if len(password) < 8:
                    self.stdout.write(
                        self.style.ERROR('La contraseña debe tener al menos 8 caracteres')
                    )
                    continue
                
                confirm_password = getpass.getpass('Confirmar contraseña: ')
                if password != confirm_password:
                    self.stdout.write(
                        self.style.ERROR('Las contraseñas no coinciden')
                    )
                    password = None
                    
            except KeyboardInterrupt:
                # Si no hay entrada interactiva, usar contraseña por defecto
                password = 'Admin123!'
                confirm_password = password
                self.stdout.write(
                    self.style.WARNING(
                        f'Usando contraseña por defecto: {password}\n'
                        '⚠️  CAMBIE ESTA CONTRASEÑA INMEDIATAMENTE EN PRODUCCIÓN'
                    )
                )
                break

        admin_user.set_password(password)
        admin_user.save()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Contraseña configurada exitosamente')
        )

    def _create_admin_token(self, admin_user):
        """Crea un token de API para el administrador"""
        # Eliminar tokens existentes
        Token.objects.filter(user=admin_user).delete()
        
        # Crear nuevo token
        token = Token.objects.create(user=admin_user)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Token de API creado: {token.key}')
        )
        self.stdout.write(
            self.style.WARNING(
                '⚠️  Guarde este token en un lugar seguro. '
                'Se puede usar para acceder a la API sin contraseña.'
            )
        )

    def _show_admin_info(self, admin_user):
        """Muestra información del usuario administrador"""
        self.stdout.write('\n--- INFORMACIÓN DEL ADMINISTRADOR ---')
        self.stdout.write(f'Email: {admin_user.email}')
        self.stdout.write(f'Username: {admin_user.username}')
        self.stdout.write(f'Nombre completo: {admin_user.full_name}')
        self.stdout.write(f'Staff: {"Sí" if admin_user.is_staff else "No"}')
        self.stdout.write(f'Superusuario: {"Sí" if admin_user.is_superuser else "No"}')
        self.stdout.write(f'Activo: {"Sí" if admin_user.is_active else "No"}')
        self.stdout.write(f'Email verificado: {"Sí" if admin_user.email_verified else "No"}')
        self.stdout.write(f'Último login: {admin_user.last_login or "Nunca"}')
        
        # Mostrar token si existe
        try:
            token = Token.objects.get(user=admin_user)
            self.stdout.write(f'Token API: {token.key}')
        except Token.DoesNotExist:
            self.stdout.write('Token API: No configurado')
        
        self.stdout.write('--- FIN INFORMACIÓN ---\n')
