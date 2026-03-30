import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('renders with role="alert"', () => {
    render(<ErrorState message="Something failed" onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays the error message', () => {
    render(<ErrorState message="Network error occurred" onRetry={vi.fn()} />);
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('renders "Try Again" button', () => {
    render(<ErrorState message="Error" onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('"Try Again" button calls onRetry when clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('retry button has min-h-[48px] class for touch target (A11Y-03)', () => {
    render(<ErrorState message="Error" onRetry={vi.fn()} />);
    const button = screen.getByRole('button', { name: /try again/i });
    expect(button.className).toContain('min-h-[48px]');
  });
});
