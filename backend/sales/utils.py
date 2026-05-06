def calculate_profit(sale):
    cost = sum(item.product.cost * item.quantity for item in sale.items.all())
    return float(sale.total_amount) - cost