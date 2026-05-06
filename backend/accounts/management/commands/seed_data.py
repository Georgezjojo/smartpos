from django.core.management.base import BaseCommand
from accounts.models import User
from businesses.models import Business, Branch
from inventory.models import Category, Product, Stock

class Command(BaseCommand):
    help = 'Seeds database with sample data'

    def handle(self, *args, **options):
        owner = User.objects.create_superuser(email='owner@demo.com', password='demo1234', full_name='Demo Owner')
        business = Business.objects.create(name='Demo Supermarket', owner=owner)
        branch = Branch.objects.create(business=business, name='Main Branch', location='Nairobi CBD')
        owner.business = business
        owner.branch = branch
        owner.role = 'owner'
        owner.save()

        cat1 = Category.objects.create(business=business, name='Beverages')
        cat2 = Category.objects.create(business=business, name='Snacks')
        products_data = [
            {'name': 'Coca Cola 500ml', 'sku': 'CC500', 'price': 50, 'cost': 40, 'category': cat1, 'stock': 200},
            {'name': 'Crisps 150g', 'sku': 'CP150', 'price': 30, 'cost': 20, 'category': cat2, 'stock': 150},
            {'name': 'Bread', 'sku': 'BR001', 'price': 50, 'cost': 45, 'category': cat2, 'stock': 50},
        ]
        for p in products_data:
            product = Product.objects.create(
                business=business, name=p['name'], sku=p['sku'], price=p['price'],
                cost=p['cost'], category=p['category']
            )
            Stock.objects.create(product=product, branch=branch, quantity=p['stock'])

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully'))