from django.core.management.base import BaseCommand
from configuracion.models import ConfiguracionGeneral, ParametroSistema


class Command(BaseCommand):
    help = 'Inicializa la configuración básica del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina la configuración existente antes de crear una nueva',
        )

    def handle(self, *args, **options):
        if options['reset']:
            ConfiguracionGeneral.objects.all().delete()
            ParametroSistema.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Configuración existente eliminada')
            )

        # Crear configuración general
        config, created = ConfiguracionGeneral.objects.get_or_create(
            pk=1,
            defaults={
                'nombre_empresa': 'CorteSec',
                'nit': '123456789-0',
                'direccion': 'Dirección de la empresa',
                'telefono': '123-456-7890',
                'email': 'info@cortesec.com',
                'moneda': 'COP',
                'simbolo_moneda': '$',
                'zona_horaria': 'America/Bogota',
                'formato_fecha': '%d/%m/%Y',
                'dia_pago_nomina': 30,
                'periodo_nomina': 'mensual',
                'sesion_timeout_minutos': 30,
                'max_intentos_login': 3,
                'requiere_cambio_password': True,
                'dias_cambio_password': 90,
                'puerto_email': 587,
                'usar_tls': True,
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('Configuración general creada exitosamente')
            )
        else:
            self.stdout.write(
                self.style.WARNING('La configuración general ya existe')
            )

        # Crear parámetros del sistema
        parametros = [
            {
                'codigo': 'version_sistema',
                'nombre': 'Versión del Sistema',
                'descripcion': 'Versión actual del sistema',
                'tipo_valor': 'string',
                'valor': '1.0.0',
                'es_sistema': True
            },
            {
                'codigo': 'mantenimiento',
                'nombre': 'Modo Mantenimiento',
                'descripcion': 'Activar/desactivar modo mantenimiento',
                'tipo_valor': 'boolean',
                'valor': 'false',
                'es_sistema': True
            },
            {
                'codigo': 'max_empleados',
                'nombre': 'Máximo de Empleados',
                'descripcion': 'Número máximo de empleados permitidos',
                'tipo_valor': 'integer',
                'valor': '1000',
                'es_sistema': False
            },
            {
                'codigo': 'backup_automatico',
                'nombre': 'Backup Automático',
                'descripcion': 'Activar backup automático',
                'tipo_valor': 'boolean',
                'valor': 'true',
                'es_sistema': False
            },
            {
                'codigo': 'notificaciones_email',
                'nombre': 'Notificaciones por Email',
                'descripcion': 'Enviar notificaciones por correo electrónico',
                'tipo_valor': 'boolean',
                'valor': 'true',
                'es_sistema': False
            },
            {
                'codigo': 'logeo_detallado',
                'nombre': 'Logging Detallado',
                'descripcion': 'Activar logging detallado del sistema',
                'tipo_valor': 'boolean',
                'valor': 'false',
                'es_sistema': True
            },
        ]

        for param_data in parametros:
            param, created = ParametroSistema.objects.get_or_create(
                codigo=param_data['codigo'],
                defaults=param_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado parámetro: {param.codigo} - {param.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe parámetro: {param.codigo} - {param.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Configuración básica inicializada correctamente')
        )
