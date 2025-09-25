import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const SignUpForm: React.FC = () => {
  const { register, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo(null);
    if (password !== confirm) {
      setInfo('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    await register({ email, password });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input className="w-full rounded-lg bg-slate-700 p-2 text-slate-100" placeholder="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded-lg bg-slate-700 p-2 text-slate-100" placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input className="w-full rounded-lg bg-slate-700 p-2 text-slate-100" placeholder="비밀번호 확인" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {info && <p className="text-amber-300 text-sm">{info}</p>}
      <button disabled={loading || !email || !password} className="w-full rounded-lg bg-amber-400 py-2 font-bold text-slate-900">회원가입</button>
    </form>
  );
};

export default SignUpForm;

