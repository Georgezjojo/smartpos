from celery import shared_task
from django.utils import timezone
from django.db import models
from django.db.models import Sum
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from businesses.models import Business
from sales.models import Sale
from inventory.models import Product

@shared_task
def send_daily_summary_emails():
    """Send daily sales summary to all business owners."""
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    for business in Business.objects.filter(is_active=True):
        owner = business.owner
        if not owner.email:
            continue

        total_sales = Sale.objects.filter(
            business=business, created_at__date=yesterday
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        low_stock_products = Product.objects.filter(
            business=business,
            stock_records__quantity__lte=models.F('min_stock')
        ).distinct()[:5]

        message = f"Daily Summary for {business.name} - {yesterday}\n\n"
        message += f"Total Sales: {total_sales} KES\n\n"
        if low_stock_products.exists():
            message += "Low Stock Alerts:\n"
            for prod in low_stock_products:
                stock_qty = prod.stock_records.aggregate(Sum('quantity'))['quantity__sum'] or 0
                message += f"- {prod.name}: {stock_qty} left (min {prod.min_stock})\n"
        else:
            message += "No low stock items."

        send_mail(
            f'SmartPOS Daily Report - {yesterday}',
            message,
            settings.DEFAULT_FROM_EMAIL,
            [owner.email],
            fail_silently=False,
        )