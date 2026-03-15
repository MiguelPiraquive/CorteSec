from django.core.management.base import BaseCommand
from django.db.models import F

from contabilidad.models import ComprobanteContable, FlujoCaja


class Command(BaseCommand):
    help = 'Pruebas rápidas de consistencia contable (balance y flujo).'

    def handle(self, *args, **options):
        desbalanceados = ComprobanteContable.objects.exclude(total_debito=F('total_credito'))
        total_desbalanceados = desbalanceados.count()

        self.stdout.write(self.style.MIGRATE_HEADING('Chequeos rápidos de contabilidad'))
        self.stdout.write(f'Comprobantes desbalanceados: {total_desbalanceados}')

        if total_desbalanceados:
            for comprobante in desbalanceados[:10]:
                self.stdout.write(
                    f" - {comprobante.numero} | Deb: {comprobante.total_debito} | Cred: {comprobante.total_credito}"
                )

        saldo_caja = FlujoCaja.get_saldo_actual()
        self.stdout.write(f'Saldo flujo caja (global): {saldo_caja}')

        self.stdout.write(self.style.SUCCESS('Chequeos completados.'))
