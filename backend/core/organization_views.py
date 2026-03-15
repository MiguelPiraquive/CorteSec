from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from core.models import Organizacion, Plan, PlanChangeLog
from core.serializers import OrganizacionSerializer
from core.pagination import StandardResultsSetPagination
from core.policies import OrganizacionesAccessPolicy
import logging

logger = logging.getLogger(__name__)

class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizacionSerializer
    permission_classes = [OrganizacionesAccessPolicy]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        # Debug logging
        logger.info(f"User: {self.request.user}")
        logger.info(f"User authenticated: {self.request.user.is_authenticated}")
        logger.info(f"User organization: {getattr(self.request.user, 'organization', None)}")
        logger.info(f"User is superuser: {self.request.user.is_superuser}")
        
        # SUPERUSUARIOS pueden ver TODAS las organizaciones
        if self.request.user.is_superuser:
            logger.info("Superuser detected - returning all organizations")
            queryset = Organizacion.objects.all()
        # Usuarios normales solo ven su organización
        elif hasattr(self.request.user, 'organization') and self.request.user.organization:
            logger.info(f"Regular user - returning organization: {self.request.user.organization}")
            queryset = Organizacion.objects.filter(id=self.request.user.organization.id)
        else:
            logger.info("No organization access - returning empty queryset")
            return Organizacion.objects.none()

        search = self.request.query_params.get('search')
        activa = self.request.query_params.get('activa')

        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(codigo__icontains=search) |
                Q(razon_social__icontains=search) |
                Q(nit__icontains=search) |
                Q(email__icontains=search)
            )

        if activa in ['true', 'false']:
            queryset = queryset.filter(activa=activa == 'true')

        return queryset.order_by('nombre')
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Obtener la organización actual del usuario"""
        organization = getattr(request.user, 'organization', None)
        if not organization:
            return Response(
                {"detail": "No current organization set"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(organization)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def switch(self, request):
        """Cambiar la organización actual del usuario"""
        organization_id = request.data.get('organization_id')
        if not organization_id:
            return Response(
                {"detail": "organization_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            organization = self.get_queryset().get(pk=organization_id)
            request.user.organization = organization
            request.user.save()
            serializer = self.get_serializer(organization)
            return Response(serializer.data)
        except Organizacion.DoesNotExist:
            return Response(
                {"detail": "Organization not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def set_plan(self, request, pk=None):
        """Actualizar plan y límites de la organización (requiere organizaciones.admin)."""
        organization = self.get_object()
        previous_plan = organization.plan.code if organization.plan_id else ''
        previous_limits = {
            'max_users': organization.max_users,
            'max_storage_mb': organization.max_storage_mb,
        }
        plan = request.data.get('plan') or request.data.get('plan_code')
        max_users = request.data.get('max_users')
        max_storage_mb = request.data.get('max_storage_mb')
        is_trial = request.data.get('is_trial')
        trial_ends_at = request.data.get('trial_ends_at')
        settings_payload = request.data.get('settings')

        plan_obj = None
        if plan:
            plan_obj = Plan.objects.filter(code=plan, is_active=True).first()
            if not plan_obj:
                return Response(
                    {"detail": "Plan inválido"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if plan_obj:
            organization.plan = plan_obj
            if max_users is None:
                organization.max_users = plan_obj.max_users
            if max_storage_mb is None:
                organization.max_storage_mb = plan_obj.max_storage_mb
        if max_users is not None:
            organization.max_users = int(max_users)
        if max_storage_mb is not None:
            organization.max_storage_mb = int(max_storage_mb)
        if is_trial is not None:
            organization.is_trial = bool(is_trial)
        if trial_ends_at:
            organization.trial_ends_at = trial_ends_at
        if settings_payload is not None:
            organization.settings = settings_payload

        # Validar límites actuales de usuarios
        current_users = organization.users.count()
        if organization.max_users and current_users > organization.max_users:
            return Response(
                {"detail": "El límite de usuarios del plan es menor al número actual de usuarios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.save()

        if plan_obj:
            PlanChangeLog.objects.create(
                organization=organization,
                changed_by=request.user,
                previous_plan=previous_plan,
                new_plan=plan_obj.code,
                previous_limits=previous_limits,
                new_limits={
                    'max_users': organization.max_users,
                    'max_storage_mb': organization.max_storage_mb,
                },
                note='Cambio manual desde set_plan'
            )
        serializer = self.get_serializer(organization)
        return Response(serializer.data)
