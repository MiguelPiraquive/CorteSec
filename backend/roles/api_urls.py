from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import RolViewSet

router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='rol')

urlpatterns = [
    path('', include(router.urls)),
]
