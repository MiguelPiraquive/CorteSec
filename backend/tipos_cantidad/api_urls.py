from rest_framework.routers import DefaultRouter
from .api_views import TiposCantidadViewSet

router = DefaultRouter()
router.register(r'', TiposCantidadViewSet, basename='tiposcantidad')

urlpatterns = router.urls
