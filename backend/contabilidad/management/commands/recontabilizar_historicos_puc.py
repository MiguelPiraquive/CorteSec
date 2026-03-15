from django.core.management.base import BaseCommand

from contabilidad.models import ComprobanteContable, FlujoCaja
from contabilidad.models import generar_comprobante_nomina_simple, generar_comprobante_pago_prestamo
from nomina.models import NominaSimple
from prestamos.models import PagoPrestamo


class Command(BaseCommand):
    help = 'Recontabiliza históricos de nómina simple y pagos de préstamo con PUC actualizado.'

    def add_arguments(self, parser):
        parser.add_argument('--nomina', action='store_true', help='Recontabilizar nómina simple')
        parser.add_argument('--prestamos', action='store_true', help='Recontabilizar pagos de préstamo')
        parser.add_argument('--force', action='store_true', help='Forzar regeneración eliminando comprobantes previos')

    def handle(self, *args, **options):
        do_nomina = options['nomina']
        do_prestamos = options['prestamos']
        force = options['force']

        if not do_nomina and not do_prestamos:
            do_nomina = True
            do_prestamos = True

        if do_nomina:
            self._recontabilizar_nomina(force=force)

        if do_prestamos:
            self._recontabilizar_prestamos(force=force)

    def _eliminar_comprobantes(self, comprobantes):
        if not comprobantes:
            return
        FlujoCaja.objects.filter(comprobante__in=comprobantes).delete()
        comprobantes.delete()

    def _recontabilizar_nomina(self, force=False):
        nominas = NominaSimple.objects.filter(estado='pagada')
        procesadas = 0
        omitidas = 0
        errores = 0

        for nomina in nominas.iterator():
            existentes = ComprobanteContable.objects.filter(nomina_relacionada=nomina)
            if existentes.exists() and not force:
                omitidas += 1
                continue

            if existentes.exists() and force:
                self._eliminar_comprobantes(existentes)

            try:
                generar_comprobante_nomina_simple(nomina, force=True)
                procesadas += 1
            except Exception as exc:
                errores += 1
                self.stdout.write(self.style.ERROR(f'Nomina {nomina.numero}: {exc}'))

        self.stdout.write(self.style.SUCCESS(
            f'Nómina recontabilizada. Procesadas: {procesadas}, Omitidas: {omitidas}, Errores: {errores}'
        ))

    def _recontabilizar_prestamos(self, force=False):
        pagos = PagoPrestamo.objects.all()
        procesadas = 0
        omitidas = 0
        errores = 0

        for pago in pagos.iterator():
            if pago.comprobante and not force:
                omitidas += 1
                continue

            comprobantes = ComprobanteContable.objects.none()
            if pago.comprobante:
                comprobantes = ComprobanteContable.objects.filter(numero=pago.comprobante)
            else:
                comprobantes = ComprobanteContable.objects.filter(
                    prestamo_relacionado=pago.prestamo,
                    descripcion__icontains=pago.numero_pago
                )

            if comprobantes.exists() and force:
                self._eliminar_comprobantes(comprobantes)

            try:
                if force:
                    PagoPrestamo.objects.filter(pk=pago.pk).update(comprobante='')
                generar_comprobante_pago_prestamo(pago, created=True, force=True)
                procesadas += 1
            except Exception as exc:
                errores += 1
                self.stdout.write(self.style.ERROR(f'Pago {pago.numero_pago}: {exc}'))

        self.stdout.write(self.style.SUCCESS(
            f'Pagos de préstamo recontabilizados. Procesadas: {procesadas}, Omitidas: {omitidas}, Errores: {errores}'
        ))
