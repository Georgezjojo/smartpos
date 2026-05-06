from django.contrib import admin
from .models import MpesaTransaction

@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ('phone', 'amount', 'status', 'checkout_request_id', 'created_at')
    list_filter = ('status', 'business')
    search_fields = ('phone', 'account_reference')