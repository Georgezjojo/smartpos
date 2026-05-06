from django.db import models
from core.models import BaseModel
from django.conf import settings

class Business(BaseModel):
    name = models.CharField(max_length=150, unique=True)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_business')
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'businesses'

    def __str__(self):
        return self.name

class Branch(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    manager = models.ForeignKey(
         settings.AUTH_USER_MODEL,
         on_delete=models.SET_NULL,
         null=True, blank=True,
         related_name='managed_branches',
         help_text='Manager assigned to this branch'
     )

    class Meta:
        db_table = 'branches'
        unique_together = ('business', 'name')

    def __str__(self):
        return f"{self.business.name} - {self.name}"