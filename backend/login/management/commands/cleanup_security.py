"""
Comando de gestión para limpiar tokens expirados y mantener la seguridad del sistema.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from login.auth_security import AuthSecurityManager
import logging

logger = logging.getLogger('security')


class Command(BaseCommand):
    help = 'Limpia tokens expirados y realiza tareas de mantenimiento de seguridad'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se haría sin ejecutar las acciones',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Muestra información detallada',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']

        self.stdout.write(
            self.style.SUCCESS('Iniciando limpieza de seguridad...')
        )

        # Limpiar tokens expirados
        if verbose:
            self.stdout.write('Limpiando tokens expirados...')
        
        if not dry_run:
            count = AuthSecurityManager.clean_expired_tokens()
            message = f'Se eliminaron {count} tokens expirados'
        else:
            # En modo dry-run, solo contar sin eliminar
            from rest_framework.authtoken.models import Token
            from datetime import datetime
            cutoff_time = datetime.now() - timedelta(hours=AuthSecurityManager.TOKEN_VALIDITY_HOURS)
            count = Token.objects.filter(created__lt=cutoff_time).count()
            message = f'Se eliminarían {count} tokens expirados'

        self.stdout.write(self.style.SUCCESS(message))

        # Limpiar cache de intentos de login antiguos
        if verbose:
            self.stdout.write('Limpiando cache de intentos de login...')
        
        # Esta limpieza la hace automáticamente Django Cache, pero podríamos 
        # implementar una limpieza manual si fuera necesario

        # Reportar estadísticas de seguridad
        if verbose:
            self.stdout.write('Generando reporte de seguridad...')
            self._generate_security_report()

        self.stdout.write(
            self.style.SUCCESS('Limpieza de seguridad completada exitosamente.')
        )

    def _generate_security_report(self):
        """Genera un reporte básico de seguridad"""
        from rest_framework.authtoken.models import Token
        from login.models import CustomUser
        
        # Contar tokens activos
        active_tokens = Token.objects.count()
        
        # Contar usuarios activos
        active_users = CustomUser.objects.filter(is_active=True).count()
        
        # Contar usuarios staff
        staff_users = CustomUser.objects.filter(is_staff=True).count()
        
        # Contar superusuarios
        superusers = CustomUser.objects.filter(is_superuser=True).count()

        self.stdout.write('\n--- REPORTE DE SEGURIDAD ---')
        self.stdout.write(f'Tokens activos: {active_tokens}')
        self.stdout.write(f'Usuarios activos: {active_users}')
        self.stdout.write(f'Usuarios staff: {staff_users}')
        self.stdout.write(f'Superusuarios: {superusers}')
        
        # Verificar configuraciones de seguridad
        from django.conf import settings
        
        security_issues = []
        
        if settings.DEBUG:
            security_issues.append('⚠️  DEBUG está habilitado')
        
        if not getattr(settings, 'SECRET_KEY', '').startswith('django-insecure') or len(settings.SECRET_KEY) < 50:
            if not settings.SECRET_KEY or settings.SECRET_KEY.startswith('django-insecure'):
                security_issues.append('⚠️  SECRET_KEY no está configurada apropiadamente')
        
        if getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
            security_issues.append('⚠️  CORS_ALLOW_ALL_ORIGINS está habilitado')
        
        if security_issues:
            self.stdout.write(self.style.WARNING('\n--- PROBLEMAS DE SEGURIDAD DETECTADOS ---'))
            for issue in security_issues:
                self.stdout.write(self.style.WARNING(issue))
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ No se detectaron problemas de seguridad básicos'))
        
        self.stdout.write('--- FIN DEL REPORTE ---\n')
