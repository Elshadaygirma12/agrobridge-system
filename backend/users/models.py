from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', None)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(max_length=255)
    
    ROLE_CHOICES = (
        ('provider', 'Provider'),
        ('buyer', 'Buyer'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='buyer', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email

class Product(models.Model):
    UNIT_CHOICES = [
        ('kg', 'Kilogram (kg)'),
        ('q', 'Quintal (q)'),
        ('l', 'Liter (l)'),
        ('dz', 'Dozen (dz)'),
    ]

    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg')
    quantity_available = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.ImageField(upload_to='product_images/', blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def status(self):
        if self.quantity_available <= 0:
            return 'Out'
        elif self.quantity_available < 20: 
            return 'Low Stock'
        return 'In Stock'

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    order_id = models.CharField(max_length=20, unique=True, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buyer_orders')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='provider_orders')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, choices=Product.UNIT_CHOICES, default='kg')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    driver_name = models.CharField(max_length=255, blank=True, null=True)
    driver_phone = models.CharField(max_length=20, blank=True, null=True)
    driver_plate_number = models.CharField(max_length=50, blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.order_id:
            import random
            import string
            random_str = ''.join(random.choices(string.digits, k=5))
            self.order_id = f"#AB-{random_str}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_id} - {self.product.name}"