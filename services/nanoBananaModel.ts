// Placeholder implementation for the "나노바나나모델" provider.
// Replace these stubs with real API calls when model details are available.
import type { Product } from '@/types';
import { ProductCategory } from '@/types';

export const validatePrompt = async (prompt: string): Promise<{ valid: boolean; question?: string; examples?: string[] }> => {
  if (!prompt || prompt.trim().length < 5) {
    return { valid: false, question: '원하시는 스타일을 구체적으로 알려주세요.', examples: ['여름 결혼식 하객룩', '가을 캠퍼스 캐주얼', '겨울 출근용 코트 스타일'] };
  }

  // 더 세밀한 검증 로직 추가
  const cleanPrompt = prompt.trim().toLowerCase();

  // 너무 모호하거나 일반적인 요청들
  const vaguePhrases = [
    '스타일', '옷', '코디', '추천', '어떤', '뭐', '좀', '좋은', '예쁜', '멋진',
    '패션', '룩', '컨셉', '느낌', '분위기', '어울리는', '하기', '해줘', '해주세요'
  ];

  const words = cleanPrompt.split(/\s+/);
  const meaningfulWords = words.filter(word => word.length > 1 && !vaguePhrases.includes(word));

  // 구체적인 상황이나 스타일이 언급되지 않은 경우
  if (meaningfulWords.length < 2 || cleanPrompt.length < 10) {
    const questions = [
      '어떤 상황에서 입으실 스타일인지 알려주세요.',
      '선호하시는 스타일이나 분위기를 구체적으로 설명해 주세요.',
      '어떤 활동을 하시는 날의 스타일을 원하시나요?'
    ];

    return {
      valid: false,
      question: questions[Math.floor(Math.random() * questions.length)],
      examples: ['친구 결혼식 하객룩', '주말 데이트 캐주얼', '회사 미팅용 정장', '휴양지 여행 룩']
    };
  }

  return { valid: true };
};

export const generateStyle = async (
  _imageBase64: string,
  _imageMimeType: string,
  prompt: string
): Promise<{ styledImageBase64: string; description: string }> => {
  // TODO: Implement real call to NanoBanana model.
  return {
    styledImageBase64: '', // Return generated image as base64 when integrated
    description: `나노바나나모델 기반 스타일 제안 (프롬프트: ${prompt}) — 통합 대기 중입니다.`,
  };
};

export const getProductsForStyle = async (_description: string): Promise<Product[]> => {
  // Minimal placeholder products to keep UI functional during integration.
  return [
    {
      brand: 'DemoBrand',
      name: '클래식 셔츠',
      price: 49000,
      imageUrl: 'https://placehold.co/400x400?text=Shirt',
      recommendedSize: 'M',
      productUrl: '#',
      storeName: 'Demo Store',
      category: ProductCategory.Top,
    },
  ];
};

export const cropImageForProduct = async (
  _styledImageBase64: string,
  _category: ProductCategory,
  _name: string
): Promise<string | null> => {
  // Return null to fallback to full image until cropping is implemented.
  return null;
};

