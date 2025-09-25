import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const SignInForm: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login({ email, password });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input className="w-full rounded-lg bg-slate-700 p-2 text-slate-100" placeholder="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded-lg bg-slate-700 p-2 text-slate-100" placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button disabled={loading || !email || !password} className="w-full rounded-lg bg-amber-400 py-2 font-bold text-slate-900">로그인</button>
    </form>
  );
};

export default SignInForm;

