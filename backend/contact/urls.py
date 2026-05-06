from django.urls import path
from . import views

urlpatterns = [
    path('submit/', views.ContactView.as_view(), name='contact_submit'),
]