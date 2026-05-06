import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import timedelta
from sales.models import Sale, SaleItem, Customer
from inventory.models import Product, Stock
from expenses.models import Expense
from businesses.models import Branch
from .permissions import IsOwnerOrManager
from .serializers import PeriodSummarySerializer


def get_branch_filter(request):
    branch_id = request.query_params.get('branch_id')
    if branch_id:
        try:
            return Branch.objects.get(pk=branch_id, business=request.user.business)
        except Branch.DoesNotExist:
            return None
    return None


# ========== SALES SUMMARY (Dashboard usage) ==========
class SalesSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        sale_filter = Q(business=business)
        if branch:
            sale_filter &= Q(branch=branch)

        daily = Sale.objects.filter(sale_filter, created_at__date=today).aggregate(total=Sum('total_amount'))
        weekly = Sale.objects.filter(sale_filter, created_at__date__gte=week_ago).aggregate(total=Sum('total_amount'))
        monthly = Sale.objects.filter(sale_filter, created_at__date__gte=month_ago).aggregate(total=Sum('total_amount'))
        low_stock_count = Product.objects.filter(
            business=business,
            stock_records__quantity__lte=F('min_stock')
        ).distinct().count()

        return Response({
            'daily_sales': daily['total'] or 0,
            'weekly_sales': weekly['total'] or 0,
            'monthly_sales': monthly['total'] or 0,
            'low_stock_count': low_stock_count,
        })


# ========== PROFIT & LOSS ==========
class ProfitLossView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        sale_filter = Q(business=business)
        expense_filter = Q(business=business)
        if branch:
            sale_filter &= Q(branch=branch)
            expense_filter &= Q(branch=branch)
        if start:
            sale_filter &= Q(created_at__date__gte=start)
            expense_filter &= Q(date__gte=start)
        if end:
            sale_filter &= Q(created_at__date__lte=end)
            expense_filter &= Q(date__lte=end)

        total_sales = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
        total_expenses = Expense.objects.filter(expense_filter).aggregate(total=Sum('amount'))['total'] or 0
        profit = total_sales - total_expenses

        return Response({
            'total_sales': total_sales,
            'total_expenses': total_expenses,
            'profit': profit,
        })


# ========== INVENTORY REPORT ==========
class InventoryReportView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        products = Product.objects.filter(business=business)
        data = []
        for p in products:
            total_qty = p.stock_records.aggregate(total=Sum('quantity'))['total'] or 0
            total_value = total_qty * p.price
            data.append({
                'name': p.name,
                'sku': p.sku,
                'quantity': total_qty,
                'unit_price': p.price,
                'total_value': total_value,
                'min_stock': p.min_stock,
                'low_stock': total_qty <= p.min_stock,
            })
        return Response(data)


# ========== EXPENSE REPORT ==========
class ExpenseReportView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        expense_filter = Q(business=business)
        if branch:
            expense_filter &= Q(branch=branch)
        if start:
            expense_filter &= Q(date__gte=start)
        if end:
            expense_filter &= Q(date__lte=end)

        expenses = Expense.objects.filter(expense_filter)
        by_category = expenses.values('category').annotate(total=Sum('amount')).order_by('-total')
        return Response({
            'by_category': by_category,
            'total': expenses.aggregate(total=Sum('amount'))['total'] or 0,
            'list': expenses.values('id','category','amount','description','date')
        })


# ========== PRODUCT PERFORMANCE ==========
class ProductPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        item_filter = Q(sale__business=business)
        if branch:
            item_filter &= Q(sale__branch=branch)
        if start:
            item_filter &= Q(sale__created_at__date__gte=start)
        if end:
            item_filter &= Q(sale__created_at__date__lte=end)

        items = SaleItem.objects.filter(item_filter).values(
            'product__name', 'product__sku'
        ).annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_price'),
            total_cost=Sum(F('quantity') * F('product__cost'))
        ).order_by('-total_revenue')

        result = []
        for item in items:
            profit = item['total_revenue'] - (item['total_cost'] or 0)
            result.append({
                'product': item['product__name'],
                'sku': item['product__sku'],
                'quantity_sold': item['total_qty'],
                'revenue': item['total_revenue'],
                'profit': profit,
            })
        return Response(result)


# ========== BRANCH PERFORMANCE ==========
class BranchPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        branches = Branch.objects.filter(business=business)
        if branch:
            branches = branches.filter(pk=branch.pk)

        data = []
        for br in branches:
            sale_filter = Q(business=business, branch=br)
            expense_filter = Q(business=business, branch=br)
            if start:
                sale_filter &= Q(created_at__date__gte=start)
                expense_filter &= Q(date__gte=start)
            if end:
                sale_filter &= Q(created_at__date__lte=end)
                expense_filter &= Q(date__lte=end)

            sales = Sale.objects.filter(sale_filter).aggregate(
                total_sales=Sum('total_amount'),
                total_orders=Count('id')
            )
            expenses = Expense.objects.filter(expense_filter).aggregate(
                total_expenses=Sum('amount')
            )
            data.append({
                'branch': br.name,
                'sales': sales['total_sales'] or 0,
                'expenses': expenses['total_expenses'] or 0,
                'profit': (sales['total_sales'] or 0) - (expenses['total_expenses'] or 0),
                'orders': sales['total_orders'],
            })
        return Response(data)


# ========== BALANCE SHEET (Simplified) ==========
class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        inventory_value = 0
        products = Product.objects.filter(business=business)
        for p in products:
            qty = p.stock_records.aggregate(total=Sum('quantity'))['total'] or 0
            inventory_value += qty * p.cost

        sale_filter = Q(business=business)
        expense_filter = Q(business=business)
        if branch:
            sale_filter &= Q(branch=branch)
            expense_filter &= Q(branch=branch)

        total_sales_uncollected = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
        total_expenses = Expense.objects.filter(expense_filter).aggregate(total=Sum('amount'))['total'] or 0
        cash = total_sales_uncollected - total_expenses
        assets = inventory_value + cash
        liabilities = 0
        equity = assets - liabilities

        return Response({
            'assets': {
                'inventory': inventory_value,
                'cash': cash,
                'total': assets,
            },
            'liabilities': liabilities,
            'equity': equity,
        })


# ========== CASH FLOW (Simplified) ==========
class CashFlowView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        sale_filter = Q(business=business)
        expense_filter = Q(business=business)
        if branch:
            sale_filter &= Q(branch=branch)
            expense_filter &= Q(branch=branch)
        if start:
            sale_filter &= Q(created_at__date__gte=start)
            expense_filter &= Q(date__gte=start)
        if end:
            sale_filter &= Q(created_at__date__lte=end)
            expense_filter &= Q(date__lte=end)

        sales_cash = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
        expense_cash = Expense.objects.filter(expense_filter).aggregate(total=Sum('amount'))['total'] or 0
        net_cash = sales_cash - expense_cash

        return Response({
            'operating': net_cash,
            'investing': 0,
            'financing': 0,
            'net_change': net_cash,
        })


# ========== CUSTOMER REPORT ==========
class CustomerReportView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        customers = Customer.objects.filter(business=business)
        data = []
        for c in customers:
            sale_filter = Q(customer=c)
            if branch:
                sale_filter &= Q(branch=branch)
            total_purchases = Sale.objects.filter(sale_filter).count()
            total_spent = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
            data.append({
                'name': c.name,
                'phone': c.phone,
                'email': c.email,
                'total_purchases': total_purchases,
                'total_spent': total_spent,
            })
        return Response(data)


# ========== PERIOD SUMMARY ==========
class PeriodSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        serializer = PeriodSummarySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        business = request.user.business
        branch = get_branch_filter(request)

        sale_filter = Q(business=business, created_at__date__gte=start_date, created_at__date__lte=end_date)
        expense_filter = Q(business=business, date__gte=start_date, date__lte=end_date)
        if branch:
            sale_filter &= Q(branch=branch)
            expense_filter &= Q(branch=branch)

        total_sales = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
        total_expenses = Expense.objects.filter(expense_filter).aggregate(total=Sum('amount'))['total'] or 0
        profit = total_sales - total_expenses

        return Response({
            'start_date': start_date,
            'end_date': end_date,
            'total_sales': total_sales,
            'total_expenses': total_expenses,
            'profit': profit,
        })


# ========== SALES TREND ==========
class SalesTrendView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request):
        business = request.user.business
        branch = get_branch_filter(request)
        today = timezone.now().date()
        days = 30
        data = []
        for i in range(days):
            date = today - timedelta(days=i)
            sale_filter = Q(business=business, created_at__date=date)
            if branch:
                sale_filter &= Q(branch=branch)
            total = Sale.objects.filter(sale_filter).aggregate(total=Sum('total_amount'))['total'] or 0
            data.append({'date': date.isoformat(), 'total': float(total)})
        data.reverse()
        return Response(data)


# ========== EXPORT CSV ==========
class ExportReportView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get(self, request, report_type):
        business = request.user.business
        branch = get_branch_filter(request)
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        if report_type == 'sales':
            sales = Sale.objects.filter(business=business)
            if branch:
                sales = sales.filter(branch=branch)
            if start:
                sales = sales.filter(created_at__date__gte=start)
            if end:
                sales = sales.filter(created_at__date__lte=end)

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="sales_report.csv"'
            writer = csv.writer(response)
            writer.writerow(['Sale ID', 'Date', 'Customer', 'Total', 'Payment Method'])
            for sale in sales:
                writer.writerow([sale.id, sale.created_at, sale.customer.name if sale.customer else '', sale.total_amount, sale.payment_method])
            return response

        elif report_type == 'inventory':
            products = Product.objects.filter(business=business)
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="inventory_report.csv"'
            writer = csv.writer(response)
            writer.writerow(['Product', 'SKU', 'Category', 'Stock', 'Value'])
            for product in products:
                total_stock = product.stock_records.aggregate(total=Sum('quantity'))['total'] or 0
                value = total_stock * product.price
                writer.writerow([product.name, product.sku, product.category.name if product.category else '', total_stock, value])
            return response

        return Response({'error': 'Invalid report type'}, status=400)