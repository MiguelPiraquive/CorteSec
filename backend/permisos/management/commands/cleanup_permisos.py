"""
Comando para limpiar permisos y modulos huerfanos de la base de datos.
=====================================================================

Elimina permisos y modulos que ya no estan definidos en
init_frontend_permisos.py.

Uso:
  python manage.py cleanup_permisos          # Solo muestra lo que eliminaria
  python manage.py cleanup_permisos --apply  # Aplica la eliminacion
"""

from django.core.management.base import BaseCommand
from permisos.models import ModuloSistema, Permiso
from permisos.management.commands.init_frontend_permisos import MODULOS_PERMISOS


class Command(BaseCommand):
    help = 'Elimina permisos y modulos huerfanos que ya no estan en la configuracion'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Aplicar la eliminacion. Sin este flag solo muestra lo que se eliminaria (dry-run).',
        )

    def handle(self, *args, **options):
        apply = options.get('apply', False)

        # Construir set de codigos validos desde la configuracion
        valid_modulos = set()
        valid_permisos = set()

        for modulo_def in MODULOS_PERMISOS:
            codigo_modulo = modulo_def['codigo']
            valid_modulos.add(codigo_modulo)
            for accion, _, _ in modulo_def['acciones']:
                valid_permisos.add(f'{codigo_modulo}.{accion}')

        self.stdout.write(f'\nModulos validos en configuracion: {len(valid_modulos)}')
        self.stdout.write(f'Permisos validos en configuracion: {len(valid_permisos)}')
        self.stdout.write('')

        # Encontrar permisos huerfanos (en BD pero no en configuracion)
        permisos_db = Permiso.objects.filter(es_sistema=True)
        permisos_huerfanos = []
        for permiso in permisos_db:
            if permiso.codigo not in valid_permisos:
                permisos_huerfanos.append(permiso)

        # Encontrar modulos huerfanos
        modulos_db = ModuloSistema.objects.all()
        modulos_huerfanos = []
        for modulo in modulos_db:
            if modulo.codigo not in valid_modulos:
                modulos_huerfanos.append(modulo)

        if not permisos_huerfanos and not modulos_huerfanos:
            self.stdout.write(
                self.style.SUCCESS('No se encontraron permisos ni modulos huerfanos. Todo limpio.')
            )
            return

        # Mostrar permisos huerfanos
        if permisos_huerfanos:
            self.stdout.write(
                self.style.WARNING(f'Permisos huerfanos encontrados: {len(permisos_huerfanos)}')
            )
            for p in permisos_huerfanos:
                self.stdout.write(f'  - {p.codigo} ({p.nombre})')

        # Mostrar modulos huerfanos
        if modulos_huerfanos:
            self.stdout.write(
                self.style.WARNING(f'\nModulos huerfanos encontrados: {len(modulos_huerfanos)}')
            )
            for m in modulos_huerfanos:
                self.stdout.write(f'  - {m.codigo} ({m.nombre})')

        if not apply:
            self.stdout.write(
                self.style.NOTICE(
                    '\nEsto es un dry-run. Ejecuta con --apply para eliminar.'
                )
            )
            return

        # Eliminar permisos huerfanos
        if permisos_huerfanos:
            codigos = [p.codigo for p in permisos_huerfanos]
            count, _ = Permiso.objects.filter(codigo__in=codigos, es_sistema=True).delete()
            self.stdout.write(
                self.style.SUCCESS(f'\nPermisos eliminados: {count}')
            )

        # Eliminar modulos huerfanos (solo si no tienen permisos restantes)
        if modulos_huerfanos:
            eliminados = 0
            for modulo in modulos_huerfanos:
                permisos_restantes = Permiso.objects.filter(modulo=modulo).count()
                if permisos_restantes == 0:
                    modulo.delete()
                    eliminados += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  Modulo eliminado: {modulo.codigo}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  Modulo {modulo.codigo} tiene {permisos_restantes} permisos '
                            f'no-sistema, no se elimina'
                        )
                    )
            self.stdout.write(
                self.style.SUCCESS(f'Modulos eliminados: {eliminados}')
            )

        self.stdout.write(self.style.SUCCESS('\nLimpieza completada.'))
