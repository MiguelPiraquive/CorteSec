"""
Mixins de Plan Limits para ViewSets — CorteSec
================================================

Mixins reutilizables para ViewSets que necesitan
validar límites de plan antes de crear recursos.
"""

import logging

from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger('billing')


class PlanLimitMixin:
    """
    Mixin para ViewSets que valida límites del plan
    antes de permitir create().
    
    Configurar en la subclase:
        plan_limit_metric = 'max_empleados'       # feature_code a validar
        plan_limit_count_model = Empleado          # Modelo para contar
        plan_limit_count_filter = {}               # Filtros adicionales
    
    Ejemplo:
        class EmpleadoViewSet(PlanLimitMixin, ModelViewSet):
            plan_limit_metric = 'max_empleados'
            plan_limit_count_model = Empleado
    """

    plan_limit_metric = None
    plan_limit_count_model = None
    plan_limit_count_filter = {}

    def create(self, request, *args, **kwargs):
        if self.plan_limit_metric:
            error = self._check_plan_limit(request)
            if error:
                return error
        return super().create(request, *args, **kwargs)

    def _check_plan_limit(self, request):
        """Verifica si se excede el límite del plan. Retorna Response de error o None."""
        user = request.user
        if not user.is_authenticated:
            return None

        # Superusers no tienen límites
        if user.is_superuser or user.is_staff:
            return None

        org = getattr(user, 'organization', None)
        if not org:
            return None

        from billing.models import PlanFeature

        try:
            feature = PlanFeature.objects.get(
                plan=org.plan,
                feature_code=self.plan_limit_metric,
            )
        except PlanFeature.DoesNotExist:
            return None

        if not feature.enabled:
            return Response(
                {
                    'error': f'Tu plan ({org.plan.name}) no incluye esta funcionalidad.',
                    'code': 'feature_not_available',
                    'metric': self.plan_limit_metric,
                    'required_upgrade': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if feature.limit_value is None:
            return None

        # Contar recursos actuales
        current_count = self._get_current_count(org)

        if current_count >= feature.limit_value:
            return Response(
                {
                    'error': (
                        f'Has alcanzado el límite de {feature.limit_value} '
                        f'{feature.feature_name.lower()} de tu plan ({org.plan.name}).'
                    ),
                    'code': 'plan_limit_reached',
                    'metric': self.plan_limit_metric,
                    'current': current_count,
                    'limit': feature.limit_value,
                    'required_upgrade': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _get_current_count(self, org):
        """Cuenta los recursos actuales para la organización."""
        if self.plan_limit_count_model:
            qs = self.plan_limit_count_model.objects.filter(
                organization=org,
                **self.plan_limit_count_filter,
            )
            return qs.count()

        # Fallback: buscar en UsageRecord
        from billing.models import UsageRecord
        try:
            usage = UsageRecord.objects.get(
                organization=org,
                metric=self.plan_limit_metric,
            )
            return usage.current_value
        except UsageRecord.DoesNotExist:
            return 0


class FeatureGateMixin:
    """
    Mixin que bloquea acceso COMPLETO al ViewSet si el feature no está habilitado.
    
    Configurar en la subclase:
        required_feature = 'nomina_electronica'
    
    Ejemplo:
        class NominaElectronicaViewSet(FeatureGateMixin, ModelViewSet):
            required_feature = 'nomina_electronica'
    """

    required_feature = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.required_feature:
            self._check_feature_access(request)

    def _check_feature_access(self, request):
        """Verifica acceso al feature."""
        user = request.user
        if not user.is_authenticated:
            return

        if user.is_superuser or user.is_staff:
            return

        org = getattr(user, 'organization', None)
        if not org:
            return

        from billing.models import PlanFeature

        try:
            feature = PlanFeature.objects.get(
                plan=org.plan,
                feature_code=self.required_feature,
            )
            if not feature.enabled:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    detail={
                        'error': f'Tu plan ({org.plan.name}) no incluye {feature.feature_name}.',
                        'code': 'feature_not_available',
                        'feature': self.required_feature,
                        'required_upgrade': True,
                    }
                )
        except PlanFeature.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                detail={
                    'error': 'Esta funcionalidad no está disponible en tu plan actual.',
                    'code': 'feature_not_available',
                    'feature': self.required_feature,
                    'required_upgrade': True,
                }
            )
