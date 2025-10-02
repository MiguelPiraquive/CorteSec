"""Project root URLs - include contractor_management routes for tests and app namespaces"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.organization_views import OrganizationViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('', include('contractor_management.urls')),
    path('api/', include(router.urls)),
]
