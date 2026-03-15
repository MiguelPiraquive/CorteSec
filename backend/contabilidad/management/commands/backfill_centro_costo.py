from django.core.management.base import BaseCommand
from django.db import connection

from contabilidad.models import CentroCosto


class Command(BaseCommand):
    help = 'Backfill de centro de costo en movimientos contables (texto -> FK).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo muestra cambios sin aplicar actualizaciones.'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        centros_por_codigo = {
            centro.codigo: centro.id
            for centro in CentroCosto.objects.all()
        }

        if not centros_por_codigo:
            self.stdout.write(self.style.WARNING('No hay centros de costo para mapear.'))
            return

        table_name = 'contabilidad_movimientocontable'
        with connection.cursor() as cursor:
            columns = [
                col.name
                for col in connection.introspection.get_table_description(cursor, table_name)
            ]

        if 'centro_costo' in columns:
            centro_col = 'centro_costo'
        elif 'centro_costo_id' in columns:
            centro_col = 'centro_costo_id'
        else:
            self.stdout.write(self.style.WARNING('No se encontró columna de centro de costo.'))
            return

        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT id, {centro_col} FROM {table_name} WHERE {centro_col} IS NOT NULL"
            )
            rows = cursor.fetchall()

        actualizados = 0
        sin_mapeo = 0

        for movimiento_id, centro_valor in rows:
            if centro_valor is None:
                continue

            try:
                centro_valor_str = str(centro_valor).strip()
            except Exception:
                centro_valor_str = ''

            # Si ya es un FK válido, continuar
            if centro_valor_str.isdigit():
                centro_id = int(centro_valor_str)
                if centro_id in centros_por_codigo.values():
                    continue

            centro_id = centros_por_codigo.get(centro_valor_str)
            if not centro_id:
                sin_mapeo += 1
                continue

            actualizados += 1
            if dry_run:
                continue

            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE {table_name} SET {centro_col} = %s WHERE id = %s",
                    [centro_id, movimiento_id]
                )

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry run: {actualizados} registros se actualizarían."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Actualizados: {actualizados} registros."))

        if sin_mapeo:
            self.stdout.write(self.style.WARNING(f"Sin mapeo: {sin_mapeo} registros."))
