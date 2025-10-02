from django.core.management.base import BaseCommand
from tipos_cantidad.models import TipoCantidad


class Command(BaseCommand):
    help = 'Crea los tipos de cantidad (unidades de medida) predefinidos del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Eliminar todos los tipos existentes antes de crear los nuevos'
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Eliminando tipos de cantidad existentes...')
            TipoCantidad.objects.all().delete()
            self.stdout.write(self.style.WARNING('Tipos de cantidad eliminados'))

        tipos_cantidad = [
            {
                'codigo': 'm2',
                'descripcion': 'Metro cuadrado',
                'simbolo': 'm²',
                'es_sistema': True,
                'orden': 1
            },
            {
                'codigo': 'm3',
                'descripcion': 'Metro cúbico',
                'simbolo': 'm³',
                'es_sistema': True,
                'orden': 2
            },
            {
                'codigo': 'ml',
                'descripcion': 'Metro lineal',
                'simbolo': 'ml',
                'es_sistema': True,
                'orden': 3
            },
            {
                'codigo': 'm',
                'descripcion': 'Metro',
                'simbolo': 'm',
                'es_sistema': True,
                'orden': 4
            },
            {
                'codigo': 'kg',
                'descripcion': 'Kilogramo',
                'simbolo': 'kg',
                'es_sistema': True,
                'orden': 5
            },
            {
                'codigo': 'ton',
                'descripcion': 'Tonelada',
                'simbolo': 't',
                'es_sistema': True,
                'orden': 6
            },
            {
                'codigo': 'und',
                'descripcion': 'Unidad',
                'simbolo': 'und',
                'es_sistema': True,
                'orden': 7
            },
            {
                'codigo': 'hrs',
                'descripcion': 'Horas',
                'simbolo': 'hrs',
                'es_sistema': True,
                'orden': 8
            },
            {
                'codigo': 'global',
                'descripcion': 'Global',
                'simbolo': '',
                'es_sistema': True,
                'orden': 9
            },
            {
                'codigo': 'mes',
                'descripcion': 'Mes',
                'simbolo': 'mes',
                'es_sistema': True,
                'orden': 10
            },
            {
                'codigo': 'dia',
                'descripcion': 'Día',
                'simbolo': 'día',
                'es_sistema': True,
                'orden': 11
            },
            {
                'codigo': 'lts',
                'descripcion': 'Litros',
                'simbolo': 'lts',
                'es_sistema': True,
                'orden': 12
            },
        ]

        created_count = 0
        existing_count = 0

        for tipo_data in tipos_cantidad:
            tipo, created = TipoCantidad.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de cantidad: {tipo.codigo} - {tipo.descripcion}')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de cantidad: {tipo.codigo} - {tipo.descripcion}')
                )

        self.stdout.write('')
        self.stdout.write(f'Resumen:')
        self.stdout.write(f'- Tipos creados: {created_count}')
        self.stdout.write(f'- Tipos existentes: {existing_count}')
        self.stdout.write(f'- Total: {created_count + existing_count}')
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS('Tipos de cantidad inicializados correctamente')
        )
