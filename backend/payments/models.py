from django.db import models
from django.conf import settings

# Assuming you have a Business model in the 'business' app
# Adjust the import if needed
class MpesaTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        SUCCESS = 'Success', 'Success'
        FAILED = 'Failed', 'Failed'
        USED = 'Used', 'Used'          # when the operator confirms it for a sale

    business = models.ForeignKey(
        'businesses.Business', on_delete=models.CASCADE, related_name='mpesa_transactions'
    )
    phone = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    account_reference = models.CharField(max_length=50)
    transaction_desc = models.CharField(max_length=100, blank=True, default='Sale Payment')
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    result_code = models.IntegerField(null=True, blank=True)
    result_description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional link to a sale when confirmed
    sale = models.ForeignKey(
        'sales.Sale', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='mpesa_payments'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.phone} - {self.amount} KES - {self.status}"