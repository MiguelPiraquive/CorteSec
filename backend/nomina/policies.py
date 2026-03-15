from core.policies import BaseAccessPolicy


class EmpleadoAccessPolicy(BaseAccessPolicy):
    id = 'nomina-empleado-policy'
    resource_name = 'empleados'


class ContratoAccessPolicy(BaseAccessPolicy):
    id = 'nomina-contrato-policy'
    resource_name = 'contratos'


class TipoContratoAccessPolicy(BaseAccessPolicy):
    id = 'nomina-tipo-contrato-policy'
    resource_name = 'tipos_contrato'


class ParametrosLegalesAccessPolicy(BaseAccessPolicy):
    id = 'nomina-parametros-legales-policy'
    resource_name = 'parametros_legales'


class ConceptoLaboralAccessPolicy(BaseAccessPolicy):
    id = 'nomina-concepto-policy'
    resource_name = 'conceptos_laborales'


class NominaAccessPolicy(BaseAccessPolicy):
    id = 'nomina-policy'
    resource_name = 'nomina'

    CUSTOM_ACTION_MAP = {
        'calcular':     'calcular',
        'aprobar':      'aprobar',
        'pagar':        'pagar',
        'anular':       'anular',
        'desprendible': 'view',
        'por_periodo':  'view',
        'estadisticas': 'view',
        'export_excel': 'view',
    }
