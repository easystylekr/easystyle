import type { Product } from '../types';
import { ProductCategory } from '../types';

// 네이버 쇼핑 API 응답 타입
interface NaverShoppingResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverProduct[];
}

interface NaverProduct {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

// 네이버 검색 API 설정
const NAVER_API_CONFIG = {
  baseUrl: 'https://openapi.naver.com/v1/search/shop.json',
  // 실제 사용 시에는 환경변수에서 가져와야 함
  clientId: process.env.NAVER_CLIENT_ID || '',
  clientSecret: process.env.NAVER_CLIENT_SECRET || ''
};

// 카테고리를 네이버 쇼핑 카테고리로 매핑
export const mapCategoryToNaverCategory = (category: ProductCategory): string => {
  const categoryMap: Record<ProductCategory, string> = {
    [ProductCategory.Top]: '패션의류>여성의류>상의',
    [ProductCategory.Bottom]: '패션의류>여성의류>하의',
    [ProductCategory.Outerwear]: '패션의류>여성의류>아우터',
    [ProductCategory.Shoes]: '패션잡화>신발',
    [ProductCategory.Accessory]: '패션잡화>패션소품',
    [ProductCategory.Underwear]: '패션의류>여성의류>속옷'
  };

  return categoryMap[category] || '패션의류';
};

// 네이버 쇼핑 카테고리를 우리 카테고리로 변환
export const mapNaverCategoryToOurCategory = (naverCategory: string): ProductCategory => {
  if (naverCategory.includes('상의') || naverCategory.includes('티셔츠') || naverCategory.includes('셔츠')) {
    return ProductCategory.Top;
  }
  if (naverCategory.includes('하의') || naverCategory.includes('바지') || naverCategory.includes('스커트')) {
    return ProductCategory.Bottom;
  }
  if (naverCategory.includes('아우터') || naverCategory.includes('자켓') || naverCategory.includes('코트')) {
    return ProductCategory.Outerwear;
  }
  if (naverCategory.includes('신발') || naverCategory.includes('부츠') || naverCategory.includes('스니커즈')) {
    return ProductCategory.Shoes;
  }
  if (naverCategory.includes('가방') || naverCategory.includes('액세서리') || naverCategory.includes('시계')) {
    return ProductCategory.Accessory;
  }
  if (naverCategory.includes('속옷') || naverCategory.includes('언더웨어')) {
    return ProductCategory.Underwear;
  }

  return ProductCategory.Top; // 기본값
};

// HTML 태그 제거 함수
const removeHtmlTags = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
};

// 네이버 쇼핑 API 호출 (프록시 서버 사용)
const callNaverShoppingAPI = async (
  query: string,
  display: number = 20,
  sort: string = 'sim'
): Promise<NaverShoppingResponse | null> => {
  try {
    // 백엔드 프록시를 통한 네이버 API 호출
    const params = new URLSearchParams({
      query,
      display: display.toString(),
      sort
    });

    const response = await fetch(`http://localhost:8000/api/products/naver-shopping/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`네이버 쇼핑 API 호출 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('네이버 쇼핑 API 호출 오류:', error);
    return null;
  }
};

// 네이버 쇼핑에서 상품 검색
export const searchNaverShopping = async (
  keywords: string[],
  category?: ProductCategory,
  maxResults: number = 10
): Promise<Product[]> => {
  try {
    const products: Product[] = [];

    // 각 키워드로 검색 수행
    for (const keyword of keywords.slice(0, 3)) { // 최대 3개 키워드만 사용
      const naverResponse = await callNaverShoppingAPI(keyword, maxResults);

      if (naverResponse && naverResponse.items) {
        const naverProducts = naverResponse.items.map((item: NaverProduct) => {
          const productCategory = mapNaverCategoryToOurCategory(
            `${item.category1} ${item.category2} ${item.category3} ${item.category4}`
          );

          return {
            id: `naver-${item.productId || Math.random().toString(36).substr(2, 9)}`,
            brand: removeHtmlTags(item.brand || item.maker || '브랜드 미상'),
            name: removeHtmlTags(item.title),
            price: parseInt(item.lprice) || 0,
            imageUrl: item.image,
            recommendedSize: 'Free',
            productUrl: item.link,
            storeName: removeHtmlTags(item.mallName || '네이버쇼핑'),
            category: productCategory,
            currency: 'KRW',
            isSelected: false
          } as Product;
        });

        products.push(...naverProducts);
      }
    }

    // 카테고리 필터링
    let filteredProducts = products;
    if (category) {
      filteredProducts = products.filter(product => product.category === category);
    }

    // 중복 제거 (상품명과 브랜드가 같은 경우)
    const uniqueProducts = filteredProducts.filter((product, index, self) =>
      index === self.findIndex(p =>
        p.name.toLowerCase() === product.name.toLowerCase() &&
        p.brand.toLowerCase() === product.brand.toLowerCase()
      )
    );

    // 가격순으로 정렬하고 최대 결과 수만큼 반환
    return uniqueProducts
      .sort((a, b) => a.price - b.price)
      .slice(0, maxResults);

  } catch (error) {
    console.error('네이버 쇼핑 검색 실패:', error);
    return [];
  }
};

// 스타일 설명을 네이버 검색에 적합한 키워드로 변환
export const convertStyleToNaverKeywords = (styleDescription: string): string[] => {
  const keywords = [];

  // 기본 패션 키워드 맵
  const fashionKeywords = {
    // 상의 관련
    '상의': ['상의', '티셔츠', '블라우스', '셔츠', '니트'],
    '티셔츠': ['티셔츠', '반팔티', '긴팔티'],
    '셔츠': ['셔츠', '블라우스'],
    '니트': ['니트', '스웨터', '가디건'],
    '후드': ['후드티', '후드집업', '맨투맨'],

    // 하의 관련
    '하의': ['하의', '바지', '팬츠', '스커트'],
    '바지': ['바지', '팬츠', '슬랙스', '청바지'],
    '청바지': ['청바지', '데님', '진'],
    '스커트': ['스커트', '미니스커트', '롱스커트'],

    // 아우터 관련
    '아우터': ['아우터', '자켓', '코트', '패딩'],
    '자켓': ['자켓', '블레이저', '재킷'],
    '코트': ['코트', '트렌치코트', '롱코트'],
    '패딩': ['패딩', '다운점퍼', '패딩점퍼'],

    // 신발 관련
    '신발': ['신발', '구두', '운동화', '부츠'],
    '운동화': ['운동화', '스니커즈', '러닝화'],
    '부츠': ['부츠', '앵클부츠', '롱부츠'],
    '구두': ['구두', '힐', '플랫슈즈'],

    // 액세서리 관련
    '가방': ['가방', '핸드백', '토트백', '크로스백'],
    '액세서리': ['액세서리', '목걸이', '귀걸이', '시계'],
    '모자': ['모자', '캡', '비니', '햇']
  };

  // 색상 키워드
  const colors = [
    '블랙', '화이트', '네이비', '베이지', '브라운', '그레이', '카키',
    '레드', '블루', '그린', '핑크', '옐로우', '퍼플', '오렌지'
  ];

  // 스타일 키워드
  const styles = [
    '캐주얼', '포멀', '빈티지', '모던', '클래식', '트렌디', '미니멀',
    '로맨틱', '시크', '스포티', '스트릿', '보헤미안'
  ];

  const description = styleDescription.toLowerCase();

  // 패션 아이템 키워드 매칭
  Object.entries(fashionKeywords).forEach(([key, values]) => {
    if (description.includes(key) || values.some(v => description.includes(v.toLowerCase()))) {
      keywords.push(...values.slice(0, 2)); // 최대 2개씩
    }
  });

  // 색상 키워드 매칭
  colors.forEach(color => {
    if (description.includes(color.toLowerCase()) || description.includes(color)) {
      keywords.push(color);
    }
  });

  // 스타일 키워드 매칭
  styles.forEach(style => {
    if (description.includes(style.toLowerCase()) || description.includes(style)) {
      keywords.push(style);
    }
  });

  // 중복 제거 및 빈 배열 처리
  const uniqueKeywords = [...new Set(keywords)];

  return uniqueKeywords.length > 0 ? uniqueKeywords : ['패션', '의류'];
};

// 카테고리별 인기 검색어
export const getPopularNaverKeywords = (category: ProductCategory): string[] => {
  const popularKeywords: Record<ProductCategory, string[]> = {
    [ProductCategory.Top]: ['블라우스', '니트', '맨투맨', '후드티', '크롭탑'],
    [ProductCategory.Bottom]: ['와이드팬츠', '스키니진', '플리츠스커트', '미니스커트', '조거팬츠'],
    [ProductCategory.Outerwear]: ['트렌치코트', '무스탕', '패딩', '가디건', '블레이저'],
    [ProductCategory.Shoes]: ['첼시부츠', '운동화', '로퍼', '앵클부츠', '스니커즈'],
    [ProductCategory.Accessory]: ['크로스백', '시계', '귀걸이', '목걸이', '반지'],
    [ProductCategory.Underwear]: ['브라', '팬티', '보정속옷', '런닝', '나시']
  };

  return popularKeywords[category] || [];
};

// 네이버 쇼핑 통합 검색
export const searchNaverShoppingIntegrated = async (
  styleDescription: string,
  category?: ProductCategory
): Promise<Product[]> => {
  try {
    // 스타일 설명을 키워드로 변환
    const keywords = convertStyleToNaverKeywords(styleDescription);

    // 카테고리별 인기 키워드 추가
    if (category) {
      const popularKeywords = getPopularNaverKeywords(category);
      keywords.push(...popularKeywords.slice(0, 2));
    }

    console.log('네이버 쇼핑 검색 키워드:', keywords);

    // 네이버 쇼핑에서 검색
    const naverProducts = await searchNaverShopping(keywords, category, 15);

    return naverProducts;

  } catch (error) {
    console.error('네이버 쇼핑 통합 검색 실패:', error);
    return [];
  }
};