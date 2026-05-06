from rest_framework import serializers
from .models import MpesaTransaction

class STKPushSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    account_reference = serializers.CharField(max_length=50)

class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = ['id', 'phone', 'amount', 'account_reference', 'status',
                  'checkout_request_id', 'mpesa_receipt_number', 'created_at']
        read_only_fields = ['status', 'checkout_request_id', 'mpesa_receipt_number', 'created_at']