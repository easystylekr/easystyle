import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Req = { headers: Record<string, any> };

export function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error('Missing SUPABASE env: VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function getBearerToken(req: Req): Promise<string | null> {
  const auth = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  if (auth && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  return null;
}

export async function requireAdmin(req: Req) {
  const supabase = getServiceClient();
  const token = await getBearerToken(req);
  if (!token) {
    return { ok: false as const, status: 401, json: { error: 'missing_bearer' } };
  }
  const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return { ok: false as const, status: 401, json: { error: 'invalid_token' } };
  }
  const uid = userRes.user.id;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('id, role, email, display_name')
    .eq('id', uid)
    .single();
  if (profErr || !prof || prof.role !== 'admin') {
    return { ok: false as const, status: 403, json: { error: 'forbidden' } };
  }
  return { ok: true as const, supabase, user: userRes.user, profile: prof };
}

