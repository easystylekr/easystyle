# 🚀 MVP 상품검색 Agent 구축 가이드 (Vercel)

## 🎯 MVP 접근 방식

### 현실적인 3단계 구축
```
Phase 1: 기본 검색 (1주) → Phase 2: AI 개선 (1주) → Phase 3: 완전 자동화 (1주)
```

## 📁 Vercel 프로젝트 구조

```
/
├── components/              # React 컴포넌트
│   ├── admin/              # phillip 관리자 전용
│   │   ├── ProductSearch.tsx
│   │   ├── SearchResults.tsx
│   │   └── AdminDashboard.tsx
│   └── user/               # 사용자 UI
├── api/                    # Vercel Serverless Functions
│   ├── admin/
│   │   ├── search-products.ts
│   │   ├── approve-purchase.ts
│   │   └── dashboard-data.ts
│   └── products/
│       ├── basic-search.ts
│       └── stock-check.ts
├── services/               # 비즈니스 로직
│   ├── productSearch/
│   │   ├── basicSearch.ts  # MVP용 간단한 검색
│   │   ├── aiParser.ts     # AI 상품 파싱
│   │   └── stockChecker.ts # 재고 확인
│   └── supabaseClient.ts
└── lib/                    # 유틸리티
    ├── shopping-malls.ts   # 쇼핑몰 설정
    └── admin-auth.ts       # phillip 인증
```

## 🏗️ Phase 1: MVP 기본 검색 (1주)

### 1. 간단한 상품 검색 API
```typescript
// api/admin/search-products.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { basicProductSearch } from '../../services/productSearch/basicSearch';
import { verifyPhillipAdmin } from '../../lib/admin-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // phillip 인증 확인
  const isAdmin = await verifyPhillipAdmin(req);
  if (!isAdmin) {
    return res.status(403).json({ error: '관리자만 접근 가능합니다' });
  }

  try {
    const { productName, category, priceRange } = req.body;

    // 기본 검색 실행 (복잡한 AI 없이)
    const results = await basicProductSearch({
      productName,
      category,
      priceRange
    });

    res.status(200).json({
      success: true,
      products: results,
      searchedAt: new Date()
    });
  } catch (error) {
    console.error('검색 실패:', error);
    res.status(500).json({ error: '검색에 실패했습니다' });
  }
}
```

### 2. 기본 검색 로직 (AI 없이)
```typescript
// services/productSearch/basicSearch.ts
interface BasicSearchParams {
  productName: string;
  category: string;
  priceRange: { min: number; max: number };
}

interface ProductResult {
  name: string;
  price: number;
  imageUrl: string;
  productUrl: string;
  mallName: string;
  inStock: boolean;
}

export async function basicProductSearch(params: BasicSearchParams): Promise<ProductResult[]> {
  const { productName, category, priceRange } = params;

  // 간단한 키워드 기반 검색
  const searchKeywords = [
    productName,
    `${category} ${productName}`,
    productName.split(' ').join('+')
  ];

  const allResults: ProductResult[] = [];

  // 주요 쇼핑몰 3곳만 검색 (MVP)
  const malls = [
    {
      name: '무신사',
      searchUrl: 'https://www.musinsa.com/search/musinsa/goods?q=',
      parser: parseMusinsaResults
    },
    {
      name: '29CM',
      searchUrl: 'https://www.29cm.co.kr/search?keyword=',
      parser: parse29cmResults
    }
  ];

  for (const mall of malls) {
    try {
      const results = await searchInMall(mall, searchKeywords[0]);
      allResults.push(...results);
    } catch (error) {
      console.error(`${mall.name} 검색 실패:`, error);
    }
  }

  // 가격대 필터링 및 상위 10개만
  return allResults
    .filter(product => product.price >= priceRange.min && product.price <= priceRange.max)
    .slice(0, 10);
}

// 기본적인 HTML 파싱 (Puppeteer 대신 fetch + cheerio)
async function searchInMall(mall: any, keyword: string): Promise<ProductResult[]> {
  try {
    const response = await fetch(mall.searchUrl + encodeURIComponent(keyword), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EasyStyle/1.0)'
      }
    });

    const html = await response.text();
    return mall.parser(html, mall.name);
  } catch (error) {
    console.error('Mall search failed:', error);
    return [];
  }
}
```

### 3. Admin 검색 UI
```typescript
// components/admin/ProductSearch.tsx
import React, { useState } from 'react';

interface SearchForm {
  productName: string;
  category: string;
  priceMin: number;
  priceMax: number;
}

export const ProductSearch: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [form, setForm] = useState<SearchForm>({
    productName: '',
    category: '상의',
    priceMin: 0,
    priceMax: 500000
  });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.productName,
          category: form.category,
          priceRange: { min: form.priceMin, max: form.priceMax }
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.products);
      }
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">상품 검색 (MVP)</h2>

      {/* 검색 폼 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="상품명 입력"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            className="border p-3 rounded"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border p-3 rounded"
          >
            <option value="상의">상의</option>
            <option value="하의">하의</option>
            <option value="신발">신발</option>
            <option value="악세서리">악세서리</option>
          </select>
          <input
            type="number"
            placeholder="최소 가격"
            value={form.priceMin}
            onChange={(e) => setForm({ ...form, priceMin: Number(e.target.value) })}
            className="border p-3 rounded"
          />
          <input
            type="number"
            placeholder="최대 가격"
            value={form.priceMax}
            onChange={(e) => setForm({ ...form, priceMax: Number(e.target.value) })}
            className="border p-3 rounded"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !form.productName}
          className="mt-4 w-full bg-blue-600 text-white p-3 rounded font-semibold disabled:bg-gray-300"
        >
          {loading ? '검색 중...' : '상품 검색'}
        </button>
      </div>

      {/* 검색 결과 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((product, index) => (
          <ProductCard key={index} product={product} onApprove={handleApprove} />
        ))}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onApprove }: any) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <img
      src={product.imageUrl}
      alt={product.name}
      className="w-full h-48 object-cover rounded mb-3"
    />
    <h3 className="font-semibold text-sm mb-2">{product.name}</h3>
    <p className="text-gray-600 text-xs mb-2">{product.mallName}</p>
    <p className="font-bold text-lg mb-3">{product.price.toLocaleString()}원</p>
    <div className="flex gap-2">
      <a
        href={product.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 bg-gray-200 text-center py-2 rounded text-sm"
      >
        상품 확인
      </a>
      <button
        onClick={() => onApprove(product)}
        className="flex-1 bg-green-600 text-white py-2 rounded text-sm"
      >
        구매 승인
      </button>
    </div>
  </div>
);
```

### 4. phillip 관리자 인증
```typescript
// lib/admin-auth.ts
import { supabase } from '../services/supabaseClient';

export async function verifyPhillipAdmin(req: any): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return false;

    // phillip 이메일 확인
    return user.email === 'phillip@yourdomain.com';
  } catch {
    return false;
  }
}
```

## 🎯 Phase 2: AI 상품 파싱 추가 (1주)

### AI 스타일링 결과 자동 분석
```typescript
// api/admin/ai-search.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { styleDescription } = req.body;

  // Gemini로 스타일링 결과에서 상품 추출
  const products = await parseStyleDescription(styleDescription);

  // 각 상품에 대해 기본 검색 실행
  const searchResults = await Promise.all(
    products.map(product => basicProductSearch({
      productName: product.name,
      category: product.category,
      priceRange: product.priceRange
    }))
  );

  res.json({
    parsedProducts: products,
    searchResults: searchResults.flat()
  });
}
```

## 🔧 Phase 3: 자동화 및 최적화 (1주)

### 재고 확인 자동화
```typescript
// api/admin/auto-check.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 정기적으로 저장된 상품들의 재고 상태 확인
  const products = await getApprovedProducts();

  const stockUpdates = await Promise.all(
    products.map(async (product) => {
      const isInStock = await quickStockCheck(product.url);
      return { id: product.id, inStock: isInStock };
    })
  );

  // 품절된 상품이 있으면 phillip에게 알림
  const outOfStock = stockUpdates.filter(p => !p.inStock);
  if (outOfStock.length > 0) {
    await notifyPhillip(outOfStock);
  }

  res.json({ updated: stockUpdates.length });
}
```

## 🚀 Vercel 배포 최적화

### 1. package.json 설정
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "cheerio": "^1.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@google/generative-ai": "^0.1.0"
  }
}
```

### 2. vercel.json 최적화
```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key",
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 3. 환경변수 설정
```bash
# Vercel Dashboard에서 설정
GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_EMAIL=phillip@yourdomain.com
```

## 📊 MVP 성공 지표

### Week 1 목표
- ✅ phillip이 수동으로 상품 검색 가능
- ✅ 무신사, 29CM에서 상품 찾기 성공률 >70%
- ✅ 검색 결과를 DB에 저장

### Week 2 목표
- ✅ AI가 스타일링 결과에서 자동으로 상품 추출
- ✅ 검색 정확도 >80%
- ✅ phillip 승인 워크플로우 완성

### Week 3 목표
- ✅ 재고 자동 확인
- ✅ 품절 알림 시스템
- ✅ 구매 대행 프로세스 완성

## 💡 MVP 핵심 포인트

### 1. **단순함 우선**
- 복잡한 AI Agent 대신 기본 검색부터
- Puppeteer 대신 fetch + cheerio
- 3개 쇼핑몰만 지원

### 2. **점진적 개선**
- Week 1: 수동 검색
- Week 2: AI 파싱 추가
- Week 3: 완전 자동화

### 3. **Vercel 최적화**
- Serverless Functions 활용
- 30초 타임아웃 고려
- 환경변수로 설정 관리

이렇게 3주에 걸쳐 MVP를 구축하면 **실제 동작하는 상품 검색 Agent 시스템**을 Vercel에서 완전히 운영할 수 있습니다.