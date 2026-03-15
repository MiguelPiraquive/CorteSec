"""
Management Command: Listar Usuarios Sin Roles
=============================================

Lista todos los usuarios activos que no tienen roles ni permisos asignados.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
import csv
from datetime import datetime

User = get_user_model()


class Command(BaseCommand):
    help = 'Lista usuarios activos sin roles ni permisos asignados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--exportar',
            type=str,
            help='Archivo CSV donde exportar la lista'
        )
        parser.add_argument(
            '--incluir-inactivos',
            action='store_true',
            help='Incluir también usuarios inactivos'
        )

    def handle(self, *args, **options):
        exportar = options.get('exportar')
        incluir_inactivos = options['incluir_inactivos']

        self.stdout.write(self.style.SUCCESS('\n=== USUARIOS SIN ROLES NI PERMISOS ===\n'))

        # Query para usuarios sin protección
        query = User.objects.annotate(
            num_roles=Count('asignaciones_rol', filter=Q(asignaciones_rol__activa=True)),
            num_permisos_directos=Count('permisos_directos', filter=Q(permisos_directos__activo=True))
        ).filter(
            num_roles=0,
            num_permisos_directos=0,
            is_superuser=False
        )

        if not incluir_inactivos:
            query = query.filter(is_active=True)

        usuarios = query.order_by('date_joined')
        total = usuarios.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS('✅ Todos los usuarios tienen roles o permisos asignados'))
            return

        self.stdout.write(f'Total de usuarios sin protección: {total}\n')

        # Mostrar en consola
        self.stdout.write(f"{'Username':<20} {'Email':<35} {'Activo':<8} {'Fecha registro'}")
        self.stdout.write('-' * 80)

        for usuario in usuarios[:50]:
            activo = '✓' if usuario.is_active else '✗'
            fecha = usuario.date_joined.strftime('%Y-%m-%d')
            organizacion = getattr(usuario, 'organization', None) or getattr(usuario, 'organizacion', None)
            org_str = f" (Org: {organizacion})" if organizacion else ""

            self.stdout.write(
                f"{usuario.username[:19]:<20} {usuario.email[:34]:<35} {activo:<8} {fecha}{org_str}"
            )

        if total > 50:
            self.stdout.write(f'\n... y {total - 50} usuarios más')

        # Exportar a CSV si se solicita
        if exportar:
            self.exportar_csv(usuarios, exportar)

        # Sugerencias
        self.stdout.write(self.style.WARNING(
            f'\n⚠️  Estos usuarios no pueden acceder a ninguna funcionalidad del sistema'
        ))
        self.stdout.write('\nAcciones sugeridas:')
        self.stdout.write('  1. Asignar roles apropiados usando: python manage.py asignar_rol <username> <rol>')
        self.stdout.write('  2. Asignar permisos directos si es necesario')
        self.stdout.write('  3. Desactivar usuarios si no son necesarios\n')

    def exportar_csv(self, usuarios, archivo):
        try:
            with open(archivo, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'ID', 'Username', 'Email', 'Nombre', 'Apellido',
                    'Activo', 'Superuser', 'Fecha Registro', 'Organización'
                ])

                for usuario in usuarios:
                    organizacion = getattr(usuario, 'organization', None) or getattr(usuario, 'organizacion', None)
                    writer.writerow([
                        usuario.id,
                        usuario.username,
                        usuario.email,
                        getattr(usuario, 'nombre', ''),
                        getattr(usuario, 'apellido', ''),
                        usuario.is_active,
                        usuario.is_superuser,
                        usuario.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
                        str(organizacion) if organizacion else ''
                    ])

            self.stdout.write(self.style.SUCCESS(f'\n✅ Lista exportada a: {archivo}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error al exportar: {str(e)}'))
