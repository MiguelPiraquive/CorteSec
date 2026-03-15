from django.core.management.base import BaseCommand

from nomina.models import NominaSimple


class Command(BaseCommand):
    help = 'Genera comprobantes contables faltantes para nómina simple pagada.'

    def handle(self, *args, **options):
        pendientes = NominaSimple.objects.filter(
            estado='pagada',
            comprobantes_contables__isnull=True
        )

        total = pendientes.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No hay nóminas pendientes.'))
            return

        from contabilidad.models import generar_comprobante_nomina_simple

        procesadas = 0
        for nomina in pendientes.iterator():
            generar_comprobante_nomina_simple(nomina, force=False)
            procesadas += 1

        self.stdout.write(self.style.SUCCESS(f'Comprobantes generados para {procesadas} nóminas.'))
