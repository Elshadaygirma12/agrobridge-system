import io
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from django.shortcuts import render
from rest_framework import generics, permissions, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core import signing
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import User, Product, Order
from .serializers import (
    RegisterSerializer, ProductSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    OrderSerializer, MyTokenObtainPairSerializer, UserSerializer
)
from django.utils.encoding import force_str
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        response.data['message'] = "Profile updated successfully."
        return response

class EmailChangeVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')

        if not token:
            return Response({"error": "Missing verification token."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify the token and extract data (valid for 24 hours)
            data = signing.loads(token, max_age=86400)
            user_id = data.get('user_id')
            new_email = data.get('new_email')
            
            user = User.objects.get(pk=user_id)
        except (signing.SignatureExpired):
            return Response({"error": "The verification link has expired."}, status=status.HTTP_400_BAD_REQUEST)
        except (signing.BadSignature, User.DoesNotExist):
            return Response({"error": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the new email is already taken by someone else
        if User.objects.filter(email=new_email).exists():
            return Response({"error": "This email is already in use by another account."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.email = new_email
        user.save()
        return Response({"message": "Email address updated successfully."}, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": "Invalid token or token already blacklisted."}, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            # Since validation passed, the user definitely exists
            user = User.objects.get(email=email)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            # This matches the React Router format: /reset-password/uid/token/
            reset_link = f"http://localhost:5173/reset-password/{uidb64}/{token}/"
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@agrobridge.com')
            send_mail(
                subject="Password Reset Request",
                message=f"Click the link to reset your password: {reset_link}\n\nNote: This link will expire shortly.",
                from_email=from_email,
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response(
                {"message": "If the email exists, reset instructions have been sent."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

class CategoryListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = Product.objects.values_list('category', flat=True).distinct()
        categories = [cat for cat in categories if cat]
        return Response(categories)

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'category': ['exact', 'icontains'],
        'price': ['gte', 'lte'],
        'provider': ['exact'],
    }
    search_fields = ['name', 'description', 'category']
    ordering_fields = ['price', 'created_at']

    def perform_create(self, serializer):
        if self.request.user.role != 'provider':
            raise PermissionDenied("Only providers can add products.")
        serializer.save(provider=self.request.user)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Product.objects.all()

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'buyer':
            return Order.objects.filter(buyer=user).order_by('-created_at')
        elif user.role == 'provider':
            return Order.objects.filter(provider=user).order_by('-created_at')
        return Order.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'buyer':
            raise PermissionDenied("Only buyers can place orders.")
        
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']
        
        # Calculate total price
        total_price = product.price * quantity
        
        # Deduct ordered quantity from available stock
        product.quantity_available -= quantity
        product.save()
        
        serializer.save(
            buyer=self.request.user,
            provider=product.provider,
            unit=product.unit,
            total_price=total_price
        )

class OrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'buyer':
            return Order.objects.filter(buyer=user)
        elif user.role == 'provider':
            return Order.objects.filter(provider=user)
        return Order.objects.none()

    def perform_update(self, serializer):
        order = self.get_object()
        if self.request.user != order.provider:
            raise PermissionDenied("Only the provider can update the order status.")
        
        old_status = order.status
        new_status = serializer.validated_data.get('status', old_status)
        
        # Adjust stock if status changes to or from 'cancelled'
        if new_status == 'cancelled' and old_status != 'cancelled':
            product = order.product
            product.quantity_available += order.quantity
            product.save()
        elif old_status == 'cancelled' and new_status != 'cancelled':
            product = order.product
            product.quantity_available -= order.quantity
            product.save()

        serializer.save()



class OrderConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # We filter by provider=request.user to ensure only the farmer can confirm it
            order = Order.objects.get(pk=pk, provider=request.user)
            order.driver_name = request.data.get('driver_name')
            order.driver_phone = request.data.get('driver_phone')
            order.driver_plate_number = request.data.get('driver_plate_number')
            order.status = 'confirmed'
            order.save()
            
            serializer = OrderSerializer(order)
            return Response({
                "message": "Order confirmed successfully.",
                "status": order.status,
                "order": serializer.data
            })
        except Order.DoesNotExist:
            return Response({"error": "Order not found or you don't have permission."}, status=status.HTTP_404_NOT_FOUND)

class OrderRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # We filter by provider=request.user to ensure only the farmer can reject it
            order = Order.objects.get(pk=pk, provider=request.user)
            rejection_reason = request.data.get('rejection_reason')
            
            if order.status != 'cancelled':
                order.status = 'cancelled'
                order.rejection_reason = rejection_reason
                order.save()
                
                # Restore quantity back to available stock
                product = order.product
                product.quantity_available += order.quantity
                product.save()
            else:
                if rejection_reason:
                    order.rejection_reason = rejection_reason
                    order.save()
                
            serializer = OrderSerializer(order)
            return Response({
                "message": "Order rejected successfully.",
                "status": order.status,
                "order": serializer.data
            })
        except Order.DoesNotExist:
            return Response({"error": "Order not found or you don't have permission."}, status=status.HTTP_404_NOT_FOUND)

class OrderDeliverView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # We filter by buyer=request.user to ensure only the buyer can mark it as delivered
            order = Order.objects.get(pk=pk, buyer=request.user)
            if order.status != 'confirmed':
                return Response({"error": "Only confirmed orders can be marked as delivered."}, status=status.HTTP_400_BAD_REQUEST)
            order.status = 'delivered'
            order.save()
            
            serializer = OrderSerializer(order)
            return Response({
                "message": "Order marked as delivered successfully.",
                "status": order.status,
                "order": serializer.data
            })
        except Order.DoesNotExist:
            return Response({"error": "Order not found or you don't have permission."}, status=status.HTTP_404_NOT_FOUND)


class ProviderDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'provider':
            return Response({"error": "Only providers can access the dashboard."}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        total_products = Product.objects.filter(provider=user).count()
        active_orders = Order.objects.filter(provider=user, status='pending').count()
        confirmed_orders = Order.objects.filter(provider=user, status='confirmed').count()
        
        # Recent Order History
        recent_orders = Order.objects.filter(provider=user).order_by('-created_at')[:10]
        order_serializer = OrderSerializer(recent_orders, many=True)
        
        data = {
            "total_products": total_products,
            "active_orders": active_orders,
            "confirmed_orders": confirmed_orders,
            "order_history": order_serializer.data
        }
        return Response(data)

class SalesReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'provider':
            return Response({"error": "Only providers can access sales reports."}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        product_id = request.query_params.get('product_id')

        # Filter orders for the provider, excluding cancelled ones
        orders = Order.objects.filter(provider=user).exclude(status='cancelled')

        if start_date:
            orders = orders.filter(created_at__date__gte=start_date)
        if end_date:
            orders = orders.filter(created_at__date__lte=end_date)
        if product_id and product_id != 'all':
            orders = orders.filter(product_id=product_id)

        # Sales over time (Line Chart data)
        sales_over_time = orders.annotate(date=TruncDate('created_at')) \
            .values('date') \
            .annotate(total_quantity=Sum('quantity')) \
            .order_by('date')

        # Product Summary (Table data)
        # We group by product name and unit to be accurate, but the screenshot just shows "PRODUCT"
        product_summary = orders.values('product__name', 'product__unit') \
            .annotate(
                orders_count=Count('id'),
                total_quantity=Sum('quantity')
            ) \
            .order_by('-total_quantity')

        # Provider's products for the filter dropdown
        provider_products = Product.objects.filter(provider=user).values('id', 'name')

        return Response({
            "sales_over_time": sales_over_time,
            "product_summary": product_summary,
            "products": provider_products
        })


class ExportSalesReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'provider':
            return Response({"error": "Only providers can export sales reports."}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        product_id = request.query_params.get('product_id')

        # Filter orders for provider, excluding cancelled ones
        orders = Order.objects.filter(provider=user).exclude(status='cancelled')

        if start_date:
            orders = orders.filter(created_at__date__gte=start_date)
        if end_date:
            orders = orders.filter(created_at__date__lte=end_date)

        selected_product_name = "All Products"
        if product_id and product_id != 'all':
            orders = orders.filter(product_id=product_id)
            prod = Product.objects.filter(id=product_id, provider=user).first()
            if prod:
                selected_product_name = prod.name

        # Calculate metrics
        total_orders = orders.count()
        total_revenue = orders.aggregate(total=Sum('total_price'))['total'] or 0
        total_quantity = orders.aggregate(total=Sum('quantity'))['total'] or 0

        # Sales over time
        sales_over_time = orders.annotate(date=TruncDate('created_at')) \
            .values('date') \
            .annotate(
                total_quantity=Sum('quantity'),
                total_sales=Sum('total_price'),
                orders_count=Count('id')
            ) \
            .order_by('date')

        # Product Summary
        product_summary = orders.values('product__name', 'product__unit') \
            .annotate(
                orders_count=Count('id'),
                total_quantity=Sum('quantity'),
                total_sales=Sum('total_price')
            ) \
            .order_by('-total_quantity')

        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        elements = []
        styles = getSampleStyleSheet()

        # Custom typography & styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1B5E20'),
            spaceAfter=4
        )

        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#388E3C'),
            spaceAfter=15
        )

        meta_label_style = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#424242')
        )

        meta_val_style = ParagraphStyle(
            'MetaVal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#212121')
        )

        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#1B5E20'),
            spaceBefore=12,
            spaceAfter=8
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.white,
            alignment=1
        )

        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#212121')
        )

        table_cell_center = ParagraphStyle(
            'TableCellCenter',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#212121'),
            alignment=1
        )

        table_cell_right = ParagraphStyle(
            'TableCellRight',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#212121'),
            alignment=2
        )

        # Header section
        elements.append(Paragraph("AgroBridge", title_style))
        elements.append(Paragraph("SALES & ANALYTICS REPORT", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2E7D32'), spaceAfter=12))

        # Meta Information Box
        date_range_str = f"{start_date if start_date else 'Beginning'} to {end_date if end_date else 'Present'}"
        meta_data = [
            [
                Paragraph("Provider:", meta_label_style), Paragraph(user.full_name or user.email, meta_val_style),
                Paragraph("Generated On:", meta_label_style), Paragraph(timezone.now().strftime("%Y-%m-%d %H:%M"), meta_val_style)
            ],
            [
                Paragraph("Email:", meta_label_style), Paragraph(user.email, meta_val_style),
                Paragraph("Date Filter:", meta_label_style), Paragraph(date_range_str, meta_val_style)
            ],
            [
                Paragraph("Phone:", meta_label_style), Paragraph(user.phone or "N/A", meta_val_style),
                Paragraph("Product Filter:", meta_label_style), Paragraph(selected_product_name, meta_val_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[80, 190, 90, 180])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F5F7F5')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#C8E6C9')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E8F5E9')),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # KPI Summary Cards (Table format)
        kpi_heading_style = ParagraphStyle('KPIHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor('#2E7D32'), alignment=1)
        kpi_value_style = ParagraphStyle('KPIVal', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=17, textColor=colors.HexColor('#1B5E20'), alignment=1)

        kpi_data = [
            [
                Paragraph("TOTAL ORDERS", kpi_heading_style),
                Paragraph("TOTAL VOLUME SOLD", kpi_heading_style),
                Paragraph("TOTAL REVENUE", kpi_heading_style)
            ],
            [
                Paragraph(str(total_orders), kpi_value_style),
                Paragraph(f"{total_quantity:,.2f}", kpi_value_style),
                Paragraph(f"${total_revenue:,.2f}", kpi_value_style)
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[180, 180, 180])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#E8F5E9')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#81C784')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#A5D6A7')),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 15))

        # Product Summary Table
        elements.append(Paragraph("Product Performance Summary", section_heading))
        prod_table_data = [
            [
                Paragraph("Product Name", table_header_style),
                Paragraph("Unit", table_header_style),
                Paragraph("Orders Count", table_header_style),
                Paragraph("Total Quantity", table_header_style),
                Paragraph("Total Sales", table_header_style)
            ]
        ]

        if product_summary:
            for item in product_summary:
                p_name = item['product__name'] or 'N/A'
                p_unit = item['product__unit'] or 'unit'
                orders_cnt = str(item['orders_count'])
                t_qty = f"{item['total_quantity']:,.2f}"
                t_sales = f"${item['total_sales']:,.2f}" if item.get('total_sales') is not None else "$0.00"

                prod_table_data.append([
                    Paragraph(p_name, table_cell_style),
                    Paragraph(p_unit, table_cell_center),
                    Paragraph(orders_cnt, table_cell_center),
                    Paragraph(t_qty, table_cell_right),
                    Paragraph(t_sales, table_cell_right)
                ])
        else:
            prod_table_data.append([
                Paragraph("No product sales data recorded for selected filters.", table_cell_style),
                Paragraph("-", table_cell_center), Paragraph("-", table_cell_center),
                Paragraph("-", table_cell_right), Paragraph("-", table_cell_right)
            ])

        prod_table = Table(prod_table_data, colWidths=[170, 60, 90, 110, 110])
        prod_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2E7D32')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')),
        ]))
        elements.append(prod_table)
        elements.append(Spacer(1, 15))

        # Daily Sales Breakdown Table
        elements.append(Paragraph("Sales Breakdown Over Time", section_heading))
        sales_table_data = [
            [
                Paragraph("Date", table_header_style),
                Paragraph("Orders", table_header_style),
                Paragraph("Quantity Sold", table_header_style),
                Paragraph("Daily Revenue", table_header_style)
            ]
        ]

        if sales_over_time:
            for item in sales_over_time:
                d_str = str(item['date']) if item['date'] else 'N/A'
                o_cnt = str(item['orders_count'])
                q_sold = f"{item['total_quantity']:,.2f}"
                rev = f"${item['total_sales']:,.2f}" if item.get('total_sales') is not None else "$0.00"

                sales_table_data.append([
                    Paragraph(d_str, table_cell_style),
                    Paragraph(o_cnt, table_cell_center),
                    Paragraph(q_sold, table_cell_right),
                    Paragraph(rev, table_cell_right)
                ])
        else:
            sales_table_data.append([
                Paragraph("No sales history found.", table_cell_style),
                Paragraph("-", table_cell_center), Paragraph("-", table_cell_right), Paragraph("-", table_cell_right)
            ])

        sales_table = Table(sales_table_data, colWidths=[140, 90, 150, 160])
        sales_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#388E3C')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')),
        ]))
        elements.append(sales_table)
        elements.append(Spacer(1, 20))

        # Footer note
        footer_style = ParagraphStyle(
            'FooterNote',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#757575'),
            alignment=1
        )
        elements.append(Paragraph("Generated automatically by AgroBridge Platform. Confidential & Proprietary.", footer_style))

        # Build PDF document
        doc.build(elements)

        pdf_value = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_value, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="sales_report_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        return response

