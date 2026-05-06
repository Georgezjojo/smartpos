from django.db import models
from core.models import BaseModel
from businesses.models import Business, Branch

class Category(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children')

    class Meta:
        db_table = 'categories'
        unique_together = ('business', 'name')

class Product(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Automatic discount percentage (0‑100)")
    discount_name = models.CharField(max_length=100, null=True, blank=True, help_text="Name of the discount (e.g., 'Sale 20%')")
    name = models.CharField(max_length=200)
    pack_size = models.IntegerField(default=1, help_text="Number of pieces in one carton")
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)
    sku = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    min_stock = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'products'

class Stock(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_records')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stock')
    quantity = models.IntegerField(default=0)

    class Meta:
        db_table = 'stock'
        unique_together = ('product', 'branch')

class StockTransfer(BaseModel):
    from_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_out')
    to_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_in')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'stock_transfers'

