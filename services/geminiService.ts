import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Product } from '../types';
import { ProductCategory } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export async function detectGender(imageBase64: string, imageMimeType: string): Promise<{ gender: 'male' | 'female' | 'unknown'; confidence?: number }> {
  try {
    const imagePart = fileToGenerativePart(imageBase64, imageMimeType);
    const prompt = `이미지를 보고 인물의 성별을 판단하세요.
가능한 결과는 오직 다음 중 하나입니다: male, female, unknown.
자신이 없거나 얼굴/신체가 명확하지 않으면 unknown으로 하세요.
추가 설명 없이 한 단어만 출력하세요.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, { text: prompt }]
      }
    });
    const text = (response.text || '').trim().toLowerCase();
    const normalized = text.replace(/[^a-z가-힣]/g, '');
    if (/(male|남자|남성)/.test(normalized)) return { gender: 'male' };
    if (/(female|여자|여성)/.test(normalized)) return { gender: 'female' };
    return { gender: 'unknown' };
  } catch (e) {
    console.warn('detectGender failed', e);
    return { gender: 'unknown' };
  }
}


export const getProductsForStyle = async (description: string): Promise<Product[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `당신은 한국 패션 시장 전문가입니다. 다음 패션 스타일에 대한 설명을 바탕으로, 현재 **한국 온라인 쇼핑몰(예: Musinsa, 29CM, WConcept, SSF Shop 등)**에서 실제로 판매 중인 상품 5개로 구성된 목록을 만들어주세요.

            **스타일 설명:** "${description}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            brand: { type: Type.STRING },
                            name: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                            imageUrl: { type: Type.STRING, description: "브라우저에서 직접 열 수 있는 실제 이미지 파일의 전체 URL (.jpg, .png 등)" },
                            recommendedSize: { type: Type.STRING },
                            productUrl: { type: Type.STRING },
                            storeName: { type: Type.STRING },
                            category: { type: Type.STRING, enum: Object.values(ProductCategory) }
                        },
                        required: ["brand", "name", "price", "imageUrl", "productUrl", "storeName", "category"]
                    }
                }
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            console.error("Gemini did not return parsable JSON for products:", response.text);
            return [];
        }
        return JSON.parse(jsonText);

    } catch (e) {
        console.error("Gemini로부터 JSON 파싱 실패:", e);
        throw new Error("상품 정보를 가져올 수 없습니다.");
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
  } catch (error) {
    console.error(`'${productName}' 크롭 이미지 생성 중 오류:`, error);
    return '';
  }
};
