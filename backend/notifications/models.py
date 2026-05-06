from django.db import models
from core.models import BaseModel
from django.conf import settings
from businesses.models import Business, Branch


class Notification(BaseModel):
    TYPE_CHOICES = [
        ('low_stock', 'Low Stock'),
        ('daily_summary', 'Daily Summary'),
        ('profit_alert', 'Profit Alert'),
        ('system', 'System'),
        ('welcome', 'Welcome'),   # ← added for first‑login welcome
    ]
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='notifications')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'notifications'