from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    ProductCategory, Brand, Store, Product,
    UserWishlist, StyleRecommendation, Cart, CartItem
)


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en', 'icon_display', 'sort_order', 'is_active', 'product_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'name_en', 'description')
    list_editable = ('sort_order', 'is_active')
    ordering = ('sort_order', 'name')

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="{}"></i> {}', obj.icon, obj.icon)
        return '-'
    icon_display.short_description = 'Icon'

    def product_count(self, obj):
        count = obj.products.count()
        url = reverse('admin:products_product_changelist') + f'?category={obj.id}'
        return format_html('<a href="{}">{} products</a>', url, count)
    product_count.short_description = 'Products'


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'is_premium', 'is_active', 'product_count', 'created_at')
    list_filter = ('is_premium', 'is_active', 'country', 'created_at')
    search_fields = ('name', 'description', 'country')
    list_editable = ('is_premium', 'is_active')
    ordering = ('name',)

    def product_count(self, obj):
        count = obj.products.count()
        url = reverse('admin:products_product_changelist') + f'?brand={obj.id}'
        return format_html('<a href="{}">{} products</a>', url, count)
    product_count.short_description = 'Products'


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_partner', 'is_active', 'product_count', 'created_at')
    list_filter = ('is_partner', 'is_active', 'created_at')
    search_fields = ('name', 'website')
    list_editable = ('is_active',)
    ordering = ('name',)

    def product_count(self, obj):
        count = obj.products.count()
        url = reverse('admin:products_product_changelist') + f'?store={obj.id}'
        return format_html('<a href="{}">{} products</a>', url, count)
    product_count.short_description = 'Products'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'category', 'price_display', 'currency', 'is_on_sale', 'rating', 'is_available', 'created_at')
    list_filter = ('category', 'brand', 'store', 'is_available', 'currency', 'created_at')
    search_fields = ('name', 'description', 'color', 'style_tags')
    list_editable = ('is_available',)
    ordering = ('-created_at',)
    readonly_fields = ('uuid', 'created_at', 'updated_at')

    fieldsets = (
        ('기본 정보', {
            'fields': ('uuid', 'name', 'description', 'category', 'brand', 'store')
        }),
        ('가격 정보', {
            'fields': ('original_price', 'sale_price', 'currency')
        }),
        ('제품 상세', {
            'fields': ('color', 'material', 'main_image', 'additional_images', 'rating', 'review_count', 'style_tags', 'recommended_size')
        }),
        ('재고 및 링크', {
            'fields': ('is_available', 'stock_status', 'product_url', 'affiliate_url')
        }),
        ('메타데이터', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def price_display(self, obj):
        if obj.is_on_sale and obj.sale_price:
            return format_html(
                '<span style="text-decoration: line-through;">{}</span> → <strong style="color: red;">{}</strong>',
                obj.original_price, obj.sale_price
            )
        return str(obj.current_price)
    price_display.short_description = 'Price'


# UserWishlist와 StyleRecommendation 모델이 아직 정의되지 않았거나 다른 구조일 수 있음
# 기본 admin 등록만 수행
try:
    from .models import UserWishlist
    @admin.register(UserWishlist)
    class UserWishlistAdmin(admin.ModelAdmin):
        list_display = ('user', 'product')
        search_fields = ('user__username', 'user__email', 'product__name')
        raw_id_fields = ('user', 'product')
except ImportError:
    pass

try:
    from .models import StyleRecommendation
    @admin.register(StyleRecommendation)
    class StyleRecommendationAdmin(admin.ModelAdmin):
        list_display = ('user',)
        search_fields = ('user__username', 'user__email')
        raw_id_fields = ('user',)
except ImportError:
    pass


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_items_display', 'total_price_display', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    list_filter = ('created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')

    def total_items_display(self, obj):
        return obj.total_items
    total_items_display.short_description = 'Total Items'

    def total_price_display(self, obj):
        return format_html('₩{:,}', int(obj.total_price))
    total_price_display.short_description = 'Total Price'


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('added_at', 'updated_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart_user', 'product', 'size', 'quantity', 'subtotal_display', 'added_at')
    list_filter = ('added_at', 'updated_at', 'size')
    search_fields = ('cart__user__username', 'product__name', 'product__brand__name')
    readonly_fields = ('added_at', 'updated_at')

    def cart_user(self, obj):
        return obj.cart.user.username
    cart_user.short_description = 'User'

    def subtotal_display(self, obj):
        return format_html('₩{:,}', int(obj.subtotal))
    subtotal_display.short_description = 'Subtotal'


# Cart 인라인을 기존 User admin에 추가하려면 authentication 앱에서 설정해야 함
# 여기서는 별도로 관리
