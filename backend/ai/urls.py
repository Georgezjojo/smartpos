from django.urls import path
from . import views

urlpatterns = [
    path('demand-prediction/', views.DemandPredictionView.as_view()),
    path('recommendations/', views.SmartRecommendationView.as_view()),
    path('chat/', views.AIChatView.as_view(), name='ai_chat'),
]