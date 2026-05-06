from rest_framework import serializers
from .models import Category, Product, Stock, StockTransfer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('business',)

class ProductSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('business',)

    def get_stock_quantity(self, obj):
        branch = self.context.get('branch')
        stock = obj.stock_records.filter(branch=branch).first()
        return stock.quantity if stock else 0

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = '__all__'

class StockTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransfer
        fields = '__all__'

class StockTransferSerializer(serializers.ModelSerializer):
    from_branch_name = serializers.CharField(source='from_branch.name', read_only=True)
    to_branch_name = serializers.CharField(source='to_branch.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = StockTransfer
        fields = '__all__'
        extra_fields = ['from_branch_name', 'to_branch_name', 'product_name']