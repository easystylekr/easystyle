import requests
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# 네이버 API 설정
NAVER_CLIENT_ID = getattr(settings, 'NAVER_CLIENT_ID', '')
NAVER_CLIENT_SECRET = getattr(settings, 'NAVER_CLIENT_SECRET', '')
NAVER_SHOPPING_API_URL = 'https://openapi.naver.com/v1/search/shop.json'

@csrf_exempt
@require_http_methods(["GET"])
def naver_shopping_proxy(request):
    """
    네이버 쇼핑 API 프록시
    CORS 문제를 해결하고 API 키를 보호하기 위한 프록시 엔드포인트
    """
    try:
        # API 키 확인
        if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
            return JsonResponse({
                'error': '네이버 API 설정이 필요합니다.',
                'items': []
            }, status=500)

        # 요청 파라미터 추출
        query = request.GET.get('query', '').strip()
        if not query:
            return JsonResponse({
                'error': '검색어가 필요합니다.',
                'items': []
            }, status=400)

        display = int(request.GET.get('display', 20))
        start = int(request.GET.get('start', 1))
        sort = request.GET.get('sort', 'sim')  # sim: 정확도순, date: 날짜순, asc: 가격낮은순, dsc: 가격높은순

        # 파라미터 유효성 검사
        if display > 100:
            display = 100
        if start < 1:
            start = 1

        # 네이버 API 호출
        headers = {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            'User-Agent': 'EasyStyle-Fashion-App/1.0'
        }

        params = {
            'query': query,
            'display': display,
            'start': start,
            'sort': sort
        }

        logger.info(f"네이버 쇼핑 API 호출: query={query}, display={display}, sort={sort}")

        response = requests.get(
            NAVER_SHOPPING_API_URL,
            headers=headers,
            params=params,
            timeout=10
        )

        if response.status_code == 200:
            naver_data = response.json()

            # 필요한 필드만 필터링하여 응답 크기 최적화
            filtered_items = []
            for item in naver_data.get('items', []):
                filtered_item = {
                    'title': item.get('title', ''),
                    'link': item.get('link', ''),
                    'image': item.get('image', ''),
                    'lprice': item.get('lprice', '0'),
                    'hprice': item.get('hprice', '0'),
                    'mallName': item.get('mallName', ''),
                    'productId': item.get('productId', ''),
                    'productType': item.get('productType', ''),
                    'brand': item.get('brand', ''),
                    'maker': item.get('maker', ''),
                    'category1': item.get('category1', ''),
                    'category2': item.get('category2', ''),
                    'category3': item.get('category3', ''),
                    'category4': item.get('category4', '')
                }
                filtered_items.append(filtered_item)

            filtered_response = {
                'lastBuildDate': naver_data.get('lastBuildDate', ''),
                'total': naver_data.get('total', 0),
                'start': naver_data.get('start', 1),
                'display': naver_data.get('display', 0),
                'items': filtered_items
            }

            logger.info(f"네이버 쇼핑 API 성공: {len(filtered_items)}개 상품 반환")
            return JsonResponse(filtered_response)

        else:
            logger.error(f"네이버 API 오류: {response.status_code}, {response.text}")
            return JsonResponse({
                'error': f'네이버 API 호출 실패: {response.status_code}',
                'items': []
            }, status=response.status_code)

    except requests.exceptions.Timeout:
        logger.error("네이버 API 요청 타임아웃")
        return JsonResponse({
            'error': '요청 시간이 초과되었습니다.',
            'items': []
        }, status=408)

    except requests.exceptions.RequestException as e:
        logger.error(f"네이버 API 요청 오류: {str(e)}")
        return JsonResponse({
            'error': '네트워크 오류가 발생했습니다.',
            'items': []
        }, status=500)

    except ValueError as e:
        logger.error(f"파라미터 오류: {str(e)}")
        return JsonResponse({
            'error': '잘못된 요청 파라미터입니다.',
            'items': []
        }, status=400)

    except Exception as e:
        logger.error(f"네이버 쇼핑 프록시 예기치 않은 오류: {str(e)}")
        return JsonResponse({
            'error': '서버 오류가 발생했습니다.',
            'items': []
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def naver_shopping_categories(request):
    """
    네이버 쇼핑 카테고리 정보 반환
    """
    categories = {
        'fashion': {
            'women_clothing': {
                'tops': ['블라우스', '티셔츠', '셔츠', '니트웨어', '후드티', '맨투맨'],
                'bottoms': ['바지', '청바지', '스커트', '레깅스', '반바지'],
                'outerwear': ['자켓', '코트', '패딩', '가디건', '블레이저'],
                'underwear': ['브라', '팬티', '속옷세트', '보정속옷']
            },
            'shoes': ['운동화', '구두', '부츠', '샌들', '슬리퍼', '힐'],
            'accessories': ['가방', '지갑', '벨트', '모자', '시계', '쥬얼리']
        }
    }

    return JsonResponse(categories)


@csrf_exempt
@require_http_methods(["GET"])
def naver_shopping_popular_keywords(request):
    """
    네이버 쇼핑 인기 검색어 반환
    """
    popular_keywords = {
        'fashion': [
            '블라우스', '니트', '청바지', '원피스', '코트',
            '운동화', '부츠', '가방', '액세서리', '스커트'
        ],
        'seasonal': {
            'spring': ['가디건', '블라우스', '스니커즈', '가벼운자켓'],
            'summer': ['반팔티', '원피스', '샌들', '반바지'],
            'fall': ['니트', '부츠', '자켓', '롱코트'],
            'winter': ['패딩', '목도리', '부츠', '두꺼운코트']
        }
    }

    return JsonResponse(popular_keywords)