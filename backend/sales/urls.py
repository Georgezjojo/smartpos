from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('customers', views.CustomerViewSet)
router.register('sales', views.SaleViewSet, basename='sale')

urlpatterns = router.urls
urlpatterns += [
    path('sync-offline/', views.SyncOfflineSaleView.as_view(), name='sync_offline_sale'),
]