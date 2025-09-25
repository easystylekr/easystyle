import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './services/supabaseClient';
import type { RegisterPayload, LoginPayload } from './apiService';

type AuthUser = { id: string; email: string | null } | null;

type AuthContextType = {
  user: AuthUser;
  loading: boolean;
  error: string | null;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { sub.subscription?.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    error,
    register: async ({ email, password }) => {
      setError(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      if (!data.session) {
        // 이메일 확인 필요 설정 시, 세션이 없을 수 있음
      }
    },
    login: async ({ email, password }) => {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    },
    logout: async () => {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) setError(error.message);
    }
  }), [user, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

