from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Product, Order

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'phone', 'profile_image']
        read_only_fields = ['role']

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No account found with that email address.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            uid = urlsafe_base64_decode(data['uidb64']).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError("Invalid user.")

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError("Invalid or expired token.")
        
        return data

    def save(self):
        uid = urlsafe_base64_decode(self.validated_data['uidb64']).decode()
        user = User.objects.get(pk=uid)
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    buyer_phone = serializers.ReadOnlyField(source='buyer.phone')
    provider_name = serializers.ReadOnlyField(source='provider.full_name')
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'product', 'product_name', 'buyer', 'buyer_name', 'buyer_phone',
            'provider', 'provider_name', 'quantity', 'unit', 
            'total_price', 'status', 'created_at',
            'driver_name', 'driver_phone', 'driver_plate_number',
            'rejection_reason'
        ]
        read_only_fields = ['order_id', 'created_at', 'total_price', 'provider', 'buyer']

    def validate(self, data):
        # Fall back to existing instance values if they are not provided in the PATCH data
        product = data.get('product', getattr(self.instance, 'product', None))
        quantity = data.get('quantity', getattr(self.instance, 'quantity', None))

        if not product:
            raise serializers.ValidationError({"product": "Product is required."})
        
        if quantity is None or quantity <= 0:
            raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})

        # 1. Stock limit validation (ensure quantity does not exceed available stock)
        # Note: If updating an existing order, we should consider that the order itself is already reserving 'self.instance.quantity' units.
        available_stock = product.quantity_available
        if self.instance and self.instance.product == product:
            available_stock += self.instance.quantity

        if quantity > available_stock:
            raise serializers.ValidationError({
                "quantity": f"Cannot place order for {quantity} {product.unit}. Only {available_stock} {product.unit} is available in stock."
            })

        # 2. Wholesale minimum order quantity limit based on product unit
        unit = product.unit
        min_limit = 0
        if unit == 'kg':
            min_limit = 10
        elif unit == 'q':
            min_limit = 1
        elif unit == 'l':
            min_limit = 10
        elif unit == 'dz':
            min_limit = 5

        if quantity < min_limit:
            raise serializers.ValidationError({
                "quantity": f"This is a wholesale market. The minimum order quantity for unit '{unit}' is {min_limit}."
            })

        return data

class ProductSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    provider_name = serializers.ReadOnlyField(source='provider.full_name')
    provider_phone = serializers.ReadOnlyField(source='provider.phone')

    class Meta:
        model = Product
        fields = [
            'id', 'provider', 'provider_name', 'provider_phone', 'name', 
            'description', 'price', 'unit', 'quantity_available', 
            'image', 'category', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['provider', 'created_at', 'updated_at', 'status']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be true and positive.")
        return value

    def validate_quantity_available(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'password', 'role', 'phone']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Account already exists. Use a different email.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=validated_data.get('role', 'buyer'),
            phone=validated_data.get('phone', '')
        )
        return user