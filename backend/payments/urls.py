from django.urls import path
from . import views

urlpatterns = [
    path('mpesa/stkpush/', views.MpesaSTKPushView.as_view(), name='mpesa-stkpush'),
    path('mpesa/status/', views.MpesaStatusView.as_view(), name='mpesa-status'),
    path('recent/', views.RecentPaymentsView.as_view(), name='payments-recent'),
    path('<int:pk>/confirm/', views.ConfirmPaymentView.as_view(), name='payments-confirm'),
    path('mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
]