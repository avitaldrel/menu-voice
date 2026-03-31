import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMenuExtraction } from '@/hooks/useMenuExtraction';
import type { AppAction } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

// Mock dependencies
vi.mock('@/lib/image-utils', () => ({
  resizeImage: vi.fn().mockResolvedValue('base64encodeddata'),
}));

vi.mock('@/lib/indexeddb', () => ({
  saveSession: vi.fn().mockResolvedValue(42),
}));

const mockMenu: Menu = {
  restaurantName: 'Test Place',
  menuType: 'lunch',
  categories: [],
  extractionConfidence: 0.85,
  warnings: [],
};

describe('useMenuExtraction', () => {
  let dispatch: React.Dispatch<AppAction>;

  beforeEach(() => {
    dispatch = vi.fn() as unknown as React.Dispatch<AppAction>;
    vi.clearAllMocks();
  });

  it('dispatches FILES_SELECTED immediately on extract call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMenu),
    });

    const { result } = renderHook(() => useMenuExtraction(dispatch));

    const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.extract([file]);
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'FILES_SELECTED',
      fileCount: 1,
    });
  });

  it('dispatches EXTRACTION_SUCCESS on successful API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMenu),
    });

    const { result } = renderHook(() => useMenuExtraction(dispatch));

    const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.extract([file]);
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXTRACTION_SUCCESS',
        menu: mockMenu,
        sessionId: 42,
      })
    );
  });

  it('calls fetch with /api/menu/extract endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMenu),
    });

    const { result } = renderHook(() => useMenuExtraction(dispatch));

    const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.extract([file]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/menu/extract',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('dispatches EXTRACTION_ERROR on failed API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'AI extraction failed' }),
    });

    const { result } = renderHook(() => useMenuExtraction(dispatch));

    const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.extract([file]);
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXTRACTION_ERROR',
      })
    );
  });

  describe('quality detection', () => {
    it('dispatches EXTRACTION_LOW_QUALITY (not EXTRACTION_SUCCESS) when extractionConfidence < 0.3 and empty warnings', async () => {
      const lowConfidenceMenu: Menu = { ...mockMenu, extractionConfidence: 0.2, warnings: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(lowConfidenceMenu),
      });

      const { result } = renderHook(() => useMenuExtraction(dispatch));
      const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.extract([file]);
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACTION_LOW_QUALITY' })
      );
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACTION_SUCCESS' })
      );
    });

    it('dispatches EXTRACTION_LOW_QUALITY with guidance containing "difficult to read" when confidence < 0.3', async () => {
      const lowConfidenceMenu: Menu = { ...mockMenu, extractionConfidence: 0.2, warnings: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(lowConfidenceMenu),
      });

      const { result } = renderHook(() => useMenuExtraction(dispatch));
      const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.extract([file]);
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXTRACTION_LOW_QUALITY',
          guidance: expect.stringContaining('difficult to read'),
        })
      );
    });

    it('dispatches EXTRACTION_LOW_QUALITY when extractionConfidence=0.9 and warnings present, with warning in guidance', async () => {
      const warningsMenu: Menu = { ...mockMenu, extractionConfidence: 0.9, warnings: ['Page 2 was blurry'] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(warningsMenu),
      });

      const { result } = renderHook(() => useMenuExtraction(dispatch));
      const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.extract([file]);
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXTRACTION_LOW_QUALITY',
          guidance: expect.stringContaining('Page 2 was blurry'),
        })
      );
    });

    it('dispatches EXTRACTION_SUCCESS (normal flow) when confidence=0.9 and empty warnings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMenu),
      });

      const { result } = renderHook(() => useMenuExtraction(dispatch));
      const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.extract([file]);
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXTRACTION_SUCCESS' })
      );
    });

    it('passes attemptCount=2 when extract called with attemptCount=2', async () => {
      const lowConfidenceMenu: Menu = { ...mockMenu, extractionConfidence: 0.2, warnings: [] };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(lowConfidenceMenu),
      });

      const { result } = renderHook(() => useMenuExtraction(dispatch));
      const file = new File(['fake'], 'menu.jpg', { type: 'image/jpeg' });
      await act(async () => {
        await result.current.extract([file], 2);
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXTRACTION_LOW_QUALITY',
          attemptCount: 2,
        })
      );
    });
  });
});
