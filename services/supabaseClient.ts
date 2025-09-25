import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 환경변수가 없는 경우, 앱이 크래시하지 않도록 안전한 스텁을 제공
function createSupabaseStub() {
  const notConfigured = () => ({ error: { message: 'Supabase not configured' } });
  const noUser = { data: { user: null } };
  return {
    auth: {
      getUser: async () => noUser,
      onAuthStateChange: (_: any, __: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => notConfigured(),
      signInWithPassword: async () => notConfigured(),
      signUp: async () => notConfigured(),
      signInWithOAuth: async () => notConfigured(),
    },
    from: (_table: string) => ({
      insert: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      upsert: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      select: async () => ({ data: [], error: { message: 'Supabase not configured' } }),
    }),
  } as unknown as ReturnType<typeof createClient>;
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (() => {
      console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return createSupabaseStub();
    })();
