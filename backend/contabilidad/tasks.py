import logging

from celery import shared_task
from django.db.models import F

from configuracion.models import ConfiguracionGeneral
from contabilidad.models import PlanCuentas, ComprobanteContable, FlujoCaja
from core.models import Organizacion

logger = logging.getLogger(__name__)


REQUIRED_CODES = ['1365', '237005', '238030', '2370', '421005', '4175', '1105', '5105']
REQUIRED_CONFIG_FIELDS = [
    'cuenta_efectivo_defecto',
    'cuenta_nomina_defecto',
    'cuenta_prestamos_defecto',
    'cuenta_intereses_prestamo_defecto',
    'cuenta_mora_prestamo_defecto',
    'cuenta_otras_deducciones_defecto',
]


def _auditar_puc(label):
    organizaciones = Organizacion.objects.all()
    if not organizaciones.exists():
        logger.warning('[%s] Sin organizaciones registradas', label)
        return

    for org in organizaciones:
        configuracion = ConfiguracionGeneral.objects.filter(organization=org).first()
        faltan_config = []
        if not configuracion:
            faltan_config = list(REQUIRED_CONFIG_FIELDS)
        else:
            for field in REQUIRED_CONFIG_FIELDS:
                if not getattr(configuracion, field, None):
                    faltan_config.append(field)

        faltan_cuentas = []
        for codigo in REQUIRED_CODES:
            cuenta = PlanCuentas.objects.filter(codigo=codigo, organization=org).first()
            if not cuenta:
                cuenta = PlanCuentas.objects.filter(codigo=codigo, organization__isnull=True).first()
            if not cuenta:
                faltan_cuentas.append(codigo)

        if faltan_config or faltan_cuentas:
            logger.warning(
                '[%s] Org %s: faltan_config=%s, faltan_cuentas=%s',
                label,
                org.codigo,
                faltan_config,
                faltan_cuentas,
            )
        else:
            logger.info('[%s] Org %s: PUC OK', label, org.codigo)

    desbalanceados = ComprobanteContable.objects.exclude(total_debito=F('total_credito')).count()
    saldo_caja = FlujoCaja.get_saldo_actual()
    logger.info('[%s] Desbalanceados=%s, SaldoCaja=%s', label, desbalanceados, saldo_caja)


@shared_task
def auditoria_puc_diaria():
    _auditar_puc('DIARIA')


@shared_task
def auditoria_puc_semanal():
    _auditar_puc('SEMANAL')
