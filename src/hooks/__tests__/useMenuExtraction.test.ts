import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMenuExtraction } from '@/hooks/useMenuExtraction';
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
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatch = vi.fn();
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
});
