from django.urls import path

from .views import PaymentView, QosPayWebhookView, TransactionStatusView

urlpatterns = [
    path('pay/', PaymentView.as_view(), name='qospay-pay'),
    path('status/', TransactionStatusView.as_view(), name='qospay-status'),
    path('webhook/', QosPayWebhookView.as_view(), name='qospay-webhook'),
]
