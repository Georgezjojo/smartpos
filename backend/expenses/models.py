from django.db import models
from core.models import BaseModel
from businesses.models import Business, Branch

class Expense(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='expenses')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(null=True, blank=True)
    date = models.DateField()

    class Meta:
        db_table = 'expenses'