"""
Decorators de Feature Gate y Plan Limits — CorteSec
=====================================================

Decoradores para proteger views que requieren features
específicos del plan o que tienen límites numéricos.
"""

import functools
import logging

from django.http import JsonResponse

logger = logging.getLogger('billing')


def require_feature(feature_code):
    """
    Decorator que bloquea acceso si el plan no tiene el feature.
    
    Uso:
        @require_feature('nomina_electronica')
        def generar_nomina_electronica(request):
            ...
    
    Para CBV:
        @method_decorator(require_feature('nomina_electronica'))
        def post(self, request):
            ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Extraer request si es un método de clase (self, request, ...)
            actual_request = request
            if hasattr(request, 'user') is False and len(args) > 0:
                actual_request = args[0]

            user = getattr(actual_request, 'user', None)
            if not user or not user.is_authenticated:
                return view_func(request, *args, **kwargs)

            # Superusers pueden todo
            if user.is_superuser or user.is_staff:
                return view_func(request, *args, **kwargs)

            org = getattr(user, 'organization', None)
            if not org:
                return view_func(request, *args, **kwargs)

            # Verificar feature
            from billing.models import PlanFeature
            try:
                feature = PlanFeature.objects.get(
                    plan=org.plan,
                    feature_code=feature_code,
                )
                if not feature.enabled:
                    return JsonResponse({
                        'error': f'Tu plan ({org.plan.name}) no incluye esta funcionalidad.',
                        'code': 'feature_not_available',
                        'feature': feature_code,
                        'required_upgrade': True,
                    }, status=403)
            except PlanFeature.DoesNotExist:
                # Feature no definido para este plan = no disponible
                return JsonResponse({
                    'error': f'Esta funcionalidad no está disponible en tu plan actual.',
                    'code': 'feature_not_available',
                    'feature': feature_code,
                    'required_upgrade': True,
                }, status=403)

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_plan_limit(metric, get_current_count=None):
    """
    Decorator que valida límites numéricos del plan antes de crear recursos.
    
    Uso:
        @require_plan_limit('users')
        def create_user(request):
            ...
    
    Args:
        metric: Código del feature que tiene limit_value (ej: 'max_empleados')
        get_current_count: Función(org) que retorna el conteo actual.
                          Si None, usa UsageRecord.
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            actual_request = request
            if hasattr(request, 'user') is False and len(args) > 0:
                actual_request = args[0]

            user = getattr(actual_request, 'user', None)
            if not user or not user.is_authenticated:
                return view_func(request, *args, **kwargs)

            if user.is_superuser or user.is_staff:
                return view_func(request, *args, **kwargs)

            org = getattr(user, 'organization', None)
            if not org:
                return view_func(request, *args, **kwargs)

            # Solo bloquear en métodos de escritura
            if actual_request.method in ('GET', 'HEAD', 'OPTIONS'):
                return view_func(request, *args, **kwargs)

            # Verificar límite de usuarios directamente
            if metric == 'users':
                current = org.usuarios_count
                limit = org.max_users
                if current >= limit:
                    return JsonResponse({
                        'error': f'Has alcanzado el límite de {limit} usuarios de tu plan ({org.plan.name}).',
                        'code': 'plan_limit_reached',
                        'metric': metric,
                        'current': current,
                        'limit': limit,
                        'required_upgrade': True,
                    }, status=403)
                return view_func(request, *args, **kwargs)

            # Para otros límites, buscar en PlanFeature
            from billing.models import PlanFeature, UsageRecord
            try:
                feature = PlanFeature.objects.get(
                    plan=org.plan,
                    feature_code=metric,
                )
            except PlanFeature.DoesNotExist:
                return view_func(request, *args, **kwargs)

            if not feature.enabled:
                return JsonResponse({
                    'error': f'Tu plan ({org.plan.name}) no incluye esta funcionalidad.',
                    'code': 'feature_not_available',
                    'metric': metric,
                    'required_upgrade': True,
                }, status=403)

            if feature.limit_value is None:
                # Sin límite numérico, solo feature flag
                return view_func(request, *args, **kwargs)

            # Obtener conteo actual
            if get_current_count:
                current = get_current_count(org)
            else:
                try:
                    usage = UsageRecord.objects.get(
                        organization=org, metric=metric,
                    )
                    current = usage.current_value
                except UsageRecord.DoesNotExist:
                    current = 0

            if current >= feature.limit_value:
                return JsonResponse({
                    'error': f'Has alcanzado el límite de {feature.limit_value} {feature.feature_name.lower()} de tu plan ({org.plan.name}).',
                    'code': 'plan_limit_reached',
                    'metric': metric,
                    'current': current,
                    'limit': feature.limit_value,
                    'required_upgrade': True,
                }, status=403)

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
