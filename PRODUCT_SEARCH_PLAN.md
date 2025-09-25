# 🔍 상품 검색 Agent 시스템 개발 계획

## 📋 핵심 워크플로우 분석

### 현재 프로세스
```
AI 스타일링 → 상품 추천 → 사용자 선택 → 구매 요청
     ↓              ↓              ↓           ↓
  Gemini API    Mock Products   UI Selection  DB Record
```

### 목표 프로세스
```
AI 스타일링 → 상품 검색 Agent → 실시간 재고 확인 → phillip 관리자 검토 → 구매 대행
     ↓              ↓                  ↓              ↓              ↓
  Gemini API    Search Agent      Stock Check      Admin Panel    Purchase
```

## 🎯 핵심 요구사항

### 1. **정확한 상품 매칭**
- AI 스타일링 결과의 상품명/브랜드/스타일을 정확히 파싱
- 한국 쇼핑몰에서 동일하거나 유사한 상품 검색
- 가격, 사이즈, 색상 정보 수집

### 2. **실시간 구매 가능성 확인**
- 재고 상태 확인
- 배송 가능 여부
- 할인/프로모션 정보

### 3. **관리자 워크플로우**
- phillip이 검색 결과 검토
- 구매 대행 승인/거부
- 고객 커뮤니케이션

## 🏗️ 시스템 아키텍처

### Agent 기반 검색 시스템
```typescript
// 상품 검색 Agent 구조
interface ProductSearchAgent {
  // 1. 상품 정보 파싱
  parseStyleProduct(aiDescription: string): ProductQuery;

  // 2. 멀티 쇼핑몰 검색
  searchAcrossStores(query: ProductQuery): SearchResult[];

  // 3. 결과 검증 및 랭킹
  validateAndRank(results: SearchResult[]): RankedProduct[];

  // 4. 구매 가능성 확인
  checkAvailability(products: RankedProduct[]): AvailableProduct[];
}
```

## 📅 단계별 개발 계획

# Phase 1: 상품 검색 Agent 기반 시스템 (2주)

## Week 1: 상품 파싱 및 검색 Engine

### Day 1-2: 상품 정보 파싱 Agent
```typescript
// services/productParser.ts
export interface ProductQuery {
  category: '상의' | '하의' | '신발' | '악세서리';
  productType: string; // "블레이저", "스니커즈", "목걸이" 등
  brand?: string;
  color?: string[];
  style?: string[]; // "캐주얼", "포멀", "스트릿" 등
  priceRange?: { min: number; max: number };
  keywords: string[]; // 검색용 키워드 추출
}

export class ProductParsingAgent {
  async parseFromAIDescription(description: string): Promise<ProductQuery[]> {
    // AI 스타일링 결과에서 각 아이템 추출
    const prompt = `
      다음 스타일링 설명에서 개별 상품 정보를 추출해주세요:
      "${description}"

      각 상품마다 다음 정보를 JSON 형태로 추출:
      - category: 카테고리
      - productType: 구체적 상품 유형
      - brand: 브랜드 (언급된 경우)
      - color: 색상
      - style: 스타일 키워드
      - keywords: 검색용 키워드 배열
    `;

    const result = await this.aiModel.generateContent(prompt);
    return this.validateAndCleanQueries(JSON.parse(result));
  }
}
```

### Day 3-4: 멀티 쇼핑몰 검색 Agent
```typescript
// services/shoppingMallAgent.ts
export interface ShoppingMall {
  name: string;
  baseUrl: string;
  searchUrl: string;
  selectors: {
    productCard: string;
    name: string;
    price: string;
    image: string;
    link: string;
    availability: string;
  };
}

export class ShoppingMallSearchAgent {
  private malls: ShoppingMall[] = [
    {
      name: '무신사',
      baseUrl: 'https://www.musinsa.com',
      searchUrl: '/search/musinsa/goods?q={query}',
      selectors: {
        productCard: '.li_box',
        name: '.list_info .goods_name',
        price: '.list_info .price',
        image: '.list_img img',
        link: 'a.img_block',
        availability: '.soldout_dimmed'
      }
    },
    {
      name: '29CM',
      baseUrl: 'https://www.29cm.co.kr',
      searchUrl: '/search?keyword={query}',
      selectors: {
        productCard: '.product_card',
        name: '.product_title',
        price: '.product_price',
        image: '.product_img img',
        link: 'a.product_link',
        availability: '.sold_out'
      }
    },
    {
      name: 'W컨셉',
      baseUrl: 'https://www.wconcept.co.kr',
      searchUrl: '/Search?keyword={query}',
      selectors: {
        productCard: '.prd-item',
        name: '.prd-name',
        price: '.prd-price',
        image: '.prd-img img',
        link: 'a.prd-link',
        availability: '.soldout'
      }
    }
  ];

  async searchProduct(query: ProductQuery): Promise<SearchResult[]> {
    const results = await Promise.all(
      this.malls.map(mall => this.searchInMall(mall, query))
    );
    return results.flat();
  }

  private async searchInMall(mall: ShoppingMall, query: ProductQuery): Promise<SearchResult[]> {
    const searchKeywords = this.buildSearchKeywords(query);
    const results: SearchResult[] = [];

    for (const keyword of searchKeywords) {
      try {
        const url = mall.baseUrl + mall.searchUrl.replace('{query}', encodeURIComponent(keyword));
        const products = await this.scrapeProducts(url, mall);
        results.push(...products);
      } catch (error) {
        console.error(`${mall.name} 검색 실패:`, error);
      }
    }

    return this.deduplicateResults(results);
  }
}
```

### Day 5: 결과 검증 및 랭킹 System
```typescript
// services/productRanking.ts
export class ProductRankingAgent {
  async rankResults(query: ProductQuery, results: SearchResult[]): Promise<RankedProduct[]> {
    return results
      .map(result => ({
        ...result,
        score: this.calculateRelevanceScore(query, result)
      }))
      .filter(product => product.score > 0.3) // 최소 관련성 점수
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // 상위 20개만
  }

  private calculateRelevanceScore(query: ProductQuery, result: SearchResult): number {
    let score = 0;

    // 카테고리 일치 (40%)
    if (result.category === query.category) score += 0.4;

    // 상품 타입 유사도 (30%)
    score += this.calculateTextSimilarity(query.productType, result.name) * 0.3;

    // 브랜드 일치 (20%)
    if (query.brand && result.brand === query.brand) score += 0.2;

    // 색상 일치 (10%)
    if (query.color && result.colors.some(c => query.color!.includes(c))) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}
```

## Week 2: 실시간 재고 확인 및 Admin 시스템

### Day 6-7: 재고 확인 Agent
```typescript
// services/stockAgent.ts
export class StockCheckAgent {
  async checkAvailability(products: RankedProduct[]): Promise<AvailableProduct[]> {
    const checks = await Promise.all(
      products.map(async product => {
        const availability = await this.checkSingleProduct(product);
        return {
          ...product,
          ...availability
        };
      })
    );

    return checks.filter(product => product.inStock);
  }

  private async checkSingleProduct(product: RankedProduct): Promise<StockInfo> {
    try {
      // 상품 상세 페이지 크롤링
      const response = await fetch(product.url);
      const html = await response.text();

      return {
        inStock: !html.includes('sold out') && !html.includes('품절'),
        availableSizes: this.extractSizes(html),
        availableColors: this.extractColors(html),
        currentPrice: this.extractCurrentPrice(html),
        shippingInfo: this.extractShippingInfo(html),
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        inStock: false,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }
}
```

### Day 8-9: Admin Dashboard API
```typescript
// api/admin/product-search.ts - Vercel Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // phillip 인증 확인
  if (!await isPhillipAdmin(req)) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  }

  const { sessionId } = req.query;

  try {
    // 1. 스타일링 세션의 AI 결과 가져오기
    const session = await getStyleSession(sessionId);

    // 2. Agent를 통한 상품 검색 실행
    const searchAgent = new ProductSearchPipeline();
    const searchResults = await searchAgent.execute(session.description);

    // 3. 결과를 DB에 저장 (캐싱)
    await saveSearchResults(sessionId, searchResults);

    res.status(200).json({
      sessionId,
      products: searchResults,
      searchedAt: new Date(),
      totalFound: searchResults.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Day 10: Admin UI Components
```typescript
// components/admin/ProductSearchResults.tsx
export const ProductSearchResults = ({ sessionId }: { sessionId: string }) => {
  const [searchResults, setSearchResults] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/product-search?sessionId=${sessionId}`);
      const data = await response.json();
      setSearchResults(data.products);
    } catch (error) {
      console.error('상품 검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePurchase = async (productId: string) => {
    // 구매 승인 처리
    await fetch('/api/admin/approve-purchase', {
      method: 'POST',
      body: JSON.stringify({ productId, sessionId })
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSearchProducts}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? '검색 중...' : '상품 검색 시작'}
      </button>

      {searchResults.map(product => (
        <div key={product.id} className="border p-4 rounded">
          <div className="flex items-center space-x-4">
            <img src={product.image} alt={product.name} className="w-20 h-20 object-cover" />
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-gray-600">{product.brand} - {product.mall}</p>
              <p className="text-lg font-bold">{product.price.toLocaleString()}원</p>
              <p className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                {product.inStock ? '구매 가능' : '품절'}
              </p>
            </div>
            <div className="space-x-2">
              <a
                href={product.url}
                target="_blank"
                className="px-3 py-1 bg-gray-200 rounded text-sm"
              >
                쇼핑몰에서 보기
              </a>
              {product.inStock && (
                <button
                  onClick={() => handleApprovePurchase(product.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                >
                  구매 승인
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

# Phase 2: 고도화 및 최적화 (1주)

## Day 11-12: 검색 정확도 개선
- **ML 기반 상품 매칭**: 이미지 유사도 검색 추가
- **브랜드 DB 구축**: 한국 패션 브랜드 매핑 테이블
- **동의어 처리**: "블레이저" → "자켓", "스니커즈" → "운동화" 등

## Day 13-14: 성능 최적화
- **캐싱 전략**: Redis로 검색 결과 캐싱
- **병렬 처리**: 쇼핑몰별 동시 검색
- **Rate Limiting**: 쇼핑몰 서버 부하 방지

## Day 15: 모니터링 및 알림
- **검색 성공률 모니터링**
- **품절 상품 자동 알림**
- **가격 변동 추적**

## 🔧 핵심 기술 스택

### Backend (Vercel Functions)
- **Web Scraping**: Puppeteer (헤드리스 브라우저)
- **HTML Parsing**: Cheerio
- **Rate Limiting**: Vercel Edge Config
- **Caching**: Redis (Upstash)

### Agent System
- **AI Model**: Gemini (상품 파싱용)
- **Search Algorithm**: 텍스트 유사도 + 가중치 스코어링
- **Image Processing**: Sharp (이미지 비교용)

### Monitoring
- **Success Rate**: Vercel Analytics
- **Error Tracking**: Sentry
- **Performance**: New Relic

## 📊 성공 지표 (KPI)

### 검색 정확도
- **상품 매칭 정확도**: >85%
- **재고 정보 정확도**: >90%
- **검색 성공률**: >95%

### 성능
- **평균 검색 시간**: <10초
- **동시 검색 처리**: 50개 세션
- **캐시 히트율**: >70%

### 비즈니스
- **구매 전환율**: >60% (검색된 상품 중)
- **phillip 승인율**: >80%
- **고객 만족도**: >4.2/5.0

## 🚨 위험 요소 및 대응책

### 1. **웹사이트 구조 변경**
- **위험**: 쇼핑몰 사이트 리뉴얼로 크롤링 실패
- **대응**: 다중 Selector 패턴, 자동 복구 로직

### 2. **Rate Limiting**
- **위험**: 쇼핑몰에서 IP 차단
- **대응**: 프록시 로테이션, 요청 간격 조절

### 3. **법적 이슈**
- **위험**: 크롤링 관련 법적 문제
- **대응**: robots.txt 준수, API 우선 사용

## 🎯 단계별 검증 방법

### Phase 1 검증
1. **샘플 스타일링 10개**로 상품 파싱 정확도 테스트
2. **주요 쇼핑몰 3곳**에서 검색 성공률 확인
3. **phillip 관리자 UI** 사용성 테스트

### Phase 2 검증
1. **실제 고객 주문 20건**으로 E2E 테스트
2. **성능 부하 테스트** (동시 사용자 100명)
3. **24시간 연속 모니터링**으로 안정성 확인

## 📅 구현 타임라인

| 단계 | 기간 | 핵심 작업 | 완료 조건 |
|------|------|----------|----------|
| Week 1 | 7일 | Agent 기반 검색 시스템 구축 | 멀티 쇼핑몰 검색 성공 |
| Week 2 | 7일 | 재고 확인 + Admin UI | phillip 대시보드 완성 |
| Week 3 | 7일 | 고도화 및 최적화 | KPI 목표 달성 |

이 계획을 통해 **정확하고 실시간으로 동작하는 상품 검색 Agent 시스템**을 구축할 수 있습니다. 핵심은 AI 파싱의 정확성과 멀티 쇼핑몰 검색의 안정성입니다.