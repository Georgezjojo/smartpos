from accounts.tasks import send_notification_email

def check_low_stock(product, branch):
    stock = product.stock_records.filter(branch=branch).first()
    if stock and stock.quantity <= product.min_stock:
        from notifications.models import Notification
        notif = Notification.objects.create(
            business=product.business,
            branch=branch,
            user=product.business.owner,
            type='low_stock',
            message=f'Low stock alert: {product.name} ({stock.quantity} left)'
        )
        # Send email to business owner if email exists
        owner = product.business.owner
        if owner.email:
            send_notification_email.delay(
                owner.email,
                'SmartPOS - Low Stock Alert',
                f'{product.name} is low in stock (only {stock.quantity} left at {branch.name}).'
            )