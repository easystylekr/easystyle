import { supabase } from '@/services/supabaseClient';

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const url = query ? `${path}?${query}` : path;
  const headers = await authHeader();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

export const adminApi = {
  me: () => get<{ ok: boolean }>(`/api/admin/me`),
  list: (table: string, params?: Record<string, any>) => get<{ items: any[] }>(`/api/admin/list`, { table, ...(params || {}) }),
  update: (table: 'purchase_requests' | 'search_jobs' | 'profiles', id: string, update: Record<string, any>) => post(`/api/admin/update`, { table, id, update })
};

