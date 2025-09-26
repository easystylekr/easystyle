import { supabase } from '@/services/supabaseClient';

export async function upsertProfileFromSession() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const email = user.email ?? '';
  const displayName = user.user_metadata?.display_name ?? user.user_metadata?.name ?? email.split('@')[0] ?? '';
  const phone = user.user_metadata?.phone ?? null;
  const payload: any = {
    id: user.id,
    email,
    display_name: displayName,
    phone,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 기본 경로: upsert (PK=id)
  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id', returning: 'minimal' });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    console.warn('[profiles.upsert] failed:', error);
    // 'phone' 컬럼이 스키마 캐시에 없는 경우를 대비해 폴백 시 phone을 제거하고 재시도
    const stripPhone = msg.includes("phone") && msg.includes('schema cache');
    const baseUpdate: any = {
      email,
      display_name: displayName,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!stripPhone) baseUpdate.phone = phone;

    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update(baseUpdate)
        .eq('id', user.id);
      if (updErr) {
        console.warn('[profiles.update] failed:', updErr);
        const insertPayload: any = { ...payload };
        if (stripPhone) delete insertPayload.phone;
        const { error: insErr } = await supabase
          .from('profiles')
          .insert(insertPayload);
        if (insErr) console.warn('[profiles.insert] failed:', insErr);
      }
    } catch (e) {
      console.warn('[profiles.upsert] fallback failed:', e);
    }
  }
}
