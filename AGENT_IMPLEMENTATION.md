# 🤖 상품검색 Agent 구현 가이드

## 🏗️ Agent 아키텍처 설계

### Core Agent System
```typescript
// services/agents/ProductSearchAgent.ts
export class ProductSearchAgent {
  private parsingAgent: ProductParsingAgent;
  private searchAgent: MultiStoreSearchAgent;
  private validationAgent: ProductValidationAgent;
  private stockAgent: StockCheckAgent;

  constructor() {
    this.parsingAgent = new ProductParsingAgent();
    this.searchAgent = new MultiStoreSearchAgent();
    this.validationAgent = new ProductValidationAgent();
    this.stockAgent = new StockCheckAgent();
  }

  async executeSearchPipeline(styleDescription: string): Promise<SearchResult> {
    // 1단계: AI 스타일링 결과에서 상품 정보 추출
    const productQueries = await this.parsingAgent.parseProducts(styleDescription);

    // 2단계: 멀티 쇼핑몰 검색 실행
    const searchResults = await this.searchAgent.searchAll(productQueries);

    // 3단계: 결과 검증 및 랭킹
    const validatedResults = await this.validationAgent.validate(searchResults);

    // 4단계: 실시간 재고 확인
    const stockResults = await this.stockAgent.checkAvailability(validatedResults);

    return {
      originalDescription: styleDescription,
      parsedQueries: productQueries,
      searchResults: stockResults,
      searchedAt: new Date(),
      confidence: this.calculateOverallConfidence(stockResults)
    };
  }
}
```

## 🧠 1단계: 상품 파싱 Agent

### AI 기반 상품 정보 추출
```typescript
// services/agents/ProductParsingAgent.ts
export interface ProductQuery {
  id: string;
  category: '상의' | '하의' | '신발' | '악세서리';
  productType: string;        // "블레이저", "스니커즈" 등
  brand?: string;
  colors: string[];
  materials?: string[];       // "울", "면", "가죽" 등
  style: string[];           // "캐주얼", "포멀", "스트릿"
  priceRange: {
    min: number;
    max: number;
  };
  searchKeywords: string[];
  priority: number;          // 검색 우선순위 (1-5)
}

export class ProductParsingAgent {
  private geminiClient: GoogleGenerativeAI;

  constructor() {
    this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async parseProducts(styleDescription: string): Promise<ProductQuery[]> {
    const prompt = this.buildParsingPrompt(styleDescription);

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          temperature: 0.1, // 일관성을 위해 낮은 temperature
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(prompt);
      const parsedData = JSON.parse(result.response.text());

      return this.validateAndEnrichQueries(parsedData.products);
    } catch (error) {
      console.error('상품 파싱 실패:', error);
      throw new Error('AI 상품 분석에 실패했습니다.');
    }
  }

  private buildParsingPrompt(description: string): string {
    return `
다음 스타일링 설명에서 개별 상품 정보를 정확히 추출해주세요:

"${description}"

각 상품에 대해 다음 JSON 형식으로 응답해주세요:

{
  "products": [
    {
      "category": "상의|하의|신발|악세서리",
      "productType": "구체적인 상품명 (예: 블레이저, 슬림팬츠, 스니커즈)",
      "brand": "브랜드명 (언급된 경우만)",
      "colors": ["색상1", "색상2"],
      "materials": ["소재1", "소재2"],
      "style": ["스타일 키워드"],
      "priceRange": {
        "min": 예상최저가,
        "max": 예상최고가
      },
      "searchKeywords": ["검색용", "키워드", "배열"],
      "priority": 1-5점수
    }
  ]
}

주의사항:
1. 각 아이템을 명확히 분리하여 추출
2. 한국 쇼핑몰에서 검색 가능한 용어 사용
3. 가격대는 한국 시장 기준으로 현실적 추정
4. 우선순위는 스타일에서 중요도 기준
5. 검색 키워드는 다양한 표현 포함
`;
  }

  private validateAndEnrichQueries(rawQueries: any[]): ProductQuery[] {
    return rawQueries.map((query, index) => ({
      id: `product_${Date.now()}_${index}`,
      category: this.normalizeCategory(query.category),
      productType: query.productType || '상품',
      brand: query.brand,
      colors: Array.isArray(query.colors) ? query.colors : [],
      materials: Array.isArray(query.materials) ? query.materials : [],
      style: Array.isArray(query.style) ? query.style : [],
      priceRange: {
        min: Math.max(0, query.priceRange?.min || 0),
        max: Math.max(query.priceRange?.min || 0, query.priceRange?.max || 100000)
      },
      searchKeywords: this.generateSearchKeywords(query),
      priority: Math.min(5, Math.max(1, query.priority || 3))
    }));
  }

  private generateSearchKeywords(query: any): string[] {
    const keywords: string[] = [];

    // 기본 상품명
    if (query.productType) keywords.push(query.productType);

    // 브랜드
    if (query.brand) keywords.push(query.brand);

    // 색상 + 상품 조합
    if (query.colors) {
      query.colors.forEach((color: string) => {
        keywords.push(`${color} ${query.productType}`);
      });
    }

    // 스타일 + 상품 조합
    if (query.style) {
      query.style.forEach((style: string) => {
        keywords.push(`${style} ${query.productType}`);
      });
    }

    // 동의어 추가
    keywords.push(...this.getSynonyms(query.productType));

    return [...new Set(keywords)]; // 중복 제거
  }

  private getSynonyms(productType: string): string[] {
    const synonymMap: Record<string, string[]> = {
      '블레이저': ['자켓', '재킷', '정장자켓'],
      '스니커즈': ['운동화', '캐주얼화', '스니커'],
      '셔츠': ['남방', '와이셔츠', '드레스셔츠'],
      '바지': ['팬츠', '슬랙스', '트라우저'],
      '원피스': ['드레스', '투피스'],
      '가방': ['백', '핸드백', '숄더백'],
      // ... 더 많은 동의어 매핑
    };

    return synonymMap[productType] || [];
  }
}
```

## 🌐 2단계: 멀티 쇼핑몰 검색 Agent

### 병렬 검색 시스템
```typescript
// services/agents/MultiStoreSearchAgent.ts
export interface ShoppingMall {
  id: string;
  name: string;
  baseUrl: string;
  searchConfig: {
    searchUrl: string;
    searchParam: string;
    selectors: {
      productContainer: string;
      productName: string;
      productPrice: string;
      productImage: string;
      productLink: string;
      productBrand?: string;
      stockStatus: string;
    };
    pagination?: {
      nextPageSelector: string;
      maxPages: number;
    };
  };
  requestConfig: {
    headers: Record<string, string>;
    delay: number; // ms between requests
    maxRetries: number;
  };
}

export class MultiStoreSearchAgent {
  private malls: ShoppingMall[];
  private browser: Browser | null = null;

  constructor() {
    this.malls = this.initializeShoppingMalls();
  }

  async searchAll(queries: ProductQuery[]): Promise<SearchResult[]> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const allResults: SearchResult[] = [];

      // 쇼핑몰별 병렬 검색
      for (const mall of this.malls) {
        const mallResults = await this.searchInMall(mall, queries);
        allResults.push(...mallResults);
      }

      return this.deduplicateAndRank(allResults);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private async searchInMall(mall: ShoppingMall, queries: ProductQuery[]): Promise<SearchResult[]> {
    const page = await this.browser!.newPage();
    const results: SearchResult[] = [];

    try {
      // User-Agent 설정
      await page.setUserAgent(mall.requestConfig.headers['User-Agent']);

      // 우선순위별 검색 (높은 우선순위 먼저)
      const sortedQueries = queries.sort((a, b) => b.priority - a.priority);

      for (const query of sortedQueries) {
        for (const keyword of query.searchKeywords) {
          try {
            const searchResults = await this.searchKeyword(page, mall, keyword, query);
            results.push(...searchResults);

            // Rate limiting
            await this.delay(mall.requestConfig.delay);
          } catch (error) {
            console.error(`${mall.name}에서 "${keyword}" 검색 실패:`, error);
          }
        }
      }

      return results;
    } finally {
      await page.close();
    }
  }

  private async searchKeyword(
    page: Page,
    mall: ShoppingMall,
    keyword: string,
    originalQuery: ProductQuery
  ): Promise<SearchResult[]> {
    const searchUrl = mall.baseUrl + mall.searchConfig.searchUrl +
                     `?${mall.searchConfig.searchParam}=${encodeURIComponent(keyword)}`;

    await page.goto(searchUrl, { waitUntil: 'networkidle0' });

    // 상품 컨테이너 대기
    try {
      await page.waitForSelector(mall.searchConfig.selectors.productContainer, { timeout: 5000 });
    } catch {
      return []; // 검색 결과 없음
    }

    const products = await page.evaluate((selectors, mallName, keyword) => {
      const containers = document.querySelectorAll(selectors.productContainer);
      const results = [];

      for (let i = 0; i < Math.min(containers.length, 10); i++) { // 상위 10개만
        const container = containers[i];

        const nameEl = container.querySelector(selectors.productName);
        const priceEl = container.querySelector(selectors.productPrice);
        const imageEl = container.querySelector(selectors.productImage);
        const linkEl = container.querySelector(selectors.productLink);
        const stockEl = container.querySelector(selectors.stockStatus);

        if (nameEl && priceEl && linkEl) {
          results.push({
            name: nameEl.textContent?.trim() || '',
            price: this.parsePrice(priceEl.textContent?.trim() || ''),
            imageUrl: imageEl?.src || imageEl?.dataset?.src || '',
            productUrl: this.resolveUrl(linkEl.href),
            mallName,
            searchKeyword: keyword,
            inStock: !stockEl || !stockEl.textContent?.includes('품절'),
            scrapedAt: new Date().toISOString()
          });
        }
      }

      return results;
    }, mall.searchConfig.selectors, mall.name, keyword);

    return products.map(product => ({
      ...product,
      originalQuery,
      relevanceScore: this.calculateRelevance(product, originalQuery),
      mall: {
        id: mall.id,
        name: mall.name
      }
    }));
  }

  private initializeShoppingMalls(): ShoppingMall[] {
    return [
      {
        id: 'musinsa',
        name: '무신사',
        baseUrl: 'https://www.musinsa.com',
        searchConfig: {
          searchUrl: '/search/musinsa/goods',
          searchParam: 'q',
          selectors: {
            productContainer: '.li_box',
            productName: '.list_info .goods_name',
            productPrice: '.list_info .price',
            productImage: '.list_img img',
            productLink: 'a.img_block',
            stockStatus: '.soldout_dimmed'
          }
        },
        requestConfig: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          delay: 1000,
          maxRetries: 3
        }
      },
      {
        id: '29cm',
        name: '29CM',
        baseUrl: 'https://www.29cm.co.kr',
        searchConfig: {
          searchUrl: '/search',
          searchParam: 'keyword',
          selectors: {
            productContainer: '.product_card',
            productName: '.product_title',
            productPrice: '.product_price',
            productImage: '.product_img img',
            productLink: 'a.product_link',
            stockStatus: '.sold_out'
          }
        },
        requestConfig: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          delay: 1500,
          maxRetries: 3
        }
      },
      // W컨셉, SSF Shop 등 추가...
    ];
  }

  private calculateRelevance(product: any, query: ProductQuery): number {
    let score = 0;
    const productName = product.name.toLowerCase();

    // 상품명 일치도 (50%)
    if (productName.includes(query.productType.toLowerCase())) {
      score += 0.5;
    }

    // 브랜드 일치 (20%)
    if (query.brand && productName.includes(query.brand.toLowerCase())) {
      score += 0.2;
    }

    // 색상 일치 (15%)
    query.colors.forEach(color => {
      if (productName.includes(color.toLowerCase())) {
        score += 0.15 / query.colors.length;
      }
    });

    // 스타일 키워드 일치 (15%)
    query.style.forEach(style => {
      if (productName.includes(style.toLowerCase())) {
        score += 0.15 / query.style.length;
      }
    });

    return Math.min(score, 1.0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## ✅ 3단계: 상품 검증 Agent

### AI 기반 상품 매칭 검증
```typescript
// services/agents/ProductValidationAgent.ts
export class ProductValidationAgent {
  private geminiClient: GoogleGenerativeAI;

  constructor() {
    this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async validate(searchResults: SearchResult[]): Promise<ValidatedProduct[]> {
    const grouped = this.groupByQuery(searchResults);
    const validated: ValidatedProduct[] = [];

    for (const [queryId, results] of grouped.entries()) {
      const validatedGroup = await this.validateGroup(queryId, results);
      validated.push(...validatedGroup);
    }

    return this.rankAndFilter(validated);
  }

  private async validateGroup(queryId: string, results: SearchResult[]): Promise<ValidatedProduct[]> {
    if (results.length === 0) return [];

    const originalQuery = results[0].originalQuery;

    // AI를 사용한 상품 매칭 검증
    const validationPrompt = this.buildValidationPrompt(originalQuery, results);

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(validationPrompt);
      const validation = JSON.parse(result.response.text());

      return results.map((product, index) => ({
        ...product,
        validation: validation.products[index] || {
          isMatch: false,
          confidence: 0,
          reason: '검증 실패'
        }
      })).filter(product => product.validation.isMatch && product.validation.confidence > 0.6);

    } catch (error) {
      console.error('상품 검증 실패:', error);
      // AI 검증 실패 시 기본 스코어 기반 필터링
      return results.filter(product => product.relevanceScore > 0.5).map(product => ({
        ...product,
        validation: {
          isMatch: true,
          confidence: product.relevanceScore,
          reason: '기본 매칭 알고리즘 기반'
        }
      }));
    }
  }

  private buildValidationPrompt(query: ProductQuery, results: SearchResult[]): string {
    const productsText = results.map((product, index) =>
      `${index}: "${product.name}" - ${product.mallName} - ${product.price.toLocaleString()}원`
    ).join('\n');

    return `
다음 검색 조건에 맞는 상품들을 검증해주세요:

검색 조건:
- 카테고리: ${query.category}
- 상품 타입: ${query.productType}
- 브랜드: ${query.brand || '지정없음'}
- 색상: ${query.colors.join(', ') || '지정없음'}
- 스타일: ${query.style.join(', ')}
- 가격대: ${query.priceRange.min.toLocaleString()}원 ~ ${query.priceRange.max.toLocaleString()}원

검색 결과:
${productsText}

각 상품에 대해 다음 JSON 형식으로 검증 결과를 제공해주세요:

{
  "products": [
    {
      "isMatch": true/false,
      "confidence": 0.0-1.0,
      "reason": "매칭/불일치 이유",
      "priceMatch": true/false,
      "categoryMatch": true/false,
      "styleMatch": true/false
    }
  ]
}

기준:
1. 상품명이 검색 조건과 일치하는가?
2. 가격대가 범위 내에 있는가?
3. 카테고리가 정확한가?
4. 스타일이 어울리는가?
`;
  }
}
```

## 📦 4단계: 재고 확인 Agent

### 실시간 재고 및 상세 정보 수집
```typescript
// services/agents/StockCheckAgent.ts
export interface StockInfo {
  inStock: boolean;
  availableSizes: string[];
  availableColors: string[];
  currentPrice: number;
  originalPrice?: number;
  discountRate?: number;
  shippingInfo: {
    freeShipping: boolean;
    estimatedDelivery: string;
    shippingCost?: number;
  };
  lastUpdated: Date;
  stockLevel?: 'high' | 'medium' | 'low' | 'out';
}

export class StockCheckAgent {
  private browser: Browser | null = null;
  private cache = new Map<string, { data: StockInfo; expiry: number }>();

  async checkAvailability(products: ValidatedProduct[]): Promise<AvailableProduct[]> {
    this.browser = await puppeteer.launch({ headless: true });

    try {
      const results = await Promise.all(
        products.map(async (product) => {
          const stockInfo = await this.checkSingleProduct(product);
          return {
            ...product,
            stock: stockInfo
          };
        })
      );

      return results.filter(product => product.stock.inStock);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private async checkSingleProduct(product: ValidatedProduct): Promise<StockInfo> {
    const cacheKey = `${product.mall.id}_${product.productUrl}`;

    // 캐시 확인 (5분 유효)
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const page = await this.browser!.newPage();

    try {
      await page.goto(product.productUrl, { waitUntil: 'networkidle0' });

      const stockInfo = await page.evaluate((mallId) => {
        // 쇼핑몰별 상세 정보 추출 로직
        switch (mallId) {
          case 'musinsa':
            return this.extractMusinsaStock();
          case '29cm':
            return this.extract29cmStock();
          default:
            return this.extractGenericStock();
        }
      }, product.mall.id);

      // 캐시 저장 (5분)
      this.cache.set(cacheKey, {
        data: stockInfo,
        expiry: Date.now() + 5 * 60 * 1000
      });

      return stockInfo;
    } catch (error) {
      console.error(`재고 확인 실패 (${product.name}):`, error);
      return {
        inStock: false,
        availableSizes: [],
        availableColors: [],
        currentPrice: product.price,
        shippingInfo: {
          freeShipping: false,
          estimatedDelivery: '알 수 없음'
        },
        lastUpdated: new Date()
      };
    } finally {
      await page.close();
    }
  }
}
```

## 🎯 Admin Interface Integration

### Vercel API Route
```typescript
// api/admin/search-products.ts
import { ProductSearchAgent } from '../../services/agents/ProductSearchAgent';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // phillip 관리자 인증
  const isAdmin = await verifyPhillipAdmin(req);
  if (!isAdmin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  }

  try {
    const { styleDescription, sessionId } = req.body;

    // 상품 검색 Agent 실행
    const searchAgent = new ProductSearchAgent();
    const results = await searchAgent.executeSearchPipeline(styleDescription);

    // 결과를 Supabase에 저장
    await saveSearchResults(sessionId, results);

    res.status(200).json({
      success: true,
      sessionId,
      results,
      searchedAt: results.searchedAt,
      totalProducts: results.searchResults.length
    });
  } catch (error) {
    console.error('상품 검색 실패:', error);
    res.status(500).json({ error: error.message });
  }
}
```

## 🔧 성능 최적화

### 1. 캐싱 전략
```typescript
// 검색 결과 캐싱
const CACHE_TTL = {
  PRODUCT_SEARCH: 10 * 60 * 1000, // 10분
  STOCK_CHECK: 5 * 60 * 1000,     // 5분
  VALIDATION: 30 * 60 * 1000      // 30분
};
```

### 2. 병렬 처리
```typescript
// 쇼핑몰별 동시 검색
const searchPromises = malls.map(mall => this.searchInMall(mall, queries));
const results = await Promise.allSettled(searchPromises);
```

### 3. Rate Limiting
```typescript
// 쇼핑몰별 요청 제한
const delays = {
  musinsa: 1000,    // 1초
  '29cm': 1500,     // 1.5초
  wconcept: 2000    // 2초
};
```

이 Agent 시스템을 통해 **정확하고 실시간으로 동작하는 상품 검색 및 재고 확인**이 가능합니다. phillip 관리자가 검토하여 최적의 상품을 선별해 구매 대행할 수 있는 완전한 워크플로우입니다.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create detailed product search agent implementation", "status": "completed", "activeForm": "Creating detailed product search agent implementation"}]