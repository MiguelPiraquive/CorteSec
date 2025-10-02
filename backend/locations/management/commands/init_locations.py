from django.core.management.base import BaseCommand
from locations.models import Pais, Departamento, Ciudad, Location


class Command(BaseCommand):
    help = 'Inicializa ubicaciones básicas de Colombia'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina las ubicaciones existentes antes de crear nuevas',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Location.objects.all().delete()
            Ciudad.objects.all().delete()
            Departamento.objects.all().delete()
            Pais.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Ubicaciones existentes eliminadas')
            )

        # Crear país Colombia
        colombia, created = Pais.objects.get_or_create(
            codigo='CO',
            defaults={
                'nombre': 'Colombia',
                'codigo_iso': 'COL',
                'activo': True
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Creado país: {colombia.nombre}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Ya existe país: {colombia.nombre}')
            )

        # Crear departamentos principales
        departamentos_data = [
            {'codigo': '11', 'nombre': 'Bogotá D.C.'},
            {'codigo': '05', 'nombre': 'Antioquia'},
            {'codigo': '76', 'nombre': 'Valle del Cauca'},
            {'codigo': '08', 'nombre': 'Atlántico'},
            {'codigo': '13', 'nombre': 'Bolívar'},
            {'codigo': '17', 'nombre': 'Caldas'},
            {'codigo': '15', 'nombre': 'Boyacá'},
            {'codigo': '19', 'nombre': 'Cauca'},
            {'codigo': '23', 'nombre': 'Córdoba'},
            {'codigo': '25', 'nombre': 'Cundinamarca'},
            {'codigo': '41', 'nombre': 'Huila'},
            {'codigo': '52', 'nombre': 'Nariño'},
            {'codigo': '54', 'nombre': 'Norte de Santander'},
            {'codigo': '66', 'nombre': 'Risaralda'},
            {'codigo': '68', 'nombre': 'Santander'},
            {'codigo': '70', 'nombre': 'Sucre'},
            {'codigo': '73', 'nombre': 'Tolima'},
        ]

        departamentos_creados = {}
        for dept_data in departamentos_data:
            dept, created = Departamento.objects.get_or_create(
                codigo=dept_data['codigo'],
                pais=colombia,
                defaults={
                    'nombre': dept_data['nombre'],
                    'activo': True
                }
            )
            departamentos_creados[dept_data['codigo']] = dept
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado departamento: {dept.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe departamento: {dept.nombre}')
                )

        # Crear ciudades principales
        ciudades_data = [
            {'codigo': '11001', 'nombre': 'Bogotá', 'departamento': '11'},
            {'codigo': '05001', 'nombre': 'Medellín', 'departamento': '05'},
            {'codigo': '76001', 'nombre': 'Cali', 'departamento': '76'},
            {'codigo': '08001', 'nombre': 'Barranquilla', 'departamento': '08'},
            {'codigo': '13001', 'nombre': 'Cartagena', 'departamento': '13'},
            {'codigo': '17001', 'nombre': 'Manizales', 'departamento': '17'},
            {'codigo': '15001', 'nombre': 'Tunja', 'departamento': '15'},
            {'codigo': '19001', 'nombre': 'Popayán', 'departamento': '19'},
            {'codigo': '23001', 'nombre': 'Montería', 'departamento': '23'},
            {'codigo': '41001', 'nombre': 'Neiva', 'departamento': '41'},
            {'codigo': '52001', 'nombre': 'Pasto', 'departamento': '52'},
            {'codigo': '54001', 'nombre': 'Cúcuta', 'departamento': '54'},
            {'codigo': '66001', 'nombre': 'Pereira', 'departamento': '66'},
            {'codigo': '68001', 'nombre': 'Bucaramanga', 'departamento': '68'},
            {'codigo': '70001', 'nombre': 'Sincelejo', 'departamento': '70'},
            {'codigo': '73001', 'nombre': 'Ibagué', 'departamento': '73'},
        ]

        ciudades_creadas = {}
        for ciudad_data in ciudades_data:
            dept_codigo = ciudad_data.pop('departamento')
            ciudad, created = Ciudad.objects.get_or_create(
                codigo=ciudad_data['codigo'],
                departamento=departamentos_creados[dept_codigo],
                defaults={
                    'nombre': ciudad_data['nombre'],
                    'activo': True
                }
            )
            ciudades_creadas[ciudad_data['codigo']] = ciudad
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada ciudad: {ciudad.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe ciudad: {ciudad.nombre}')
                )

        # Crear ubicaciones de ejemplo
        ubicaciones_data = [
            {
                'codigo': 'SEDE001',
                'nombre': 'Sede Principal',
                'direccion': 'Carrera 7 # 32-16',
                'ciudad': '11001',
                'tipo': 'oficina',
                'activo': True
            },
            {
                'codigo': 'SEDE002',
                'nombre': 'Sucursal Medellín',
                'direccion': 'Carrera 43A # 1-50',
                'ciudad': '05001',
                'tipo': 'sucursal',
                'activo': True
            },
            {
                'codigo': 'SEDE003',
                'nombre': 'Sucursal Cali',
                'direccion': 'Avenida 6N # 28-21',
                'ciudad': '76001',
                'tipo': 'sucursal',
                'activo': True
            },
            {
                'codigo': 'ALM001',
                'nombre': 'Almacén Principal',
                'direccion': 'Zona Industrial Fontibón',
                'ciudad': '11001',
                'tipo': 'almacen',
                'activo': True
            },
        ]

        for ubicacion_data in ubicaciones_data:
            ciudad_codigo = ubicacion_data.pop('ciudad')
            ubicacion_data['ciudad'] = ciudades_creadas[ciudad_codigo]
            
            ubicacion, created = Location.objects.get_or_create(
                codigo=ubicacion_data['codigo'],
                defaults=ubicacion_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creada ubicación: {ubicacion.codigo} - {ubicacion.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe ubicación: {ubicacion.codigo} - {ubicacion.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Ubicaciones básicas de Colombia inicializadas correctamente')
        )
