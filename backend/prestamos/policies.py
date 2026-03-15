from core.policies import BaseAccessPolicy


class TipoPrestamoAccessPolicy(BaseAccessPolicy):
    id = 'prestamo-tipo-policy'
    resource_name = 'tipos_prestamo'


class PrestamoAccessPolicy(BaseAccessPolicy):
    id = 'prestamo-policy'
    resource_name = 'prestamos'


class PagoPrestamoAccessPolicy(BaseAccessPolicy):
    id = 'prestamo-pago-policy'
    resource_name = 'prestamos'
