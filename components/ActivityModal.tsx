import React, { useEffect, useState } from 'react';
import { listPurchaseRequests, listStyleRequests, PurchaseRequestRow, StyleRequestRow } from '@/services/db';

type Props = { open: boolean; onClose: () => void };

const ActivityModal: React.FC<Props> = ({ open, onClose }) => {
  const [styles, setStyles] = useState<StyleRequestRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([listStyleRequests(), listPurchaseRequests()])
      .then(([s, p]) => { setStyles(s); setPurchases(p); })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-800 p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">내 활동</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        {loading ? (
          <p className="text-slate-300">불러오는 중...</p>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-bold text-amber-400 mb-2">스타일 요청</h3>
              {styles.length === 0 ? (
                <p className="text-slate-400 text-sm">기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {styles.map(s => (
                    <li key={s.id} className="bg-slate-700 rounded-lg p-3">
                      <p className="text-slate-200 text-sm line-clamp-2">{s.prompt}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                        <span>엔진: {s.model_provider}</span>
                        <span>{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="text-sm font-bold text-amber-400 mb-2">구매 요청</h3>
              {purchases.length === 0 ? (
                <p className="text-slate-400 text-sm">기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {purchases.map(pr => (
                    <li key={pr.id} className="bg-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>총액: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(pr.total_krw)}</span>
                        <span className="text-xs text-slate-400">{new Date(pr.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">항목 수: {Array.isArray(pr.items) ? pr.items.length : 0}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityModal;

