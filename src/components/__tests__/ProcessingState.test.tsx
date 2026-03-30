import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProcessingState } from '@/components/ProcessingState';

describe('ProcessingState', () => {
  it('always renders a div with role="status" even when not visible', () => {
    render(<ProcessingState isVisible={false} message="" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('role="status" div has aria-live="polite"', () => {
    render(<ProcessingState isVisible={false} message="" />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveAttribute('aria-live', 'polite');
  });

  it('when isVisible=true, shows message in status div', () => {
    render(<ProcessingState isVisible={true} message="Reading your menu..." />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveTextContent('Reading your menu...');
  });

  it('when isVisible=false, status div content is empty', () => {
    render(<ProcessingState isVisible={false} message="Reading your menu..." />);
    const statusDiv = screen.getByRole('status');
    expect(statusDiv).toHaveTextContent('');
  });

  it('shows visual spinner when visible', () => {
    const { container } = render(<ProcessingState isVisible={true} message="Loading" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('hides visual spinner when not visible', () => {
    const { container } = render(<ProcessingState isVisible={false} message="" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });
});
