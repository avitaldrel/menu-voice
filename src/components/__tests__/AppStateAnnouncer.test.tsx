import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppStateAnnouncer } from '@/components/AppStateAnnouncer';
import type { AppState } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

const mockMenu: Menu = {
  restaurantName: 'Test Bistro',
  menuType: 'dinner',
  categories: [],
  extractionConfidence: 0.9,
  warnings: [],
};

const mockMenuNoName: Menu = {
  restaurantName: null,
  menuType: 'dinner',
  categories: [],
  extractionConfidence: 0.9,
  warnings: [],
};

describe('AppStateAnnouncer', () => {
  it('renders a div with role="status"', () => {
    const state: AppState = { status: 'idle' };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    const state: AppState = { status: 'idle' };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-atomic="true"', () => {
    const state: AppState = { status: 'idle' };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  it('always renders div in DOM (never conditionally mounted)', () => {
    const state: AppState = { status: 'idle' };
    const { rerender } = render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<AppStateAnnouncer appState={{ status: 'results', menu: mockMenu, sessionId: 1 }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has className containing sr-only', () => {
    const state: AppState = { status: 'idle' };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').className).toContain('sr-only');
  });

  it('announces "Menu loaded. Test Bistro is ready." when status is results with restaurantName', () => {
    const state: AppState = { status: 'results', menu: mockMenu, sessionId: 1 };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('Menu loaded. Test Bistro is ready.');
  });

  it('announces "Menu loaded. Restaurant menu is ready." when status is results and restaurantName is null', () => {
    const state: AppState = { status: 'results', menu: mockMenuNoName, sessionId: 1 };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('Menu loaded. Restaurant menu is ready.');
  });

  it('announces "Reading your menu, 1 photo." when processing with fileCount 1', () => {
    const state: AppState = { status: 'processing', fileCount: 1 };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('Reading your menu, 1 photo.');
  });

  it('announces "Reading your menu, 3 photos." when processing with fileCount 3', () => {
    const state: AppState = { status: 'processing', fileCount: 3 };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('Reading your menu, 3 photos.');
  });

  it('text content is empty string when status is idle', () => {
    const state: AppState = { status: 'idle' };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('text content is empty string when status is retake (RetakeGuidance handles retake announcements)', () => {
    const state: AppState = {
      status: 'retake',
      menu: mockMenu,
      sessionId: 1,
      attemptCount: 1,
      guidance: 'Please retake the photo.',
    };
    render(<AppStateAnnouncer appState={state} />);
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
