import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/services/adminApi';

type Tab = 'purchase_requests' | 'auth_events' | 'profiles' | 'search_jobs';

const tabs: { key: Tab; label: string }[] = [
  { key: 'purchase_requests', label: '구매 요청' },
  { key: 'auth_events', label: 'Auth 이벤트' },
  { key: 'profiles', label: '프로필' },
  { key: 'search_jobs', label: '검색 작업' },
];

const AdminPage: React.FC = () => {
  const [active, setActive] = useState<Tab>('purchase_requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    adminApi.me().then(() => setAuthorized(true)).catch(() => setAuthorized(false));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (active === 'purchase_requests' && statusFilter) params.status = statusFilter;
      if (active === 'auth_events' && eventFilter) params.eventType = eventFilter;
      if (active === 'profiles' && emailFilter) params.email = emailFilter;
      const { items } = await adminApi.list(active, params);
      setItems(items);
    } catch (e: any) {
      setError(e?.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authorized) load(); }, [active, statusFilter, eventFilter, emailFilter, authorized]);

  const onUpdate = async (table: 'purchase_requests' | 'search_jobs' | 'profiles', id: string, update: Record<string, any>) => {
    try {
      await adminApi.update(table, id, update);
      await load();
    } catch (e: any) {
      alert(e?.message || '업데이트 실패');
    }
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">관리자 전용</h1>
          <p className="text-slate-300">접근 권한이 없습니다.</p>
          <a className="underline text-amber-400" href="/">홈으로</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Admin</h1>
          <a className="text-sm text-slate-300 underline" href="/">홈으로</a>
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} className={`px-3 py-1 rounded-md text-sm ${active===t.key ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-200'}`}>{t.label}</button>
          ))}
        </div>

        <div className="mb-3 flex gap-2 items-center">
          {active === 'purchase_requests' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
              <option value="">전체 상태</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="ordered">ordered</option>
              <option value="completed">completed</option>
            </select>
          )}
          {active === 'auth_events' && (
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
              <option value="">전체 이벤트</option>
              <option value="signup">signup</option>
              <option value="login">login</option>
              <option value="logout">logout</option>
              <option value="reset">reset</option>
            </select>
          )}
          {active === 'profiles' && (
            <input value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} placeholder="이메일 검색" className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1" />
          )}
          <button onClick={load} className="px-3 py-1 rounded-md bg-slate-700 text-slate-200">새로고침</button>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-4">불러오는 중...</div>
          ) : error ? (
            <div className="p-4 text-red-300">{error}</div>
          ) : (
            <Table
              tab={active}
              rows={items}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Table: React.FC<{ tab: Tab; rows: any[]; onUpdate: (table: any, id: string, update: Record<string, any>) => void }>
  = ({ tab, rows, onUpdate }) => {
  if (rows.length === 0) return <div className="p-4 text-slate-300">데이터가 없습니다.</div>;

  if (tab === 'purchase_requests') {
    return (
      <div className="divide-y divide-slate-700">
        {rows.map(r => (
          <div key={r.id} className="p-3 flex items-start justify-between gap-4">
            <div className="text-sm">
              <div className="font-mono text-xs text-slate-400">{r.id}</div>
              <div>총액: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Number(r.total_krw||0))}</div>
              <div>상태: <span className="font-semibold">{r.status}</span></div>
              <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['approved','rejected','ordered','completed'].map(s => (
                <button key={s} onClick={() => onUpdate('purchase_requests', r.id, { status: s })} className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600">{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'auth_events') {
    return (
      <div className="divide-y divide-slate-700">
        {rows.map(r => (
          <div key={r.id} className="p-3 text-sm flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-slate-400">{r.id}</div>
              <div>유저: {r.user_id || 'anonymous'}</div>
              <div>이벤트: <span className="font-semibold">{r.event_type}</span></div>
              <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs max-w-xs truncate text-slate-400">{r.user_agent || ''}</div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'profiles') {
    return (
      <div className="divide-y divide-slate-700">
        {rows.map(r => (
          <div key={r.id} className="p-3 text-sm flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-slate-400">{r.id}</div>
              <div>{r.email} <span className="text-xs text-slate-400">({r.display_name || '-'})</span></div>
              <div>역할: <span className="font-semibold">{r.role}</span> · 상태: <span className="font-semibold">{r.status}</span></div>
              <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onUpdate('profiles', r.id, { role: r.role === 'admin' ? 'user' : 'admin' })} className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600">{r.role === 'admin' ? 'Revoke admin' : 'Make admin'}</button>
              {['active','inactive','banned'].map(s => (
                <button key={s} onClick={() => onUpdate('profiles', r.id, { status: s })} className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600">{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'search_jobs') {
    return (
      <div className="divide-y divide-slate-700">
        {rows.map(r => (
          <div key={r.id} className="p-3 text-sm flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-slate-400">{r.id}</div>
              <div>유저: {r.user_id || '-'}</div>
              <div>질의: {r.query}</div>
              <div>상태: <span className="font-semibold">{r.status}</span></div>
              <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              {['queued','running','done','failed'].map(s => (
                <button key={s} onClick={() => onUpdate('search_jobs', r.id, { status: s })} className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600">{s}</button>
              ))}
              <a className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600" href={`#results-${r.id}`} onClick={(e) => { e.preventDefault(); window.prompt('search_results는 API로 확인하세요. job_id:', r.id); }}>결과 job_id 복사</a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default AdminPage;

