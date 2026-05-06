from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet)
router.register('products', views.ProductViewSet)
router.register('stock', views.StockViewSet, basename='stock')
router.register('transfers', views.StockTransferViewSet, basename='transfer')

urlpatterns = router.urls