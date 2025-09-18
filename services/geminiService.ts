import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Product } from '../types';
import { ProductCategory } from '../types';
import { productsAPI } from './apiService';
import { searchKoreanFashionProducts } from './koreanShoppingService';
import { searchNaverShoppingIntegrated } from './naverShoppingService';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

export const validatePrompt = async (prompt: string): Promise<{ valid: true } | { valid: false; question: string; examples: string[] }> => {
    if (!prompt || prompt.trim().length < 5) {
        return {
            valid: false,
            question: "어떤 스타일을 원하시는지 조금 더 자세히 알려주시겠어요?",
            examples: ["주말 데이트를 위한 캐주얼한 스타일", "중요한 회의를 위한 포멀한 오피스룩", "휴양지에서 입을 편안한 원피스"]
        };
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `다음 패션 스타일링 요청이 구체적인지 판단해주세요: "${prompt}".

        1.  요청이 구체적이라면 (예: 상황, 장소, 원하는 스타일이 명확하다면) **"YES"** 라고만 대답하세요.
        2.  요청이 너무 모호하다면, 사용자의 의도를 파악하기 위한 **하나의 추가 질문**과 **3가지 답변 예시**를 포함한 JSON 객체를 생성해주세요.

        **JSON 출력 형식:**
        \`\`\`json
        {
          "question": "사용자에게 할 질문",
          "examples": ["답변 예시 1", "답변 예시 2", "답변 예시 3"]
        }
        \`\`\`

        **예시:**
        -   사용자가 "옷 추천해줘" 라고 입력하면, 다음과 같이 응답할 수 있습니다:
        \`\`\`json
        {
          "question": "어떤 활동을 하실 예정인지, 어떤 스타일을 선호하시는지 알려주시면 더 멋진 스타일을 추천해드릴 수 있어요.",
          "examples": ["주말 데이트", "친구 결혼식", "편안한 집콕룩"]
        }
        \`\`\`
        
        이제 판단해주세요. 다른 설명 없이 "YES" 또는 JSON 객체만 반환해야 합니다.`,
      });
      
      const resultText = response.text.trim();
      if (resultText.toUpperCase() === 'YES') {
          return { valid: true };
      }

      try {
          const jsonMatch = resultText.match(/```(json)?\s*([\s\S]*?)\s*```/);
          const parsableText = jsonMatch ? jsonMatch[2] : resultText;
          const parsed = JSON.parse(parsableText);
          if (parsed.question && Array.isArray(parsed.examples)) {
              return { valid: false, question: parsed.question, examples: parsed.examples };
          }
           return { valid: false, question: "요청이 너무 모호합니다. 더 자세한 정보를 제공해주세요.", examples: [] };
      } catch (e) {
          console.error("Failed to parse validation response as JSON:", e, "Response text:", resultText);
          // Fallback to treating the raw text as the question
          return { valid: false, question: resultText, examples: [] };
      }

    } catch (error) {
      console.error("Prompt validation failed:", error);
      return { valid: true }; // In case of API error, assume the prompt is fine.
    }
};

export const generateStyle = async (
  imageBase64: string,
  imageMimeType: string,
  prompt: string
): Promise<{ styledImageBase64: string; description: string }> => {
  const imagePart = fileToGenerativePart(imageBase64, imageMimeType);

  // --- 1단계: 전문가 코디 제안 (텍스트) 생성 ---
  const styleProposalPrompt = `
    **당신은 사용자의 사진과 텍스트 요청을 기반으로, 맞춤형 스타일링 솔루션을 제공하는 세계 최고 수준의 AI 패션 스타일리스트입니다.**

    **분석:**
    -   첨부된 사용자의 사진을 분석하여 체형, 분위기를 파악하세요.
    -   사용자의 요청 사항을 분석하세요: "${prompt}"

    **코디 제안 원칙:**
    -   사용자 맞춤: 사용자의 특징을 가장 잘 살릴 수 있는 스타일을 제안합니다.
    -   상황 적합성: 사용자가 언급한 상황에 가장 적합한 코디를 제안합니다.
    -   스타일 일관성: 제안하는 모든 아이템은 전체 코디의 스타일을 일관성 있게 유지해야 합니다.
    -   현실성: 실제로 구매 가능한 트렌디하고 세련된 아이템을 중심으로 제안합니다.

    **임무:**
    위 분석과 원칙에 따라, 사용자를 위한 상세한 코디 설명을 생성해주세요. 이 설명은 나중에 이미지를 생성하는 데 사용됩니다. **다른 인사나 설명 없이, 오직 의상, 신발, 액세서리에 대한 구체적인 설명만 하나의 문단으로 제공해주세요.**

    **출력 예시:**
    "몸에 살짝 피트되는 블랙 터틀넥 니트, 허리 라인이 강조된 블랙 울 블렌드 재킷, 하이웨이스트 디자인의 스트레이트 핏 가죽 팬츠, 얇은 굽의 블랙 앵클 부츠, 그리고 실버 체인 목걸이와 미니멀한 클러치백으로 구성된 세련된 룩."
  `;

  let description = '';
  try {
    const descriptionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: styleProposalPrompt }
            ]
        }
    });
    description = descriptionResponse.text.trim();
  } catch(error) {
    console.error("스타일 제안(설명) 생성 API 호출 실패:", error);
    throw new Error('스타일을 제안하는 데 실패했습니다. 다시 시도해 주세요.');
  }

  if (!description) {
      console.error("스타일 제안(설명) 생성에 실패했습니다.");
      throw new Error('스타일을 제안하는 데 실패했습니다. 다시 시도해 주세요.');
  }

  // --- 2단계: 생성된 코디 제안(텍스트)을 기반으로 이미지 생성 ---
  const imageGenerationTextPart = {
    text: `**임무:** 사용자의 원본 사진과 아래의 상세한 스타일 설명을 바탕으로 전문적인 패션 화보 이미지를 생성하세요.
    
    **상세 스타일 설명:** "${description}"

    **핵심 지침:**
    1.  **인물 완전 유지:** 원본 이미지 속 인물의 **얼굴을 포함한 모든 신체적 특징(체형, 피부톤 등)을 절대 변경하지 말고 그대로 사용**해야 합니다.
    2.  **가상 의상 피팅:** 원본 의상만 위의 '상세 스타일 설명'에 명시된 새로운 의상으로 완벽하게 교체하세요.
    3.  **배경 생성:** 사용자의 초기 요청("${prompt}")과 어울리는 **새롭고 사실적인 배경**을 생성하여 기존 배경을 교체하세요.
    4.  **모델 포즈 적용:** 인물의 포즈를 **자연스럽고 자신감 있는 패션 모델 포즈**로 변경해주세요.
    5.  **최종 출력:** 위의 모든 요소가 결합된 **고품질의 새로운 이미지 한 장만**을 출력하세요. 텍스트 설명은 절대 포함하지 마세요.`
  };

  let styledImageBase64 = '';
  try {
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [imagePart, imageGenerationTextPart],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                styledImageBase64 = part.inlineData.data;
                break;
            }
        }
    }
  } catch (error) {
    console.error("스타일 이미지 생성 API 호출 실패:", error);
    throw new Error('스타일 이미지를 생성하는 데 실패했습니다. 다시 시도해 주세요.');
  }

  if (!styledImageBase64) {
    console.error("스타일 이미지 생성에 실패했습니다.");
    throw new Error('스타일을 완성하지 못했습니다. 다시 시도해 주세요.');
  }
  
  const finalDescription = `고객님은 ${description}`;
  
  return { styledImageBase64, description: finalDescription };
};


export const getProductsForStyle = async (description: string): Promise<Product[]> => {
    try {
        console.log('AI 스타일링을 위한 상품 검색 시작:', description);

        // 여러 소스에서 상품 검색을 병렬로 실행
        const searchPromises = [
            // 1. 기존 백엔드 데이터베이스 검색
            searchFromBackendDatabase(description),
            // 2. 네이버 쇼핑 검색
            searchNaverShoppingIntegrated(description),
            // 3. 한국 쇼핑몰 시뮬레이션 검색
            searchKoreanFashionProducts(description)
        ];

        // 모든 검색 결과를 기다림 (실패한 것은 빈 배열로 처리)
        const searchResults = await Promise.allSettled(searchPromises);

        let allProducts: Product[] = [];

        // 각 검색 결과를 합침
        searchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                const sourceName = ['백엔드 DB', '네이버 쇼핑', '한국 쇼핑몰'][index];
                console.log(`${sourceName}에서 ${result.value.length}개 상품 발견`);
                allProducts.push(...result.value);
            } else {
                const sourceName = ['백엔드 DB', '네이버 쇼핑', '한국 쇼핑몰'][index];
                console.warn(`${sourceName} 검색 실패:`, result.status === 'rejected' ? result.reason : '데이터 없음');
            }
        });

        // 중복 제거 (상품명과 브랜드가 비슷한 경우)
        const uniqueProducts = removeDuplicateProducts(allProducts);

        // 관련성 점수 계산 및 정렬
        const scoredProducts = calculateRelevanceScore(uniqueProducts, description);

        console.log(`총 ${scoredProducts.length}개의 고유 상품 발견`);

        // 상위 8개 상품 반환 (다양성 확보)
        return scoredProducts.slice(0, 8);

    } catch (e) {
        console.error("통합 상품 검색 실패:", e);
        // 모든 검색이 실패한 경우 기본 상품 목록 반환
        return await getFallbackProducts();
    }
};

// 카테고리 이름을 enum으로 매핑하는 함수
const mapCategoryToEnum = (categoryName: string): ProductCategory => {
    const categoryMap: Record<string, ProductCategory> = {
        'Tops': ProductCategory.Top,
        'Bottoms': ProductCategory.Bottom,
        'Shoes': ProductCategory.Shoes,
        'Accessories': ProductCategory.Accessory,
        'Outerwear': ProductCategory.Outerwear,
        'Underwear': ProductCategory.Underwear
    };
    return categoryMap[categoryName] || ProductCategory.Top;
};

// 백엔드 데이터베이스에서 상품 검색
const searchFromBackendDatabase = async (description: string): Promise<Product[]> => {
    try {
        console.log('백엔드 검색 description:', description, 'type:', typeof description);
        const searchData = {
            query: description,
            sort_by: 'relevance',
            page: 1
        };
        console.log('백엔드 검색 데이터:', searchData);

        const response = await productsAPI.searchProducts(searchData);

        return response.results
            .filter((item: any) => item.currency === 'KRW')
            .map((item: any) => ({
                id: item.uuid,
                brand: item.brand_name,
                name: item.name,
                price: item.current_price,
                imageUrl: item.main_image,
                recommendedSize: item.recommended_size || 'M',
                productUrl: item.product_url,
                storeName: item.store_name,
                category: mapCategoryToEnum(item.category_name),
                currency: item.currency || 'KRW',
                isSelected: false
            }));
    } catch (e) {
        console.error("백엔드 DB 검색 실패:", e);
        return [];
    }
};

// 중복 상품 제거 함수
const removeDuplicateProducts = (products: Product[]): Product[] => {
    const seen = new Set<string>();
    return products.filter(product => {
        // 상품명과 브랜드를 조합한 키로 중복 판단
        const key = `${product.name.toLowerCase().trim()}-${product.brand.toLowerCase().trim()}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

// 관련성 점수 계산 함수
const calculateRelevanceScore = (products: Product[], description: string): Product[] => {
    const keywords = description.toLowerCase().split(/\s+/);

    return products.map(product => {
        let score = 0;
        const searchText = `${product.name} ${product.brand}`.toLowerCase();

        // 키워드 매칭 점수
        keywords.forEach(keyword => {
            if (searchText.includes(keyword)) {
                score += 2;
            }
        });

        // 특정 브랜드나 쇼핑몰 보너스 점수
        const preferredStores = ['무신사', '29CM', '스타일난다', '네이버쇼핑'];
        if (preferredStores.some(store => product.storeName.includes(store))) {
            score += 1;
        }

        return { ...product, score };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .map(({ score, ...product }) => product);
};

// 백엔드 API 실패 시 사용할 기본 상품 목록
const getFallbackProducts = async (): Promise<Product[]> => {
    try {
        const response = await productsAPI.getProducts({ sort_by: 'newest' });
        return response.results
            .filter((item: any) => item.currency === 'KRW')
            .slice(0, 5)
            .map((item: any) => ({
                id: item.uuid,
                brand: item.brand_name,
                name: item.name,
                price: item.current_price,
                imageUrl: item.main_image,
                recommendedSize: item.recommended_size || 'M',
                productUrl: item.product_url,
                storeName: item.store_name,
                category: mapCategoryToEnum(item.category_name),
                currency: item.currency || 'KRW',
                isSelected: false
            }));
    } catch (e) {
        console.error("기본 상품 목록 조회 실패:", e);
        return [];
    }
};

export const cropImageForProduct = async (
  fullImageBase64: string,
  productCategory: string,
  productName: string
): Promise<string> => {
  try {
    const cropPrompt = `
      **임무:** 주어진 전체 이미지에서 특정 패션 아이템만 클로즈업하여 잘라낸 이미지를 생성하세요.
      **지침:**
      1.  이미지에서 모델이 착용하고 있는 '${productName}' (${productCategory}) 아이템을 찾으세요.
      2.  해당 아이템이 잘 보이도록 이미지를 자연스럽게 잘라내세요 (크롭핑).
      3.  결과는 잘라낸 이미지 한 장이어야 합니다. 다른 텍스트나 설명은 포함하지 마세요.
    `;

    const imagePart = fileToGenerativePart(fullImageBase64, 'image/png');
    const textPart = { text: cropPrompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }
    console.warn(`'${productName}'에 대한 크롭 이미지를 생성하지 못했습니다.`);
    return '';
  } catch (error: any) {
    console.error(`'${productName}' 크롭 이미지 생성 중 오류:`, error);

    // Gemini API 서비스 일시 중단 또는 과부하 처리
    if (error?.message?.includes('503') || error?.message?.includes('Service Unavailable')) {
      console.warn(`Gemini API 서비스 일시 중단. '${productName}' 크롭 이미지 건너뜀.`);
      return '';
    }

    return '';
  }
};