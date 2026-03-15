from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from .models import Notificacion
from .serializers import NotificacionSerializer
from .pagination import StandardResultsSetPagination
import logging

logger = logging.getLogger(__name__)


class NotificacionViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    """API para gestión de notificaciones del usuario actual.
    
    Soporta filtrado por tipo, categoría, prioridad y estado de lectura.
    Incluye acciones para marcar leída/no leída, borrar leídas y estadísticas.
    """
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def _get_base_queryset(self):
        """Queryset base con filtros multi-tenant y expiración."""
        user = self.request.user
        qs = Notificacion.objects.filter(usuario=user)
        if hasattr(user, 'organization') and user.organization:
            qs = qs.filter(
                Q(organization=user.organization) | Q(organization__isnull=True)
            )
        qs = qs.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        return qs

    def get_queryset(self):
        queryset = self._get_base_queryset()

        tipo = self.request.query_params.get('tipo')
        categoria = self.request.query_params.get('categoria')
        prioridad = self.request.query_params.get('prioridad')
        leida = self.request.query_params.get('leida')
        ordering = self.request.query_params.get('ordering', '-fecha')

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        if categoria:
            queryset = queryset.filter(categoria=categoria)

        if prioridad:
            queryset = queryset.filter(prioridad=prioridad)

        if leida in ['true', 'false']:
            queryset = queryset.filter(leida=leida == 'true')

        allowed_ordering = {
            'fecha', '-fecha', 'titulo', '-titulo', 'tipo', '-tipo',
            'leida', '-leida', 'prioridad', '-prioridad', 'categoria', '-categoria'
        }
        if ordering not in allowed_ordering:
            ordering = '-fecha'

        return queryset.order_by(ordering)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marcar una notificación como leída."""
        notificacion = self.get_object()
        notificacion.marcar_como_leida()
        return Response({'success': True})

    @action(detail=True, methods=['post'])
    def mark_unread(self, request, pk=None):
        """Marcar una notificación como no leída."""
        notificacion = self.get_object()
        notificacion.marcar_como_no_leida()
        return Response({'success': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marcar todas las notificaciones como leídas."""
        count = self._get_base_queryset().filter(leida=False).update(
            leida=True,
            fecha_leida=timezone.now()
        )
        return Response({'success': True, 'updated': count})

    @action(detail=False, methods=['delete'], url_path='delete-read')
    def delete_read(self, request):
        """Eliminar todas las notificaciones leídas."""
        count, _ = self._get_base_queryset().filter(leida=True).delete()
        return Response({'success': True, 'deleted': count})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de notificaciones con desglose por categoría, tipo y prioridad."""
        base_qs = self._get_base_queryset()

        total = base_qs.count()
        no_leidas = base_qs.filter(leida=False).count()
        urgentes = base_qs.filter(leida=False, prioridad='urgente').count()

        por_tipo_list = list(
            base_qs.values('tipo').annotate(count=Count('id')).order_by('-count')
        )

        por_categoria_list = list(
            base_qs.values('categoria').annotate(count=Count('id')).order_by('-count')
        )

        por_prioridad_list = list(
            base_qs.values('prioridad').annotate(count=Count('id')).order_by('-count')
        )

        # Convertir a dicts simples para el frontend
        por_tipo = {item['tipo']: item['count'] for item in por_tipo_list}
        por_categoria = {item['categoria']: item['count'] for item in por_categoria_list}
        por_prioridad = {item['prioridad']: item['count'] for item in por_prioridad_list}

        return Response({
            'total': total,
            'no_leidas': no_leidas,
            'leidas': total - no_leidas,
            'urgentes': urgentes,
            'por_tipo': por_tipo,
            'por_categoria': por_categoria,
            'por_prioridad': por_prioridad,
        })
