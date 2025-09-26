import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock NanoBanana fallback
const nanoResult = { styledImageBase64: 'AAA', description: 'nano ok' };
vi.mock('./nanoBananaModel', () => ({
  generateStyle: vi.fn(async () => nanoResult),
}));

// Mock AI unified service to throw a quota error so provider falls back
vi.mock('./aiStyleService', () => ({
  generateStyleWithFallback: vi.fn(async () => {
    const err: any = new Error('quota exceeded');
    err.code = 429;
    throw err;
  }),
}));

describe('styleProvider.generateStyle fallback', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('falls back to NanoBanana on quota error', async () => {
    const mod = await import('./styleProvider');
    const res = await mod.generateStyle('imgbase64', 'image/jpeg', 'prompt');
    expect(res.description).toBe('nano ok');
    expect(res.styledImageBase64).toBe('AAA');
  });
});

