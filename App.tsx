import React, { useState, useRef, useMemo } from 'react';
import { AppScreen, Product, ProductCategory } from './types';
import { generateStyle, getProductsForStyle, validatePrompt, cropImageForProduct } from './services/styleProvider';
import { recordStyleRequest, recordPurchaseRequest, recordStyleSession } from './services/db';
import { localImageStorage } from './services/localImageStorage';
import { comprehensiveProductSearch, ProductSearchResult } from './services/shoppingSearchAgent';
import { saveProductSearchSession, saveProductSearchResults } from './services/productStorageService';
import { progressiveOptimization, createFastPreview } from './services/imageOptimizer';
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
    const [shoppingResults, setShoppingResults] = useState<ProductSearchResult[]>([]);
    const [requestDetails, setRequestDetails] = useState<{ count: number; total: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
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
                setError(null);
                setShowAuth(false);
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
                setError(null);
                setShowAuth(false);
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

    const requireAuthAsync = async (): Promise<boolean> => {
        if (userEmail) return true;
        try {
            const { data } = await supabase.auth.getUser();
            if (data.user?.email) {
                setUserEmail(data.user.email);
                return true;
            }
        } catch {}
        // 최종적으로 미인증이면 모달 표시
        setAuthMode('login');
        setShowAuth(true);
        return false;
    };

    const openFilePicker = async () => {
        if (!(await requireAuthAsync())) return;
        fileInputRef.current?.click();
    };

    const handleImageSelect = async (file: File) => {
        if (!requireAuth()) return;
        if (!file) return;

        setIsLoading(true);
        setLoadingMessage('이미지를 불러오는 중...');

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = e.target?.result as string;
                    const base64 = result.split(',')[1];
                    if (base64) {
                        // 원본 이미지 설정
                        const originalUrl = URL.createObjectURL(file);
                        setOriginalImage({ base64, mimeType: file.type, url: originalUrl });

                        // 빠른 미리보기 생성 (백그라운드에서)
                        try {
                            setLoadingMessage('미리보기 생성 중...');
                            const previewUrl = await createFastPreview(result, 800);

                            // 미리보기가 준비되면 URL 업데이트
                            setOriginalImage(prev => prev ? {
                                ...prev,
                                url: previewUrl
                            } : null);

                            if (previewUrl !== result) {
                                console.log('[ImageOptimizer] Fast preview created, size reduced');
                            }
                        } catch (previewError) {
                            console.warn('[ImageOptimizer] Preview generation failed:', previewError);
                            // 미리보기 생성 실패해도 원본으로 계속 진행
                        }

                        setScreen(AppScreen.Styling);
                        setError(null);
                    } else {
                        setError('이미지 파일을 처리하는 데 실패했습니다. 다른 파일을 시도해 주세요.');
                    }
                } catch (error) {
                    console.error('[ImageSelect] Processing error:', error);
                    setError('이미지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
                } finally {
                    setIsLoading(false);
                }
            };

            reader.onerror = () => {
                setError('파일을 읽는 데 실패했습니다. 다른 파일을 시도해 주세요.');
                setIsLoading(false);
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('[ImageSelect] Error:', error);
            setError('이미지 선택 중 오류가 발생했습니다.');
            setIsLoading(false);
        }
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

    // Helpers to mitigate large/unsupported images on mobile (e.g., Z Flip)
    const withTimeout = async <T,>(p: Promise<T>, ms = 60000): Promise<T> => {
        return await Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
        ]);
    };

    // 이미지 최적화 함수는 services/imageOptimizer.ts로 이동됨

    const executeStyleGeneration = async (finalPrompt: string, meta?: { userPrompt?: string; userAnswer?: string }) => {
        if (!originalImage || isGenerating) return;

        const overallStartTime = performance.now();
        console.log('🚀 [executeStyleGeneration] Starting style generation process', {
            promptLength: finalPrompt.length,
            originalImageSize: originalImage.base64.length,
            timestamp: new Date().toLocaleTimeString()
        });

        setIsGenerating(true);
        setIsLoading(true);
        setError(null);

        try {
            // Preprocess image: convert to JPEG and downscale to reduce model latency/errors
            const srcDataUrl = `data:${originalImage.mimeType};base64,${originalImage.base64}`;

            // 점진적 최적화로 사용자 경험 개선
            const imageOptStartTime = performance.now();
            console.log('🖼️ [executeStyleGeneration] Starting image optimization...');
            const optimizedResult = await progressiveOptimization(srcDataUrl, (stage, progress) => {
                setLoadingMessage(`${stage} (${Math.round(progress)}%)`);
                console.log(`📊 [imageOptimization] ${stage}: ${Math.round(progress)}%`);
            });
            const imageOptEndTime = performance.now();
            const imageOptDuration = imageOptEndTime - imageOptStartTime;
            console.log('✅ [executeStyleGeneration] Image optimization completed', {
                duration: `${imageOptDuration.toFixed(0)}ms`,
                originalSize: originalImage.base64.length,
                optimizedSize: optimizedResult.base64.length,
                compressionRatio: `${(optimizedResult.compressionRatio || 0).toFixed(1)}%`
            });

            let processedBase64 = optimizedResult.base64;
            let processedMime = 'image/jpeg';

            setLoadingMessage('AI가 당신의 스타일을 만들고 있어요... (최대 50초, 실패 시 자동 폴백)');
            const aiStartTime = performance.now();
            console.log('🤖 [executeStyleGeneration] Starting AI style generation...', {
                processedImageSize: processedBase64.length,
                prompt: finalPrompt.substring(0, 100) + (finalPrompt.length > 100 ? '...' : '')
            });

            let styledImageBase64: string, description: string;
            let aiEndTime: number; // AI 생성 완료 시간 변수 선언
            try {
                ({ styledImageBase64, description } = await withTimeout(
                    generateStyle(processedBase64, processedMime, finalPrompt),
                    50000  // 50초 - 균형잡힌 타임아웃
                ));

                aiEndTime = performance.now();
                const aiDuration = aiEndTime - aiStartTime;
                console.log('✅ [executeStyleGeneration] AI style generation completed', {
                    duration: `${aiDuration.toFixed(0)}ms`,
                    generatedImageSize: styledImageBase64?.length || 0,
                    descriptionLength: description?.length || 0
                });
            } catch (e) {
                const aiErrorTime = performance.now();
                const firstAttemptDuration = aiErrorTime - aiStartTime;
                console.warn('⚠️ [executeStyleGeneration] First AI attempt failed', {
                    error: e instanceof Error ? e.message : String(e),
                    duration: `${firstAttemptDuration.toFixed(0)}ms`
                });

                // Retry once with smaller image if timeout or error
                try {
                    setLoadingMessage('더 작은 크기로 재시도 중...');

                    const retryOptStartTime = performance.now();
                    console.log('🔄 [executeStyleGeneration] Starting retry with smaller image...');

                    // 더 작은 크기로 재최적화
                    const retryResult = await progressiveOptimization(srcDataUrl, (stage, progress) => {
                        setLoadingMessage(`재시도: ${stage} (${Math.round(progress)}%)`);
                        console.log(`📊 [retryOptimization] ${stage}: ${Math.round(progress)}%`);
                    });

                    const retryOptEndTime = performance.now();
                    console.log('✅ [executeStyleGeneration] Retry optimization completed', {
                        duration: `${(retryOptEndTime - retryOptStartTime).toFixed(0)}ms`,
                        retryImageSize: retryResult.base64.length
                    });

                    processedBase64 = retryResult.base64;

                    const retryAiStartTime = performance.now();
                    console.log('🤖 [executeStyleGeneration] Starting retry AI generation...');

                    ({ styledImageBase64, description } = await withTimeout(
                        generateStyle(processedBase64, processedMime, finalPrompt),
                        45000  // 45초로 조정
                    ));

                    const retryAiEndTime = performance.now();
                    console.log('✅ [executeStyleGeneration] Retry AI generation completed', {
                        duration: `${(retryAiEndTime - retryAiStartTime).toFixed(0)}ms`,
                        generatedImageSize: styledImageBase64?.length || 0
                    });
                } catch (e2: any) {
                    console.error('❌ [executeStyleGeneration] Retry also failed', {
                        error: e2 instanceof Error ? e2.message : String(e2),
                        totalDuration: `${(performance.now() - aiStartTime).toFixed(0)}ms`
                    });
                    throw e2;
                }
            }
            setStyledResult({ imageBase64: styledImageBase64, description });

            // 즉시 로컬에 저장하고 백그라운드에서 업로드
            console.log('💾 [executeStyleGeneration] Saving images locally and scheduling background upload...');
            const localSaveStartTime = performance.now();

            try {
              const localImageId = localImageStorage.saveLocally({
                originalImage: {
                  base64: originalImage.base64,
                  mimeType: originalImage.mimeType || 'image/png'
                },
                styledImage: {
                  base64: styledImageBase64,
                  mimeType: 'image/png'
                },
                metadata: {
                  userPrompt: meta?.userPrompt ?? prompt,
                  userAnswer: meta?.userAnswer ?? userAnswer,
                  fullPrompt: finalPrompt,
                  description,
                  modelProvider: (import.meta as any).env?.VITE_STYLE_PROVIDER || 'gemini',
                  timestamp: Date.now()
                }
              });

              console.log('✅ [executeStyleGeneration] Local save completed', {
                duration: `${(performance.now() - localSaveStartTime).toFixed(0)}ms`,
                localImageId: localImageId
              });

            } catch (e) {
              console.warn('❌ [executeStyleGeneration] Local save failed, falling back to direct upload:', e);
              // 폴백: 직접 업로드 (하지만 시간이 걸림)
              try {
                recordStyleRequest(finalPrompt, (import.meta as any).env?.VITE_STYLE_PROVIDER).catch((e2: any) => console.warn('recordStyleRequest failed', e2));
              } catch (fallbackError) {
                console.error('Fallback storage also failed:', fallbackError);
              }
            }

            setLoadingMessage('스타일에 맞는 상품을 찾고 있어요...');
            const productStartTime = performance.now();
            console.log('🛍️ [executeStyleGeneration] Starting product recommendation...');
            const productResults = await withTimeout(getProductsForStyle(description), 12000).catch(() => []) as Product[];
            const productEndTime = performance.now();
            console.log('✅ [executeStyleGeneration] Product recommendation completed', {
                duration: `${(productEndTime - productStartTime).toFixed(0)}ms`,
                productCount: productResults.length
            });

            // 추가: 쇼핑 검색 AI Agent로 실제 구매 가능한 상품 검색
            let shoppingStartTime: number, shoppingEndTime: number;
            try {
                setLoadingMessage('실제 구매 가능한 상품을 찾고 있어요...');
                shoppingStartTime = performance.now();
                console.log('🛒 [executeStyleGeneration] Starting shopping search AI agent...');

                const shoppingSearchRequest = {
                    styleDescription: description,
                    gender: meta?.userAnswer?.includes('남') || meta?.userPrompt?.includes('남') ? 'male' as const :
                           meta?.userAnswer?.includes('여') || meta?.userPrompt?.includes('여') ? 'female' as const : 'unisex' as const,
                    ageGroup: meta?.userAnswer || meta?.userPrompt
                };

                console.log('📋 [shoppingSearch] Request parameters', {
                    descriptionLength: description.length,
                    gender: shoppingSearchRequest.gender,
                    ageGroup: shoppingSearchRequest.ageGroup || 'not specified'
                });

                const shoppingResults = await comprehensiveProductSearch(shoppingSearchRequest);
                shoppingEndTime = performance.now();
                console.log('✅ [executeStyleGeneration] Shopping search completed', {
                    duration: `${(shoppingEndTime - shoppingStartTime).toFixed(0)}ms`,
                    shoppingResultsCount: shoppingResults.length
                });
                setShoppingResults(shoppingResults);

                // Supabase에 검색 세션과 결과 저장
                const sessionId = crypto.randomUUID();
                await saveProductSearchSession({
                    session_id: sessionId,
                    style_description: description,
                    gender: shoppingSearchRequest.gender,
                    age_group: shoppingSearchRequest.ageGroup,
                    total_products_found: shoppingResults.length,
                    user_id: '' // 서비스에서 자동으로 채워짐
                });

                console.log('💾 [executeStyleGeneration] Saving shopping results to Supabase...');
                const saveStartTime = performance.now();
                await saveProductSearchResults(sessionId, description, shoppingResults);
                console.log('✅ [executeStyleGeneration] Shopping results saved', {
                    duration: `${(performance.now() - saveStartTime).toFixed(0)}ms`,
                    sessionId: sessionId
                });
            } catch (shoppingError) {
                shoppingEndTime = performance.now();
                console.error('❌ [executeStyleGeneration] Shopping search failed', {
                    error: shoppingError instanceof Error ? shoppingError.message : String(shoppingError),
                    duration: `${(shoppingEndTime - shoppingStartTime).toFixed(0)}ms`
                });
                setShoppingResults([]);
            }

            // First show products quickly, then attempt limited background crops
            const limited = (productResults || []).slice(0, Number((import.meta as any).env?.VITE_STYLING_MAX_PRODUCTS) || 8);
            setProducts(limited);
            setSelectedProducts(limited);

            setLoadingMessage('상품 이미지를 준비하고 있어요...');
            const cropStartTime = performance.now();
            console.log('✂️ [executeStyleGeneration] Starting product image cropping...', {
                totalProducts: limited.length
            });

            const cropLimit = Number((import.meta as any).env?.VITE_STYLING_CROP_LIMIT) || 4;
            Promise.allSettled(
                limited.slice(0, cropLimit).map(async (product, index) => {
                    const productCropStartTime = performance.now();
                    console.log(`🔄 [productCrop] Processing product ${index + 1}/${cropLimit}:`, {
                        name: product.name,
                        category: product.category
                    });

                    const cropped = await cropImageForProduct(styledImageBase64, product.category, product.name);
                    const productCropEndTime = performance.now();

                    if (cropped) {
                        console.log(`✅ [productCrop] Product ${index + 1} cropped successfully`, {
                            duration: `${(productCropEndTime - productCropStartTime).toFixed(0)}ms`,
                            croppedImageSize: cropped.length
                        });
                        setProducts(prev => prev.map(p => p.productUrl === product.productUrl ? { ...p, croppedImageBase64: cropped } : p));
                    } else {
                        console.log(`⚠️ [productCrop] Product ${index + 1} cropping failed`, {
                            duration: `${(productCropEndTime - productCropStartTime).toFixed(0)}ms`
                        });
                    }
                })
            ).then(() => {
                console.log('✅ [executeStyleGeneration] All product cropping completed', {
                    totalDuration: `${(performance.now() - cropStartTime).toFixed(0)}ms`,
                    processedCount: Math.min(limited.length, cropLimit)
                });
            }).catch(() => {});

            // 전체 프로세스 완료 시간 로깅
            const overallEndTime = performance.now();
            const totalDuration = overallEndTime - overallStartTime;
            console.log('🎉 [executeStyleGeneration] Complete process finished!', {
                totalDuration: `${totalDuration.toFixed(0)}ms`,
                totalDurationMinutes: `${(totalDuration / 60000).toFixed(1)}min`,
                imageOptimizationTime: `${imageOptDuration.toFixed(0)}ms`,
                aiGenerationTime: styledImageBase64 ? `${(aiEndTime || performance.now()) - aiStartTime}ms` : 'failed',
                productRecommendationTime: `${(productEndTime - productStartTime).toFixed(0)}ms`,
                shoppingSearchTime: `${((shoppingEndTime || performance.now()) - (shoppingStartTime || overallStartTime)).toFixed(0)}ms`,
                breakdown: {
                    imageOptimization: `${((imageOptDuration / totalDuration) * 100).toFixed(1)}%`,
                    aiGeneration: `${(((aiEndTime || performance.now()) - aiStartTime) / totalDuration * 100).toFixed(1)}%`,
                    productSearch: `${(((productEndTime - productStartTime) / totalDuration) * 100).toFixed(1)}%`,
                    shoppingSearch: `${(((shoppingEndTime || performance.now()) - (shoppingStartTime || overallStartTime)) / totalDuration * 100).toFixed(1)}%`,
                    other: `${(100 - ((imageOptDuration + (aiEndTime || performance.now() - aiStartTime) + (productEndTime - productStartTime) + ((shoppingEndTime || performance.now()) - (shoppingStartTime || overallStartTime))) / totalDuration * 100)).toFixed(1)}%`
                }
            });

            setScreen(AppScreen.Result);
        } catch (err: any) {
            console.error(err);

            // 오류 유형별 사용자 안내
            const errorMessage = err?.message || '';
            if (errorMessage.includes('Google AI 서버') || errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
                setError('Google AI 서버가 일시적으로 불안정합니다. 몇 분 후 다시 시도해 주세요.');
                return;
            }

            if (errorMessage.includes('timeout')) {
                setError('네트워크 상황이 좋지 않아 시간이 오래 걸리고 있습니다. 다시 시도해 주세요.');
                return;
            }

            // Fallback: 텍스트 기반 추천으로 전환하여 사용자 흐름 유지
            try {
                setLoadingMessage('이미지 생성이 지연되어 텍스트 기반 추천으로 전환합니다...');
                const productResults = await withTimeout(getProductsForStyle(finalPrompt), 8000).catch(() => []) as Product[];
                const limited = (productResults || []).slice(0, Number((import.meta as any).env?.VITE_STYLING_MAX_PRODUCTS) || 8);
                setStyledResult({ imageBase64: '', description: '텍스트 기반 추천입니다. AI 이미지 생성 서비스가 일시적으로 불안정하여 제품 추천만 제공해드립니다.' });
                setProducts(limited);
                setSelectedProducts(limited);
                setScreen(AppScreen.Result);
                setError('AI 이미지 생성 서비스 오류로 텍스트 기반 추천으로 전환했습니다.');
            } catch (e2) {
                setError(errorMessage || '스타일 생성 중 오류가 발생했습니다.');
            }
        } finally {
            setIsLoading(false);
            setIsGenerating(false);
            setAiQuestion(null);
            setUserAnswer('');
        }
    };

    // Fix: Restructured the conditional to ensure TypeScript correctly narrows the type of `validationResult`.
    const handleInitialStyleRequest = async () => {
        if (!(await requireAuthAsync())) return;
        setAiQuestion(null);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('스타일 요청을 확인하는 중...');
        const validationResult = await validatePrompt(prompt);

        if (validationResult.valid === false) {
            setAiQuestion({ question: validationResult.question, examples: validationResult.examples });
            setIsLoading(false);
        } else {
            await executeStyleGeneration(prompt, { userPrompt: prompt, userAnswer: '' });
        }
    };
    
    const handleAnswerSubmit = async () => {
        if (!(await requireAuthAsync())) return;
        const fullPrompt = `${prompt}\n\n추가 정보: ${userAnswer}`;
        await executeStyleGeneration(fullPrompt, { userPrompt: prompt, userAnswer });
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
    const openActivity = async () => {
        if (!(await requireAuthAsync())) return;
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

    const withLogoutTimeout = async <T,>(p: Promise<T>, ms = LOGOUT_TIMEOUT): Promise<T> => {
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
                try { await withLogoutTimeout((supabase as any).auth.signOut({ scope: 'global' })); } catch (e) { /* silent in production */ if (AUTH_DEBUG) console.debug('signOut (debug):', e); }
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

                    {/* 쇼핑 검색 결과 섹션 */}
                    {shoppingResults.length > 0 && (
                        <div className="my-6">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4">🛒 실제 구매 가능한 상품</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {shoppingResults.map((product, index) => (
                                    <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors">
                                        <div className="flex gap-4">
                                            {product.image && (
                                                <img
                                                    src={product.image}
                                                    alt={product.title}
                                                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-slate-100 truncate">
                                                    {product.title}
                                                </h3>
                                                <p className="text-amber-400 font-bold text-lg mt-1">
                                                    {product.price}
                                                </p>
                                                {product.brand && (
                                                    <p className="text-slate-400 text-sm">
                                                        {product.brand}
                                                    </p>
                                                )}
                                                {product.description && (
                                                    <p className="text-slate-300 text-sm mt-2 line-clamp-2">
                                                        {product.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            product.source === 'korean'
                                                                ? 'bg-amber-400 text-slate-900'
                                                                : 'bg-sky-600 text-white'
                                                        }`}>
                                                            {product.source === 'korean' ? '🇰🇷 국내' : '🌍 해외'}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded-full">
                                                            {product.category}
                                                        </span>
                                                        {product.isValidUrl && (
                                                            <span className="text-xs px-2 py-1 bg-green-600 text-white rounded-full">
                                                                ✓ 유효
                                                            </span>
                                                        )}
                                                    </div>
                                                    {product.isValidUrl && (
                                                        <a
                                                            href={product.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-medium rounded-md transition-colors"
                                                        >
                                                            구매하기
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-slate-400 text-sm text-center">
                                    💡 AI가 추천한 실제 구매 가능한 상품입니다. URL 유효성이 검증되었습니다.
                                </p>
                            </div>
                        </div>
                    )}

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
