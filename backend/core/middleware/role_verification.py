"""
Middleware para verificar vigencia y atributos de asignaciones de rol.
"""
from django.utils import timezone
import logging

logger = logging.getLogger('security')


class RoleVerificationMiddleware:
    """
    Verifica en cada request:
    - Vigencia de asignaciones de rol
    - Restricciones horarias/días
    - Atributos ABAC
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.excluded_paths = [
            '/api/auth/',
            '/login/',
            '/logout/',
            '/admin/',
            '/static/',
            '/media/',
        ]

    def __call__(self, request):
        if request.user.is_authenticated and not self._is_excluded(request.path):
            self._verify_roles(request)
        return self.get_response(request)

    def _is_excluded(self, path):
        return any(path.startswith(excluded) for excluded in self.excluded_paths)

    def _verify_roles(self, request):
        try:
            from roles.models import AsignacionRol
        except Exception as exc:
            logger.warning(f"Roles no disponibles para verificación: {exc}")
            return

        asignaciones = AsignacionRol.objects.filter(usuario=request.user, activa=True)
        now = timezone.now()
        estado_expirado, _ = None, None

        for asignacion in asignaciones:
            if not asignacion.esta_vigente():
                if estado_expirado is None:
                    from roles.models import EstadoAsignacion
                    estado_expirado, _ = EstadoAsignacion.objects.get_or_create(
                        nombre='Expirada',
                        defaults={'activo': False, 'color': '#ef4444'}
                    )
                asignacion.activa = False
                asignacion.estado = estado_expirado
                asignacion.save(update_fields=['activa', 'estado'])
                logger.info(
                    f"Asignación expirada desactivada: user={request.user.id} rol={asignacion.rol_id}"
                )
            else:
                if not asignacion.cumple_atributos({'request': request, 'user': request.user}):
                    logger.info(
                        f"Asignación no cumple atributos: user={request.user.id} rol={asignacion.rol_id}"
                    )
