// Provider-agnostic style generation facade.
// Default: Gemini via geminiService. Optional: NanoBanana model via env flag.
import {
  validatePrompt as geminiValidate,
  generateStyle as geminiGenerate,
  getProductsForStyle as geminiProducts,
  cropImageForProduct as geminiCrop,
  detectGender as geminiDetect,
} from './geminiService';

import {
  validatePrompt as nanoValidate,
  generateStyle as nanoGenerate,
  getProductsForStyle as nanoProducts,
  cropImageForProduct as nanoCrop,
  detectGender as nanoDetect,
} from './nanoBananaModel';

const provider = (import.meta.env.VITE_STYLE_PROVIDER || 'gemini').toLowerCase();
const isNano = provider === 'nanobanana' || provider === 'nano' || provider === 'nb';
const fallbackOnQuota = String(import.meta.env.VITE_FALLBACK_ON_QUOTA || 'true').toLowerCase() !== 'false';

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const status = err.status || err.code || err?.error?.code;
  return (
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate')
  );
}

export const validatePrompt = async (...args: Parameters<typeof geminiValidate>) => {
  if (isNano) return nanoValidate(...args as any);
  try {
    return await geminiValidate(...args as any);
  } catch (e) {
    if (fallbackOnQuota && isQuotaError(e)) {
      console.warn('[styleProvider] Gemini quota error on validatePrompt — falling back to NanoBanana');
      return await nanoValidate(...args as any);
    }
    throw e;
  }
};

export const generateStyle = async (...args: Parameters<typeof geminiGenerate>) => {
  if (isNano) return nanoGenerate(...args as any);

  // 새로운 통합 AI 서비스 사용 (Gemini + OpenAI fallback)
  try {
    const { generateStyleWithFallback } = await import('./aiStyleService');
    const result = await generateStyleWithFallback(...args);

    // 기존 인터페이스와 호환성을 위해 변환
    return {
      styledImageBase64: result.styledImageBase64 || '',
      description: result.description
    };
  } catch (e) {
    if (fallbackOnQuota && isQuotaError(e)) {
      console.warn('[styleProvider] AI services quota error — falling back to NanoBanana');
      const result = await nanoGenerate(...args as any);
      return result;
    }
    throw e;
  }
};

export const getProductsForStyle = async (...args: Parameters<typeof geminiProducts>) => {
  if (isNano) return nanoProducts(...args as any);
  try {
    return await geminiProducts(...args as any);
  } catch (e) {
    if (fallbackOnQuota && isQuotaError(e)) {
      console.warn('[styleProvider] Gemini quota error on getProductsForStyle — falling back to NanoBanana');
      return await nanoProducts(...args as any);
    }
    throw e;
  }
};

export const cropImageForProduct = async (...args: Parameters<typeof geminiCrop>) => {
  if (isNano) return nanoCrop(...args as any);
  try {
    return await geminiCrop(...args as any);
  } catch (e) {
    if (fallbackOnQuota && isQuotaError(e)) {
      console.warn('[styleProvider] Gemini quota error on cropImageForProduct — falling back to NanoBanana');
      return await nanoCrop(...args as any);
    }
    throw e;
  }
};

export const detectGender = async (...args: Parameters<typeof geminiDetect>) => {
  if (isNano) return nanoDetect(...args as any);
  try {
    return await geminiDetect(...args as any);
  } catch (e) {
    if (fallbackOnQuota && isQuotaError(e)) {
      console.warn('[styleProvider] Gemini quota error on detectGender — falling back to NanoBanana');
      return await nanoDetect(...args as any);
    }
    return { gender: 'unknown' } as any;
  }
};
