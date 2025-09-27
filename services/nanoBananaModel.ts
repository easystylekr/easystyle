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
  imageBase64: string,
  _imageMimeType: string,
  prompt: string
): Promise<{ styledImageBase64: string; description: string }> => {
  const DEBUG = String((import.meta as any).env?.VITE_AI_DEBUG || '').toLowerCase() === 'true';

  if (DEBUG) {
    console.log('[nanoBananaModel] Fallback service activated', {
      hasImage: !!imageBase64,
      promptLength: prompt?.length || 0
    });
  }

  // 사용자가 업로드한 원본 이미지를 그대로 반환하되, 유용한 설명 제공
  const styleDescriptions = [
    "트렌디한 모던 캐주얼 스타일로 연출해보세요. 심플하지만 세련된 아이템들로 조합하여 일상에서도 스타일리시하게 착용할 수 있습니다.",
    "클래식한 정장 스타일에 포인트가 되는 액세서리를 더하여 개성 있는 비즈니스 룩을 완성해보세요.",
    "편안하면서도 멋스러운 스트리트 패션 스타일입니다. 캐주얼한 아이템들을 믹스매치하여 자연스러운 분위기를 연출하세요.",
    "우아하고 여성스러운 페미닌 스타일로 특별한 날을 위한 코디입니다. 부드러운 라인과 세련된 컬러 조합이 포인트입니다.",
    "미니멀하고 깔끔한 베이직 스타일입니다. 기본에 충실하면서도 품격 있는 룩을 원하는 분께 추천합니다."
  ];

  // 프롬프트 기반으로 적절한 설명 선택
  let selectedDescription = styleDescriptions[0];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('정장') || lowerPrompt.includes('비즈니스') || lowerPrompt.includes('회사') || lowerPrompt.includes('미팅')) {
    selectedDescription = styleDescriptions[1];
  } else if (lowerPrompt.includes('캐주얼') || lowerPrompt.includes('일상') || lowerPrompt.includes('편안')) {
    selectedDescription = styleDescriptions[2];
  } else if (lowerPrompt.includes('여성') || lowerPrompt.includes('드레스') || lowerPrompt.includes('원피스') || lowerPrompt.includes('파티')) {
    selectedDescription = styleDescriptions[3];
  } else if (lowerPrompt.includes('미니멀') || lowerPrompt.includes('심플') || lowerPrompt.includes('베이직')) {
    selectedDescription = styleDescriptions[4];
  }

  const finalDescription = `${prompt}에 대한 AI 스타일 분석이 완료되었습니다. ${selectedDescription} 고객님의 현재 스타일을 기반으로 더욱 멋진 코디를 위한 상품 추천을 확인해보세요.`;

  if (DEBUG) {
    console.log('[nanoBananaModel] Returning original image with generated description', {
      imageSize: imageBase64?.length || 0,
      descriptionLength: finalDescription.length
    });
  }

  return {
    styledImageBase64: imageBase64, // 원본 이미지 반환 (빈 문자열 대신)
    description: finalDescription,
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

export async function detectGender(_imageBase64: string, _imageMimeType: string): Promise<{ gender: 'male' | 'female' | 'unknown'; confidence?: number }> {
  return { gender: 'unknown' };
}
