import { supabase } from '@/services/supabaseClient';
import type { Product } from '@/types';

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

export async function listStyleRequests(): Promise<StyleRequestRow[]> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return [];
  try {
    const res: any = await (supabase as any).from('style_requests').select('*');
    const rows: StyleRequestRow[] = res?.data || [];
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (e) {
    console.warn('listStyleRequests failed', e);
    return [];
  }
}

export async function listPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return [];
  try {
    const res: any = await (supabase as any).from('purchase_requests').select('*');
    const rows: PurchaseRequestRow[] = res?.data || [];
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (e) {
    console.warn('listPurchaseRequests failed', e);
    return [];
  }
}
