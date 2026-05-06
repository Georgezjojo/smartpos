from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Sale, SaleItem, Customer
from .serializers import SaleSerializer, CustomerSerializer
from inventory.models import Product, Stock
from notifications.models import Notification


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Customer.objects.none()

    def get_queryset(self):
        return Customer.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Sale.objects.none()

    def get_queryset(self):
        return Sale.objects.filter(business=self.request.user.business).order_by('-created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        items_data = request.data.pop('items', [])
        if not items_data:
            return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

        request.data['business'] = request.user.business.id
        request.data['branch'] = request.user.branch.id if request.user.branch else None
        request.data['cashier'] = request.user.id

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save(total_amount=0)

        total = 0
        for item in items_data:
            product_id = item['product']
            quantity = item['quantity']

            try:
                product = Product.objects.get(pk=product_id, business=request.user.business)
            except Product.DoesNotExist:
                return Response({'error': f'Product {product_id} not found'}, status=400)

            unit_price = product.price
            total_price = unit_price * quantity

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
            )
            total += total_price

            stock, created = Stock.objects.get_or_create(
                product=product,
                branch=request.user.branch,
                defaults={'quantity': 0},
            )
            if stock.quantity < quantity:
                raise serializers.ValidationError(f'Insufficient stock for {product.name}')
            stock.quantity -= quantity
            stock.save()

            if stock.quantity <= product.min_stock:
                Notification.objects.create(
                    business=request.user.business,
                    branch=request.user.branch,
                    user=request.user,
                    type='low_stock',
                    message=f'Low stock alert: {product.name} ({stock.quantity} left)',
                )
                owner = request.user.business.owner
                if owner.email:
                    from accounts.tasks import send_notification_email
                    send_notification_email.delay(
                        owner.email,
                        'SmartPOS - Low Stock Alert',
                        f'{product.name} is low in stock (only {stock.quantity} left at {request.user.branch.name}).',
                    )

        discount = float(request.data.get('discount', 0))
        tax = (total - discount) * 0.16
        sale.total_amount = total - discount + tax
        sale.discount = discount
        sale.tax = tax
        sale.save()

        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent = self.get_queryset()[:20]
        return Response(SaleSerializer(recent, many=True).data)


class SyncOfflineSaleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()   # avoid mutating original
        items_data = data.pop('items', [])
        if not items_data:
            return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

        data['business'] = request.user.business.id
        data['branch'] = request.user.branch.id if request.user.branch else None
        data['cashier'] = request.user.id

        serializer = SaleSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                sale = serializer.save(total_amount=0)
                total = 0
                for item in items_data:
                    product_id = item['product']
                    quantity = item['quantity']
                    product = Product.objects.get(pk=product_id, business=request.user.business)
                    unit_price = product.price
                    total_price = unit_price * quantity
                    SaleItem.objects.create(
                        sale=sale, product=product, quantity=quantity,
                        unit_price=unit_price, total_price=total_price
                    )
                    total += total_price

                    stock, _ = Stock.objects.get_or_create(
                        product=product, branch=request.user.branch, defaults={'quantity': 0}
                    )
                    if stock.quantity < quantity:
                        raise serializers.ValidationError(f'Insufficient stock for {product.name}')
                    stock.quantity -= quantity
                    stock.save()

                discount = float(data.get('discount', 0))
                tax = (total - discount) * 0.16
                sale.total_amount = total - discount + tax
                sale.discount = discount
                sale.tax = tax
                sale.save()
                return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=400)