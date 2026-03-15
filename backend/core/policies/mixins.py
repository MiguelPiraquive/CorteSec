"""Mixins RBAC/ABAC"""
from .utils import check_resource_action_permission


class RBACPermissionMixin:
	"""Mixin que verifica permisos RBAC/ABAC por recurso/acción."""

	resource_name = None

	def has_rbac_permission(self, request, action, contexto=None):
		if not self.resource_name:
			return True
		return check_resource_action_permission(
			request.user,
			self.resource_name,
			action,
			contexto=contexto,
		)


class PermisosDirectosMixin:
	"""Mixin para permitir direct permissions adicionales."""

	extra_permission_codes = []

	def get_extra_permission_codes(self):
		return list(self.extra_permission_codes or [])
