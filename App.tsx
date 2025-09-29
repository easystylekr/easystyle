import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppScreen, Product, ProductCategory, User, StyleHistoryItem, PurchaseRequest, PurchaseRequestStatus } from './types';
import { generateStyleWithRealProducts, generateFollowUpQuestion, cropImageForProduct } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import ProductCard from './components/ProductCard';
import AdminDashboard from './components/AdminDashboard';
import { CameraIcon, GalleryIcon, SparklesIcon, SaveIcon, ShareIcon, CheckCircleIcon } from './components/icons';

type AIQuestion = {
  question: string;
  examples: string[];
};

const ADMIN_EMAIL = 'admin@easystyle.com';

interface MyPageProps {
    currentUser: User;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    styleHistory: StyleHistoryItem[];
    viewHistoryItem: (item: StyleHistoryItem) => void;
    handleShare: (item: StyleHistoryItem) => Promise<void>;
}

const MyPage: React.FC<MyPageProps> = ({ currentUser, users, setUsers, setCurrentUser, styleHistory, viewHistoryItem, handleShare }) => {
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPageError('');
        setPageSuccess('');

        if (passwordForm.new !== passwordForm.confirm) {
            setPageError('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        if (currentUser?.password !== passwordForm.current) {
            setPageError('현재 비밀번호가 올바르지 않습니다.');
            return;
        }
        
        const updatedUser = { ...currentUser, password: passwordForm.new };
        const updatedUsers = users.map(u => u.email === currentUser.email ? updatedUser : u);
        setUsers(updatedUsers);
        setCurrentUser(updatedUser);
        localStorage.setItem('easy-style-users', JSON.stringify(updatedUsers));
        setPageSuccess('비밀번호가 성공적으로 변경되었습니다!');
        setPasswordForm({ current: '', new: '', confirm: '' });
        setIsChangingPassword(false);
    };
    
    return (
        <div className="p-4 md:p-6">
            <div className="bg-slate-800 p-6 rounded-lg mb-6">
                <h2 className="text-2xl font-bold text-slate-100">{currentUser.name}님</h2>
                <p className="text-slate-400">{currentUser.email}</p>
                <p className="text-slate-400">{currentUser.phone}</p>
                <button onClick={() => setIsChangingPassword(!isChangingPassword)} className="text-sm text-amber-400 hover:underline mt-4">{isChangingPassword ? '취소' : '비밀번호 변경'}</button>
                {isChangingPassword && (
                    <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
                        <input type="password" placeholder="현재 비밀번호" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2 text-slate-100" required />
                        <input type="password" placeholder="새 비밀번호" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2 text-slate-100" required />
                        <input type="password" placeholder="새 비밀번호 확인" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2 text-slate-100" required />
                        <button type="submit" className="w-full bg-amber-400 text-slate-900 font-bold py-2 rounded-lg">변경하기</button>
                    </form>
                )}
                {pageError && <p className="text-red-400 text-sm mt-2">{pageError}</p>}
                {pageSuccess && <p className="text-green-400 text-sm mt-2">{pageSuccess}</p>}
            </div>

            <div>
                <h3 className="text-xl font-bold text-slate-100 mb-4">My Style History</h3>
                {styleHistory.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {styleHistory.map(item => (
                            <div key={item.id} className="bg-slate-800 rounded-lg overflow-hidden group relative">
                                <img src={`data:image/png;base64,${item.styledResult.imageBase64}`} alt="style history" className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                    <p className="text-xs text-slate-300 mb-2 line-clamp-3">{item.prompt}</p>
                                    <button onClick={() => viewHistoryItem(item)} className="w-full text-sm bg-slate-700 py-1 rounded mb-1">보기</button>
                                    <button onClick={() => handleShare(item)} className="w-full text-sm bg-slate-700 py-1 rounded flex items-center justify-center gap-1"><ShareIcon className="w-4 h-4" />공유</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-8">저장된 스타일이 없습니다.</p>
                )}
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [screen, setScreen] = useState<AppScreen>(AppScreen.Auth);
    const [originalImage, setOriginalImage] = useState<{ base64: string; mimeType: string; url: string } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    
    const [styledResult, setStyledResult] = useState<{ imageBase64: string; description: string } | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [requestDetails, setRequestDetails] = useState<{ count: number; total: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [aiQuestion, setAiQuestion] = useState<AIQuestion | null>(null);

    // Auth & My Page State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [styleHistory, setStyleHistory] = useState<StyleHistoryItem[]>([]);
    const [isCurrentStyleSaved, setIsCurrentStyleSaved] = useState(false);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<StyleHistoryItem | null>(null);
    
    // Admin state
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);


    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load data from localStorage on initial render
    useEffect(() => {
        try {
            const storedUsers = localStorage.getItem('easy-style-users');
            let allUsers: User[] = storedUsers ? JSON.parse(storedUsers) : [];

            // Ensure admin user exists
            if (!allUsers.find(u => u.email === ADMIN_EMAIL)) {
                const adminUser = { name: 'Admin', email: ADMIN_EMAIL, phone: '010-0000-0000', password: 'admin' };
                allUsers.push(adminUser);
                localStorage.setItem('easy-style-users', JSON.stringify(allUsers));
            }
            setUsers(allUsers);

            const storedRequests = localStorage.getItem('easy-style-purchase-requests');
            setPurchaseRequests(storedRequests ? JSON.parse(storedRequests) : []);

            const loggedInEmail = localStorage.getItem('easy-style-logged-in');
            if (loggedInEmail) {
                const user = allUsers.find((u: User) => u.email === loggedInEmail);
                if (user) {
                    setCurrentUser(user);
                    loadHistory(user.email);
                    setScreen(AppScreen.Home);
                }
            }
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
        }
    }, []);


    const groupedProducts = useMemo(() => {
        if (products.length === 0) return {};
        const groups = products.reduce((acc, product) => {
            const category = product.category || '기타';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>);

        const categoryOrder: (keyof typeof groups)[] = [ProductCategory.Top, ProductCategory.Bottom, ProductCategory.Shoes, ProductCategory.Accessory, '기타'];
        const orderedGroups: Record<string, Product[]> = {};
        categoryOrder.forEach(category => {
            if (groups[category]) {
                orderedGroups[category] = groups[category];
            }
        });
        return orderedGroups;
    }, [products]);
    
    const totalPrice = useMemo(() => {
        return selectedProducts.reduce((sum, product) => sum + product.price, 0);
    }, [selectedProducts]);


    const handleImageSelect = (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result.split(',')[1];
            if (base64) {
                setOriginalImage({ base64, mimeType: file.type, url: URL.createObjectURL(file) });
                setScreen(AppScreen.Styling);
                setError(null);
            } else {
                setError('이미지 파일을 처리하는 데 실패했습니다. 다른 파일을 시도해 주세요.');
            }
        };
        reader.onerror = () => setError('이미지 파일을 읽는 중 오류가 발생했습니다.');
        reader.readAsDataURL(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImageSelect(file);
        event.target.value = '';
    };

    const startOver = () => {
        setScreen(AppScreen.Home);
        setOriginalImage(null);
        setPrompt('');
        setStyledResult(null);
        setProducts([]);
        setIsLoading(false);
        setError(null);
        setAiQuestion(null);
        setUserAnswer('');
        setSelectedProducts([]);
        setRequestDetails(null);
        setIsCurrentStyleSaved(false);
        setViewingHistoryItem(null);
    };
    
    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('easy-style-logged-in');
        setScreen(AppScreen.Auth);
        startOver(); // Reset all state
    };

    const handleBack = () => {
        if (screen === AppScreen.Result) {
            if (viewingHistoryItem) {
                setScreen(AppScreen.MyPage);
            } else {
                 setScreen(AppScreen.Styling);
            }
             setStyledResult(null);
             setProducts([]);
             setSelectedProducts([]);
             setRequestDetails(null);
             setViewingHistoryItem(null);
        } else if (screen === AppScreen.Styling) {
            startOver();
        } else if (screen === AppScreen.MyPage || screen === AppScreen.Admin) {
            setScreen(AppScreen.Home);
        }
    };

    const executeStyleGeneration = async (finalPrompt: string) => {
        if (!originalImage) return;
        setIsLoading(true);
        setError(null);
        setViewingHistoryItem(null);
        setIsCurrentStyleSaved(false);
        setStyledResult(null);
        setProducts([]);

        try {
            setLoadingMessage('AI가 실제 상품을 찾고 스타일을 만들고 있어요...');
            const result = await generateStyleWithRealProducts(originalImage.base64, originalImage.mimeType, finalPrompt);
            
            setStyledResult({ imageBase64: result.imageBase64, description: result.description });

            setLoadingMessage('상품 이미지를 준비하고 있어요...');
            const productsWithCroppedImages = await Promise.all(
                result.products.map(async (product) => {
                    const croppedBase64 = await cropImageForProduct(
                        result.imageBase64,
                        product.category,
                        product.name
                    );
                    return { ...product, croppedImageBase64: croppedBase64 || undefined };
                })
            );
            
            setProducts(productsWithCroppedImages);
            setSelectedProducts(productsWithCroppedImages);
            setScreen(AppScreen.Result);

        } catch (err: any) {
            console.error(err);
            setError(err.message || '스타일 생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            setAiQuestion(null);
            setUserAnswer('');
        }
    };
    
    const handleInitialStyleRequest = async () => {
        if (!prompt) {
            setError("어떤 스타일을 원하시는지 입력해주세요.");
            return;
        }
        setAiQuestion(null);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('AI가 더 나은 제안을 위해 질문을 만들고 있어요...');

        const followUp = await generateFollowUpQuestion(prompt);
        
        setAiQuestion({ question: followUp.question, examples: followUp.examples });
        setIsLoading(false);
    };
    
    const handleAnswerSubmit = async () => {
        const fullPrompt = `${prompt}\n\n추가 정보: ${userAnswer}`;
        await executeStyleGeneration(fullPrompt);
    };

    const handleProductSelect = (productToToggle: Product) => {
        setSelectedProducts(prevSelected =>
            prevSelected.some(p => p.productUrl === productToToggle.productUrl)
                ? prevSelected.filter(p => p.productUrl !== productToToggle.productUrl)
                : [...prevSelected, productToToggle]
        );
    };

    const handlePurchaseRequest = (items: Product[]) => {
        if (items.length === 0) {
            setError("요청할 상품을 선택해주세요.");
            return;
        }
        if (!currentUser) {
            setError("로그인 후 이용해주세요.");
            return;
        }

        const total = items.reduce((sum, p) => sum + p.price, 0);

        const newRequest: PurchaseRequest = {
            id: Date.now().toString(),
            userEmail: currentUser.email,
            products: items,
            totalPrice: total,
            status: PurchaseRequestStatus.Pending,
            createdAt: new Date().toISOString(),
        };

        const updatedRequests = [newRequest, ...purchaseRequests];
        setPurchaseRequests(updatedRequests);
        localStorage.setItem('easy-style-purchase-requests', JSON.stringify(updatedRequests));

        setRequestDetails({ count: items.length, total });
    };

    // --- Auth Handlers ---
    const handleAuthFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAuthForm({ ...authForm, [e.target.name]: e.target.value });
    };

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        if (users.find(u => u.email === authForm.email)) {
            setError('이미 가입된 이메일입니다.');
            return;
        }
        const newUser: User = { name: authForm.name, email: authForm.email, phone: authForm.phone, password: authForm.password };
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        localStorage.setItem('easy-style-users', JSON.stringify(updatedUsers));
        
        // Log in the new user
        setCurrentUser(newUser);
        localStorage.setItem('easy-style-logged-in', newUser.email);
        setScreen(AppScreen.Home);
        setError(null);
    };
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.email === authForm.email && u.password === authForm.password);
        if (user) {
            setCurrentUser(user);
            localStorage.setItem('easy-style-logged-in', user.email);
            loadHistory(user.email);
            setScreen(AppScreen.Home);
            setError(null);
        } else {
            setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        }
    };
    
    // --- History Handlers ---
    const loadHistory = (email: string): StyleHistoryItem[] => {
        const historyData = localStorage.getItem(`easy-style-history-${email}`);
        if (historyData) {
            const parsedHistory = JSON.parse(historyData);
            setStyleHistory(parsedHistory);
            return parsedHistory;
        }
        return [];
    };
    
    const handleSaveStyle = () => {
        if (!originalImage || !styledResult || !currentUser) return;
        
        const newHistoryItem: StyleHistoryItem = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            originalImage,
            styledResult,
            products,
            prompt,
        };

        const updatedHistory = [newHistoryItem, ...styleHistory];
        setStyleHistory(updatedHistory);
        localStorage.setItem(`easy-style-history-${currentUser.email}`, JSON.stringify(updatedHistory));
        setIsCurrentStyleSaved(true);
    };
    
    const viewHistoryItem = (item: StyleHistoryItem) => {
        setViewingHistoryItem(item);
        setOriginalImage(item.originalImage);
        setStyledResult(item.styledResult);
        setProducts(item.products);
        setSelectedProducts(item.products);
        setPrompt(item.prompt);
        setIsCurrentStyleSaved(true);
        setScreen(AppScreen.Result);
    };
    
    const handleShare = async (item: StyleHistoryItem) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'EasyStyle AI Stylist',
                    text: `AI가 추천해준 제 새로운 스타일을 확인해보세요! - ${item.prompt}`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Share failed:', error);
            }
        } else {
            alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
        }
    };
    
    const renderAuth = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
                <div className="flex justify-center border-b border-slate-700 mb-6">
                    <button onClick={() => setAuthMode('login')} className={`px-6 py-2 text-lg font-bold ${authMode === 'login' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>로그인</button>
                    <button onClick={() => setAuthMode('signup')} className={`px-6 py-2 text-lg font-bold ${authMode === 'signup' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>회원가입</button>
                </div>
                
                <h1 className="text-3xl font-bold text-slate-100 mb-6">{authMode === 'login' ? '다시 만나서 반가워요!' : 'EasyStyle 시작하기'}</h1>

                <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4 text-left">
                    {authMode === 'signup' && (
                        <>
                            <input type="text" name="name" placeholder="이름" required value={authForm.name} onChange={handleAuthFormChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400" />
                            <input type="tel" name="phone" placeholder="전화번호" required value={authForm.phone} onChange={handleAuthFormChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400" />
                        </>
                    )}
                    <input type="email" name="email" placeholder="이메일" required value={authForm.email} onChange={handleAuthFormChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400" />
                    <input type="password" name="password" placeholder="비밀번호" required value={authForm.password} onChange={handleAuthFormChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400" />

                    <button type="submit" className="w-full mt-4 bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-300 transition-colors duration-300 shadow-lg">{authMode === 'login' ? '로그인' : '가입하고 시작하기'}</button>
                </form>
                 {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
        </div>
    );

    const renderHome = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
                <h1 className="text-3xl font-bold text-slate-100">당신의 전문 스타일리스트</h1>
                <p className="text-slate-400 mt-2 mb-8">사진 한 장으로 나만의 스타일을 찾아보세요.</p>
                <div className="space-y-4">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors duration-300">
                        <CameraIcon className="w-6 h-6" />
                        사진 찍기
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg">
                        <GalleryIcon className="w-6 h-6" />
                        갤러리에서 선택
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
    );

    const renderStyling = () => (
        <div className="p-4 md:p-6 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto">
                {originalImage && <img src={originalImage.url} alt="User upload" className="rounded-lg w-full max-w-md mx-auto shadow-lg" />}
                <div className="mt-6">
                    <label htmlFor="prompt" className="block text-lg font-medium text-slate-200 mb-2">어떤 스타일을 원하세요?</label>
                    <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="예: 강남역 소개팅을 위한 깔끔한 남친룩" className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition" rows={3} />
                </div>
                {aiQuestion && (
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                        <p className="text-slate-300">{aiQuestion.question}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {aiQuestion.examples.map((ex, i) => (
                                <button key={i} onClick={() => setUserAnswer(ex)} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-md hover:bg-slate-600">{ex}</button>
                            ))}
                        </div>
                        <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답변을 입력해주세요..." className="w-full mt-3 bg-slate-700 border-2 border-slate-600 rounded-lg p-2 text-slate-100 text-sm" rows={2} />
                        <button onClick={handleAnswerSubmit} disabled={isLoading || !userAnswer} className="w-full mt-3 bg-amber-400 text-slate-900 font-bold py-2 px-4 text-sm rounded-lg hover:bg-amber-300 disabled:bg-slate-600">답변 제출</button>
                    </div>
                )}
                 {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
            {!aiQuestion && (
                <button onClick={handleInitialStyleRequest} disabled={isLoading || !prompt} className="w-full mt-6 bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <SparklesIcon className="w-6 h-6" />
                    스타일 생성하기
                </button>
            )}
        </div>
    );
    
    const renderResultScreen = () => {
        if (!styledResult) return null;
        
        const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);

        return (
            <div className="pb-40"> {/* Add padding to bottom to avoid overlap with fixed bar */}
                <div className="p-4 md:p-6">
                    <div className="relative">
                        <img src={`data:image/png;base64,${styledResult.imageBase64}`} alt="Styled result" className="rounded-lg w-full shadow-2xl" />
                         {isCurrentStyleSaved ? (
                            <div className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur-sm text-green-400 rounded-full p-2 flex items-center gap-2 text-sm">
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>저장됨</span>
                            </div>
                        ) : (
                            <button onClick={handleSaveStyle} className="absolute top-4 right-4 bg-slate-900/70 backdrop-blur-sm text-slate-100 rounded-full p-2 hover:bg-slate-800 transition">
                                <SaveIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">스타일 제안</h2>
                        <p className="text-slate-300 leading-relaxed">{styledResult.description}</p>
                    </div>
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4">실제 상품으로 구성된 스타일</h2>
                        {Object.keys(groupedProducts).length > 0 ? (
                            Object.entries(groupedProducts).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-lg font-bold text-amber-400 mb-3 pb-2 border-b-2 border-slate-700">{category}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {items.map((product) => (
                                            <ProductCard
                                                key={product.productUrl}
                                                product={product}
                                                isSelected={selectedProducts.some(p => p.productUrl === product.productUrl)}
                                                onSelect={() => handleProductSelect(product)}
                                                fallbackImageUrl={`data:image/png;base64,${styledResult.imageBase64}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-center py-8">추천 상품을 찾지 못했습니다.</p>
                        )}
                    </div>

                    {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
                </div>

                {/* Bottom Purchase Bar */}
                {products.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-800 border-t border-slate-700 shadow-lg">
                        {requestDetails ? (
                            <div className="p-4 text-center">
                                <h3 className="font-bold text-lg text-amber-400">구매 요청이 완료되었습니다!</h3>
                                <p className="text-slate-300 text-sm mt-1">담당자가 확인 후 결제를 위해 연락드릴 예정입니다.</p>
                                <p className="text-slate-300 text-sm mt-2">요청 상품: {requestDetails.count}개 / 예상 금액: {formatCurrency(requestDetails.total)}</p>
                                <button onClick={startOver} className="mt-2 text-sm text-amber-400 hover:underline">새 스타일 만들기</button>
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-slate-300">선택된 상품 ({selectedProducts.length}개)</span>
                                    <span className="text-xl font-bold text-amber-400">{formatCurrency(totalPrice)}</span>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => handlePurchaseRequest(selectedProducts)} className="w-full bg-amber-400 text-slate-900 font-bold py-3 rounded-lg hover:bg-amber-300 transition-colors">선택 상품 구매 요청하기</button>
                                    <button onClick={() => handlePurchaseRequest(products)} className="w-full bg-slate-700 text-slate-200 font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">이 스타일 전체 구매 요청하기</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (!currentUser) {
            return renderAuth();
        }
        switch (screen) {
            case AppScreen.Home: return renderHome();
            case AppScreen.Styling: return renderStyling();
            case AppScreen.Result: return renderResultScreen();
            case AppScreen.MyPage: return <MyPage 
                currentUser={currentUser}
                users={users}
                setUsers={setUsers}
                setCurrentUser={setCurrentUser}
                styleHistory={styleHistory}
                viewHistoryItem={viewHistoryItem}
                handleShare={handleShare}
            />;
            case AppScreen.Admin: return <AdminDashboard
                users={users}
                requests={purchaseRequests}
                setRequests={setPurchaseRequests}
                getHistoryForUser={loadHistory}
            />;
            default: return renderAuth();
        }
    }

    return (
        <div className="bg-slate-900 min-h-screen text-slate-100">
            <div className="max-w-lg mx-auto bg-slate-900 min-h-screen flex flex-col">
                <Header 
                    onBack={handleBack} 
                    showBackButton={screen !== AppScreen.Home && screen !== AppScreen.Auth}
                    isLoggedIn={!!currentUser}
                    onMyPage={() => setScreen(AppScreen.MyPage)}
                    onLogout={handleLogout}
                    isAdmin={currentUser?.email === ADMIN_EMAIL}
                    onAdminClick={() => setScreen(AppScreen.Admin)}
                />
                <main className="flex-grow">
                    {isLoading && <Spinner message={loadingMessage} />}
                    <div className="h-full">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;