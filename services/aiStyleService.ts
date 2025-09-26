// 통합 AI 스타일 생성 서비스 (Gemini + OpenAI fallback)
import { generateStyle as generateWithGemini } from './geminiService';
import { generateStyleWithOpenAI, validateOpenAIConfig } from './openaiService';
import { saveModelUsage, StyleGenerationResult } from './modelTrackingService';

const DEBUG = true; // 타임아웃 디버깅을 위해 임시 활성화

export interface AIStyleResult {
  styledImageBase64?: string;
  description: string;
  model: string;
  provider: 'gemini' | 'openai';
}

/**
 * 통합 스타일 생성 함수
 * 1차: Gemini API 시도
 * 2차: OpenAI GPT-4 Vision fallback
 */
export const generateStyleWithFallback = async (
  imageBase64: string,
  imageMimeType: string,
  prompt: string
): Promise<AIStyleResult> => {
  const startTime = Date.now();

  if (DEBUG) {
    console.log('[aiStyleService] Starting AI style generation with fallback:', {
      hasImage: !!imageBase64,
      imageSize: imageBase64?.length || 0,
      mimeType: imageMimeType,
      promptLength: prompt?.length || 0,
      openAIAvailable: validateOpenAIConfig()
    });
  }

  // 1차 시도: Gemini API
  try {
    if (DEBUG) console.log('[aiStyleService] Attempting Gemini first...');

    const geminiResult = await generateWithGemini(imageBase64, imageMimeType, prompt);
    const responseTime = Date.now() - startTime;

    // 성공 기록 저장
    await saveModelUsage({
      model_provider: 'gemini',
      model_name: 'gemini-2.5-flash-image-preview',
      prompt_text: prompt,
      image_size: imageBase64?.length || 0,
      success: true,
      response_time_ms: responseTime
    }).catch(() => {}); // 저장 실패는 무시

    if (DEBUG) {
      console.log('[aiStyleService] Gemini generation succeeded', { responseTime });
    }

    return {
      styledImageBase64: geminiResult.styledImageBase64,
      description: geminiResult.description,
      model: 'gemini-2.5-flash-image-preview',
      provider: 'gemini'
    };

  } catch (geminiError) {
    const responseTime = Date.now() - startTime;

    if (DEBUG) {
      console.warn('[aiStyleService] Gemini generation failed:', geminiError);
    }

    // 실패 기록 저장
    await saveModelUsage({
      model_provider: 'gemini',
      model_name: 'gemini-2.5-flash-image-preview',
      prompt_text: prompt,
      image_size: imageBase64?.length || 0,
      success: false,
      error_message: geminiError instanceof Error ? geminiError.message : String(geminiError),
      response_time_ms: responseTime
    }).catch(() => {}); // 저장 실패는 무시

    // 타임아웃 및 폴백 가능 오류 확인
    const isTimeoutError = geminiError instanceof Error && geminiError.message === 'timeout';
    const isRetriableError = !geminiError ||
      isTimeoutError ||
      (typeof geminiError === 'object' && (
        String(geminiError).toLowerCase().includes('timeout') ||
        String(geminiError).toLowerCase().includes('네트워크') ||
        String(geminiError).toLowerCase().includes('connection') ||
        String(geminiError).toLowerCase().includes('fetch')
      ));

    // 재시도하지 않을 오류들 (즉시 throw) - API 키나 콘텐츠 정책 위반
    if (!isRetriableError && geminiError && typeof geminiError === 'object' && 'message' in geminiError) {
      const errorMessage = String(geminiError.message).toLowerCase();
      if (errorMessage.includes('api 키') || errorMessage.includes('unauthorized')) {
        throw geminiError; // API 키 오류는 fallback 없이 즉시 실패
      }
      if (errorMessage.includes('콘텐츠 정책') || errorMessage.includes('content')) {
        throw geminiError; // 콘텐츠 정책 위반은 fallback 없이 즉시 실패
      }
    }

    if (DEBUG) {
      console.log('[aiStyleService] Error analysis:', {
        isTimeoutError,
        isRetriableError,
        errorType: geminiError?.constructor?.name,
        errorMessage: geminiError instanceof Error ? geminiError.message : String(geminiError)
      });
    }

    // 2차 시도: OpenAI GPT-4 Vision fallback
    if (validateOpenAIConfig()) {
      try {
        if (DEBUG) console.log('[aiStyleService] Falling back to OpenAI...');

        const fallbackStartTime = Date.now();
        const openaiResult = await generateStyleWithOpenAI(imageBase64, imageMimeType, prompt);
        const fallbackResponseTime = Date.now() - fallbackStartTime;

        // 성공 기록 저장
        await saveModelUsage({
          model_provider: 'openai',
          model_name: openaiResult.model,
          prompt_text: prompt,
          image_size: imageBase64?.length || 0,
          success: true,
          response_time_ms: fallbackResponseTime
        }).catch(() => {}); // 저장 실패는 무시

        if (DEBUG) {
          console.log('[aiStyleService] OpenAI fallback succeeded', {
            responseTime: fallbackResponseTime,
            model: openaiResult.model
          });
        }

        return {
          styledImageBase64: openaiResult.imageBase64,
          description: openaiResult.description,
          model: openaiResult.model,
          provider: 'openai'
        };

      } catch (openaiError) {
        const fallbackResponseTime = Date.now() - fallbackStartTime;

        if (DEBUG) {
          console.error('[aiStyleService] OpenAI fallback also failed:', openaiError);
        }

        // 실패 기록 저장
        await saveModelUsage({
          model_provider: 'openai',
          model_name: 'gpt-4o',
          prompt_text: prompt,
          image_size: imageBase64?.length || 0,
          success: false,
          error_message: openaiError instanceof Error ? openaiError.message : String(openaiError),
          response_time_ms: fallbackResponseTime
        }).catch(() => {}); // 저장 실패는 무시

        // 모든 AI 시도 실패 시 NanoBanana로 최종 폴백
        console.warn('[aiStyleService] All AI attempts failed, trying NanoBanana fallback...');

        try {
          const { generateStyle: nanoGenerate } = await import('./nanoBananaModel');
          const nanoResult = await nanoGenerate(imageBase64, imageMimeType, prompt);

          console.log('[aiStyleService] NanoBanana fallback succeeded');

          return {
            styledImageBase64: nanoResult.styledImageBase64 || '',
            description: nanoResult.description || '스타일 분석이 완료되었습니다.',
            model: 'nanobanana',
            provider: 'openai' // 타입 호환성
          };
        } catch (nanoError) {
          console.error('[aiStyleService] Even NanoBanana failed:', nanoError);

          // 최종 기본 응답
          return {
            styledImageBase64: '',
            description: '죄송합니다. 현재 AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.',
            model: 'fallback',
            provider: 'openai'
          };
        }
      }
    } else {
      // OpenAI 설정이 없는 경우 바로 NanoBanana로 폴백
      if (DEBUG) console.warn('[aiStyleService] OpenAI not configured, falling back to NanoBanana');

      try {
        const { generateStyle: nanoGenerate } = await import('./nanoBananaModel');
        const nanoResult = await nanoGenerate(imageBase64, imageMimeType, prompt);

        console.log('[aiStyleService] NanoBanana fallback succeeded (no OpenAI)');

        return {
          styledImageBase64: nanoResult.styledImageBase64 || '',
          description: nanoResult.description || '스타일 분석이 완료되었습니다.',
          model: 'nanobanana',
          provider: 'openai' // 타입 호환성
        };
      } catch (nanoError) {
        console.error('[aiStyleService] NanoBanana also failed (no OpenAI):', nanoError);

        // 최종 기본 응답
        return {
          styledImageBase64: '',
          description: '죄송합니다. 현재 AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.',
          model: 'fallback',
          provider: 'openai'
        };
      }
    }
  }
};

/**
 * 사용 가능한 AI 모델 확인
 */
export const getAvailableProviders = (): Array<'gemini' | 'openai'> => {
  const providers: Array<'gemini' | 'openai'> = [];

  // Gemini API 키 확인
  const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (geminiApiKey && geminiApiKey !== 'dummy-key') {
    providers.push('gemini');
  }

  // OpenAI API 키 확인
  if (validateOpenAIConfig()) {
    providers.push('openai');
  }

  return providers;
};

/**
 * 서비스 상태 확인
 */
export const getServiceStatus = () => {
  const providers = getAvailableProviders();

  return {
    gemini: {
      available: providers.includes('gemini'),
      capabilities: ['image_generation', 'text_analysis']
    },
    openai: {
      available: providers.includes('openai'),
      capabilities: ['text_analysis'] // GPT-4는 이미지 생성 불가
    },
    fallbackEnabled: providers.length > 1
  };
};