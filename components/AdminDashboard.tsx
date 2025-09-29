import React, { useState, useMemo, useEffect } from 'react';
import { User, PurchaseRequest, StyleHistoryItem, PurchaseRequestStatus, Product } from '../types';
import { ArrowLeftIcon, ShareIcon } from './icons';

interface AdminDashboardProps {
    users: User[];
    requests: PurchaseRequest[];
    setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
    getHistoryForUser: (email: string) => StyleHistoryItem[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleString('ko-KR');

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, requests, setRequests, getHistoryForUser }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userHistory, setUserHistory] = useState<StyleHistoryItem[]>([]);

    useEffect(() => {
        if (selectedUser) {
            setUserHistory(getHistoryForUser(selectedUser.email));
        } else {
            setUserHistory([]);
        }
    }, [selectedUser, getHistoryForUser]);

    const handleMarkAsCompleted = (requestId: string) => {
        const updatedRequests = requests.map(req =>
            req.id === requestId ? { ...req, status: PurchaseRequestStatus.Completed } : req
        );
        setRequests(updatedRequests);
        localStorage.setItem('easy-style-purchase-requests', JSON.stringify(updatedRequests));
    };

    const pendingRequests = useMemo(() => requests.filter(r => r.status === PurchaseRequestStatus.Pending).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [requests]);
    const completedRequests = useMemo(() => requests.filter(r => r.status === PurchaseRequestStatus.Completed).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [requests]);
    const regularUsers = useMemo(() => users.filter(u => u.email !== 'admin@easystyle.com'), [users]);


    if (selectedUser) {
        return (
            <div className="p-4 md:p-6">
                <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-amber-400 mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <div className="bg-slate-800 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-slate-100">{selectedUser.name}</h2>
                    <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                    <p className="text-slate-400 text-sm">{selectedUser.phone}</p>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Style History ({userHistory.length})</h3>
                    {userHistory.length > 0 ? (
                        <div className="space-y-4">
                            {userHistory.map(item => (
                                <div key={item.id} className="bg-slate-800 rounded-lg p-3">
                                   <div className="flex gap-3">
                                        <img src={`data:image/png;base64,${item.styledResult.imageBase64}`} alt="style history" className="w-24 h-32 object-cover rounded-md"/>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                                            <p className="text-sm text-slate-200 mt-1 line-clamp-3">"{item.prompt}"</p>
                                        </div>
                                   </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-4">No style history for this user.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-8">
            {/* Purchase Requests Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">구매 요청</h2>
                <div className="bg-slate-800 rounded-lg p-4">
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-4">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="bg-slate-700 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-200">{req.userEmail}</p>
                                            <p className="text-xs text-slate-400">{formatDate(req.createdAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-amber-400">{formatCurrency(req.totalPrice)}</p>
                                            <p className="text-xs text-slate-400">{req.products.length} items</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-slate-600 pt-3">
                                        {req.products.map((p, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs mb-1">
                                                <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover" />
                                                <div className="flex-1">
                                                    <p className="text-slate-300 truncate">{p.name}</p>
                                                    <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">구매 링크</a>
                                                </div>
                                                <p className="text-slate-300">{formatCurrency(p.price)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleMarkAsCompleted(req.id)} className="w-full mt-3 bg-green-500 text-white text-sm font-bold py-1 rounded-lg hover:bg-green-400">완료 처리</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-4">새로운 구매 요청이 없습니다.</p>
                    )}
                </div>
            </div>

            {/* User Management Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">사용자 관리</h2>
                <div className="bg-slate-800 rounded-lg p-4">
                    <div className="space-y-2">
                        {regularUsers.map(user => (
                            <div key={user.email} onClick={() => setSelectedUser(user)} className="bg-slate-700 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-600">
                                <div>
                                    <p className="font-medium text-slate-200">{user.name}</p>
                                    <p className="text-xs text-slate-400">{user.email}</p>
                                </div>
                                <span className="text-xs text-amber-400">기록 보기</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Completed Orders Section */}
             <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">완료된 주문</h2>
                <div className="bg-slate-800 rounded-lg p-4">
                    {completedRequests.length > 0 ? (
                        <div className="space-y-3">
                            {completedRequests.map(req => (
                               <div key={req.id} className="bg-slate-700/50 p-3 rounded-lg opacity-70">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-400">{req.userEmail}</p>
                                            <p className="text-xs text-slate-500">{formatDate(req.createdAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-400">{formatCurrency(req.totalPrice)}</p>
                                            <p className="text-xs text-slate-500">{req.products.length} items</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-4">완료된 주문이 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
