from rest_framework import routers
from .api_views import ItemViewSet

router = routers.DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')

urlpatterns = router.urls
