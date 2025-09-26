import { requireAdmin } from './_client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'method_not_allowed' });
  const auth = await requireAdmin(req as any);
  if (!auth.ok) return res.status(auth.status).json(auth.json);
  const supabase = auth.supabase;

  const { table, id, update } = (req.body || {}) as { table?: string; id?: string; update?: Record<string, any> };
  if (!table || !id || !update) return res.status(400).json({ error: 'missing_params' });

  try {
    if (table === 'purchase_requests') {
      const allowed = ['status', 'admin_notes'];
      const body: Record<string, any> = {};
      for (const k of allowed) if (k in update) body[k] = update[k];
      const { error } = await supabase.from('purchase_requests').update(body).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (table === 'search_jobs') {
      const allowed = ['status'];
      const body: Record<string, any> = {};
      for (const k of allowed) if (k in update) body[k] = update[k];
      const { error } = await supabase.from('search_jobs').update(body).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (table === 'profiles') {
      const allowed = ['role', 'status', 'display_name'];
      const body: Record<string, any> = {};
      for (const k of allowed) if (k in update) body[k] = update[k];
      const { error } = await supabase.from('profiles').update(body).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'invalid_table' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'server_error' });
  }
}
