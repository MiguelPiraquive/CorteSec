from django.core.management.base import BaseCommand
from prestamos.models import TipoPrestamo
from decimal import Decimal


class Command(BaseCommand):
    help = 'Inicializa tipos de préstamos básicos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los tipos de préstamos existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            TipoPrestamo.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Tipos de préstamos existentes eliminados')
            )

        # Crear tipos de préstamos básicos
        tipos_prestamos = [
            {
                'nombre': 'Préstamo Personal',
                'descripcion': 'Préstamo personal para empleados',
                'tasa_interes': Decimal('2.5'),
                'plazo_maximo_meses': 12,
                'monto_maximo': Decimal('2000000.00'),
                'monto_minimo': Decimal('100000.00'),
                'requiere_autorizacion': True,
                'requiere_garantia': False,
                'activo': True
            },
            {
                'nombre': 'Préstamo de Vivienda',
                'descripcion': 'Préstamo para compra o mejora de vivienda',
                'tasa_interes': Decimal('1.5'),
                'plazo_maximo_meses': 60,
                'monto_maximo': Decimal('20000000.00'),
                'monto_minimo': Decimal('500000.00'),
                'requiere_autorizacion': True,
                'requiere_garantia': True,
                'activo': True
            },
            {
                'nombre': 'Préstamo de Calamidad',
                'descripcion': 'Préstamo por calamidad doméstica',
                'tasa_interes': Decimal('1.0'),
                'plazo_maximo_meses': 24,
                'monto_maximo': Decimal('3000000.00'),
                'monto_minimo': Decimal('200000.00'),
                'requiere_autorizacion': True,
                'requiere_garantia': False,
                'activo': True
            },
            {
                'nombre': 'Préstamo Educativo',
                'descripcion': 'Préstamo para estudios',
                'tasa_interes': Decimal('1.2'),
                'plazo_maximo_meses': 36,
                'monto_maximo': Decimal('5000000.00'),
                'monto_minimo': Decimal('300000.00'),
                'requiere_autorizacion': True,
                'requiere_garantia': False,
                'activo': True
            },
            {
                'nombre': 'Anticipo de Nómina',
                'descripcion': 'Anticipo sobre el salario',
                'tasa_interes': Decimal('0.5'),
                'plazo_maximo_meses': 3,
                'monto_maximo': Decimal('1000000.00'),
                'monto_minimo': Decimal('50000.00'),
                'requiere_autorizacion': False,
                'requiere_garantia': False,
                'activo': True
            },
            {
                'nombre': 'Préstamo de Vehículo',
                'descripcion': 'Préstamo para compra de vehículo',
                'tasa_interes': Decimal('2.0'),
                'plazo_maximo_meses': 48,
                'monto_maximo': Decimal('15000000.00'),
                'monto_minimo': Decimal('1000000.00'),
                'requiere_autorizacion': True,
                'requiere_garantia': True,
                'activo': True
            },
        ]

        for tipo_data in tipos_prestamos:
            tipo, created = TipoPrestamo.objects.get_or_create(
                nombre=tipo_data['nombre'],
                defaults=tipo_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de préstamo: {tipo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de préstamo: {tipo.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Tipos de préstamos básicos inicializados correctamente')
        )
