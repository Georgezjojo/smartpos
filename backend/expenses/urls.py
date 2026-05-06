from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('expenses', views.ExpenseViewSet)

urlpatterns = router.urls