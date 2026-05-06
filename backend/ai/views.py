from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated   # <-- both imported
from django.db import models
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import timedelta

from sales.models import Sale, SaleItem, Customer
from inventory.models import Product
from expenses.models import Expense
from businesses.models import Branch


class AIChatView(APIView):
    permission_classes = [AllowAny]   # guests can also ask questions

    def post(self, request):
        msg = request.data.get('message', '').lower().strip()
        reply = self.generate_reply(msg, request.user)
        return Response({'reply': reply})

    def generate_reply(self, msg, user):
        msg = msg.lower().strip()

        # ========== GREETINGS ==========
        greetings = [
            'hello','hi','hey','good morning','good afternoon','good evening',
            'howdy','what\'s up','sup','yo','greetings','salutations','how are you',
            'how do you do','nice to meet you','pleasure','good day','how is it going',
            'what\'s new','how are things','how are you doing','good to see you'
        ]
        if any(g in msg for g in greetings):
            if 'how are you' in msg or 'how do you do' in msg or 'how is it going' in msg:
                return "I'm doing great, thank you for asking! I'm here to help you with SmartPOS. What would you like to know?"
            return "Hello! I'm your SmartPOS assistant. I can help with sales, inventory, POS, reports, expenses, users, settings, branches, AI insights, and more. Just ask!"

        # ========== THANKS / FAREWELL ==========
        thanks = ['thank','thanks','thank you','thx','ty','appreciate','grateful','cheers','bye','goodbye','see you','farewell','take care']
        if any(t in msg for t in thanks):
            return "You're very welcome! If you need anything else, just ask. Have a productive day with SmartPOS!"

        # ========== HELP ==========
        if any(w in msg for w in ['help','what can you do','how can you assist','what do you know','capabilities']):
            return (
                "I can provide real‑time business insights:\n"
                "• Stocking advice – what to restock, what to discontinue\n"
                "• Top & bottom selling products\n"
                "• Profit analysis per product or overall\n"
                "• Expense breakdown\n"
                "• Customer spending insights\n"
                "• Branch performance comparison\n"
                "• Sales trends (daily, weekly, monthly)\n\n"
                "Examples:\n"
                "• 'Which products are selling best?'\n"
                "• 'How much profit did I make this month?'\n"
                "• 'Which branch is performing best?'"
            )

        # ---- PUBLIC QUESTIONS – no login needed ----
        if 'login' in msg or 'sign in' in msg:
            return "Go to the Login page and enter your email/phone and password. If you forgot your password, click 'Forgot Password'."
        if 'register' in msg or 'sign up' in msg:
            return "Click 'Start Free' on the homepage, fill in your business and owner details, then verify the OTP sent to your email/phone."
        if 'mpesa' in msg or 'stk' in msg:
            return "When you complete a sale with M‑Pesa, enter the customer's phone (07… or 01…) and click 'Send Payment Request'. The customer will get an STK push to enter their PIN."

        # ---- BUSINESS‑SPECIFIC QUESTIONS – require login & business ----
        if not user.is_authenticated or not getattr(user, 'business', None):
            if any(word in msg for word in ['stock','inventory','profit','expense','customer','branch',
                                             'reports','sales','product','dashboard','ai','notif']):
                return "You need to log in first so I can see your business data."

        # From here on, the user is logged in and has a business
        if not user.business:
            return "I couldn't find your business. Please set up your business first."

        business = user.business
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
        end_of_last_month = start_of_month - timedelta(days=1)

        # ========== STOCKING ADVICE (real data) ==========
        if any(word in msg for word in ['stock','restock','discontinue','recommend','what to buy','advice','suggest']):
            low_stock = Product.objects.filter(
                business=business,
                is_active=True,
                stock_records__quantity__lte=models.F('min_stock')
            ).distinct()[:5]

            sixty_days_ago = today - timedelta(days=60)
            slow_movers = Product.objects.filter(
                business=business,
                is_active=True,
                stock_records__quantity__gt=0
            ).exclude(
                saleitem__sale__business=business,
                saleitem__sale__created_at__date__gte=sixty_days_ago
            ).distinct()[:5]

            reply = ""
            if low_stock.exists():
                reply += "🛒 **Products to restock soon:**\n"
                for p in low_stock:
                    stock = p.stock_records.aggregate(Sum('quantity'))['quantity__sum'] or 0
                    reply += f"• {p.name} – only {stock} left (min {p.min_stock})\n"
                reply += "\n"
            else:
                reply += "✅ All products have sufficient stock.\n\n"

            if slow_movers.exists():
                reply += "⚠️ **Products you might consider discontinuing (no sales in 60 days):**\n"
                for p in slow_movers:
                    stock = p.stock_records.aggregate(Sum('quantity'))['quantity__sum'] or 0
                    reply += f"• {p.name} – current stock: {stock}\n"
            else:
                reply += "🎉 No slow‑moving products detected.\n"
            reply += "\n💡 I'm here to help with more specific advice – just ask!"
            return reply

        # ========== TOP / BOTTOM PRODUCTS ==========
        if any(phrase in msg for phrase in ['top product','best selling','most sold','popular product','worst product','bottom product','slow selling']):
            items = SaleItem.objects.filter(sale__business=business).values(
                'product__name', 'product__sku'
            ).annotate(
                total_qty=Sum('quantity'),
                total_revenue=Sum('total_price')
            ).order_by('-total_qty')

            if not items:
                return "No sales data available yet."

            reply = "📊 **Product Performance**\n\n"
            if 'worst' in msg or 'bottom' in msg or 'slow' in msg:
                worst = items.order_by('total_qty')[:5]
                reply += "🔻 Least sold products:\n"
                for p in worst:
                    reply += f"• {p['product__name']} ({p['product__sku']}) – only {p['total_qty']} units sold\n"
            else:
                top = items[:5]
                reply += "🔺 Top selling products:\n"
                for p in top:
                    reply += f"• {p['product__name']} ({p['product__sku']}) – {p['total_qty']} units sold, {p['total_revenue']} KES revenue\n"

            return reply

        # ========== PROFIT ANALYSIS ==========
        if 'profit' in msg and ('per product' in msg or 'which product' in msg or 'most profitable' in msg):
            items = SaleItem.objects.filter(sale__business=business).values(
                'product__name'
            ).annotate(
                total_revenue=Sum('total_price'),
                total_cost=Sum(F('quantity') * F('product__cost'))
            ).order_by('-total_revenue')

            if not items:
                return "No sales data available."

            reply = "💰 **Profit per Product**\n\n"
            for p in items[:5]:
                profit = p['total_revenue'] - (p['total_cost'] or 0)
                reply += f"• {p['product__name']}: Revenue {p['total_revenue']} KES, Cost {p['total_cost'] or 0} KES, Profit {profit} KES\n"
            return reply

        if 'profit' in msg and ('month' in msg or 'this month' in msg or 'last month' in msg):
            sales_this = Sale.objects.filter(business=business, created_at__date__gte=start_of_month).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            sales_last = Sale.objects.filter(business=business, created_at__date__range=[start_of_last_month, end_of_last_month]).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            expenses_this = Expense.objects.filter(business=business, date__gte=start_of_month).aggregate(Sum('amount'))['amount__sum'] or 0
            expenses_last = Expense.objects.filter(business=business, date__range=[start_of_last_month, end_of_last_month]).aggregate(Sum('amount'))['amount__sum'] or 0
            profit_this = sales_this - expenses_this
            profit_last = sales_last - expenses_last
            change = profit_this - profit_last
            return (
                f"📈 **Monthly Profit Comparison**\n\n"
                f"This month (so far): Sales {sales_this} KES, Expenses {expenses_this} KES, Profit {profit_this} KES\n"
                f"Last month: Sales {sales_last} KES, Expenses {expenses_last} KES, Profit {profit_last} KES\n"
                f"Change: {change:+.2f} KES"
            )

        # ========== EXPENSE ANALYSIS ==========
        if 'expense' in msg and ('breakdown' in msg or 'category' in msg or 'top' in msg or 'where' in msg):
            categories = Expense.objects.filter(business=business).values('category').annotate(total=Sum('amount')).order_by('-total')[:5]
            if not categories:
                return "No expenses recorded yet."
            reply = "💸 **Top Expense Categories**\n\n"
            for c in categories:
                reply += f"• {c['category']}: {c['total']} KES\n"
            return reply

        # ========== CUSTOMER INSIGHTS ==========
        if 'customer' in msg and ('top' in msg or 'best' in msg or 'spend' in msg or 'loyal' in msg):
            customers = Customer.objects.filter(business=business).annotate(
                total_spent=Sum('sale__total_amount'),
                num_purchases=Count('sale')
            ).order_by('-total_spent')[:5]
            if not customers:
                return "No customer data yet."
            reply = "👥 **Top Customers**\n\n"
            for c in customers:
                reply += f"• {c.name} – {c.num_purchases} purchases, {c.total_spent or 0} KES spent\n"
            return reply

        # ========== BRANCH PERFORMANCE ==========
        if 'branch' in msg and ('compare' in msg or 'performance' in msg or 'best' in msg or 'worst' in msg):
            branches = Branch.objects.filter(business=business)
            data = []
            for b in branches:
                sales = Sale.objects.filter(branch=b).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
                data.append((b.name, sales))
            data.sort(key=lambda x: x[1], reverse=True)
            if not data:
                return "No branch data."
            reply = "🏢 **Branch Performance**\n\n"
            for name, sales in data:
                reply += f"• {name}: {sales} KES\n"
            return reply

        # ========== SALES & POS ==========
        if 'sale' in msg or 'pos' in msg or 'checkout' in msg:
            if 'discount' in msg:
                return "You can apply a discount in the POS by entering a percentage in the Discount field."
            if 'tax' in msg or 'vat' in msg:
                return "Tax (16% VAT) can be toggled on/off in the POS cart using the tax checkbox."
            if 'payment' in msg or 'cash' in msg or 'card' in msg or 'mpesa' in msg:
                return "Supported payment methods are Cash, Card, and M‑Pesa."
            if 'receipt' in msg or 'print' in msg:
                return "After completing a sale, click the **Print Receipt** button in the POS."
            if 'customer' in msg:
                return "You can select a customer from the dropdown in the POS."
            if 'barcode' in msg:
                return "Barcode scanning is a future enhancement."
            if 'void' in msg or 'cancel' in msg:
                return "Currently, sales cannot be voided from the frontend."
            return "The **Point of Sale** page is where you process sales. Search products, add to cart, apply discount, toggle tax, choose payment method, and complete the sale."

        # ========== INVENTORY ==========
        if 'inventory' in msg or 'product' in msg or 'sku' in msg:
            if 'add' in msg and 'product' in msg:
                return "Go to **Inventory** → click **Add Product**."
            if 'edit' in msg or 'update' in msg:
                return "Click the edit icon on a product card in Inventory."
            if 'delete' in msg:
                return "Click the trash icon on a product card."
            if 'low' in msg and 'alert' in msg:
                return "Low stock alerts appear on the Dashboard and via email."
            return "The **Inventory** section lets you manage products, view stock, and set discounts."

        # ========== REPORTS ==========
        if 'report' in msg or 'trend' in msg or 'export' in msg or 'csv' in msg:
            if 'export' in msg:
                return "On the Reports page, click **Export Sales CSV** or **Export Inventory CSV**."
            if 'period' in msg or 'custom' in msg:
                return "Use the **Period Summary** section on the Reports page."
            if 'trend' in msg or 'chart' in msg:
                return "A 30‑day sales trend chart is shown on the Reports page."
            return "The **Reports** page provides trends, exports, period summaries, and financial reports."

        # ========== EXPENSES (general) ==========
        if 'expense' in msg:
            if 'add' in msg: return "Go to **Expenses** → **Add Expense**."
            return "Track all business expenses under **Expenses**."

        # ========== USERS ==========
        if 'user' in msg or 'cashier' in msg or 'manager' in msg:
            if 'add' in msg: return "Owner can add users under **Users** → **Add User**."
            if 'delete' in msg: return "Click the trash icon next to a user."
            return "User management is under **Users** (Owner only)."

        # ========== SETTINGS / BRANCHES ==========
        if 'setting' in msg or 'branch' in msg:
            if 'add' in msg and 'branch' in msg: return "Go to **Settings** → **Add Branch**."
            return "Under **Settings** you can update business details and manage branches."

        # ========== DASHBOARD ==========
        if 'dashboard' in msg:
            return "The **Dashboard** shows today's sales, weekly sales, low stock items, monthly profit. Click any card to jump to the relevant page."

        # ========== AI INSIGHTS ==========
        if 'ai' in msg or 'insight' in msg:
            return "AI Insights appear on the Dashboard: restock suggestions and slow‑moving products. Ask me 'What should I restock?'"

        # ========== NOTIFICATIONS ==========
        if 'notif' in msg or 'bell' in msg:
            return "Click the bell icon in the header to see recent notifications."

        # ========== PROFILE ==========
        if 'profile' in msg or 'password' in msg:
            return "Update your name, phone, and profile picture on the **Profile** page."

        # ========== CONTACT ==========
        if 'contact' in msg or 'support' in msg:
            return "For support, visit the **Contact Us** page or email support@smartpos.com."

        # ========== SYSTEM INFO ==========
        if 'what is smartpos' in msg or 'about' in msg:
            return "SmartPOS is an intelligent Point of Sale and Business Intelligence system."

        if 'version' in msg:
            return "You're running the latest version of SmartPOS."

        if 'time' in msg or 'date' in msg:
            return f"Current server time is {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} (Africa/Nairobi)."

        # ========== FALLBACK ==========
        return (
            "I didn't quite understand that. You can ask me about:\n"
            "• Sales & POS\n• Inventory & Products\n• Reports & Exports\n• Expenses\n• Users & Roles\n"
            "• Settings & Branches\n• Dashboard & AI Insights\n• Notifications, Profile, Contact\n\n"
            "Try a question like: 'Which products are selling best?' or 'What should I restock?'"
        )


class DemandPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'message': 'AI demand prediction coming soon'})


class SmartRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = request.user.business
        today = timezone.now().date()
        sixty_days_ago = today - timedelta(days=60)

        low_stock = Product.objects.filter(
            business=business,
            is_active=True,
            stock_records__quantity__lte=models.F('min_stock')
        ).distinct()

        slow_movers = Product.objects.filter(
            business=business,
            is_active=True,
        ).exclude(
            saleitem__sale__business=business,
            saleitem__sale__created_at__date__gte=sixty_days_ago
        ).filter(
            stock_records__quantity__gt=0
        ).distinct()

        recommendations = {
            'restock': [{'id': str(p.id), 'name': p.name, 'min_stock': p.min_stock,
                         'current_stock': p.stock_records.aggregate(total=Sum('quantity'))['total'] or 0}
                        for p in low_stock],
            'discontinue': [{'id': str(p.id), 'name': p.name,
                             'stock': p.stock_records.aggregate(total=Sum('quantity'))['total'] or 0}
                            for p in slow_movers]
        }
        return Response(recommendations)