from django.core.management.base import BaseCommand
from cargos.models import Cargo, DepartamentoCargo


class Command(BaseCommand):
    help = 'Inicializa cargos básicos del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina los cargos existentes antes de crear nuevos',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Cargo.objects.all().delete()
            DepartamentoCargo.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Cargos existentes eliminados')
            )

        # Crear departamentos
        departamentos = [
            {
                'nombre': 'Administración',
                'descripcion': 'Departamento administrativo',
                'activo': True
            },
            {
                'nombre': 'Recursos Humanos',
                'descripcion': 'Gestión del talento humano',
                'activo': True
            },
            {
                'nombre': 'Contabilidad',
                'descripcion': 'Departamento contable',
                'activo': True
            },
            {
                'nombre': 'Operaciones',
                'descripcion': 'Operaciones y producción',
                'activo': True
            },
            {
                'nombre': 'Sistemas',
                'descripcion': 'Tecnología e informática',
                'activo': True
            },
            {
                'nombre': 'Ventas',
                'descripcion': 'Departamento comercial',
                'activo': True
            },
        ]

        departamentos_creados = {}
        for dept_data in departamentos:
            dept, created = DepartamentoCargo.objects.get_or_create(
                nombre=dept_data['nombre'],
                defaults=dept_data
            )
            departamentos_creados[dept_data['nombre']] = dept
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado departamento: {dept.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe departamento: {dept.nombre}')
                )

        # Crear cargos
        cargos = [
            {
                'nombre': 'Gerente General',
                'descripcion': 'Responsable de la dirección general',
                'departamento': 'Administración',
                'nivel_jerarquico': 1,
                'activo': True
            },
            {
                'nombre': 'Subgerente',
                'descripcion': 'Apoyo a la gerencia general',
                'departamento': 'Administración',
                'nivel_jerarquico': 2,
                'activo': True
            },
            {
                'nombre': 'Jefe de Recursos Humanos',
                'descripcion': 'Responsable del área de RRHH',
                'departamento': 'Recursos Humanos',
                'nivel_jerarquico': 3,
                'activo': True
            },
            {
                'nombre': 'Analista de RRHH',
                'descripcion': 'Analista de recursos humanos',
                'departamento': 'Recursos Humanos',
                'nivel_jerarquico': 4,
                'activo': True
            },
            {
                'nombre': 'Contador',
                'descripcion': 'Responsable contable',
                'departamento': 'Contabilidad',
                'nivel_jerarquico': 3,
                'activo': True
            },
            {
                'nombre': 'Auxiliar Contable',
                'descripcion': 'Auxiliar del área contable',
                'departamento': 'Contabilidad',
                'nivel_jerarquico': 4,
                'activo': True
            },
            {
                'nombre': 'Jefe de Operaciones',
                'descripcion': 'Responsable de las operaciones',
                'departamento': 'Operaciones',
                'nivel_jerarquico': 3,
                'activo': True
            },
            {
                'nombre': 'Operario',
                'descripcion': 'Operario de producción',
                'departamento': 'Operaciones',
                'nivel_jerarquico': 5,
                'activo': True
            },
            {
                'nombre': 'Jefe de Sistemas',
                'descripcion': 'Responsable del área de sistemas',
                'departamento': 'Sistemas',
                'nivel_jerarquico': 3,
                'activo': True
            },
            {
                'nombre': 'Desarrollador',
                'descripcion': 'Desarrollador de software',
                'departamento': 'Sistemas',
                'nivel_jerarquico': 4,
                'activo': True
            },
            {
                'nombre': 'Jefe de Ventas',
                'descripcion': 'Responsable del área comercial',
                'departamento': 'Ventas',
                'nivel_jerarquico': 3,
                'activo': True
            },
            {
                'nombre': 'Vendedor',
                'descripcion': 'Ejecutivo de ventas',
                'departamento': 'Ventas',
                'nivel_jerarquico': 4,
                'activo': True
            },
        ]

        for cargo_data in cargos:
            dept_nombre = cargo_data.pop('departamento')
            cargo_data['departamento'] = departamentos_creados[dept_nombre]
            
            cargo, created = Cargo.objects.get_or_create(
                nombre=cargo_data['nombre'],
                defaults=cargo_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado cargo: {cargo.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe cargo: {cargo.nombre}')
                )

        self.stdout.write(
            self.style.SUCCESS('Cargos básicos inicializados correctamente')
        )
