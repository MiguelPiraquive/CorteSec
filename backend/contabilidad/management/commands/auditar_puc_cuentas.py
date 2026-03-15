from django.core.management.base import BaseCommand

from configuracion.models import ConfiguracionGeneral
from contabilidad.models import PlanCuentas
from core.models import Organizacion


class Command(BaseCommand):
    help = 'Audita cuentas PUC requeridas por organización.'

    REQUIRED_CODES = ['1365', '237005', '238030', '2370', '421005', '4175', '1105', '5105']

    def handle(self, *args, **options):
        organizaciones = Organizacion.objects.all()
        if not organizaciones.exists():
            self.stdout.write(self.style.WARNING('No hay organizaciones registradas.'))
            return

        for org in organizaciones:
            self.stdout.write(self.style.MIGRATE_HEADING(f'Organización: {org.nombre} ({org.codigo})'))

            configuracion = ConfiguracionGeneral.objects.filter(organization=org).first()
            if not configuracion:
                self.stdout.write(self.style.ERROR('  - Falta ConfiguracionGeneral'))
                continue

            faltan_config = []
            if not configuracion.cuenta_efectivo_defecto:
                faltan_config.append('cuenta_efectivo_defecto')
            if not configuracion.cuenta_nomina_defecto:
                faltan_config.append('cuenta_nomina_defecto')
            if not configuracion.cuenta_prestamos_defecto:
                faltan_config.append('cuenta_prestamos_defecto')
            if not configuracion.cuenta_intereses_prestamo_defecto:
                faltan_config.append('cuenta_intereses_prestamo_defecto')
            if not configuracion.cuenta_mora_prestamo_defecto:
                faltan_config.append('cuenta_mora_prestamo_defecto')
            if not configuracion.cuenta_otras_deducciones_defecto:
                faltan_config.append('cuenta_otras_deducciones_defecto')

            if faltan_config:
                self.stdout.write(self.style.ERROR(f"  - Configuración incompleta: {', '.join(faltan_config)}"))
            else:
                self.stdout.write(self.style.SUCCESS('  - Configuración contable OK'))

            faltan_cuentas = []
            for codigo in self.REQUIRED_CODES:
                cuenta = PlanCuentas.objects.filter(codigo=codigo, organization=org).first()
                if not cuenta:
                    cuenta = PlanCuentas.objects.filter(codigo=codigo, organization__isnull=True).first()
                if not cuenta:
                    faltan_cuentas.append(codigo)

            if faltan_cuentas:
                self.stdout.write(self.style.ERROR(f"  - Faltan cuentas PUC: {', '.join(faltan_cuentas)}"))
            else:
                self.stdout.write(self.style.SUCCESS('  - Cuentas PUC OK'))
