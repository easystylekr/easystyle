import { supabase } from '@/services/supabaseClient';

export type AuthEventType = 'signup' | 'login' | 'logout' | 'reset';

export async function logAuthEvent(type: AuthEventType) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    await (supabase as any).from('auth_events').insert({
      user_id: user?.id ?? null,
      event_type: type,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn('logAuthEvent failed', e);
  }
}

