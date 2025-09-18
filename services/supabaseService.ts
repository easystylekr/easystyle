import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zpqymfjoexvghmibnnme.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXltZmpvZXh2Z2htaWJubm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzE4MTksImV4cCI6MjA3Mzc0NzgxOX0.YE7IV-Sf-PBwfWYi9Q-uyEasfIQQDYjKUml8ICqszM0';

// Supabase 클라이언트 생성
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 사용자 인증 관련 함수들
export const authService = {
  // 현재 사용자 정보 가져오기
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      return null;
    }
    return user;
  },

  // 이메일로 회원가입
  async signUpWithEmail(email: string, password: string, userData?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {}
      }
    });

    if (error) {
      console.error('회원가입 실패:', error);
      throw error;
    }

    return data;
  },

  // 이메일로 로그인
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('로그인 실패:', error);
      throw error;
    }

    return data;
  },

  // 로그아웃
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  },

  // 구글 OAuth 로그인
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      console.error('구글 로그인 실패:', error);
      throw error;
    }

    return data;
  },

  // 인증 상태 변경 감지
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// 데이터베이스 관련 함수들
export const databaseService = {
  // 제품 목록 가져오기
  async getProducts(filters?: any) {
    let query = supabase
      .from('products_product')
      .select(`
        *,
        brand:products_brand(name),
        category:products_productcategory(name),
        store:products_store(name)
      `);

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.brand) {
      query = query.eq('brand_id', filters.brand);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('제품 목록 가져오기 실패:', error);
      throw error;
    }

    return data;
  },

  // 제품 상세 정보 가져오기
  async getProductById(id: string) {
    const { data, error } = await supabase
      .from('products_product')
      .select(`
        *,
        brand:products_brand(name),
        category:products_productcategory(name),
        store:products_store(name)
      `)
      .eq('uuid', id)
      .single();

    if (error) {
      console.error('제품 상세 정보 가져오기 실패:', error);
      throw error;
    }

    return data;
  },

  // 위시리스트에 제품 추가
  async addToWishlist(userId: string, productId: string) {
    const { data, error } = await supabase
      .from('products_userwishlist')
      .insert([
        { user_id: userId, product_id: productId }
      ]);

    if (error) {
      console.error('위시리스트 추가 실패:', error);
      throw error;
    }

    return data;
  },

  // 위시리스트에서 제품 제거
  async removeFromWishlist(userId: string, productId: string) {
    const { data, error } = await supabase
      .from('products_userwishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('위시리스트 제거 실패:', error);
      throw error;
    }

    return data;
  },

  // 스타일 추천 저장
  async saveStyleRecommendation(userId: string, recommendationData: any) {
    const { data, error } = await supabase
      .from('products_stylerecommendation')
      .insert([
        {
          user_id: userId,
          ...recommendationData
        }
      ]);

    if (error) {
      console.error('스타일 추천 저장 실패:', error);
      throw error;
    }

    return data;
  }
};

// 실시간 구독 관련 함수들
export const realtimeService = {
  // 제품 변경사항 구독
  subscribeToProducts(callback: (payload: any) => void) {
    return supabase
      .channel('products')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products_product' },
        callback
      )
      .subscribe();
  },

  // 구독 해제
  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription);
  }
};

// 파일 업로드 관련 함수들
export const storageService = {
  // 이미지 업로드
  async uploadImage(file: File, bucket: string = 'images', path?: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = path || `${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      path: data.path,
      url: urlData.publicUrl
    };
  },

  // 이미지 삭제
  async deleteImage(path: string, bucket: string = 'images') {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('이미지 삭제 실패:', error);
      throw error;
    }
  }
};

// Supabase 연결 테스트
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('products_productcategory')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase 연결 테스트 실패:', error);
      return false;
    }

    console.log('Supabase 연결 성공!');
    return true;
  } catch (error) {
    console.error('Supabase 연결 오류:', error);
    return false;
  }
};

export default supabase;