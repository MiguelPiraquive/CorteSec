"""
Management Command: Limpiar Asignaciones Expiradas
==================================================

Desactiva automáticamente las asignaciones de roles que están fuera
de su periodo de vigencia.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from roles.models import AsignacionRol, AuditoriaRol
from django.db import transaction


class Command(BaseCommand):
    help = 'Limpia asignaciones de roles que han expirado'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la limpieza sin hacer cambios reales'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        self.stdout.write(self.style.SUCCESS('\n=== LIMPIEZA DE ASIGNACIONES EXPIRADAS ===\n'))

        # Buscar asignaciones activas pero fuera de vigencia
        asignaciones_expiradas = AsignacionRol.objects.filter(
            activa=True,
            fecha_fin__lt=now
        ).select_related('usuario', 'rol')

        total = asignaciones_expiradas.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS('✅ No hay asignaciones expiradas'))
            return

        self.stdout.write(f'Encontradas {total} asignaciones expiradas:\n')

        for asig in asignaciones_expiradas[:10]:
            dias_expirada = (now - asig.fecha_fin).days
            self.stdout.write(
                f'  - {asig.usuario.username} → {asig.rol.nombre} '
                f'(expiró hace {dias_expirada} días)'
            )

        if total > 10:
            self.stdout.write(f'  ... y {total - 10} más\n')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 Modo DRY-RUN: No se realizarán cambios'))
            return

        # Confirmar acción
        confirm = input('\n¿Desea desactivar estas asignaciones? (s/N): ')
        if confirm.lower() != 's':
            self.stdout.write(self.style.NOTICE('Operación cancelada'))
            return

        # Desactivar asignaciones
        with transaction.atomic():
            count = 0
            for asig in asignaciones_expiradas:
                asig.activa = False
                asig.save()

                # Crear auditoría
                AuditoriaRol.objects.create(
                    rol=asig.rol,
                    usuario_afectado=asig.usuario,
                    accion='limpiar_expiradas',
                    usuario_ejecutor=None,
                    detalles_anterior={'activa': True},
                    detalles_nuevo={'activa': False},
                    justificacion='Limpieza automática de asignaciones expiradas'
                )

                count += 1

        self.stdout.write(self.style.SUCCESS(f'\n✅ Desactivadas {count} asignaciones expiradas'))
