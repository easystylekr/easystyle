import type { Product } from '../types';
import { ProductCategory } from '../types';

// 한국 주요 쇼핑몰 정보
export interface KoreanShoppingSite {
  name: string;
  baseUrl: string;
  searchPath: string;
  categories: {
    clothing: string[];
    shoes: string[];
    accessories: string[];
  };
}

export const KOREAN_SHOPPING_SITES: KoreanShoppingSite[] = [
  {
    name: '무신사',
    baseUrl: 'https://www.musinsa.com',
    searchPath: '/search/goods',
    categories: {
      clothing: ['상의', '하의', '아우터', '원피스/스커트', '니트웨어'],
      shoes: ['스니커즈', '구두', '부츠', '슬리퍼/샌들', '운동화'],
      accessories: ['가방', '모자', '시계', '쥬얼리', '안경/선글라스', '벨트']
    }
  },
  {
    name: '29CM',
    baseUrl: 'https://www.29cm.co.kr',
    searchPath: '/search',
    categories: {
      clothing: ['티셔츠', '셔츠', '팬츠', '자켓', '코트', '니트'],
      shoes: ['운동화', '로퍼', '부츠', '힐', '플랫슈즈'],
      accessories: ['백팩', '토트백', '크로스백', '시계', '목걸이', '반지']
    }
  },
  {
    name: '스타일난다',
    baseUrl: 'https://www.stylenanda.com',
    searchPath: '/product/search',
    categories: {
      clothing: ['블라우스', '티셔츠', '팬츠', '스커트', '원피스', '아우터'],
      shoes: ['힐', '플랫', '부츠', '스니커즈', '샌들'],
      accessories: ['백', '쥬얼리', '헤어액세서리', '모자', '벨트']
    }
  },
  {
    name: '에이블리',
    baseUrl: 'https://www.a-bly.com',
    searchPath: '/goods/search',
    categories: {
      clothing: ['상의', '원피스', '아우터', '하의', '세트'],
      shoes: ['플랫/로퍼', '힐', '부츠', '스니커즈', '샌들/슬리퍼'],
      accessories: ['가방', '쥬얼리', '모자', '헤어용품', '양말/스타킹']
    }
  },
  {
    name: '브랜디',
    baseUrl: 'https://www.brandi.co.kr',
    searchPath: '/search',
    categories: {
      clothing: ['상의', '하의', '원피스', '아우터', '언더웨어'],
      shoes: ['운동화', '힐', '플랫슈즈', '부츠', '샌들'],
      accessories: ['가방', '액세서리', '모자', '벨트', '스카프']
    }
  }
];

// 스타일 키워드를 한국어 검색어로 변환
export const translateStyleToKorean = (styleDescription: string): string[] => {
  const keywords = [];

  // 색상 키워드
  const colorMap: Record<string, string> = {
    'black': '블랙',
    'white': '화이트',
    'navy': '네이비',
    'beige': '베이지',
    'brown': '브라운',
    'gray': '그레이',
    'red': '레드',
    'blue': '블루',
    'green': '그린',
    'pink': '핑크',
    'yellow': '옐로우',
    'purple': '퍼플'
  };

  // 아이템 키워드
  const itemMap: Record<string, string> = {
    'shirt': '셔츠',
    'blouse': '블라우스',
    'tshirt': '티셔츠',
    't-shirt': '티셔츠',
    'sweater': '스웨터',
    'cardigan': '가디건',
    'hoodie': '후드티',
    'jacket': '자켓',
    'coat': '코트',
    'blazer': '블레이저',
    'dress': '원피스',
    'skirt': '스커트',
    'pants': '팬츠',
    'jeans': '청바지',
    'trousers': '바지',
    'leggings': '레깅스',
    'shorts': '반바지',
    'boots': '부츠',
    'heels': '힐',
    'sneakers': '스니커즈',
    'flats': '플랫슈즈',
    'sandals': '샌들',
    'bag': '가방',
    'backpack': '백팩',
    'clutch': '클러치',
    'necklace': '목걸이',
    'earrings': '귀걸이',
    'bracelet': '팔찌',
    'ring': '반지',
    'watch': '시계',
    'hat': '모자',
    'cap': '캡',
    'belt': '벨트',
    'scarf': '스카프'
  };

  // 스타일 키워드
  const styleMap: Record<string, string> = {
    'casual': '캐주얼',
    'formal': '포멀',
    'business': '비즈니스',
    'romantic': '로맨틱',
    'vintage': '빈티지',
    'modern': '모던',
    'classic': '클래식',
    'trendy': '트렌디',
    'minimalist': '미니멀',
    'bohemian': '보헤미안',
    'chic': '시크',
    'elegant': '엘레간트',
    'sporty': '스포티',
    'street': '스트릿'
  };

  const lowerDescription = styleDescription.toLowerCase();

  // 색상 키워드 추출
  Object.entries(colorMap).forEach(([eng, kor]) => {
    if (lowerDescription.includes(eng)) {
      keywords.push(kor);
    }
  });

  // 아이템 키워드 추출
  Object.entries(itemMap).forEach(([eng, kor]) => {
    if (lowerDescription.includes(eng)) {
      keywords.push(kor);
    }
  });

  // 스타일 키워드 추출
  Object.entries(styleMap).forEach(([eng, kor]) => {
    if (lowerDescription.includes(eng)) {
      keywords.push(kor);
    }
  });

  // 한국어 키워드도 직접 추출
  const koreanKeywords = [
    '셔츠', '블라우스', '티셔츠', '니트', '가디건', '후드티', '맨투맨',
    '자켓', '코트', '블레이저', '점퍼', '패딩', '야상',
    '원피스', '스커트', '팬츠', '청바지', '슬랙스', '조거팬츠', '반바지',
    '부츠', '힐', '스니커즈', '로퍼', '플랫슈즈', '샌들', '슬리퍼',
    '가방', '백팩', '토트백', '크로스백', '클러치', '지갑',
    '목걸이', '귀걸이', '팔찌', '반지', '시계', '모자', '벨트', '스카프',
    '블랙', '화이트', '네이비', '베이지', '브라운', '그레이', '카키',
    '캐주얼', '포멀', '스마트캐주얼', '빈티지', '모던', '클래식', '트렌디'
  ];

  koreanKeywords.forEach(keyword => {
    if (styleDescription.includes(keyword) && !keywords.includes(keyword)) {
      keywords.push(keyword);
    }
  });

  return keywords.length > 0 ? keywords : ['패션', '코디'];
};

// 카테고리별 추천 검색어
export const getCategorySearchTerms = (category: ProductCategory): string[] => {
  switch (category) {
    case ProductCategory.Top:
      return ['상의', '티셔츠', '셔츠', '블라우스', '니트', '후드티'];
    case ProductCategory.Bottom:
      return ['하의', '팬츠', '청바지', '스커트', '레깅스', '반바지'];
    case ProductCategory.Outerwear:
      return ['아우터', '자켓', '코트', '패딩', '블레이저', '야상'];
    case ProductCategory.Shoes:
      return ['신발', '스니커즈', '부츠', '힐', '플랫슈즈', '로퍼'];
    case ProductCategory.Accessory:
      return ['액세서리', '가방', '목걸이', '시계', '모자', '벨트'];
    case ProductCategory.Underwear:
      return ['언더웨어', '속옷', '브라', '팬티', '런닝'];
    default:
      return ['패션', '의류'];
  }
};

// 한국 쇼핑몰에서 상품 검색 (시뮬레이션)
export const searchKoreanFashionProducts = async (
  styleDescription: string,
  category?: ProductCategory
): Promise<Product[]> => {
  try {
    // 스타일 설명을 한국어 키워드로 변환
    const keywords = translateStyleToKorean(styleDescription);

    // 카테고리별 추가 키워드
    if (category) {
      keywords.push(...getCategorySearchTerms(category));
    }

    console.log('한국 쇼핑몰 검색 키워드:', keywords);

    // 실제 구현에서는 각 쇼핑몰의 API를 호출하거나 웹스크래핑을 수행
    // 현재는 시뮬레이션된 데이터를 반환
    const simulatedProducts: Product[] = await generateKoreanFashionProducts(keywords, category);

    return simulatedProducts;

  } catch (error) {
    console.error('한국 쇼핑몰 상품 검색 실패:', error);
    return [];
  }
};

// 한국 패션 상품 데이터 생성 (시뮬레이션)
const generateKoreanFashionProducts = async (
  keywords: string[],
  category?: ProductCategory
): Promise<Product[]> => {

  // 무신사 상품 예시
  const musinsaProducts: Product[] = [
    {
      id: 'musinsa-001',
      brand: '유니클로',
      name: '에어리즘 코튼 오버사이즈 티셔츠',
      price: 19900,
      imageUrl: 'https://image.msscdn.net/images/goods_img/20240101/3500000/3500000_1_125.jpg',
      recommendedSize: 'L',
      productUrl: 'https://www.musinsa.com/app/goods/3500000',
      storeName: '무신사',
      category: ProductCategory.Top,
      currency: 'KRW',
      isSelected: false
    },
    {
      id: 'musinsa-002',
      brand: '리바이스',
      name: '501 오리지날 데님 진',
      price: 89000,
      imageUrl: 'https://image.msscdn.net/images/goods_img/20240201/3600000/3600000_1_125.jpg',
      recommendedSize: '30',
      productUrl: 'https://www.musinsa.com/app/goods/3600000',
      storeName: '무신사',
      category: ProductCategory.Bottom,
      currency: 'KRW',
      isSelected: false
    }
  ];

  // 29CM 상품 예시
  const cm29Products: Product[] = [
    {
      id: '29cm-001',
      brand: '에센셜',
      name: '미니멀 크롭 블레이저',
      price: 168000,
      imageUrl: 'https://via.placeholder.com/300x400/FFE4E1/8B4513?text=Minimal+Blazer',
      recommendedSize: 'M',
      productUrl: 'https://www.29cm.co.kr/product/853219',
      storeName: '29CM',
      category: ProductCategory.Outerwear,
      currency: 'KRW',
      isSelected: false
    },
    {
      id: '29cm-002',
      brand: '스튜디오 톰보이',
      name: '천연 가죽 토트백',
      price: 285000,
      imageUrl: 'https://via.placeholder.com/300x400/F5DEB3/8B4513?text=Leather+Tote',
      recommendedSize: 'One Size',
      productUrl: 'https://www.29cm.co.kr/product/847821',
      storeName: '29CM',
      category: ProductCategory.Accessory,
      currency: 'KRW',
      isSelected: false
    }
  ];

  // 스타일난다 상품 예시
  const stylenandaProducts: Product[] = [
    {
      id: 'stylenanda-001',
      brand: '3CE',
      name: '플리츠 미디 스커트',
      price: 89000,
      imageUrl: 'https://via.placeholder.com/300x400/FFB6C1/8B008B?text=Pleated+Skirt',
      recommendedSize: 'S',
      productUrl: 'https://www.stylenanda.com/product/detail.html?product_no=7028948',
      storeName: '스타일난다',
      category: ProductCategory.Bottom,
      currency: 'KRW',
      isSelected: false
    }
  ];

  // 키워드에 따라 적절한 상품 필터링
  let allProducts = [...musinsaProducts, ...cm29Products, ...stylenandaProducts];

  if (category) {
    allProducts = allProducts.filter(product => product.category === category);
  }

  // 키워드 매칭 점수 계산
  const scoredProducts = allProducts.map(product => {
    let score = 0;
    const searchText = `${product.name} ${product.brand}`.toLowerCase();

    keywords.forEach(keyword => {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    return { ...product, score };
  });

  // 점수순으로 정렬하고 상위 5개 반환
  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...product }) => product);
};

// 실제 상품 크롤링을 위한 헬퍼 함수들 (추후 구현)
export const crawlMusinsaProducts = async (keywords: string[]): Promise<Product[]> => {
  // 무신사 API 또는 크롤링 구현
  // 현재는 빈 배열 반환
  return [];
};

export const crawl29cmProducts = async (keywords: string[]): Promise<Product[]> => {
  // 29CM API 또는 크롤링 구현
  // 현재는 빈 배열 반환
  return [];
};

export const crawlStylenandaProducts = async (keywords: string[]): Promise<Product[]> => {
  // 스타일난다 API 또는 크롤링 구현
  // 현재는 빈 배열 반환
  return [];
};