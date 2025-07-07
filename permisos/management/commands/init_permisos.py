from django.core.management.base import BaseCommand
from permisos.models import Modulo, TipoPermiso, Permiso


class Command(BaseCommand):
    help = 'Inicializa módulos y permisos básicos del sistema'

    def handle(self, *args, **options):
        # Crear tipos de permiso
        tipos_permiso = [
            {'codigo': 'view', 'nombre': 'Ver'},
            {'codigo': 'add', 'nombre': 'Crear'},
            {'codigo': 'change', 'nombre': 'Editar'},
            {'codigo': 'delete', 'nombre': 'Eliminar'},
            {'codigo': 'export', 'nombre': 'Exportar'},
            {'codigo': 'import', 'nombre': 'Importar'},
            {'codigo': 'approve', 'nombre': 'Aprobar'},
            {'codigo': 'reject', 'nombre': 'Rechazar'},
        ]

        for tipo_data in tipos_permiso:
            tipo, created = TipoPermiso.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado tipo de permiso: {tipo.codigo} - {tipo.nombre}')
                )

        # Crear módulos del sistema
        modulos = [
            {
                'nombre': 'Dashboard',
                'codigo': 'dashboard',
                'descripcion': 'Panel principal del sistema',
                'icono': 'fas fa-tachometer-alt',
                'url_base': '/dashboard/',
                'orden': 1,
                'es_sistema': True
            },
            {
                'nombre': 'Nómina',
                'codigo': 'payroll',
                'descripcion': 'Gestión de nómina y empleados',
                'icono': 'fas fa-money-bill-wave',
                'url_base': '/payroll/',
                'orden': 2,
                'es_sistema': True
            },
            {
                'nombre': 'Préstamos',
                'codigo': 'prestamos',
                'descripcion': 'Gestión de préstamos a empleados',
                'icono': 'fas fa-hand-holding-usd',
                'url_base': '/prestamos/',
                'orden': 3,
                'es_sistema': True
            },
            {
                'nombre': 'Cargos',
                'codigo': 'cargos',
                'descripcion': 'Estructura jerárquica de cargos',
                'icono': 'fas fa-sitemap',
                'url_base': '/cargos/',
                'orden': 4,
                'es_sistema': True
            },
            {
                'nombre': 'Contabilidad',
                'codigo': 'contabilidad',
                'descripcion': 'Sistema contable integral',
                'icono': 'fas fa-calculator',
                'url_base': '/contabilidad/',
                'orden': 5,
                'es_sistema': True
            },
            {
                'nombre': 'Roles y Permisos',
                'codigo': 'roles',
                'descripcion': 'Gestión de roles y permisos',
                'icono': 'fas fa-user-shield',
                'url_base': '/roles/',
                'orden': 6,
                'es_sistema': True
            },
            {
                'nombre': 'Configuración',
                'codigo': 'configuracion',
                'descripcion': 'Configuración del sistema',
                'icono': 'fas fa-cogs',
                'url_base': '/configuracion/',
                'orden': 7,
                'es_sistema': True
            },
            {
                'nombre': 'Ayuda',
                'codigo': 'ayuda',
                'descripcion': 'Centro de ayuda y soporte',
                'icono': 'fas fa-question-circle',
                'url_base': '/ayuda/',
                'orden': 8,
                'es_sistema': True
            },
            {
                'nombre': 'Documentación',
                'codigo': 'documentacion',
                'descripcion': 'Gestión de documentos',
                'icono': 'fas fa-file-alt',
                'url_base': '/documentacion/',
                'orden': 9,
                'es_sistema': True
            },
        ]

        for modulo_data in modulos:
            modulo, created = Modulo.objects.get_or_create(
                codigo=modulo_data['codigo'],
                defaults=modulo_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado módulo: {modulo.codigo} - {modulo.nombre}')
                )

        # Crear permisos básicos para cada módulo
        for modulo in Modulo.objects.all():
            for tipo_permiso in TipoPermiso.objects.filter(codigo__in=['view', 'add', 'change', 'delete']):
                codigo_permiso = f"{modulo.codigo}.{tipo_permiso.codigo}"
                nombre_permiso = f"{tipo_permiso.nombre} {modulo.nombre}"
                
                permiso, created = Permiso.objects.get_or_create(
                    codigo=codigo_permiso,
                    defaults={
                        'modulo': modulo,
                        'tipo_permiso': tipo_permiso,
                        'nombre': nombre_permiso,
                        'descripcion': f"Permiso para {tipo_permiso.nombre.lower()} en {modulo.nombre}",
                        'es_sistema': True
                    }
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Creado permiso: {permiso.codigo}')
                    )

        self.stdout.write(
            self.style.SUCCESS('Módulos y permisos inicializados correctamente')
        )
