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
    // 상세 로깅으로 원인 파악을 돕습니다(권한/제약/유효성 등)
    console.warn('[profiles.upsert] failed:', error);
    // 충돌 등으로 upsert가 실패했다면 update→insert 순으로 폴백 시도
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          email,
          display_name: displayName,
          phone,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updErr) {
        console.warn('[profiles.update] failed:', updErr);
        const { error: insErr } = await supabase
          .from('profiles')
          .insert(payload);
        if (insErr) console.warn('[profiles.insert] failed:', insErr);
      }
    } catch (e) {
      console.warn('[profiles.upsert] fallback failed:', e);
    }
  }
}
