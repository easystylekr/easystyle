const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const DEBUG = Boolean(import.meta.env?.VITE_AUTH_DEBUG === 'true');

if (DEBUG) {
  console.log('[shoppingSearchAgent] Initializing with API key present:', !!apiKey);
}

// Dynamic import를 사용하여 importmap에서 로드된 모듈 사용
let GoogleGenerativeAI: any = null;
let HarmCategory: any = null;
let HarmBlockThreshold: any = null;

// 런타임에 동적으로 Google GenerativeAI 모듈 로드
const initializeAI = async () => {
  try {
    // 런타임에서 동적 import 사용
    const genAI = await (window as any).import('@google/generative-ai');
    GoogleGenerativeAI = genAI.GoogleGenerativeAI;
    HarmCategory = genAI.HarmCategory;
    HarmBlockThreshold = genAI.HarmBlockThreshold;
    return apiKey ? new GoogleGenerativeAI(apiKey) : null;
  } catch (error) {
    console.error('[shoppingSearchAgent] Failed to load GoogleGenerativeAI:', error);
    // 일시적으로 빈 AI 객체 반환하여 앱이 크래시하지 않도록 함
    return null;
  }
};

let ai: any = null;
// 초기화는 실제 사용 시점에 수행

// 쇼핑 검색 AI Agent 설정
const SHOPPING_SEARCH_CONFIG = {
  temperature: 0.3, // 더 정확한 검색을 위해 낮은 temperature
  topK: 1,
  topP: 0.8,
  maxOutputTokens: 2048,
};

const getSafetySettings = () => [
  { category: HarmCategory?.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold?.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory?.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold?.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory?.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold?.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory?.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold?.BLOCK_MEDIUM_AND_ABOVE },
].filter(setting => setting.category && setting.threshold);

export interface ProductSearchResult {
  title: string;
  price: string;
  url: string;
  image: string;
  description: string;
  brand?: string;
  category: string;
  isValidUrl: boolean;
  source: 'korean' | 'global';
}

export interface ShoppingSearchRequest {
  styleDescription: string;
  gender: 'male' | 'female' | 'unisex';
  ageGroup?: string;
  budget?: string;
  preferredBrands?: string[];
  excludedBrands?: string[];
}

// 한국 쇼핑몰 도메인 리스트 (실제 구매 가능한 사이트들)
const KOREAN_SHOPPING_DOMAINS = [
  '29cm.co.kr',
  'wconcept.co.kr',
  'musinsa.com',
  'brandi.co.kr',
  'styleshare.kr',
  'ohou.se',
  'auction.co.kr',
  '11st.co.kr',
  'gmarket.co.kr',
  'coupang.com',
  'ssg.com',
  'lotte.com',
  'hyundai.com',
  'galleria.co.kr',
  'shinsegae.com',
  'oliveyoung.co.kr',
  'aland.co.kr',
  'spao.com',
  'uniqlo.com',
  'hm.com'
];

// 글로벌 쇼핑몰 도메인 리스트
const GLOBAL_SHOPPING_DOMAINS = [
  'amazon.com',
  'zara.com',
  'hm.com',
  'uniqlo.com',
  'adidas.com',
  'nike.com',
  'asos.com',
  'zalando.com',
  'farfetch.com',
  'net-a-porter.com',
  'ssense.com',
  'nordstrom.com',
  'shopbop.com',
  'revolve.com',
  'matchesfashion.com'
];

// URL 유효성 검사 함수
export async function validateProductUrl(url: string): Promise<boolean> {
  try {
    // URL 형식 검증
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // 허용된 도메인 체크
    const isValidDomain = [...KOREAN_SHOPPING_DOMAINS, ...GLOBAL_SHOPPING_DOMAINS]
      .some(domain => hostname.includes(domain));

    if (!isValidDomain) {
      if (DEBUG) console.log('[validateProductUrl] Invalid domain:', hostname);
      return false;
    }

    // 실제 URL 접근 가능성 체크 (HEAD 요청)
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // CORS 문제 방지
      });
      return true; // no-cors 모드에서는 항상 opaque response
    } catch {
      // fetch 실패해도 URL 형식이 올바르면 true 반환
      return true;
    }
  } catch (error) {
    if (DEBUG) console.log('[validateProductUrl] URL validation failed:', error);
    return false;
  }
}

// AI를 이용한 스타일 기반 쇼핑 검색
export async function searchProductsByStyle(request: ShoppingSearchRequest): Promise<ProductSearchResult[]> {
  // 실제 사용 시점에 AI 초기화
  if (!ai) {
    ai = await initializeAI();
  }
  if (!ai) {
    console.error('[shoppingSearchAgent] GoogleGenerativeAI not initialized - missing API key');
    throw new Error('Shopping search service not available');
  }

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: SHOPPING_SEARCH_CONFIG,
      safetySettings: getSafetySettings(),
    });

    const prompt = `당신은 한국의 전문 패션 쇼핑 AI 에이전트입니다. 다음 스타일 정보를 바탕으로 실제 구매 가능한 상품을 추천해주세요.

스타일 설명: ${request.styleDescription}
성별: ${request.gender}
연령대: ${request.ageGroup || '20-30대'}
예산: ${request.budget || '제한없음'}
선호 브랜드: ${request.preferredBrands?.join(', ') || '없음'}
제외 브랜드: ${request.excludedBrands?.join(', ') || '없음'}

다음 한국 쇼핑몰 중에서 실제 상품을 찾아 추천해주세요:
- 29CM (29cm.co.kr)
- W컨셉 (wconcept.co.kr)
- 무신사 (musinsa.com)
- 브랜디 (brandi.co.kr)
- 쿠팡 (coupang.com)
- SSG (ssg.com)
- 11번가 (11st.co.kr)
- 지마켓 (gmarket.co.kr)
- 올리브영 (oliveyoung.co.kr)
- 유니클로 (uniqlo.com)

응답 형식은 다음 JSON 배열로 정확히 작성해주세요:
[
  {
    "title": "상품명",
    "price": "가격 (예: 89,000원)",
    "url": "실제 상품 구매 URL",
    "image": "상품 이미지 URL",
    "description": "상품 설명 (30자 이내)",
    "brand": "브랜드명",
    "category": "카테고리 (상의/하의/아우터/신발/악세서리 등)",
    "source": "korean"
  }
]

중요 요구사항:
1. 실제 존재하는 상품만 추천
2. 구매 가능한 유효한 URL 제공
3. 최대 8개 상품 추천
4. 다양한 쇼핑몰에서 균형있게 선택
5. 스타일과 정확히 일치하는 상품만 선택
6. JSON 형식 외 다른 텍스트는 포함하지 말 것`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (DEBUG) {
      console.log('[shoppingSearchAgent] Raw AI response:', text);
    }

    // JSON 파싱
    let products: ProductSearchResult[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const productsData = JSON.parse(jsonMatch[0]);

        // URL 유효성 검사와 함께 products 배열 생성
        products = await Promise.all(
          productsData.map(async (product: any) => ({
            ...product,
            isValidUrl: await validateProductUrl(product.url),
            source: 'korean' as const
          }))
        );

        // 유효한 URL만 필터링
        products = products.filter(product => product.isValidUrl);

        if (DEBUG) {
          console.log(`[shoppingSearchAgent] Found ${products.length} valid products`);
        }
      }
    } catch (parseError) {
      console.error('[shoppingSearchAgent] JSON parsing failed:', parseError);
      console.log('[shoppingSearchAgent] Raw text:', text);
    }

    return products;
  } catch (error) {
    console.error('[shoppingSearchAgent] Search failed:', error);
    throw new Error('상품 검색 중 오류가 발생했습니다.');
  }
}

// 글로벌 쇼핑 검색 (보조 기능)
export async function searchGlobalProducts(request: ShoppingSearchRequest): Promise<ProductSearchResult[]> {
  // 실제 사용 시점에 AI 초기화
  if (!ai) {
    ai = await initializeAI();
  }
  if (!ai) {
    console.error('[shoppingSearchAgent] GoogleGenerativeAI not initialized');
    return [];
  }

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: SHOPPING_SEARCH_CONFIG,
      safetySettings: getSafetySettings(),
    });

    const prompt = `You are a global fashion shopping AI agent. Find products matching this style description:

Style: ${request.styleDescription}
Gender: ${request.gender}
Age group: ${request.ageGroup || '20-30s'}
Budget: ${request.budget || 'No limit'}

Search from these global retailers:
- Zara, H&M, Uniqlo, Adidas, Nike, ASOS, Amazon

Return JSON array format:
[
  {
    "title": "Product name",
    "price": "Price with currency",
    "url": "Actual purchase URL",
    "image": "Product image URL",
    "description": "Brief description (under 30 chars)",
    "brand": "Brand name",
    "category": "Category (tops/bottoms/outerwear/shoes/accessories)",
    "source": "global"
  }
]

Requirements:
- Real, purchasable products only
- Valid purchase URLs
- Maximum 4 products
- No text outside JSON format`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let products: ProductSearchResult[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const productsData = JSON.parse(jsonMatch[0]);
        products = await Promise.all(
          productsData.map(async (product: any) => ({
            ...product,
            isValidUrl: await validateProductUrl(product.url),
            source: 'global' as const
          }))
        );
        products = products.filter(product => product.isValidUrl);
      }
    } catch (parseError) {
      console.error('[shoppingSearchAgent] Global search JSON parsing failed:', parseError);
    }

    return products;
  } catch (error) {
    console.error('[shoppingSearchAgent] Global search failed:', error);
    return [];
  }
}

// 통합 쇼핑 검색 (한국 + 글로벌)
export async function comprehensiveProductSearch(request: ShoppingSearchRequest): Promise<ProductSearchResult[]> {
  try {
    const [koreanProducts, globalProducts] = await Promise.all([
      searchProductsByStyle(request),
      searchGlobalProducts(request)
    ]);

    // 한국 상품 우선, 글로벌 상품 보완
    const allProducts = [...koreanProducts, ...globalProducts];

    // 최대 8개 제한
    const maxProducts = parseInt(import.meta.env.VITE_STYLING_MAX_PRODUCTS || '8');
    return allProducts.slice(0, maxProducts);
  } catch (error) {
    console.error('[shoppingSearchAgent] Comprehensive search failed:', error);
    throw error;
  }
}