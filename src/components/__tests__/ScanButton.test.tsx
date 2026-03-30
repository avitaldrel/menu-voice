import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScanButton } from '@/components/ScanButton';

describe('ScanButton', () => {
  it('renders a button with text "Scan Menu"', () => {
    render(<ScanButton onFilesSelected={vi.fn()} />);
    expect(screen.getByRole('button', { name: /scan menu/i })).toBeInTheDocument();
  });

  it('button has aria-label containing "Scan Menu"', () => {
    render(<ScanButton onFilesSelected={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Scan Menu'));
  });

  it('contains hidden file input with capture="environment" (MENU-01)', () => {
    const { container } = render(<ScanButton onFilesSelected={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('capture', 'environment');
  });

  it('file input has multiple attribute (MENU-02)', () => {
    const { container } = render(<ScanButton onFilesSelected={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('multiple');
  });

  it('file input has accept="image/*"', () => {
    const { container } = render(<ScanButton onFilesSelected={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('button has min-h-[56px] class for touch target (A11Y-03)', () => {
    render(<ScanButton onFilesSelected={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[56px]');
  });

  it('file input is visually hidden with sr-only and aria-hidden', () => {
    const { container } = render(<ScanButton onFilesSelected={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input?.className).toContain('sr-only');
    expect(input).toHaveAttribute('aria-hidden', 'true');
  });

  it('button can be disabled', () => {
    render(<ScanButton onFilesSelected={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
