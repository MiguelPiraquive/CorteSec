from django.core.management.base import BaseCommand
from ayuda.models import CategoriaAyuda, ArticuloAyuda


class Command(BaseCommand):
    help = 'Inicializa contenido básico de ayuda del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina el contenido de ayuda existente antes de crear nuevo',
        )

    def handle(self, *args, **options):
        if options['reset']:
            ArticuloAyuda.objects.all().delete()
            CategoriaAyuda.objects.all().delete()
            self.stdout.write(
                self.style.WARNING('Contenido de ayuda existente eliminado')
            )

        # Crear categorías de ayuda
        categorias = [
            {
                'nombre': 'Configuración',
                'descripcion': 'Ayuda sobre configuración del sistema',
                'icono': 'fas fa-cog',
                'orden': 1,
                'activo': True
            },
            {
                'nombre': 'Usuarios y Perfiles',
                'descripcion': 'Gestión de usuarios y perfiles',
                'icono': 'fas fa-users',
                'orden': 2,
                'activo': True
            },
            {
                'nombre': 'Nómina',
                'descripcion': 'Sistema de nómina y pagos',
                'icono': 'fas fa-money-bill',
                'orden': 3,
                'activo': True
            },
            {
                'nombre': 'Contabilidad',
                'descripcion': 'Módulo contable y financiero',
                'icono': 'fas fa-calculator',
                'orden': 4,
                'activo': True
            },
            {
                'nombre': 'Inventarios',
                'descripcion': 'Gestión de items e inventarios',
                'icono': 'fas fa-boxes',
                'orden': 5,
                'activo': True
            },
            {
                'nombre': 'Préstamos',
                'descripcion': 'Sistema de préstamos a empleados',
                'icono': 'fas fa-hand-holding-usd',
                'orden': 6,
                'activo': True
            },
            {
                'nombre': 'Reportes',
                'descripcion': 'Generación de reportes',
                'icono': 'fas fa-chart-bar',
                'orden': 7,
                'activo': True
            },
            {
                'nombre': 'Preguntas Frecuentes',
                'descripcion': 'Preguntas más comunes',
                'icono': 'fas fa-question-circle',
                'orden': 8,
                'activo': True
            },
        ]

        categorias_creadas = {}
        for cat_data in categorias:
            categoria, created = CategoriaAyuda.objects.get_or_create(
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

        # Crear artículos de ayuda
        articulos = [
            {
                'titulo': 'Configuración inicial del sistema',
                'contenido': '''
                <h3>Configuración inicial del sistema CorteSec</h3>
                <p>Para comenzar a usar el sistema, siga estos pasos:</p>
                <ol>
                    <li>Configure los datos básicos de la empresa</li>
                    <li>Cree los roles y permisos necesarios</li>
                    <li>Configure los tipos de nómina</li>
                    <li>Establezca el plan de cuentas contables</li>
                </ol>
                ''',
                'categoria': 'Configuración',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': 'Cómo crear un nuevo usuario',
                'contenido': '''
                <h3>Creación de usuarios</h3>
                <p>Para crear un nuevo usuario en el sistema:</p>
                <ol>
                    <li>Vaya al módulo de Usuarios</li>
                    <li>Haga clic en "Nuevo Usuario"</li>
                    <li>Complete los datos básicos</li>
                    <li>Asigne roles y permisos</li>
                    <li>Guarde los cambios</li>
                </ol>
                ''',
                'categoria': 'Usuarios y Perfiles',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': 'Proceso de nómina mensual',
                'contenido': '''
                <h3>Cómo procesar la nómina mensual</h3>
                <p>Pasos para procesar la nómina:</p>
                <ol>
                    <li>Verifique las novedades del mes</li>
                    <li>Genere la prenómina</li>
                    <li>Revise y ajuste conceptos</li>
                    <li>Procese la nómina definitiva</li>
                    <li>Genere los comprobantes</li>
                </ol>
                ''',
                'categoria': 'Nómina',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': 'Configuración del plan de cuentas',
                'contenido': '''
                <h3>Plan de cuentas contables</h3>
                <p>Para configurar el plan de cuentas:</p>
                <ol>
                    <li>Acceda al módulo de Contabilidad</li>
                    <li>Vaya a "Plan de Cuentas"</li>
                    <li>Cree las cuentas principales</li>
                    <li>Configure las subcuentas</li>
                    <li>Defina la naturaleza de cada cuenta</li>
                </ol>
                ''',
                'categoria': 'Contabilidad',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': 'Gestión de inventarios',
                'contenido': '''
                <h3>Administración de inventarios</h3>
                <p>Para gestionar los inventarios:</p>
                <ol>
                    <li>Configure categorías de items</li>
                    <li>Defina unidades de medida</li>
                    <li>Registre los items</li>
                    <li>Configure stocks mínimos</li>
                    <li>Realice movimientos de inventario</li>
                </ol>
                ''',
                'categoria': 'Inventarios',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': '¿Cómo funciona el sistema?',
                'contenido': '''
                <h3>Funcionamiento general del sistema</h3>
                <p>CorteSec es un sistema integral de gestión empresarial que incluye:</p>
                <ul>
                    <li>Gestión de recursos humanos</li>
                    <li>Procesamiento de nómina</li>
                    <li>Contabilidad y finanzas</li>
                    <li>Control de inventarios</li>
                    <li>Sistema de préstamos</li>
                    <li>Generación de reportes</li>
                </ul>
                ''',
                'categoria': 'Preguntas Frecuentes',
                'orden': 1,
                'activo': True
            },
            {
                'titulo': '¿Cómo restablecer mi contraseña?',
                'contenido': '''
                <h3>Restablecimiento de contraseña</h3>
                <p>Si olvidó su contraseña:</p>
                <ol>
                    <li>En la pantalla de login, haga clic en "¿Olvidó su contraseña?"</li>
                    <li>Ingrese su nombre de usuario o email</li>
                    <li>Revise su correo electrónico</li>
                    <li>Siga las instrucciones del email</li>
                    <li>Establezca una nueva contraseña</li>
                </ol>
                ''',
                'categoria': 'Preguntas Frecuentes',
                'orden': 2,
                'activo': True
            },
        ]

        for articulo_data in articulos:
            cat_nombre = articulo_data.pop('categoria')
            articulo_data['categoria'] = categorias_creadas[cat_nombre]
            
            articulo, created = ArticuloAyuda.objects.get_or_create(
                titulo=articulo_data['titulo'],
                defaults=articulo_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado artículo: {articulo.titulo}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe artículo: {articulo.titulo}')
                )

        self.stdout.write(
            self.style.SUCCESS('Contenido básico de ayuda inicializado correctamente')
        )
