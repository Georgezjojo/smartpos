from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.SalesSummaryView.as_view(), name='sales_summary'),
    path('profit-loss/', views.ProfitLossView.as_view(), name='profit_loss'),
    path('inventory/', views.InventoryReportView.as_view(), name='inventory_report'),
    path('expenses-report/', views.ExpenseReportView.as_view(), name='expenses_report'),
    path('product-performance/', views.ProductPerformanceView.as_view(), name='product_performance'),
    path('branch-performance/', views.BranchPerformanceView.as_view(), name='branch_performance'),
    path('balance-sheet/', views.BalanceSheetView.as_view(), name='balance_sheet'),
    path('cash-flow/', views.CashFlowView.as_view(), name='cash_flow'),
    path('customer-report/', views.CustomerReportView.as_view(), name='customer_report'),
    path('period-summary/', views.PeriodSummaryView.as_view(), name='period_summary'),
    path('trends/', views.SalesTrendView.as_view(), name='sales_trend'),
    path('export/<str:report_type>/', views.ExportReportView.as_view(), name='export_report'),
]