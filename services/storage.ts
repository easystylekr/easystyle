import { supabase } from '@/services/supabaseClient';

export async function uploadBase64Image(bucket: string, path: string, base64: string, contentType: string): Promise<{ path: string; publicUrl?: string } | null> {
  try {
    // 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('[storage.upload] Not authenticated, skipping upload');
      return null;
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new Blob([bytes], { type: contentType });

    // 사용자별 경로로 업로드
    const userPath = `${user.id}/${path}`;
    const { error } = await (supabase as any).storage.from(bucket).upload(userPath, file, { upsert: true, contentType });
    if (error) {
      console.warn('[storage.upload] failed:', error);
      return null;
    }
    const { data } = (supabase as any).storage.from(bucket).getPublicUrl(userPath);
    return { path: userPath, publicUrl: data?.publicUrl };
  } catch (e) {
    console.warn('[storage.upload] exception:', e);
    return null;
  }
}

