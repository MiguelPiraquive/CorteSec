from rest_framework.routers import DefaultRouter
from .api_views import DocumentacionViewSet

router = DefaultRouter()
router.register(r'documentacion', DocumentacionViewSet, basename='documentacion')

urlpatterns = router.urls
