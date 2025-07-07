from django.core.management.base import BaseCommand
from tipos_cantidad.models import TipoCantidad


class Command(BaseCommand):
    help = 'Crea los tipos de cantidad (unidades de medida) predefinidos del sistema'

    def handle(self, *args, **options):
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
                'codigo': 'global',
                'descripcion': 'Global',
                'simbolo': '',
                'es_sistema': True,
                'orden': 4
            },
        ]

        for tipo_data in tipos_cantidad:
            tipo, created = TipoCantidad.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de cantidad: {tipo.codigo} - {tipo.descripcion}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe tipo de cantidad: {tipo.codigo} - {tipo.descripcion}')
                )

        self.stdout.write(
            self.style.SUCCESS('Tipos de cantidad inicializados correctamente')
        )
