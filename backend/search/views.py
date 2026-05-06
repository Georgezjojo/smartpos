from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from sales.models import Sale, Customer
from inventory.models import Product

class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'products': [], 'sales': [], 'customers': []})

        business = request.user.business
        # Search products by name or SKU
        products = Product.objects.filter(
            business=business,
            is_active=True,
        ).filter(
            Q(name__icontains=query) | Q(sku__icontains=query)
        )[:5].values('id', 'name', 'price')

        # Search sales by ID or customer name
        sales = Sale.objects.filter(
            business=business,
        ).filter(
            Q(id__icontains=query) | Q(customer__name__icontains=query)
        )[:5].values('id', 'total_amount', 'created_at')

        # Search customers by name or phone
        customers = Customer.objects.filter(
            business=business,
        ).filter(
            Q(name__icontains=query) | Q(phone__icontains=query)
        )[:5].values('id', 'name', 'phone')

        return Response({
            'products': list(products),
            'sales': list(sales),
            'customers': list(customers),
        })