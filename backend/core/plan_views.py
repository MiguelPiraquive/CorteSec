from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from core.policies.core_access import CoreAccessPolicy
from core.models import Plan, PlanChangeLog
from core.serializers import PlanSerializer, PlanChangeLogSerializer


class PlanViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de planes SaaS (solo staff)."""
    serializer_class = PlanSerializer
    permission_classes = [CoreAccessPolicy, IsAdminUser]
    queryset = Plan.objects.all().order_by('sort_order', 'price_monthly_cop', 'name')


class PlanChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial de cambios de plan (solo staff)."""
    serializer_class = PlanChangeLogSerializer
    permission_classes = [CoreAccessPolicy, IsAdminUser]

    def get_queryset(self):
        queryset = PlanChangeLog.objects.select_related('organization', 'changed_by')
        org_id = self.request.query_params.get('organization')
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
        return queryset.order_by('-created_at')
