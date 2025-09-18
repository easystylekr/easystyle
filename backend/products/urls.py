from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import upload_views
from . import inventory_views
from . import naver_shopping_views

# ViewSet을 위한 Router 설정
router = DefaultRouter()
router.register(r'cart', views.CartViewSet, basename='cart')

app_name = 'products'

urlpatterns = [
    # 제품 카테고리 및 기본 정보
    path('categories/', views.ProductCategoryListView.as_view(), name='categories'),
    path('brands/', views.BrandListView.as_view(), name='brands'),
    path('stores/', views.StoreListView.as_view(), name='stores'),
    path('statistics/', views.product_statistics, name='statistics'),
    
    # 제품 관련
    path('', views.ProductListView.as_view(), name='product-list'),
    path('<uuid:uuid>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('search/', views.search_products, name='search-products'),
    
    # 위시리스트
    path('wishlist/', views.UserWishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', views.UserWishlistDetailView.as_view(), name='wishlist-detail'),
    path('wishlist/toggle/', views.toggle_wishlist, name='toggle-wishlist'),
    
    # 스타일 추천
    path('recommendations/', views.StyleRecommendationListView.as_view(), name='recommendations'),

    # 파일 업로드
    path('upload/style-image/', upload_views.upload_style_image, name='upload-style-image'),
    path('upload/profile-picture/', upload_views.upload_profile_picture, name='upload-profile-picture'),
    path('upload/profile-picture/delete/', upload_views.delete_profile_picture, name='delete-profile-picture'),
    path('upload/info/', upload_views.get_upload_info, name='upload-info'),

    # 재고 관리 및 구매 가능성 확인
    path('inventory/check-multiple/', inventory_views.check_multiple_products_inventory, name='check-multiple-inventory'),
    path('inventory/check-styling/', inventory_views.check_styling_products_inventory, name='check-styling-inventory'),
    path('inventory/status/<uuid:product_uuid>/', inventory_views.get_product_inventory_status, name='inventory-status'),
    path('inventory/score/<uuid:product_uuid>/', inventory_views.get_purchaseability_score, name='purchaseability-score'),
    path('inventory/statistics/', inventory_views.get_inventory_statistics, name='inventory-statistics'),
    path('inventory/alternatives/<uuid:product_uuid>/', inventory_views.get_alternative_products, name='find-alternatives'),

    # 네이버 쇼핑 API
    path('naver-shopping/', naver_shopping_views.naver_shopping_proxy, name='naver-shopping-proxy'),
    path('naver-shopping/categories/', naver_shopping_views.naver_shopping_categories, name='naver-shopping-categories'),
    path('naver-shopping/popular/', naver_shopping_views.naver_shopping_popular_keywords, name='naver-shopping-popular'),

    # Router로 관리되는 ViewSet URLs 포함
    path('', include(router.urls)),
]