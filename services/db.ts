import { supabase } from '@/services/supabaseClient';
import type { Product } from '@/types';

const withTimeout = async <T,>(p: Promise<T>, ms = 8000): Promise<T> => {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
  ]);
};

export async function recordStyleRequest(prompt: string, provider?: string) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    console.warn('recordStyleRequest skipped: not authenticated');
    return null;
  }
  const modelProvider = (provider || (import.meta.env.VITE_STYLE_PROVIDER as string) || 'gemini').toString();
  const { data: inserted, error } = await supabase
    .from('style_requests')
    .insert({ user_id: user.id, prompt, model_provider: modelProvider })
    .select('id')
    .single();
  if (error) throw error;
  return inserted?.id ?? null;
}

export async function recordPurchaseRequest(items: Product[], totalKrw: number) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    console.warn('recordPurchaseRequest skipped: not authenticated');
    return null;
  }
  const simplified = items.map((p) => ({
    brand: p.brand,
    name: p.name,
    price: p.price,
    productUrl: p.productUrl,
    category: p.category,
    storeName: p.storeName,
  }));
  const { data: inserted, error } = await supabase
    .from('purchase_requests')
    .insert({ user_id: user.id, items: simplified, total_krw: totalKrw })
    .select('id')
    .single();
  if (error) throw error;
  return inserted?.id ?? null;
}

export type StyleRequestRow = {
  id: string;
  user_id: string | null;
  prompt: string;
  model_provider: string;
  created_at: string;
};

export type PurchaseRequestRow = {
  id: string;
  user_id: string | null;
  items: any;
  total_krw: number;
  created_at: string;
};

export async function listStyleRequests(limit = 50): Promise<StyleRequestRow[]> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return [];
  try {
    const { data: rows, error } = await withTimeout(
      (supabase as any)
        .from('style_requests')
        .select('id, user_id, prompt, model_provider, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
    if (error) throw error;
    return (rows as StyleRequestRow[]) || [];
  } catch (e) {
    console.warn('listStyleRequests failed', e);
    return [];
  }
}

export async function listPurchaseRequests(limit = 50): Promise<PurchaseRequestRow[]> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return [];
  try {
    const { data: rows, error } = await withTimeout(
      (supabase as any)
        .from('purchase_requests')
        .select('id, user_id, total_krw, items, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
    );
    if (error) throw error;
    return (rows as PurchaseRequestRow[]) || [];
  } catch (e) {
    console.warn('listPurchaseRequests failed', e);
    return [];
  }
}
