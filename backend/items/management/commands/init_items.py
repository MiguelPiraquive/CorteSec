from django.core.management.base import BaseCommand
from items.models import Item, CategoriaItem, UnidadMedida


class Command(BaseCommand):
    help = 'Inicializa items básicos del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los items existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Item.objects.all().delete()
            CategoriaItem.objects.all().delete()
            UnidadMedida.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Items existentes eliminados')
            )

        # Crear unidades de medida
        unidades = [
            {
                'nombre': 'Unidad',
                'abreviatura': 'Und',
                'descripcion': 'Unidad individual',
                'activo': True
            },
            {
                'nombre': 'Kilogramo',
                'abreviatura': 'Kg',
                'descripcion': 'Unidad de peso',
                'activo': True
            },
            {
                'nombre': 'Metro',
                'abreviatura': 'm',
                'descripcion': 'Unidad de longitud',
                'activo': True
            },
            {
                'nombre': 'Litro',
                'abreviatura': 'L',
                'descripcion': 'Unidad de volumen',
                'activo': True
            },
            {
                'nombre': 'Caja',
                'abreviatura': 'Cja',
                'descripcion': 'Unidad de empaque',
                'activo': True
            },
            {
                'nombre': 'Paquete',
                'abreviatura': 'Paq',
                'descripcion': 'Unidad de empaque',
                'activo': True
            },
        ]

        unidades_creadas = {}
        for unidad_data in unidades:
            unidad, created = UnidadMedida.objects.get_or_create(
                abreviatura=unidad_data['abreviatura'],
                defaults=unidad_data
            )
            unidades_creadas[unidad_data['abreviatura']] = unidad
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada unidad: {unidad.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe unidad: {unidad.nombre}')
                )

        # Crear categorías
        categorias = [
            {
                'nombre': 'Herramientas',
                'descripcion': 'Herramientas de trabajo',
                'activo': True
            },
            {
                'nombre': 'Materiales',
                'descripcion': 'Materiales de construcción',
                'activo': True
            },
            {
                'nombre': 'Equipos',
                'descripcion': 'Equipos de trabajo',
                'activo': True
            },
            {
                'nombre': 'Oficina',
                'descripcion': 'Artículos de oficina',
                'activo': True
            },
            {
                'nombre': 'Seguridad',
                'descripcion': 'Elementos de seguridad',
                'activo': True
            },
            {
                'nombre': 'Uniformes',
                'descripcion': 'Uniformes y dotación',
                'activo': True
            },
        ]

        categorias_creadas = {}
        for cat_data in categorias:
            categoria, created = CategoriaItem.objects.get_or_create(
                nombre=cat_data['nombre'],
                defaults=cat_data
            )
            categorias_creadas[cat_data['nombre']] = categoria
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada categoría: {categoria.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe categoría: {categoria.nombre}')
                )

        # Crear items
        items = [
            {
                'codigo': 'TOOL001',
                'nombre': 'Martillo',
                'descripcion': 'Martillo de construcción',
                'categoria': 'Herramientas',
                'unidad_medida': 'Und',
                'precio_unitario': 25000.00,
                'stock_minimo': 5,
                'stock_actual': 10,
                'activo': True
            },
            {
                'codigo': 'TOOL002',
                'nombre': 'Destornillador',
                'descripcion': 'Destornillador plano',
                'categoria': 'Herramientas',
                'unidad_medida': 'Und',
                'precio_unitario': 15000.00,
                'stock_minimo': 10,
                'stock_actual': 20,
                'activo': True
            },
            {
                'codigo': 'MAT001',
                'nombre': 'Cemento',
                'descripcion': 'Cemento para construcción',
                'categoria': 'Materiales',
                'unidad_medida': 'Kg',
                'precio_unitario': 800.00,
                'stock_minimo': 100,
                'stock_actual': 500,
                'activo': True
            },
            {
                'codigo': 'EQP001',
                'nombre': 'Taladro',
                'descripcion': 'Taladro eléctrico',
                'categoria': 'Equipos',
                'unidad_medida': 'Und',
                'precio_unitario': 250000.00,
                'stock_minimo': 2,
                'stock_actual': 5,
                'activo': True
            },
            {
                'codigo': 'OFF001',
                'nombre': 'Papel Bond',
                'descripcion': 'Papel bond carta',
                'categoria': 'Oficina',
                'unidad_medida': 'Paq',
                'precio_unitario': 12000.00,
                'stock_minimo': 10,
                'stock_actual': 25,
                'activo': True
            },
            {
                'codigo': 'SEG001',
                'nombre': 'Casco de Seguridad',
                'descripcion': 'Casco de seguridad industrial',
                'categoria': 'Seguridad',
                'unidad_medida': 'Und',
                'precio_unitario': 45000.00,
                'stock_minimo': 5,
                'stock_actual': 15,
                'activo': True
            },
            {
                'codigo': 'UNI001',
                'nombre': 'Camisa Polo',
                'descripcion': 'Camisa polo empresarial',
                'categoria': 'Uniformes',
                'unidad_medida': 'Und',
                'precio_unitario': 35000.00,
                'stock_minimo': 10,
                'stock_actual': 30,
                'activo': True
            },
        ]

        for item_data in items:
            cat_nombre = item_data.pop('categoria')
            unidad_abrev = item_data.pop('unidad_medida')
            item_data['categoria'] = categorias_creadas[cat_nombre]
            item_data['unidad_medida'] = unidades_creadas[unidad_abrev]
            
            item, created = Item.objects.get_or_create(
                codigo=item_data['codigo'],
                defaults=item_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado item: {item.codigo} - {item.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe item: {item.codigo} - {item.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Items básicos inicializados correctamente')
        )
