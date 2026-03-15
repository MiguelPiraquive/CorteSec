from core.policies import BaseAccessPolicy
from core.policies.utils import build_permission_codes


class DepartamentoAccessPolicy(BaseAccessPolicy):
    id = 'locations-departamento-policy'
    resource_name = 'departamentos'


class MunicipioAccessPolicy(BaseAccessPolicy):
    id = 'locations-municipio-policy'
    resource_name = 'municipios'


class ImportLocationsAccessPolicy(BaseAccessPolicy):
    """Policy for Excel import endpoint — accepts departamentos.add OR municipios.add."""
    id = 'locations-import-policy'
    resource_name = 'departamentos'

    def _get_permission_codes(self, action):
        codes = build_permission_codes('departamentos', action)
        codes.extend(build_permission_codes('municipios', action))
        return codes


# Alias for backward compatibility
LocationsAccessPolicy = DepartamentoAccessPolicy
