import { supabase } from '@/services/supabaseClient';

export async function uploadBase64Image(bucket: string, path: string, base64: string, contentType: string): Promise<{ path: string; publicUrl?: string } | null> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new Blob([bytes], { type: contentType });
    const { error } = await (supabase as any).storage.from(bucket).upload(path, file, { upsert: true, contentType });
    if (error) {
      console.warn('[storage.upload] failed:', error);
      return null;
    }
    const { data } = (supabase as any).storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: data?.publicUrl };
  } catch (e) {
    console.warn('[storage.upload] exception:', e);
    return null;
  }
}

