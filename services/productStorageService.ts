import { supabase } from '@/services/supabaseClient';
import { ProductSearchResult } from './shoppingSearchAgent';

export interface StoredProduct {
  id?: string;
  user_id: string;
  session_id: string;
  title: string;
  price: string;
  url: string;
  image: string;
  description: string;
  brand?: string;
  category: string;
  source: 'korean' | 'global';
  style_description: string;
  is_valid_url: boolean;
  validation_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSearchSession {
  id?: string;
  user_id: string;
  session_id: string;
  style_description: string;
  gender: string;
  age_group?: string;
  budget?: string;
  preferred_brands?: string[];
  excluded_brands?: string[];
  total_products_found: number;
  created_at?: string;
}

const DEBUG = Boolean(import.meta.env?.VITE_AUTH_DEBUG === 'true');

// 상품 검색 세션 저장
export async function saveProductSearchSession(sessionData: Omit<ProductSearchSession, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.warn('[productStorageService] No authenticated user');
      return null;
    }

    const sessionWithUser = {
      ...sessionData,
      user_id: user.user.id
    };

    const { data, error } = await supabase
      .from('product_search_sessions')
      .insert([sessionWithUser])
      .select()
      .single();

    if (error) {
      console.error('[productStorageService] Session save failed:', error);
      return null;
    }

    if (DEBUG) {
      console.log('[productStorageService] Session saved:', data.id);
    }

    return data.id;
  } catch (error) {
    console.error('[productStorageService] Session save exception:', error);
    return null;
  }
}

// 상품 정보 저장
export async function saveProductSearchResults(
  sessionId: string,
  styleDescription: string,
  products: ProductSearchResult[]
): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.warn('[productStorageService] No authenticated user');
      return false;
    }

    const userId = user.user.id;
    const validationDate = new Date().toISOString();

    // 상품 데이터 변환
    const productsToSave: Omit<StoredProduct, 'id' | 'created_at' | 'updated_at'>[] = products.map(product => ({
      user_id: userId,
      session_id: sessionId,
      title: product.title,
      price: product.price,
      url: product.url,
      image: product.image,
      description: product.description,
      brand: product.brand,
      category: product.category,
      source: product.source,
      style_description: styleDescription,
      is_valid_url: product.isValidUrl,
      validation_date: validationDate
    }));

    // 배치 저장
    const { error } = await supabase
      .from('products')
      .insert(productsToSave);

    if (error) {
      console.error('[productStorageService] Products save failed:', error);
      return false;
    }

    if (DEBUG) {
      console.log(`[productStorageService] Saved ${products.length} products for session ${sessionId}`);
    }

    return true;
  } catch (error) {
    console.error('[productStorageService] Products save exception:', error);
    return false;
  }
}

// 사용자의 상품 검색 기록 조회
export async function getUserProductHistory(limit: number = 50): Promise<StoredProduct[]> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.warn('[productStorageService] No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[productStorageService] History fetch failed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[productStorageService] History fetch exception:', error);
    return [];
  }
}

// 특정 세션의 상품 조회
export async function getProductsBySession(sessionId: string): Promise<StoredProduct[]> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.warn('[productStorageService] No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[productStorageService] Session products fetch failed:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[productStorageService] Session products fetch exception:', error);
    return [];
  }
}

// URL 유효성 재검증
export async function revalidateProductUrls(sessionId: string): Promise<number> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.warn('[productStorageService] No authenticated user');
      return 0;
    }

    const products = await getProductsBySession(sessionId);
    let revalidatedCount = 0;

    for (const product of products) {
      try {
        const response = await fetch(product.url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });

        const isValid = true; // no-cors 모드에서는 항상 opaque response

        if (product.is_valid_url !== isValid) {
          const { error } = await supabase
            .from('products')
            .update({
              is_valid_url: isValid,
              validation_date: new Date().toISOString()
            })
            .eq('id', product.id);

          if (!error) {
            revalidatedCount++;
          }
        }
      } catch {
        // URL 접근 실패 시 유효하지 않음으로 표시
        if (product.is_valid_url) {
          const { error } = await supabase
            .from('products')
            .update({
              is_valid_url: false,
              validation_date: new Date().toISOString()
            })
            .eq('id', product.id);

          if (!error) {
            revalidatedCount++;
          }
        }
      }
    }

    if (DEBUG) {
      console.log(`[productStorageService] Revalidated ${revalidatedCount} products`);
    }

    return revalidatedCount;
  } catch (error) {
    console.error('[productStorageService] Revalidation exception:', error);
    return 0;
  }
}

// 사용자 통계 조회
export async function getUserProductStats(): Promise<{
  totalSessions: number;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  favoriteCategories: string[];
  favoriteBrands: string[];
}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return {
        totalSessions: 0,
        totalProducts: 0,
        validProducts: 0,
        invalidProducts: 0,
        favoriteCategories: [],
        favoriteBrands: []
      };
    }

    // 세션 수 조회
    const { count: sessionCount } = await supabase
      .from('product_search_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user.id);

    // 상품 통계 조회
    const { data: products } = await supabase
      .from('products')
      .select('is_valid_url, category, brand')
      .eq('user_id', user.user.id);

    const stats = products?.reduce((acc, product) => {
      acc.totalProducts++;
      if (product.is_valid_url) {
        acc.validProducts++;
      } else {
        acc.invalidProducts++;
      }

      // 카테고리 통계
      if (product.category) {
        acc.categoryCount[product.category] = (acc.categoryCount[product.category] || 0) + 1;
      }

      // 브랜드 통계
      if (product.brand) {
        acc.brandCount[product.brand] = (acc.brandCount[product.brand] || 0) + 1;
      }

      return acc;
    }, {
      totalProducts: 0,
      validProducts: 0,
      invalidProducts: 0,
      categoryCount: {} as Record<string, number>,
      brandCount: {} as Record<string, number>
    }) || {
      totalProducts: 0,
      validProducts: 0,
      invalidProducts: 0,
      categoryCount: {},
      brandCount: {}
    };

    // 상위 카테고리와 브랜드 추출
    const favoriteCategories = Object.entries(stats.categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    const favoriteBrands = Object.entries(stats.brandCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([brand]) => brand);

    return {
      totalSessions: sessionCount || 0,
      totalProducts: stats.totalProducts,
      validProducts: stats.validProducts,
      invalidProducts: stats.invalidProducts,
      favoriteCategories,
      favoriteBrands
    };
  } catch (error) {
    console.error('[productStorageService] Stats fetch exception:', error);
    return {
      totalSessions: 0,
      totalProducts: 0,
      validProducts: 0,
      invalidProducts: 0,
      favoriteCategories: [],
      favoriteBrands: []
    };
  }
}