from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Category, Product, Stock, StockTransfer
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    StockSerializer,
    StockTransferSerializer,
)
from .utils import check_low_stock


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Category.objects.none()  # added for router basename

    def get_queryset(self):
        return Category.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'sku', 'description']
    queryset = Product.objects.none()  # added for router basename

    def get_queryset(self):
        return Product.objects.filter(business=self.request.user.business)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['branch'] = self.request.user.branch
        return context

    def perform_create(self, serializer):
        product = serializer.save(business=self.request.user.business)
        if self.request.user.branch:
            Stock.objects.get_or_create(
                product=product,
                branch=self.request.user.branch,
                defaults={'quantity': 0},
            )


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Stock.objects.none()  # added for router basename

    def get_queryset(self):
        return Stock.objects.filter(product__business=self.request.user.business)


class StockTransferViewSet(viewsets.ModelViewSet):
    serializer_class = StockTransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = StockTransfer.objects.none()  # added for router basename

    def get_queryset(self):
        return StockTransfer.objects.filter(
            from_branch__business=self.request.user.business
        ) | StockTransfer.objects.filter(
            to_branch__business=self.request.user.business
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from_branch = serializer.validated_data['from_branch']
        to_branch = serializer.validated_data['to_branch']
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        from_stock = Stock.objects.get(product=product, branch=from_branch)
        if from_stock.quantity < quantity:
            return Response(
                {'error': 'Insufficient stock at source branch'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from_stock.quantity -= quantity
        from_stock.save()

        to_stock, _ = Stock.objects.get_or_create(
            product=product,
            branch=to_branch,
            defaults={'quantity': 0},
        )
        to_stock.quantity += quantity
        to_stock.save()

        transfer = serializer.save()
        check_low_stock(product, from_branch)
        check_low_stock(product, to_branch)

        return Response(serializer.data, status=status.HTTP_201_CREATED)