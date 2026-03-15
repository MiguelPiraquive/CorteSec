"""
Management command para asignar permisos dot-notation a roles base.

Asigna permisos a los roles EMPLEADO, GERENTE, SUPERVISOR
basandose en las necesidades reales de acceso del frontend.
"""

from django.core.management.base import BaseCommand
from roles.models import Rol
from permisos.models import Permiso


# Mapeo de roles a permisos dot-notation
ROLE_PERMISSIONS = {
    'EMPLEADO': [
        # Dashboard
        'dashboard.view',
        # Perfil propio
        'perfil.view',
        'perfil.change',
        # Ayuda
        'ayuda.view',
        'ayuda.add',
    ],
    'GERENTE': [
        # Todo lo de EMPLEADO
        'dashboard.view',
        'perfil.view',
        'perfil.change',
        'ayuda.view',
        'ayuda.add',
        # Empleados (leer)
        'empleados.view',
        # Cargos (leer)
        'cargos.view',
        # Contratos (leer)
        'contratos.view',
        'tipos_contrato.view',
        # Nomina (leer)
        'nomina.view',
        'conceptos_laborales.view',
        'parametros_legales.view',
        # Ubicaciones (leer)
        'departamentos.view',
        'municipios.view',
        # Prestamos (leer)
        'prestamos.view',
        'tipos_prestamo.view',
        # Items (leer)
        'items.view',
        # Contabilidad (leer)
        'contabilidad.view',
        # Documentacion
        'documentacion.view',
    ],
    'SUPERVISOR': [
        # Todo lo de GERENTE
        'dashboard.view',
        'perfil.view',
        'perfil.change',
        'ayuda.view',
        'ayuda.add',
        'empleados.view',
        'cargos.view',
        'contratos.view',
        'tipos_contrato.view',
        'nomina.view',
        'conceptos_laborales.view',
        'parametros_legales.view',
        'departamentos.view',
        'municipios.view',
        'prestamos.view',
        'tipos_prestamo.view',
        'items.view',
        'contabilidad.view',
        'documentacion.view',
        # Escritura adicional
        'empleados.add',
        'empleados.change',
        'contratos.add',
        'contratos.change',
        'tipos_contrato.add',
        'tipos_contrato.change',
        'nomina.add',
        'nomina.change',
        'nomina.calcular',
        'nomina.aprobar',
        'nomina.pagar',
        'nomina.anular',
        'conceptos_laborales.add',
        'conceptos_laborales.change',
        'parametros_legales.add',
        'parametros_legales.change',
        'prestamos.add',
        'prestamos.change',
        'tipos_prestamo.add',
        'tipos_prestamo.change',
        'cargos.add',
        'cargos.change',
        'items.add',
        'items.change',
        'contabilidad.add',
        'contabilidad.change',
        'documentacion.add',
        'documentacion.change',
        'departamentos.add',
        'departamentos.change',
        'municipios.add',
        'municipios.change',
    ],
}


class Command(BaseCommand):
    help = 'Asigna permisos dot-notation a roles EMPLEADO, GERENTE, SUPERVISOR'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar cambios sin aplicarlos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        for role_code, perm_codes in ROLE_PERMISSIONS.items():
            try:
                rol = Rol.objects.get(codigo=role_code)
            except Rol.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'Rol {role_code} no encontrado, saltando...'
                ))
                continue

            # Permisos actuales del rol (dot-notation)
            existing = set(
                rol.permisos.filter(codigo__contains='.').values_list('codigo', flat=True)
            )

            added = 0
            skipped = 0
            not_found = 0

            for code in perm_codes:
                if code in existing:
                    skipped += 1
                    continue

                try:
                    permiso = Permiso.objects.get(codigo=code, activo=True)
                    if not dry_run:
                        rol.permisos.add(permiso)
                    added += 1
                    self.stdout.write(f'  + {code}')
                except Permiso.DoesNotExist:
                    not_found += 1
                    self.stdout.write(self.style.WARNING(f'  ? {code} (no existe en DB)'))

            prefix = '[DRY RUN] ' if dry_run else ''
            self.stdout.write(self.style.SUCCESS(
                f'{prefix}{role_code}: +{added} asignados, {skipped} ya existian, {not_found} no encontrados'
            ))

            # Limpiar cache
            if not dry_run and added > 0:
                try:
                    rol.limpiar_cache_permisos()
                except Exception:
                    pass

        self.stdout.write(self.style.SUCCESS('Asignacion de permisos completada.'))
