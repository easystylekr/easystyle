from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from authentication.models import User
import uuid
import json
from datetime import timedelta


class ProductCategory(models.Model):
    """
    제품 카테고리 모델
    상의, 하의, 신발, 액세서리 등을 관리
    """
    name = models.CharField(max_length=100, unique=True)
    name_en = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # CSS icon class
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name_en
    
    class Meta:
        db_table = 'easystyle_product_categories'
        ordering = ['sort_order', 'name_en']


class Brand(models.Model):
    """
    브랜드 정보 모델
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    website = models.URLField(blank=True)
    country = models.CharField(max_length=100, blank=True)
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'easystyle_brands'
        ordering = ['name']


class Store(models.Model):
    """
    온라인 쇼핑몰 정보 모델
    """
    name = models.CharField(max_length=200, unique=True)
    website = models.URLField()
    api_endpoint = models.URLField(blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_partner = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # API 연동 정보
    api_key = models.CharField(max_length=500, blank=True)
    api_secret = models.CharField(max_length=500, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'easystyle_stores'
        ordering = ['name']


class Product(models.Model):
    """
    제품 정보 모델
    """
    # 기본 정보
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='products')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    
    # 가격 정보
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='KRW')
    
    # 제품 상세 정보
    color = models.CharField(max_length=100, blank=True)
    material = models.CharField(max_length=200, blank=True)
    sizes_available = models.JSONField(default=list, blank=True)
    recommended_size = models.CharField(max_length=50, blank=True)
    
    # 이미지 정보
    main_image = models.URLField()
    additional_images = models.JSONField(default=list, blank=True)
    ai_processed_image = models.ImageField(upload_to='products/ai_processed/', blank=True, null=True)
    
    # 스타일링 정보
    style_tags = models.JSONField(default=list, blank=True)  # ["casual", "formal", "sporty"]
    season = models.CharField(max_length=20, blank=True)  # spring, summer, fall, winter
    occasion = models.JSONField(default=list, blank=True)  # ["work", "date", "party"]
    
    # 외부 연동 정보
    external_id = models.CharField(max_length=200, blank=True)  # 쇼핑몰 상품 ID
    product_url = models.URLField()
    affiliate_url = models.URLField(blank=True)
    
    # 상태 및 재고
    is_available = models.BooleanField(default=True)
    stock_status = models.CharField(max_length=50, default='in_stock')
    last_updated_price = models.DateTimeField(auto_now=True)
    
    # 평점 및 리뷰
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    review_count = models.PositiveIntegerField(default=0)
    
    # AI 분석 정보
    ai_confidence_score = models.FloatField(null=True, blank=True)
    ai_style_match_score = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.brand.name} - {self.name}"
    
    @property
    def current_price(self):
        """현재 판매 가격 반환 (할인가 우선)"""
        return self.sale_price if self.sale_price else self.original_price
    
    @property
    def is_on_sale(self):
        """할인 중인지 확인"""
        return self.sale_price is not None and self.sale_price < self.original_price
    
    @property
    def discount_percentage(self):
        """할인율 계산"""
        if self.is_on_sale:
            return round(((self.original_price - self.sale_price) / self.original_price) * 100, 1)
        return 0
    
    class Meta:
        db_table = 'easystyle_products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'brand']),
            models.Index(fields=['store', 'is_available']),
            models.Index(fields=['created_at']),
        ]


class UserWishlist(models.Model):
    """
    사용자 위시리스트 모델
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name}"
    
    class Meta:
        db_table = 'easystyle_user_wishlist'
        unique_together = ['user', 'product']
        ordering = ['-added_at']


class StyleRecommendation(models.Model):
    """
    AI 스타일 추천 기록 모델
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_style_recommendations')
    products = models.ManyToManyField(Product, related_name='recommended_in')
    
    # 추천 정보
    style_prompt = models.TextField()
    generated_image = models.ImageField(upload_to='style_recommendations/')
    ai_description = models.TextField()
    confidence_score = models.FloatField()
    
    # 사용자 피드백
    user_rating = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    user_feedback = models.TextField(blank=True)
    
    # 메타데이터
    processing_time = models.FloatField(null=True, blank=True)
    algorithm_version = models.CharField(max_length=50, default='1.0')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'easystyle_style_recommendations'
        ordering = ['-created_at']


class ProductAnalytics(models.Model):
    """
    제품 분석 및 통계 모델
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='analytics')
    
    # 노출 및 클릭 통계
    view_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)
    wishlist_count = models.PositiveIntegerField(default=0)
    recommendation_count = models.PositiveIntegerField(default=0)
    
    # 스타일링 통계
    times_used_in_styling = models.PositiveIntegerField(default=0)
    average_style_rating = models.FloatField(null=True, blank=True)
    popular_combinations = models.JSONField(default=list, blank=True)
    
    # 사용자 선호도 분석
    age_group_popularity = models.JSONField(default=dict, blank=True)
    style_category_fit = models.JSONField(default=dict, blank=True)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Analytics for {self.product.name}"
    
    class Meta:
        db_table = 'easystyle_product_analytics'


class Cart(models.Model):
    """
    사용자 장바구니 모델
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Cart"

    @property
    def total_items(self):
        """장바구니 총 상품 개수"""
        return self.items.aggregate(total=models.Sum('quantity'))['total'] or 0

    @property
    def total_price(self):
        """장바구니 총 금액"""
        total = 0
        for item in self.items.all():
            total += item.subtotal
        return total

    class Meta:
        db_table = 'easystyle_carts'


class CartItem(models.Model):
    """
    장바구니 상품 모델
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    size = models.CharField(max_length=10, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    # 스타일 세트 구분 (나중에 Phase 3에서 활용)
    style_set_id = models.CharField(max_length=100, blank=True)

    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} (x{self.quantity}) in {self.cart.user.username}'s cart"

    @property
    def subtotal(self):
        """상품별 소계 금액"""
        return self.product.current_price * self.quantity

    class Meta:
        db_table = 'easystyle_cart_items'
        unique_together = ['cart', 'product', 'size']  # 같은 상품의 같은 사이즈는 하나의 아이템으로 관리
        ordering = ['-added_at']


class InventoryStatus(models.Model):
    """
    상품별 실시간 재고 상태 추적
    """
    STOCK_STATUS_CHOICES = [
        ('in_stock', '재고 있음'),
        ('low_stock', '재고 부족'),
        ('out_of_stock', '품절'),
        ('discontinued', '단종'),
        ('pre_order', '예약 주문'),
        ('unknown', '확인 불가'),
    ]

    AVAILABILITY_STATUS_CHOICES = [
        ('available', '구매 가능'),
        ('unavailable', '구매 불가'),
        ('restricted', '구매 제한'),
        ('checking', '확인 중'),
    ]

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory_status')

    # 재고 정보
    stock_status = models.CharField(max_length=20, choices=STOCK_STATUS_CHOICES, default='unknown')
    stock_quantity = models.PositiveIntegerField(null=True, blank=True, help_text="실제 재고 수량")

    # 사이즈별 재고 (JSON 형태로 저장)
    size_stock = models.JSONField(default=dict, blank=True, help_text="사이즈별 재고 정보")

    # 구매 가능 여부
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_STATUS_CHOICES, default='checking')
    is_purchasable = models.BooleanField(default=False, help_text="실제 구매 가능 여부")

    # 가격 변동 추적
    current_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_changed = models.BooleanField(default=False)
    price_change_percentage = models.FloatField(null=True, blank=True)

    # 외부 사이트 연동 정보
    last_checked_at = models.DateTimeField(auto_now=True)
    last_available_at = models.DateTimeField(null=True, blank=True)
    consecutive_unavailable_count = models.PositiveIntegerField(default=0)

    # 오류 및 문제 추적
    last_error_message = models.TextField(blank=True)
    check_failed_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} - {self.stock_status} - {self.availability_status}"

    @property
    def is_recently_checked(self):
        """최근 1시간 내에 확인되었는지"""
        return timezone.now() - self.last_checked_at < timedelta(hours=1)

    @property
    def needs_urgent_check(self):
        """긴급 확인이 필요한지 (24시간 이상 미확인)"""
        return timezone.now() - self.last_checked_at > timedelta(hours=24)

    def mark_as_available(self, stock_quantity=None, size_stock=None):
        """구매 가능으로 마킹"""
        self.availability_status = 'available'
        self.is_purchasable = True
        self.last_available_at = timezone.now()
        self.consecutive_unavailable_count = 0
        self.check_failed_count = 0

        if stock_quantity is not None:
            self.stock_quantity = stock_quantity

        if size_stock:
            self.size_stock = size_stock

        # 재고 상태 결정
        if stock_quantity:
            if stock_quantity > 10:
                self.stock_status = 'in_stock'
            elif stock_quantity > 0:
                self.stock_status = 'low_stock'
            else:
                self.stock_status = 'out_of_stock'
                self.is_purchasable = False

        self.save()

    def mark_as_unavailable(self, reason=""):
        """구매 불가로 마킹"""
        self.availability_status = 'unavailable'
        self.is_purchasable = False
        self.consecutive_unavailable_count += 1
        self.last_error_message = reason
        self.save()

    def mark_check_failed(self, error_message=""):
        """확인 실패로 마킹"""
        self.check_failed_count += 1
        self.last_error_message = error_message

        # 연속 실패 시 상태 조정
        if self.check_failed_count >= 3:
            self.availability_status = 'checking'
            self.is_purchasable = False

        self.save()

    class Meta:
        db_table = 'easystyle_inventory_status'
        verbose_name = '재고 상태'
        verbose_name_plural = '재고 상태들'


class InventoryCheckLog(models.Model):
    """
    재고 확인 로그 및 히스토리
    """
    CHECK_TYPE_CHOICES = [
        ('scheduled', '정기 확인'),
        ('manual', '수동 확인'),
        ('api_webhook', 'API 웹훅'),
        ('user_request', '사용자 요청'),
        ('style_recommendation', '스타일 추천 시'),
    ]

    STATUS_CHOICES = [
        ('success', '성공'),
        ('failed', '실패'),
        ('partial', '부분 성공'),
        ('timeout', '타임아웃'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_checks')
    check_type = models.CharField(max_length=20, choices=CHECK_TYPE_CHOICES, default='scheduled')

    # 확인 결과
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)

    # 확인 전후 상태
    previous_stock_status = models.CharField(max_length=20, blank=True)
    new_stock_status = models.CharField(max_length=20, blank=True)

    # 상세 정보
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    api_response_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)

    # 변경 사항 추적
    price_before = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_after = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    availability_changed = models.BooleanField(default=False)

    checked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.status} - {self.checked_at.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        db_table = 'easystyle_inventory_check_logs'
        ordering = ['-checked_at']
        indexes = [
            models.Index(fields=['product', '-checked_at']),
            models.Index(fields=['status', '-checked_at']),
        ]


class StoreApiConfig(models.Model):
    """
    쇼핑몰별 API 설정 및 크롤링 정보
    """
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='api_config')

    # API 설정
    api_type = models.CharField(max_length=20, choices=[
        ('rest_api', 'REST API'),
        ('graphql', 'GraphQL'),
        ('scraping', '웹 스크래핑'),
        ('rss_feed', 'RSS 피드'),
    ], default='scraping')

    # 재고 확인 엔드포인트
    inventory_check_url = models.URLField(blank=True)
    product_detail_url_pattern = models.CharField(max_length=500, blank=True)

    # 스크래핑 설정
    inventory_selector = models.CharField(max_length=200, blank=True, help_text="재고 정보 CSS 셀렉터")
    price_selector = models.CharField(max_length=200, blank=True, help_text="가격 정보 CSS 셀렉터")
    availability_selector = models.CharField(max_length=200, blank=True, help_text="구매 가능 여부 셀렉터")

    # 요청 설정
    request_headers = models.JSONField(default=dict, blank=True)
    request_delay_seconds = models.PositiveIntegerField(default=1, help_text="요청 간격(초)")
    max_retries = models.PositiveIntegerField(default=3)
    timeout_seconds = models.PositiveIntegerField(default=30)

    # 결과 파싱 설정
    success_indicators = models.JSONField(default=list, blank=True, help_text="성공 판단 키워드")
    stock_keywords = models.JSONField(default=dict, blank=True, help_text="재고 상태 키워드 매핑")
    unavailable_keywords = models.JSONField(default=list, blank=True, help_text="품절/구매불가 키워드")

    # 상태 정보
    is_active = models.BooleanField(default=True)
    last_successful_check = models.DateTimeField(null=True, blank=True)
    consecutive_failures = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.store.name} API Config - {self.api_type}"

    @property
    def is_healthy(self):
        """API 상태가 건강한지 확인"""
        return (
            self.is_active and
            self.consecutive_failures < 5 and
            (
                self.last_successful_check is None or
                timezone.now() - self.last_successful_check < timedelta(hours=24)
            )
        )

    def mark_success(self):
        """성공 마킹"""
        self.last_successful_check = timezone.now()
        self.consecutive_failures = 0
        self.save()

    def mark_failure(self):
        """실패 마킹"""
        self.consecutive_failures += 1

        # 연속 실패 시 비활성화
        if self.consecutive_failures >= 10:
            self.is_active = False

        self.save()

    class Meta:
        db_table = 'easystyle_store_api_configs'
        verbose_name = '스토어 API 설정'
        verbose_name_plural = '스토어 API 설정들'


class PurchaseabilityScore(models.Model):
    """
    상품별 구매 가능성 점수 (ML 기반)
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='purchaseability_score')

    # 구매 가능성 점수 (0-100)
    overall_score = models.PositiveIntegerField(default=0, help_text="전체 구매 가능성 점수")

    # 세부 점수
    availability_score = models.PositiveIntegerField(default=0, help_text="재고 가용성 점수")
    reliability_score = models.PositiveIntegerField(default=0, help_text="스토어 신뢰도 점수")
    price_stability_score = models.PositiveIntegerField(default=0, help_text="가격 안정성 점수")
    delivery_score = models.PositiveIntegerField(default=0, help_text="배송 가능성 점수")

    # 히스토리 기반 분석
    historical_availability_rate = models.FloatField(default=0.0, help_text="과거 가용성 비율")
    average_stock_duration_days = models.PositiveIntegerField(default=0, help_text="평균 재고 유지 기간")
    price_change_frequency = models.PositiveIntegerField(default=0, help_text="가격 변동 빈도")

    # 예측 정보
    predicted_stock_out_date = models.DateTimeField(null=True, blank=True)
    predicted_restock_date = models.DateTimeField(null=True, blank=True)
    confidence_level = models.FloatField(default=0.0, help_text="예측 신뢰도")

    # 추천 우선순위
    recommendation_priority = models.PositiveIntegerField(default=50, help_text="추천 우선순위 (1-100)")

    last_calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - Score: {self.overall_score}/100"

    @property
    def is_highly_purchasable(self):
        """높은 구매 가능성 여부"""
        return self.overall_score >= 80

    @property
    def is_recommended_for_styling(self):
        """스타일링 추천에 적합한지"""
        return (
            self.overall_score >= 60 and
            self.availability_score >= 70 and
            self.reliability_score >= 60
        )

    def update_scores(self):
        """점수 재계산"""
        # 실제 ML 모델이나 복잡한 로직으로 대체 예정
        # 현재는 기본적인 계산

        inventory = getattr(self.product, 'inventory_status', None)
        if inventory:
            # 가용성 점수
            if inventory.is_purchasable and inventory.stock_status == 'in_stock':
                self.availability_score = 90
            elif inventory.stock_status == 'low_stock':
                self.availability_score = 60
            elif inventory.stock_status == 'out_of_stock':
                self.availability_score = 10
            else:
                self.availability_score = 30

            # 신뢰도 점수 (체크 실패율 기반)
            if inventory.check_failed_count == 0:
                self.reliability_score = 100
            elif inventory.check_failed_count < 3:
                self.reliability_score = 80
            elif inventory.check_failed_count < 5:
                self.reliability_score = 60
            else:
                self.reliability_score = 30

        # 전체 점수 계산
        self.overall_score = int(
            (self.availability_score * 0.4) +
            (self.reliability_score * 0.3) +
            (self.price_stability_score * 0.15) +
            (self.delivery_score * 0.15)
        )

        # 추천 우선순위 계산
        self.recommendation_priority = min(max(self.overall_score, 1), 100)

        self.save()

    class Meta:
        db_table = 'easystyle_purchaseability_scores'
        ordering = ['-overall_score']
        verbose_name = '구매 가능성 점수'
        verbose_name_plural = '구매 가능성 점수들'


class PurchaseProxyRequest(models.Model):
    """
    고객별 구매 대행 요청 관리
    """
    STATUS_CHOICES = [
        ('pending', '대기 중'),
        ('confirmed', '확인됨'),
        ('purchasing', '구매 중'),
        ('purchased', '구매 완료'),
        ('shipped', '배송 중'),
        ('delivered', '배송 완료'),
        ('cancelled', '취소됨'),
        ('failed', '구매 실패'),
    ]

    PRIORITY_CHOICES = [
        ('low', '낮음'),
        ('normal', '보통'),
        ('high', '높음'),
        ('urgent', '긴급'),
    ]

    # 기본 정보
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchase_requests')
    style_recommendation = models.ForeignKey(
        StyleRecommendation,
        on_delete=models.CASCADE,
        related_name='purchase_requests',
        null=True,
        blank=True
    )

    # 구매 상태
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')

    # 고객 정보
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    delivery_address = models.TextField()
    delivery_memo = models.TextField(blank=True)

    # 구매 정보
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # 담당자 정보
    assigned_coordinator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_purchases'
    )
    coordinator_notes = models.TextField(blank=True)

    # 일정 관리
    requested_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer_name} - {self.get_status_display()} - {self.uuid}"

    @property
    def total_items_count(self):
        """총 구매 상품 개수"""
        return self.items.count()

    @property
    def is_urgent(self):
        """긴급 건인지 확인"""
        if self.deadline and self.deadline <= timezone.now() + timedelta(hours=24):
            return True
        return self.priority == 'urgent'

    def mark_confirmed(self, coordinator=None):
        """구매 확인"""
        self.status = 'confirmed'
        self.confirmed_at = timezone.now()
        if coordinator:
            self.assigned_coordinator = coordinator
        self.save()

    def mark_purchasing(self):
        """구매 중으로 상태 변경"""
        self.status = 'purchasing'
        self.save()

    def mark_completed(self):
        """구매 완료"""
        self.status = 'purchased'
        self.completed_at = timezone.now()
        self.save()

    class Meta:
        db_table = 'easystyle_purchase_proxy_requests'
        ordering = ['-created_at']
        verbose_name = '구매 대행 요청'
        verbose_name_plural = '구매 대행 요청들'


class PurchaseProxyItem(models.Model):
    """
    구매 대행 요청의 개별 상품
    """
    STATUS_CHOICES = [
        ('pending', '대기'),
        ('checking', '재고 확인 중'),
        ('available', '구매 가능'),
        ('unavailable', '구매 불가'),
        ('ordered', '주문 완료'),
        ('alternative_suggested', '대체품 제안'),
    ]

    request = models.ForeignKey(PurchaseProxyRequest, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchase_items')

    # 구매 상세 정보
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=50, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    # 상태 및 URL 정보
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    purchase_url = models.URLField(help_text="실제 구매할 쇼핑몰 URL")
    alternative_products = models.JSONField(default=list, blank=True, help_text="대체 상품 정보")

    # 구매 결과
    order_number = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateTimeField(null=True, blank=True)

    # 메모
    coordinator_notes = models.TextField(blank=True)
    customer_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} - {self.get_status_display()}"

    @property
    def subtotal(self):
        """소계 금액"""
        return self.unit_price * self.quantity

    @property
    def is_available_for_purchase(self):
        """구매 가능한 상태인지 확인"""
        return self.status == 'available' and self.purchase_url

    def mark_ordered(self, order_number=None):
        """주문 완료로 마킹"""
        self.status = 'ordered'
        self.purchase_date = timezone.now()
        if order_number:
            self.order_number = order_number
        self.save()

    class Meta:
        db_table = 'easystyle_purchase_proxy_items'
        ordering = ['created_at']
        unique_together = ['request', 'product', 'size']


class CoordinatorDashboard(models.Model):
    """
    팀 코디네이터 대시보드 정보
    """
    coordinator = models.OneToOneField(User, on_delete=models.CASCADE, related_name='coordinator_dashboard')

    # 업무 통계
    total_requests_handled = models.PositiveIntegerField(default=0)
    total_items_purchased = models.PositiveIntegerField(default=0)
    total_amount_processed = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # 성과 지표
    success_rate = models.FloatField(default=0.0, help_text="구매 성공률 (%)")
    average_processing_time_hours = models.FloatField(default=0.0)
    customer_satisfaction_score = models.FloatField(default=0.0)

    # 설정
    is_active = models.BooleanField(default=True)
    max_concurrent_requests = models.PositiveIntegerField(default=10)
    preferred_stores = models.JSONField(default=list, blank=True)
    working_hours = models.JSONField(default=dict, blank=True)

    last_active_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.coordinator.username} Dashboard"

    @property
    def current_active_requests(self):
        """현재 처리 중인 요청 수"""
        return PurchaseProxyRequest.objects.filter(
            assigned_coordinator=self.coordinator,
            status__in=['confirmed', 'purchasing']
        ).count()

    @property
    def can_take_more_requests(self):
        """추가 요청을 받을 수 있는지"""
        return self.is_active and self.current_active_requests < self.max_concurrent_requests

    def update_statistics(self):
        """통계 업데이트"""
        handled_requests = PurchaseProxyRequest.objects.filter(assigned_coordinator=self.coordinator)

        self.total_requests_handled = handled_requests.count()
        self.total_items_purchased = PurchaseProxyItem.objects.filter(
            request__assigned_coordinator=self.coordinator,
            status='ordered'
        ).count()

        completed_requests = handled_requests.filter(status='purchased')
        if handled_requests.exists():
            self.success_rate = (completed_requests.count() / handled_requests.count()) * 100

        self.save()

    class Meta:
        db_table = 'easystyle_coordinator_dashboards'
        verbose_name = '코디네이터 대시보드'
        verbose_name_plural = '코디네이터 대시보드들'
