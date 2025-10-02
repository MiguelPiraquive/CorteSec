from rest_framework.routers import DefaultRouter
from .api_views import TiposCantidadViewSet

router = DefaultRouter()
router.register(r'tipos-cantidad', TiposCantidadViewSet, basename='tiposcantidad')

urlpatterns = router.urls
