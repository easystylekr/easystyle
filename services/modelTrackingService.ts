// AI 모델 사용 추적 및 저장 서비스
import { supabase } from './supabaseClient';

const DEBUG = Boolean((import.meta as any).env?.VITE_DEBUG);

export interface ModelUsageRecord {
  id?: string;
  user_id?: string;
  user_email?: string;
  model_provider: 'gemini' | 'openai';
  model_name: string;
  prompt_text: string;
  image_size?: number;
  success: boolean;
  error_message?: string;
  response_time_ms?: number;
  created_at?: string;
}

export interface StyleGenerationResult {
  styledImageBase64?: string;
  description: string;
  model: string;
  provider: 'gemini' | 'openai';
  success: boolean;
  errorMessage?: string;
  responseTime?: number;
}

/**
 * AI 모델 사용 기록을 Supabase에 저장
 */
export const saveModelUsage = async (
  record: Omit<ModelUsageRecord, 'id' | 'created_at'>
): Promise<void> => {
  try {
    // 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      if (DEBUG) console.warn('[modelTracking] Auth error:', authError);
      return; // 인증 오류 시 조용히 무시
    }

    const recordToSave: Partial<ModelUsageRecord> = {
      ...record,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('ai_model_usage')
      .insert([recordToSave]);

    if (error) {
      if (DEBUG) console.error('[modelTracking] Database insert error:', error);
      return; // 데이터베이스 오류 시 조용히 무시 (사용자 경험에 영향 없음)
    }

    if (DEBUG) {
      console.log('[modelTracking] Model usage saved successfully:', {
        provider: record.model_provider,
        model: record.model_name,
        success: record.success
      });
    }

  } catch (error) {
    if (DEBUG) console.error('[modelTracking] Failed to save model usage:', error);
    // 추적 실패는 사용자 경험에 영향을 주지 않음
  }
};

/**
 * 최근 모델 사용 통계 조회
 */
export const getModelUsageStats = async (days: number = 30): Promise<{
  total: number;
  by_provider: Record<string, number>;
  success_rate: number;
}> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { total: 0, by_provider: {}, success_rate: 0 };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('ai_model_usage')
      .select('model_provider, success')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString());

    if (error || !data) {
      if (DEBUG) console.error('[modelTracking] Failed to get usage stats:', error);
      return { total: 0, by_provider: {}, success_rate: 0 };
    }

    const total = data.length;
    const byProvider: Record<string, number> = {};
    let successCount = 0;

    for (const record of data) {
      byProvider[record.model_provider] = (byProvider[record.model_provider] || 0) + 1;
      if (record.success) successCount++;
    }

    return {
      total,
      by_provider: byProvider,
      success_rate: total > 0 ? successCount / total : 0
    };

  } catch (error) {
    if (DEBUG) console.error('[modelTracking] Error getting usage stats:', error);
    return { total: 0, by_provider: {}, success_rate: 0 };
  }
};

/**
 * Supabase 테이블 생성 SQL (참고용)
 *
 * CREATE TABLE ai_model_usage (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id),
 *   user_email TEXT,
 *   model_provider TEXT NOT NULL CHECK (model_provider IN ('gemini', 'openai')),
 *   model_name TEXT NOT NULL,
 *   prompt_text TEXT,
 *   image_size INTEGER,
 *   success BOOLEAN NOT NULL DEFAULT false,
 *   error_message TEXT,
 *   response_time_ms INTEGER,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- RLS 정책
 * ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can insert their own usage records" ON ai_model_usage
 *   FOR INSERT WITH CHECK (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can view their own usage records" ON ai_model_usage
 *   FOR SELECT USING (auth.uid() = user_id);
 *
 * -- 인덱스
 * CREATE INDEX ai_model_usage_user_id_idx ON ai_model_usage (user_id);
 * CREATE INDEX ai_model_usage_created_at_idx ON ai_model_usage (created_at);
 * CREATE INDEX ai_model_usage_provider_idx ON ai_model_usage (model_provider);
 */