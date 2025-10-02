from django.core.management.base import BaseCommand
from core.models import Configuracion, LogSistema
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Inicializa configuraciones básicas del core del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina las configuraciones existentes antes de crear nuevas',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Configuracion.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Configuraciones existentes eliminadas')
            )

        # Crear configuraciones básicas del sistema
        configuraciones = [
            {
                'clave': 'sistema_nombre',
                'valor': 'CorteSec',
                'descripcion': 'Nombre del sistema',
                'tipo': 'string',
                'activo': True
            },
            {
                'clave': 'sistema_version',
                'valor': '1.0.0',
                'descripcion': 'Versión actual del sistema',
                'tipo': 'string',
                'activo': True
            },
            {
                'clave': 'mantenimiento_activo',
                'valor': 'false',
                'descripcion': 'Indica si el sistema está en mantenimiento',
                'tipo': 'boolean',
                'activo': True
            },
            {
                'clave': 'max_intentos_login',
                'valor': '3',
                'descripcion': 'Máximo número de intentos de login',
                'tipo': 'integer',
                'activo': True
            },
            {
                'clave': 'tiempo_bloqueo_login',
                'valor': '15',
                'descripcion': 'Tiempo de bloqueo en minutos tras exceder intentos',
                'tipo': 'integer',
                'activo': True
            },
            {
                'clave': 'backup_automatico',
                'valor': 'true',
                'descripcion': 'Activar backup automático',
                'tipo': 'boolean',
                'activo': True
            },
            {
                'clave': 'log_detallado',
                'valor': 'false',
                'descripcion': 'Activar logging detallado',
                'tipo': 'boolean',
                'activo': True
            },
            {
                'clave': 'notificaciones_email',
                'valor': 'true',
                'descripcion': 'Enviar notificaciones por email',
                'tipo': 'boolean',
                'activo': True
            },
            {
                'clave': 'timezone',
                'valor': 'America/Bogota',
                'descripcion': 'Zona horaria del sistema',
                'tipo': 'string',
                'activo': True
            },
            {
                'clave': 'idioma_defecto',
                'valor': 'es',
                'descripcion': 'Idioma por defecto del sistema',
                'tipo': 'string',
                'activo': True
            },
        ]

        for config_data in configuraciones:
            config, created = Configuracion.objects.get_or_create(
                clave=config_data['clave'],
                defaults=config_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada configuración: {config.clave}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe configuración: {config.clave}')
                )

        # Crear log inicial del sistema
        LogSistema.objects.create(
            usuario=None,
            accion='sistema_inicializado',
            descripcion='Sistema inicializado con configuraciones básicas',
            ip_address=None,
            user_agent=None
        )

        self.stdout.write(
            self.style.SUCCESS('Configuraciones básicas del core inicializadas correctamente')
        )
