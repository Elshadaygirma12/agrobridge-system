from django.contrib import admin
from .models import User, Product, Order

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('email', 'full_name', 'phone')
    ordering = ('-date_joined',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider', 'price', 'unit', 'quantity_available', 'category', 'created_at')
    list_filter = ('category', 'unit', 'created_at')
    search_fields = ('name', 'description', 'provider__email', 'provider__full_name')
    ordering = ('-created_at',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'product', 'buyer', 'provider', 'quantity', 'total_price', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order_id', 'product__name', 'buyer__email', 'provider__email')
    readonly_fields = ('order_id', 'created_at')
    ordering = ('-created_at',)
