import React, { useState, useRef, useMemo } from 'react';
import { AppScreen, Product, ProductCategory } from './types';
import { generateStyle, getProductsForStyle, validatePrompt, cropImageForProduct } from './services/styleProvider';
import { recordStyleRequest, recordPurchaseRequest } from './services/db';
import Header from './components/Header';
import Spinner from './components/Spinner';
import ProductCard from './components/ProductCard';
import { CameraIcon, GalleryIcon, SparklesIcon } from './components/icons';
import AuthModal from './components/AuthModal';
import AdminPage from './components/AdminPage';
import { supabase } from './services/supabaseClient';
import { upsertProfileFromSession } from './services/profile';
import ActivityModal from './components/ActivityModal';

type AIQuestion = {
  question: string;
  examples: string[];
};

const App: React.FC = () => {
    // Simple path switch (no router): /admin renders AdminPage
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return <AdminPage/>;
    }
    const [screen, setScreen] = useState<AppScreen>(AppScreen.Home);
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    
    const suppressAuthEventsRef = React.useRef(false);

    React.useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            setUserEmail(data.user?.email ?? null);
            // 로그인 상태면 혹시 남아있을 수 있는 로그아웃 표시를 해제
            if (data.user) {
                setLoggingOut(false);
            }
            if (data.user) await upsertProfileFromSession();
        });
        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
            // 로그아웃 진행 중에는 이벤트를 일시 무시하여 UI가 다시 로그인 상태로 보이지 않게 함
            if (suppressAuthEventsRef.current) {
                if (event === 'SIGNED_OUT') suppressAuthEventsRef.current = false;
                return;
            }
            setUserEmail(session?.user?.email ?? null);
            if (event === 'SIGNED_IN') {
                // 방어적으로 로그아웃 진행 UI를 해제
                setLoggingOut(false);
            }
            if (session?.user) await upsertProfileFromSession();
            // 이벤트 로깅 (login/logout)
            try {
                const { logAuthEvent } = await import('./services/authLog');
                if (event === 'SIGNED_IN') await logAuthEvent('login');
                if (event === 'SIGNED_OUT') await logAuthEvent('logout');
            } catch {}
        });
        return () => { sub.subscription?.unsubscribe(); };
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


    const requireAuth = () => {
        if (!userEmail) {
            setAuthMode('login');
            setShowAuth(true);
            setError('이 기능을 사용하려면 로그인이 필요합니다.');
            return false;
        }
        return true;
    };

    const openFilePicker = () => {
        if (!requireAuth()) return;
        fileInputRef.current?.click();
    };

    const handleImageSelect = (file: File) => {
        if (!requireAuth()) return;
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

    const reset = () => {
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
    };

    const handleBack = () => {
        if (screen === AppScreen.Result) {
            setScreen(AppScreen.Styling);
            setStyledResult(null);
            setProducts([]);
            setSelectedProducts([]);
            setRequestDetails(null);
        } else if (screen === AppScreen.Styling) {
            reset();
        }
    };

    // 비로그인 상태에서 보호된 화면에 머물지 않도록 자동 복귀 및 로그인 유도
    React.useEffect(() => {
        if (!userEmail && (screen === AppScreen.Styling || screen === AppScreen.Result)) {
            reset();
            setAuthMode('login');
            setShowAuth(true);
            setError('로그인이 필요합니다. 로그인 후 이용해 주세요.');
        }
    }, [userEmail, screen]);

    const executeStyleGeneration = async (finalPrompt: string) => {
        if (!originalImage) return;
        setIsLoading(true);
        setError(null);

        try {
            setLoadingMessage('AI가 당신의 스타일을 만들고 있어요...');
            const { styledImageBase64, description } = await generateStyle(originalImage.base64, originalImage.mimeType, finalPrompt);
            setStyledResult({ imageBase64: styledImageBase64, description });
            // Persist request meta (non-blocking)
            recordStyleRequest(finalPrompt, (import.meta as any).env?.VITE_STYLE_PROVIDER).catch((e: any) => console.warn('recordStyleRequest failed', e));

            setLoadingMessage('스타일에 맞는 상품을 찾고 있어요...');
            const productResults = await getProductsForStyle(description);

            setLoadingMessage('상품 이미지를 준비하고 있어요...');
            const productsWithCroppedImages = await Promise.all(
                productResults.map(async (product) => {
                    const croppedBase64 = await cropImageForProduct(
                        styledImageBase64,
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

    // Fix: Restructured the conditional to ensure TypeScript correctly narrows the type of `validationResult`.
    const handleInitialStyleRequest = async () => {
        if (!requireAuth()) return;
        setAiQuestion(null);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('스타일 요청을 확인하는 중...');

        const validationResult = await validatePrompt(prompt);

        if (validationResult.valid === false) {
            setAiQuestion({ question: validationResult.question, examples: validationResult.examples });
            setIsLoading(false);
        } else {
            await executeStyleGeneration(prompt);
        }
    };
    
    const handleAnswerSubmit = async () => {
        if (!requireAuth()) return;
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
        if (!userEmail) {
            setError('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
            return;
        }
        const total = items.reduce((sum, p) => sum + p.price, 0);
        setRequestDetails({ count: items.length, total });
        // Persist purchase request (non-blocking)
        recordPurchaseRequest(items, total).catch((e: any) => console.warn('recordPurchaseRequest failed', e));
    };

    const [showActivity, setShowActivity] = useState(false);
    const openActivity = () => {
        if (!requireAuth()) return;
        setShowActivity(true);
    }

    const AUTH_DEBUG = Boolean((import.meta as any).env?.VITE_AUTH_DEBUG);
    const LOGOUT_TIMEOUT = Number((import.meta as any).env?.VITE_LOGOUT_TIMEOUT_MS) || 3000;
    const [loggingOut, setLoggingOut] = useState(false);

    const clearSupabaseStorage = () => {
        const lsKeys: string[] = [];
        const ssKeys: string[] = [];
        try {
            for (let i = 0; i < localStorage.length; i++) lsKeys.push(localStorage.key(i) || '');
            for (let i = 0; i < sessionStorage.length; i++) ssKeys.push(sessionStorage.key(i) || '');
            const shouldRemove = (k: string) => /(^sb-.*-auth-token$)|(^sb-.*-persist-session$)|(^sb-.*-refresh-token$)/.test(k) || k.includes('supabase.auth.token');
            lsKeys.filter(shouldRemove).forEach(k => localStorage.removeItem(k));
            ssKeys.filter(shouldRemove).forEach(k => sessionStorage.removeItem(k));
        } catch (e) {
            if (AUTH_DEBUG) console.warn('storage clear failed', e);
        }
    };

    const withTimeout = async <T,>(p: Promise<T>, ms = LOGOUT_TIMEOUT): Promise<T> => {
        return await Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
        ]);
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        // 0) 즉시 UI 반영 및 토큰 제거 (사용자 체감 지연 제거)
        setLoggingOut(true);
        suppressAuthEventsRef.current = true;
        // 이벤트 억제 플래그가 영구히 남지 않도록 안전 타이머로 해제
        setTimeout(() => { suppressAuthEventsRef.current = false; }, 1500);
        clearSupabaseStorage();
        setUserEmail(null);
        setTimeout(() => setLoggingOut(false), 300); // 짧은 진행 표시만 노출

        // 1) 백그라운드 정리: 타임아웃을 적용하여 지연 방지
        (async () => {
            try {
                // 단일 호출: global scope만 시도 (네트워크 지연 시에도 시도는 하되 실패해도 무시)
                try { await withTimeout((supabase as any).auth.signOut({ scope: 'global' })); } catch (e) { /* silent in production */ if (AUTH_DEBUG) console.debug('signOut (debug):', e); }
                clearSupabaseStorage();
            } finally {
                // 최후 수단: 여전히 세션이 남아있다면 리로드로 정합성 확보(비차단, 약간 지연 후)
                setTimeout(async () => {
                    try {
                        const { data } = await supabase.auth.getUser();
                        if (data.user) window.location.href = '/';
                    } catch {}
                }, 500);
            }
        })();
    };

    const renderHome = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
                <h1 className="text-3xl font-bold text-slate-100">당신의 전문 스타일리스트</h1>
                <p className="text-slate-400 mt-2 mb-8">사진 한 장으로 나만의 스타일을 찾아보세요.</p>
                <div className="space-y-4">
                    <button onClick={openFilePicker} className="w-full bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors duration-300">
                        <CameraIcon className="w-6 h-6" />
                        사진 찍기
                    </button>
                    <button onClick={openFilePicker} className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg">
                        <GalleryIcon className="w-6 h-6" />
                        갤러리에서 선택
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="mt-8 flex items-center gap-4">
                {userEmail ? (
                    <>
                      <span className="text-slate-300 text-sm">{userEmail}</span>
                      <div className="w-px h-4 bg-slate-600"></div>
                      <button onClick={handleLogout} disabled={loggingOut} className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium disabled:opacity-60">{loggingOut ? '로그아웃 중...' : '로그아웃'}</button>
                      <div className="w-px h-4 bg-slate-600"></div>
                      <button onClick={openActivity} className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">내 활동</button>
                    </>
                ) : (
                    <>
                      <button onClick={() => { setAuthMode('login'); setShowAuth(true); }} className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">로그인</button>
                      <div className="w-px h-4 bg-slate-600"></div>
                      <button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">회원가입</button>
                    </>
                )}
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
                        <button onClick={handleAnswerSubmit} disabled={isLoading || !userAnswer || !userEmail} className="w-full mt-3 bg-amber-400 text-slate-900 font-bold py-2 px-4 text-sm rounded-lg hover:bg-amber-300 disabled:bg-slate-600">답변 제출</button>
                    </div>
                )}
                 {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
            {!aiQuestion && (
                <button onClick={handleInitialStyleRequest} disabled={isLoading || !prompt || !userEmail} className="w-full mt-6 bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <SparklesIcon className="w-6 h-6" />
                    스타일 생성하기
                </button>
            )}
        </div>
    );
    
    const renderResultScreen = () => {
        if (!styledResult) return null;
        
        const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
        const resultImageUrl = styledResult.imageBase64
            ? `data:image/png;base64,${styledResult.imageBase64}`
            : (originalImage?.url || '');

        return (
            <div className="pb-40"> {/* Add padding to bottom to avoid overlap with fixed bar */}
                <div className="p-4 md:p-6">
                    {resultImageUrl ? (
                        <img src={resultImageUrl} alt="Styled result" className="rounded-lg w-full shadow-2xl" />
                    ) : (
                        <div className="rounded-lg w-full aspect-[16/10] bg-slate-800 flex items-center justify-center text-slate-400">
                            이미지가 없습니다
                        </div>
                    )}
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">스타일 제안</h2>
                        <p className="text-slate-300 leading-relaxed">{styledResult.description}</p>
                    </div>
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4">스타일링 아이템</h2>
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
                                                fallbackImageUrl={resultImageUrl}
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

                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-800 border-t border-slate-700 shadow-lg">
                     {requestDetails ? (
                        <div className="p-4 text-center">
                            <h3 className="font-bold text-lg text-amber-400">구매 요청이 완료되었습니다!</h3>
                            <p className="text-slate-300 text-sm mt-1">담당자가 확인 후 결제를 위해 연락드릴 예정입니다.</p>
                            <p className="text-slate-300 text-sm mt-2">요청 상품: {requestDetails.count}개 / 예상 금액: {formatCurrency(requestDetails.total)}</p>
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
            </div>
        );
    };

    return (
        <div className="bg-slate-900 min-h-screen text-slate-100">
            <div className="max-w-lg mx-auto bg-slate-900 min-h-screen flex flex-col">
                <Header onBack={handleBack} showBackButton={screen !== AppScreen.Home} />
                <main className="flex-grow">
                    {isLoading && <Spinner message={loadingMessage} />}
                    <div className="h-full">
                        {screen === AppScreen.Home && renderHome()}
                        {screen === AppScreen.Styling && renderStyling()}
                        {screen === AppScreen.Result && renderResultScreen()}
                    </div>
                </main>
                <AuthModal open={showAuth} onClose={() => setShowAuth(false)} defaultMode={authMode} />
                <ActivityModal open={showActivity} onClose={() => setShowActivity(false)} />
            </div>
        </div>
    );
};

export default App;
