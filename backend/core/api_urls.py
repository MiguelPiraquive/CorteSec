"""
URLs del módulo Core - API Endpoints
====================================

Endpoints de API para funcionalidades core del sistema:
- Organizaciones
- Notificaciones
- Logs del sistema
- Configuraciones

Autor: Sistema CorteSec
Versión: 1.0.0
Fecha: 2025-08-17
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .organization_views import OrganizationViewSet
from .notification_views import NotificacionViewSet
from .plan_views import PlanViewSet, PlanChangeLogViewSet
from .test_views import test_auth
from .auditoria_views import AuditoriaViewSet
from .system_status import system_status, system_health_check
from .invitation_views import InvitacionViewSet, validate_invitation, accept_invitation
from . import search_apis
from . import api_views
from usuarios.views import UserViewSet

# Router para ViewSets
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'auditoria', AuditoriaViewSet, basename='auditoria')
router.register(r'plans', PlanViewSet, basename='plans')
router.register(r'plan-changes', PlanChangeLogViewSet, basename='plan-changes')
router.register(r'notificaciones', NotificacionViewSet, basename='notificaciones')
router.register(r'invitaciones', InvitacionViewSet, basename='invitaciones')

# Patterns URL
urlpatterns = [
    # Test endpoint
    path('test-auth/', test_auth, name='test_auth'),

    # Search APIs (global search, suggestions, history)
    path('search/', search_apis.search_global, name='search_global'),
    path('search/counts/', search_apis.search_counts, name='search_counts'),
    path('search/suggestions/', search_apis.search_suggestions, name='search_suggestions'),
    path('search/autocomplete/', search_apis.search_autocomplete, name='search_autocomplete'),
    path('search/smart-suggestions/', search_apis.search_smart_suggestions, name='search_smart_suggestions'),
    path('search/recent-history/', search_apis.search_recent_history, name='search_recent_history'),
    path('search/track-click/', search_apis.search_track_click, name='search_track_click'),
    path('search/history/', search_apis.search_history, name='search_history'),
    path('search/stats/', search_apis.search_stats, name='search_stats'),
    path('search/modules/', search_apis.search_modules, name='search_modules'),

    # Public APIs (landing)
    path('public/plans/', api_views.public_plans, name='public_plans'),
    path('public/landing/', api_views.public_landing_info, name='public_landing_info'),

    # Compatibilidad: usuarios bajo /api/core/usuarios/
    path('core/usuarios/', UserViewSet.as_view({'get': 'list'}), name='core-usuarios'),

    # System status (staff)
    path('system-status/', system_status, name='system_status'),
    path('health-check/', system_health_check, name='system_health_check'),
    
    # Invitaciones (públicas - sin autenticación)
    path('invitacion/validar/<str:token>/', validate_invitation, name='validate_invitation'),
    path('invitacion/aceptar/', accept_invitation, name='accept_invitation'),

    # ViewSets automáticos
    path('', include(router.urls)),
]
