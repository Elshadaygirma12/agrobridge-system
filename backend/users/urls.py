# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    RegisterView, ProductListCreateView, ProductDetailView,
    PasswordResetRequestView, PasswordResetConfirmView,
    CategoryListView, LogoutView, OrderListCreateView,
    ProviderDashboardView, OrderDetailView, MyTokenObtainPairView,
    UserProfileView, SalesReportView, ExportSalesReportPDFView, OrderConfirmView, OrderRejectView,
    EmailChangeVerifyView, OrderDeliverView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('verify-email-change/', EmailChangeVerifyView.as_view(), name='verify-email-change'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('orders/', OrderListCreateView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('provider-dashboard/', ProviderDashboardView.as_view(), name='provider-dashboard'),
    path('sales-reports/', SalesReportView.as_view(), name='sales-reports'),
    path('sales-reports/export-pdf/', ExportSalesReportPDFView.as_view(), name='sales-reports-export-pdf'),
    path('orders/<int:pk>/confirm/', OrderConfirmView.as_view(), name='order-confirm'),
    path('orders/<int:pk>/reject/', OrderRejectView.as_view(), name='order-reject'),
    path('orders/<int:pk>/deliver/', OrderDeliverView.as_view(), name='order-deliver'),
]