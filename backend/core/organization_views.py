from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.models import Organizacion
from core.serializers import OrganizacionSerializer
import logging

logger = logging.getLogger(__name__)

class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizacionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Debug logging
        logger.info(f"User: {self.request.user}")
        logger.info(f"User authenticated: {self.request.user.is_authenticated}")
        logger.info(f"User organization: {getattr(self.request.user, 'organization', None)}")
        logger.info(f"User is superuser: {self.request.user.is_superuser}")
        
        # SUPERUSUARIOS pueden ver TODAS las organizaciones
        if self.request.user.is_superuser:
            logger.info("Superuser detected - returning all organizations")
            return Organizacion.objects.filter(activa=True)
        
        # Usuarios normales solo ven su organización
        if hasattr(self.request.user, 'organization') and self.request.user.organization:
            logger.info(f"Regular user - returning organization: {self.request.user.organization}")
            return Organizacion.objects.filter(id=self.request.user.organization.id)
        
        logger.info("No organization access - returning empty queryset")
        return Organizacion.objects.none()
    
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
