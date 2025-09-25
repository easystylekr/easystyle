import { supabase } from '@/services/supabaseClient';

export async function upsertProfileFromSession() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const email = user.email ?? '';
  const displayName = user.user_metadata?.name ?? email.split('@')[0] ?? '';
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email,
      display_name: displayName,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}
