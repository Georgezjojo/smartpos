from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet)

urlpatterns = router.urls
urlpatterns += [
    path('unread-count/', views.UnreadNotificationCountView.as_view(), name='unread_count'),
]