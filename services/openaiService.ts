// OpenAI GPT-4 Vision API 서비스

const DEBUG = Boolean((import.meta as any).env?.VITE_DEBUG);
const openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;

export interface OpenAIStyleResult {
  imageBase64?: string;
  description: string;
  model: string;
}

interface OpenAIImageAnalysisResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export const generateStyleWithOpenAI = async (
  imageBase64: string,
  imageMimeType: string,
  prompt: string
): Promise<OpenAIStyleResult> => {
  if (!openaiApiKey || openaiApiKey === 'dummy-key') {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. VITE_OPENAI_API_KEY 환경변수를 확인해 주세요.');
  }

  if (DEBUG) {
    console.log('[openaiService] Starting style generation with OpenAI GPT-4 Vision', {
      hasImage: !!imageBase64,
      imageSize: imageBase64?.length || 0,
      mimeType: imageMimeType,
      promptLength: prompt.length,
      apiKeyPresent: !!openaiApiKey
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4 Omni (latest vision model)
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `이미지를 분석하여 다음 스타일 요청에 맞는 패션 코디네이션을 생성해주세요:

**사용자 요청**: ${prompt}

**작업 지침**:
1. 제공된 이미지의 인물을 분석하세요 (체형, 피부톤, 얼굴 특징 등)
2. 사용자의 스타일 요청을 고려하여 적합한 의상을 제안하세요
3. 구체적인 아이템명, 색상, 스타일링 팁을 포함하세요
4. 한국의 패션 트렌드를 반영하세요

**출력 형식**:
상세한 스타일링 설명을 200-300자로 작성해주세요. 구체적인 아이템과 색상, 코디네이션 방법을 포함하세요.

참고: OpenAI GPT-4는 이미지 생성이 불가능하므로, 텍스트 기반 상세 설명만 제공합니다.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 요청 실패: ${response.status} ${errorText}`);
    }

    const data: OpenAIImageAnalysisResponse = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('OpenAI API 응답 형식이 올바르지 않습니다.');
    }

    const description = data.choices[0].message.content;

    if (DEBUG) {
      console.log('[openaiService] Style generation completed successfully');
    }

    return {
      description: `OpenAI GPT-4 Vision 분석 결과: ${description}`,
      model: 'gpt-4o'
    };

  } catch (error) {
    if (DEBUG) {
      console.error('[openaiService] Style generation failed:', error);
    }

    // 특정 오류 처리
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message).toLowerCase();
      if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        throw new Error('OpenAI API 키가 유효하지 않습니다. VITE_OPENAI_API_KEY를 확인해 주세요.');
      }
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        throw new Error('OpenAI API 사용량이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
      }
      if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
        throw new Error('OpenAI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }

    throw new Error('OpenAI를 통한 스타일 분석에 실패했습니다. 다시 시도해 주세요.');
  }
};

export const validateOpenAIConfig = (): boolean => {
  return !!(openaiApiKey && openaiApiKey !== 'dummy-key');
};