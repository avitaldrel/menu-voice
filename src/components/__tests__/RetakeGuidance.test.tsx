import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetakeGuidance } from '@/components/RetakeGuidance';

// Mock ScanButton to simplify file input interactions
vi.mock('@/components/ScanButton', () => ({
  ScanButton: ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => (
    <button
      onClick={() => onFilesSelected([new File([''], 'menu.jpg', { type: 'image/jpeg' })])}
    >
      Scan Menu
    </button>
  ),
}));

describe('RetakeGuidance', () => {
  const defaultProps = {
    guidance: 'The photo was blurry',
    attemptCount: 1,
    onRetake: vi.fn(),
    onProceed: vi.fn(),
  };

  it('renders a div with role="alert" and aria-atomic="true"', () => {
    render(<RetakeGuidance {...defaultProps} />);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.getAttribute('aria-atomic')).toBe('true');
  });

  it('the role="alert" div has className containing "sr-only"', () => {
    render(<RetakeGuidance {...defaultProps} />);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl?.className).toContain('sr-only');
  });

  it('shows the guidance text when attemptCount is 1 (no prefix)', () => {
    render(<RetakeGuidance {...defaultProps} />);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl?.textContent).toBe('The photo was blurry');
  });

  it('shows "Attempt 2:" prefix when attemptCount is 2 (deduplication for VoiceOver iOS)', () => {
    render(<RetakeGuidance {...defaultProps} attemptCount={2} />);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl?.textContent).toBe('Attempt 2: The photo was blurry');
  });

  it('renders a ScanButton (verify by finding the "Scan Menu" button text)', () => {
    render(<RetakeGuidance {...defaultProps} />);
    expect(screen.getByText('Scan Menu')).toBeTruthy();
  });

  it('does NOT render a "Proceed with what I have" button when attemptCount is 1', () => {
    render(<RetakeGuidance {...defaultProps} attemptCount={1} />);
    expect(screen.queryByText('Proceed with what I have')).toBeNull();
  });

  it('DOES render a "Proceed with what I have" button when attemptCount is 2', () => {
    render(<RetakeGuidance {...defaultProps} attemptCount={2} />);
    expect(screen.getByText('Proceed with what I have')).toBeTruthy();
  });

  it('DOES render a "Proceed with what I have" button when attemptCount is 3', () => {
    render(<RetakeGuidance {...defaultProps} attemptCount={3} />);
    expect(screen.getByText('Proceed with what I have')).toBeTruthy();
  });

  it('the "Proceed with what I have" button has aria-label="Proceed with partial menu data"', () => {
    render(<RetakeGuidance {...defaultProps} attemptCount={2} />);
    const btn = screen.getByText('Proceed with what I have');
    expect(btn.getAttribute('aria-label')).toBe('Proceed with partial menu data');
  });

  it('visible guidance panel has className containing "text-yellow-800" and "bg-yellow-50"', () => {
    render(<RetakeGuidance {...defaultProps} />);
    const panel = document.querySelector('.text-yellow-800.bg-yellow-50');
    expect(panel).not.toBeNull();
  });

  it('onRetake callback fires when ScanButton files selected', () => {
    const onRetake = vi.fn();
    render(<RetakeGuidance {...defaultProps} onRetake={onRetake} />);
    fireEvent.click(screen.getByText('Scan Menu'));
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(onRetake).toHaveBeenCalledWith(expect.any(Array));
  });

  it('onProceed callback fires when "Proceed with what I have" button clicked', () => {
    const onProceed = vi.fn();
    render(<RetakeGuidance {...defaultProps} attemptCount={2} onProceed={onProceed} />);
    fireEvent.click(screen.getByText('Proceed with what I have'));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});
