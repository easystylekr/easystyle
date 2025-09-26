// Basic unit tests for provider detection and fallback readiness
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock neighbors to avoid loading real SDKs
vi.mock('./openaiService', () => ({
  validateOpenAIConfig: () => false,
}));

vi.mock('./geminiService', () => ({
  generateStyle: vi.fn(),
}));

vi.mock('./modelTrackingService', () => ({
  saveModelUsage: vi.fn(async () => {}),
}));

describe('aiStyleService.getAvailableProviders', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete (process.env as any).API_KEY;
  });

  it('detects gemini when GEMINI_API_KEY is set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const mod = await import('./aiStyleService');
    const providers = mod.getAvailableProviders();
    expect(providers).toContain('gemini');
  });

  it('detects gemini when API_KEY alias is set', async () => {
    (process.env as any).API_KEY = 'alias-key';
    const mod = await import('./aiStyleService');
    const providers = mod.getAvailableProviders();
    expect(providers).toContain('gemini');
  });

  it('returns empty when no keys exist', async () => {
    const mod = await import('./aiStyleService');
    const providers = mod.getAvailableProviders();
    expect(providers).not.toContain('gemini');
  });
});

