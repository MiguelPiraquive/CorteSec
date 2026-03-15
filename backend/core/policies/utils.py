"""Utilidades RBAC + ABAC para permisos"""

import hashlib
import json
from django.core.cache import cache
from django.db.models import Q

from permisos.models import Permiso, PermisoDirecto  # AsignacionPermiso removed
from roles.models import AsignacionRol


def _context_hash(contexto):
	if not contexto:
		return 'noctx'
	try:
		payload = json.dumps(contexto, default=str, sort_keys=True)
	except Exception:
		payload = str(contexto)
	return hashlib.md5(payload.encode('utf-8')).hexdigest()


def _normalize_codes(codes):
	if not codes:
		return []
	if isinstance(codes, str):
		return [codes]
	return list(codes)


def build_permission_codes(resource, action):
	if not resource or not action:
		return []
	return [
		f"{resource}.{action}",
		f"{resource}_{action}",
	]


def _permission_applicable(permiso, user):
	if not permiso.activo or not permiso.esta_vigente():
		return False

	user_org_id = getattr(user, 'organization_id', None)
	# Compatibilidad con doble campo (Organizacion y organization)
	permiso_org_id = getattr(permiso, 'Organizacion_id', None)
	tenant_org_id = getattr(permiso, 'organization_id', None)

	if permiso_org_id and user_org_id != permiso_org_id:
		return False
	if tenant_org_id and user_org_id != tenant_org_id:
		return False

	return True


def _evaluate_permiso(permiso, user, contexto=None):
	if not _permission_applicable(permiso, user):
		return False
	return permiso.puede_usar(user, contexto or {})


def check_permission(user, codes, contexto=None):
	"""Verifica si el usuario tiene el permiso según RBAC + ABAC."""
	if not user or not user.is_authenticated:
		return False

	if user.is_superuser:
		return True

	codes = _normalize_codes(codes)
	if not codes:
		return False

	cache_key = f"rbac:{user.id}:{'|'.join(sorted(codes))}:{_context_hash(contexto)}"
	cached = cache.get(cache_key)
	if cached is not None:
		return cached

	# 1) Permisos directos (deny tiene prioridad)
	direct_assignments = (
		PermisoDirecto.objects
		.filter(usuario=user, activo=True, permiso__codigo__in=codes)
		.select_related('permiso')
	)

	for asignacion in direct_assignments:
		if asignacion.tipo == 'deny' and asignacion.es_efectivo():
			cache.set(cache_key, False, 300)
			return False

	for asignacion in direct_assignments:
		if asignacion.tipo in ['grant', 'temporary'] and asignacion.es_efectivo():
			if _evaluate_permiso(asignacion.permiso, user, contexto):
				cache.set(cache_key, True, 300)
				return True

	# 2) Permisos por roles
	asignaciones_roles_qs = AsignacionRol.objects.filter(usuario=user, activa=True)
	if getattr(user, 'organization_id', None):
		asignaciones_roles_qs = asignaciones_roles_qs.filter(
			Q(tenant_id=user.organization_id) | Q(tenant_id__isnull=True) | Q(tenant_id='')
		)

	asignaciones_roles = asignaciones_roles_qs.select_related('rol')

	roles_validos = [a for a in asignaciones_roles if a.esta_vigente() and a.cumple_atributos(contexto)]
	if not roles_validos:
		cache.set(cache_key, False, 300)
		return False

	roles_ids = [a.rol_id for a in roles_validos]

	# TODO: AsignacionPermiso fue removido, verificar permisos directamente desde Rol.permisos
	# asignaciones_permisos = (
	# 	AsignacionPermiso.objects
	# 	.filter(rol_id__in=roles_ids, activo=True, permiso__codigo__in=codes)
	# 	.select_related('permiso')
	# )

	# for asignacion in asignaciones_permisos:
	# 	if asignacion.tipo == 'deny' and asignacion.es_efectivo():
	# 		cache.set(cache_key, False, 300)
	# 		return False

	# for asignacion in asignaciones_permisos:
	# 	if asignacion.tipo in ['grant', 'temporary'] and asignacion.es_efectivo():
	# 		if _evaluate_permiso(asignacion.permiso, user, contexto):
	# 			cache.set(cache_key, True, 300)
	# 			return True

	# Verificar permisos directamente desde los roles
	from roles.models import Rol
	roles = Rol.objects.filter(id__in=roles_ids, activo=True).prefetch_related('permisos')
	for rol in roles:
		for permiso in rol.permisos.filter(codigo__in=codes, activo=True):
			if _evaluate_permiso(permiso, user, contexto):
				cache.set(cache_key, True, 300)
				return True

	cache.set(cache_key, False, 300)
	return False


def get_user_permissions_cache(user):
	return cache.get(f"user-perms:{user.id}")


def invalidate_user_permissions_cache(user):
	cache.delete(f"user-perms:{user.id}")


def check_resource_action_permission(user, resource, action, contexto=None):
	codes = build_permission_codes(resource, action)
	return check_permission(user, codes, contexto)
