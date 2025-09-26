import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { logAuthEvent } from '@/services/authLog';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
};

const AuthModal: React.FC<Props> = ({ open, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // 재전송 쿨다운(초)
  const [loadingMessage, setLoadingMessage] = useState(''); // 로딩 중 메시지
  const AUTH_TIMEOUT_MS = 30000; // 30초 타임아웃으로 증가

  const DEBUG = Boolean((import.meta as any).env?.VITE_AUTH_DEBUG);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const SUPABASE_ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

  async function withTimeout<T>(p: Promise<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
  }

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setError(null);
      setMode('login');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, defaultMode]);

  // 회원가입 탭 진입 시, 이름에 샘플 값을 한 번만 채워 사용자에게 예시를 제공합니다.
  useEffect(() => {
    if (open && mode === 'signup' && !displayName) {
      setDisplayName('홍길동');
    }
  }, [open, mode]);

  // 세션 변경을 항상 감지하여, 실제로 로그인된 상태가 되면 모달을 자동으로 닫습니다.
  useEffect(() => {
    if (!open) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(false);
        setLoadingMessage('');
        setError(null);
        setInfo(null);
        // 짧은 딜레이 후 닫아 깜빡임 방지
        setTimeout(() => onClose(), 200);
      }
    });
    return () => { sub.subscription?.unsubscribe(); };
  }, [open, onClose]);

  // 쿨다운 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleLogin = async () => {
    if (!validateInputs('login')) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setLoadingMessage('로그인 중...');

    // 5초 후 로딩 메시지 업데이트
    const messageTimeout1 = setTimeout(() => {
      if (loading) setLoadingMessage('서버 연결 중...');
    }, 5000);

    // 15초 후 로딩 메시지 업데이트
    const messageTimeout2 = setTimeout(() => {
      if (loading) setLoadingMessage('잠시만 기다려 주세요...');
    }, 15000);

    try {
      const t0 = performance.now();
      const { error }: any = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      const dt = Math.round(performance.now() - t0);

      // 타임아웃 정리
      clearTimeout(messageTimeout1);
      clearTimeout(messageTimeout2);

      if (DEBUG) console.debug(`[auth] signIn took ${dt}ms`, { error });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (error.status === 400 && (msg.includes('invalid login') || msg.includes('invalid email') || msg.includes('invalid password'))) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (msg.includes('email not confirmed') || msg.includes('confirm your email')) {
          setError('이메일 확인이 필요합니다. 받은 편지함의 확인 메일을 열람해 주세요.');
          setInfo('확인 메일을 받지 못하셨다면, 아래 "확인 이메일 재전송"을 이용하세요.');
        } else if (msg.includes('signups not allowed')) {
          setError('이메일 가입이 비활성화되어 있습니다. 관리자에게 문의해 주세요.');
        } else {
          setError(error.message || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
        return;
      }

      // 성공적으로 로그인되면 잠시 대기 후 모달 닫기
      setLoadingMessage('로그인 완료!');
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (e: any) {
      // 타임아웃 정리
      clearTimeout(messageTimeout1);
      clearTimeout(messageTimeout2);

      if (DEBUG) console.warn('login failed:', e);

      // 타임아웃 에러인 경우, 실제로 로그인이 성공했을 수도 있으므로 세션 확인
      if (e?.message === 'timeout') {
        setLoadingMessage('로그인 상태 확인 중...');

        // 세션 상태 확인
        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.user) {
            setLoadingMessage('로그인 완료!');
            setTimeout(() => {
              onClose();
            }, 500);
            return;
          }
        } catch (sessionError) {
          console.warn('세션 확인 실패:', sessionError);
        }

        // REST 직접 호출로 1회 더 시도하여 원인 파악/로그인
        const restResult = await loginViaRest(email, password);
        if (restResult === 'ok') {
          setLoadingMessage('로그인 완료!');
          setTimeout(() => onClose(), 500);
          return;
        }
        setError(restResult || '네트워크가 느려 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.');
      } else if (String(e).includes('Failed to fetch')) {
        setError('네트워크 요청에 실패했습니다. 인터넷 연결 또는 방화벽/차단 설정을 확인해 주세요.');
      } else {
        setError('로그인 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // 라이브러리 타임아웃 시 REST로 직접 로그인 시도. 성공 시 세션 주입.
  async function loginViaRest(email: string, password: string): Promise<'ok' | string> {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON) return 'Supabase 설정이 올바르지 않습니다. VITE_SUPABASE_URL/ANON_KEY를 확인해 주세요.';
      const url = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/token?grant_type=password';
      const res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`
        },
        body: JSON.stringify({ email, password })
      }), Math.max(8000, AUTH_TIMEOUT_MS / 2));
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg = (data?.error_description || data?.error || data?.msg || `HTTP ${res.status}`);
        const lower = String(msg).toLowerCase();
        if (lower.includes('invalid')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
        if (lower.includes('confirm')) return '이메일 확인이 필요합니다. 확인 메일을 열람해 주세요.';
        if (res.status === 401) return '익명 키(apikey)가 올바르지 않습니다. 환경변수를 확인해 주세요.';
        return `로그인 실패: ${msg}`;
      }
      const access_token = data?.access_token;
      const refresh_token = data?.refresh_token;
      if (access_token && refresh_token) {
        try {
          await (supabase as any).auth.setSession({ access_token, refresh_token });
          return 'ok';
        } catch (e) {
          if (DEBUG) console.warn('setSession failed', e);
          return '세션 설정에 실패했습니다. 다시 시도해 주세요.';
        }
      }
      return '로그인 응답이 올바르지 않습니다.';
    } catch (err: any) {
      if (DEBUG) console.warn('loginViaRest failed', err);
      if (String(err).includes('timeout')) return '응답이 지연됩니다. 네트워크 상태를 확인하고 다시 시도해 주세요.';
      if (String(err).includes('Failed to fetch')) return '네트워크 요청에 실패했습니다. 인터넷 연결 또는 방화벽/차단 설정을 확인해 주세요.';
      return '로그인 요청에 실패했습니다.';
    }
  }

  const handleSignup = async () => {
    if (!validateInputs('signup')) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const t0 = performance.now();
      // 이메일 확인 정책에 따라 redirect_to를 선택적으로 설정
      const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
      const EMAIL_CONFIRM = !isLocalhost && String((import.meta as any).env?.VITE_EMAIL_CONFIRM || 'false').toLowerCase() === 'true';
      const emailRedirectTo = (import.meta as any).env?.VITE_EMAIL_REDIRECT || window.location.origin;
      const signUpOptions: any = EMAIL_CONFIRM ? { emailRedirectTo } : {};
      signUpOptions.data = { display_name: displayName.trim(), phone: phone.trim() };

      // 422 대응: redirect_to 또는 metadata로 인한 거절 가능성을 고려해
      // 옵션→데이터만→최소 페이로드 순으로 폴백
      // VITE_SIGNUP_MINIMAL=true인 경우 즉시 최소 페이로드로만 시도(MVP 강제 경량 경로)
      let data: any = null; let error: any = null;
      const FORCE_MINIMAL = isLocalhost || String((import.meta as any).env?.VITE_SIGNUP_MINIMAL || 'false').toLowerCase() === 'true';
      const attempts = FORCE_MINIMAL
        ? [{ email, password }]
        : [
            { email, password, options: signUpOptions },
            { email, password, options: { data: { display_name: displayName.trim(), phone: phone.trim() } } },
            { email, password }
          ];
      for (const payload of attempts) {
        try {
          const res: any = await withTimeout(supabase.auth.signUp(payload as any));
          data = res.data; error = res.error;
          if (!error) break;
          // 422 or redirect 관련이면 다음 시도
          if (!(error.status === 422 || /redirect|url/i.test(error.message || ''))) break;
        } catch (e: any) {
          error = e;
        }
      }
      const dt = Math.round(performance.now() - t0);
      if (DEBUG) console.debug(`[auth] signUp took ${dt}ms`, { error });

      if (error) {
        const msg = error.message || '';
        if (/Signups not allowed/i.test(msg)) {
          setError('이메일 가입이 비활성화되어 있습니다. Supabase Auth 설정에서 Email provider를 활성화해 주세요.');
        } else if (/redirect|url/i.test(msg) || error.status === 422) {
          setError('가입 요청이 거절되었습니다(422). URL 허용/보안 설정을 확인해 주세요. 개발환경에서는 VITE_SIGNUP_MINIMAL=true 또는 Email Confirm Off를 권장합니다.');
        } else if (/password/i.test(msg) && /6/i.test(msg)) {
          setError('비밀번호는 6자 이상이어야 합니다.');
        } else if (/rate/i.test(msg)) {
          setError('요청이 일시적으로 많습니다. 잠시 후 다시 시도해 주세요.');
        } else if (/already registered/i.test(msg)) {
          setError('이미 등록된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해 주세요.');
        } else {
          setError(msg || '회원가입에 실패했습니다. 입력값과 설정을 확인해 주세요.');
        }
        return;
      }
      if (!data?.session) {
        // MVP: 이메일 확인이 켜져 있어도 즉시 로그인 시도
        const { error: loginErr } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password })
        );
        if (loginErr) {
          const lower = (loginErr.message || '').toLowerCase();
          if (lower.includes('confirm')) {
            setInfo('회원가입이 완료되었습니다. 이메일 확인이 필요합니다. (MVP에서는 Email Confirm을 Off로 설정하면 즉시 로그인됩니다)');
          } else {
            setError(loginErr.message || '자동 로그인에 실패했습니다. 로그인 버튼으로 시도해 주세요.');
          }
          return;
        }
      }
      // 성공적으로 로그인되면 모달 닫기
      setLoadingMessage('로그인 완료!');
      setTimeout(() => onClose(), 400);
    } catch (e: any) {
      if (DEBUG) console.warn('signup failed:', e);
      if (e?.message === 'timeout') {
        setError('응답이 지연됩니다. 네트워크 상태를 확인하고 다시 시도해 주세요.');
      } else if (String(e).includes('Failed to fetch')) {
        setError('네트워크 요청에 실패했습니다. 인터넷 연결 또는 방화벽/차단 설정을 확인해 주세요.');
      } else {
        setError('회원가입 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    if (cooldown > 0) {
      setInfo(`잠시 후 다시 시도해 주세요. (${cooldown}s)`);
      return;
    }
    setPending(true);
    setError(null);
    setInfo(null);
    // @ts-ignore: resend is available in supabase-js v2
    const { error } = await (supabase as any).auth.resend({ type: 'signup', email, options: { redirectTo: window.location.origin } });
    setPending(false);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('too many requests') || error.status === 429) {
        setCooldown(60); // 60초 대기 권장
        setError('요청이 너무 많습니다. 1분 후 다시 시도해 주세요.');
      } else {
        setError(error.message);
      }
    } else {
      setCooldown(60);
      setInfo('확인 이메일을 다시 전송했습니다. 1분 후 재전송 가능합니다. 받은 편지함/스팸함을 확인해 주세요.');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    setPending(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setPending(false);
    if (error) setError(error.message); else {
      try { await logAuthEvent('reset'); } catch {}
      setInfo('비밀번호 재설정 링크를 이메일로 전송했습니다.');
    }
  };


  function validateInputs(current: 'login' | 'signup') {
    setError(null);
    setInfo(null);
    const emailOk = /.+@.+\..+/.test(email);
    if (!emailOk) {
      setError('유효한 이메일 주소를 입력해 주세요.');
      return false;
    }
    if (current === 'signup') {
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return false;
      }
      if (!displayName.trim()) {
        setError('이름을 입력해 주세요.');
        return false;
      }
      const phoneOk = /^[0-9\-+\s]{9,}$/.test(phone.trim());
      if (!phoneOk) {
        setError('유효한 휴대폰 번호를 입력해 주세요.');
        return false;
      }
      if (confirmPassword.trim().length === 0) {
        setError('비밀번호 확인을 입력해 주세요.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return false;
      }
    }
    if (current === 'login' && password.length === 0) {
      setError('비밀번호를 입력해 주세요.');
      return false;
    }
    return true;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">{mode === 'login' ? '로그인' : '회원가입'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('login')} className={`px-3 py-1 rounded-md text-sm ${mode==='login' ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>로그인</button>
          <button onClick={() => setMode('signup')} className={`px-3 py-1 rounded-md text-sm ${mode==='signup' ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>회원가입</button>
      </div>
        <div className="space-y-3">
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="이름 (예: 홍길동)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-slate-700 p-2 text-slate-100 placeholder-slate-400 border-2 border-slate-600 focus:border-amber-400"
              />
              <input
                type="tel"
                placeholder="휴대폰 번호"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-slate-700 p-2 text-slate-100 placeholder-slate-400 border-2 border-slate-600 focus:border-amber-400"
              />
            </>
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-slate-700 p-2 text-slate-100 placeholder-slate-400 border-2 border-slate-600 focus:border-amber-400"
          />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-700 p-2 text-slate-100 placeholder-slate-400 border-2 border-slate-600 focus:border-amber-400"
          />
          {mode === 'signup' && (
            <>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-700 p-2 text-slate-100 placeholder-slate-400 border-2 border-slate-600 focus:border-amber-400"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs">비밀번호가 일치하지 않습니다.</p>
              )}
            </>
          )}
          <div className="text-right text-xs">
            <button type="button" onClick={() => setShowPassword(s => !s)} className="underline text-slate-400 hover:text-slate-200">
              {showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {info && <p className="text-amber-300 text-sm">{info}</p>}
          {!navigator.onLine && (
            <p className="text-sky-300 text-xs">오프라인 상태로 감지되었습니다. 네트워크 연결 후 다시 시도하세요.</p>
          )}
          <button
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={
              loading || !email || !password || (mode === 'signup' && (!displayName.trim() || !phone.trim() || !confirmPassword || password !== confirmPassword))
            }
            className="w-full rounded-lg bg-amber-400 py-2 font-bold text-slate-900 hover:bg-amber-300 disabled:bg-slate-600"
          >
            {loading ? (loadingMessage || '처리 중...') : (mode === 'login' ? '로그인' : '회원가입')}
          </button>
          {error && !loading && (
            <button
              type="button"
              onClick={mode === 'login' ? handleLogin : handleSignup}
              className="w-full rounded-lg bg-slate-700 py-2 text-slate-100 hover:bg-slate-600"
            >
              다시 시도
            </button>
          )}
          
          <div className="flex gap-2 text-xs text-slate-400 mt-2">
            <button type="button" onClick={handleResendVerification} disabled={pending} className="underline hover:text-slate-200">확인 이메일 재전송</button>
            <span>·</span>
            <button type="button" onClick={handleResetPassword} disabled={pending} className="underline hover:text-slate-200">비밀번호 재설정</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
