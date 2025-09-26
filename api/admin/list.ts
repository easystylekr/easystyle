import { requireAdmin } from './_client';

export default async function handler(req: any, res: any) {
  const auth = await requireAdmin(req as any);
  if (!auth.ok) return res.status(auth.status).json(auth.json);
  const supabase = auth.supabase;

  const table = String(req.query.table || '').trim();
  if (!table) return res.status(400).json({ error: 'missing_table' });

  const limit = Number(req.query.limit || 100);
  const status = req.query.status ? String(req.query.status) : undefined;
  const eventType = req.query.eventType ? String(req.query.eventType) : undefined;
  const email = req.query.email ? String(req.query.email) : undefined;
  const jobId = req.query.jobId ? String(req.query.jobId) : undefined;

  try {
    if (table === 'profiles') {
      let q = supabase.from('profiles').select('id, email, display_name, role, status, last_login_at, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (email) q = q.ilike('email', `%${email}%`);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ items: data });
    }
    if (table === 'auth_events') {
      let q = supabase.from('auth_events').select('id, user_id, event_type, user_agent, ip, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (eventType) q = q.eq('event_type', eventType);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ items: data });
    }
    if (table === 'purchase_requests') {
      let q = supabase.from('purchase_requests').select('id, user_id, items, total_krw, status, admin_notes, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ items: data });
    }
    if (table === 'search_jobs') {
      const { data, error } = await supabase.from('search_jobs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return res.status(200).json({ items: data });
    }
    if (table === 'search_results') {
      if (!jobId) return res.status(400).json({ error: 'missing_jobId' });
      const { data, error } = await supabase.from('search_results').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ items: data });
    }
    return res.status(400).json({ error: 'invalid_table' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'server_error' });
  }
}
