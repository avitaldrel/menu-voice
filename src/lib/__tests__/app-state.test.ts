import { describe, it, expect } from 'vitest';
import { appReducer, type AppState } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

const mockMenu: Menu = {
  restaurantName: 'Test Bistro',
  menuType: 'dinner',
  categories: [{
    name: 'Appetizers',
    description: null,
    items: [{
      name: 'Bruschetta',
      description: 'Tomato and basil',
      price: '$8',
      allergens: ['gluten'],
      dietaryFlags: ['vegetarian'],
      modifications: null,
      portionSize: null,
      confidence: 0.95,
    }],
  }],
  extractionConfidence: 0.9,
  warnings: [],
};

describe('appReducer', () => {
  it('transitions from idle to processing on FILES_SELECTED', () => {
    const state: AppState = { status: 'idle' };
    const result = appReducer(state, { type: 'FILES_SELECTED', fileCount: 3 });
    expect(result).toEqual({ status: 'processing', fileCount: 3 });
  });

  it('transitions to results on EXTRACTION_SUCCESS', () => {
    const state: AppState = { status: 'processing', fileCount: 2 };
    const result = appReducer(state, { type: 'EXTRACTION_SUCCESS', menu: mockMenu, sessionId: 1 });
    expect(result.status).toBe('results');
    if (result.status === 'results') {
      expect(result.menu.restaurantName).toBe('Test Bistro');
      expect(result.sessionId).toBe(1);
    }
  });

  it('transitions to error on EXTRACTION_ERROR', () => {
    const state: AppState = { status: 'processing', fileCount: 1 };
    const result = appReducer(state, { type: 'EXTRACTION_ERROR', message: 'API failed' });
    expect(result).toEqual({ status: 'error', message: 'API failed', retryable: true });
  });

  it('transitions back to idle on RETRY', () => {
    const state: AppState = { status: 'error', message: 'fail', retryable: true };
    const result = appReducer(state, { type: 'RETRY' });
    expect(result).toEqual({ status: 'idle' });
  });

  it('transitions back to idle on RESET', () => {
    const state: AppState = { status: 'results', menu: mockMenu, sessionId: 1 };
    const result = appReducer(state, { type: 'RESET' });
    expect(result).toEqual({ status: 'idle' });
  });
});
