import { supabase } from './services/supabaseClient';

export type RegisterPayload = { email: string; password: string };
export type LoginPayload = { email: string; password: string };

export const apiService = {
  async register(payload: RegisterPayload) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });
    return { data, error };
  },
  async login(payload: LoginPayload) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
    return { data, error };
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
};

// Compatibility: Map URL-style calls used by older code to Supabase Auth
export class ApiClient {
  async post(url: string, body: any) {
    const path = url.replace(/\/$/, '');
    if (path.endsWith('/api/auth/register')) {
      return apiService.register(body);
    }
    if (path.endsWith('/api/auth/login')) {
      return apiService.login(body);
    }
    if (path.endsWith('/api/auth/logout')) {
      return apiService.logout();
    }
    return Promise.reject(new Error(`Not implemented in apiService stub: POST ${url}`));
  }
}

