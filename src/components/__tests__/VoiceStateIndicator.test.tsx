import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceStateIndicator } from '@/components/VoiceStateIndicator';
import type { VoiceState } from '@/lib/voice-state';

describe('VoiceStateIndicator', () => {
  const allStatuses: VoiceState['status'][] = [
    'idle',
    'listening',
    'processing',
    'speaking',
    'error',
  ];

  it('always renders role="status" element in the DOM', () => {
    render(<VoiceStateIndicator status="idle" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each(allStatuses)(
    'role="status" is always in DOM for status "%s"',
    (status) => {
      render(<VoiceStateIndicator status={status} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    }
  );

  it('role="status" has aria-live="polite"', () => {
    render(<VoiceStateIndicator status="idle" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('role="status" has aria-atomic="true"', () => {
    render(<VoiceStateIndicator status="idle" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  it('role="status" has sr-only class', () => {
    render(<VoiceStateIndicator status="idle" />);
    expect(screen.getByRole('status')).toHaveClass('sr-only');
  });

  it('shows "Tap to start listening" for idle status', () => {
    render(<VoiceStateIndicator status="idle" />);
    expect(screen.getByRole('status')).toHaveTextContent('Tap to start listening');
  });

  it('shows "Listening..." for listening status', () => {
    render(<VoiceStateIndicator status="listening" />);
    expect(screen.getByRole('status')).toHaveTextContent('Listening...');
  });

  it('shows "Thinking..." for processing status', () => {
    render(<VoiceStateIndicator status="processing" />);
    expect(screen.getByRole('status')).toHaveTextContent('Thinking...');
  });

  it('shows "Speaking..." for speaking status', () => {
    render(<VoiceStateIndicator status="speaking" />);
    expect(screen.getByRole('status')).toHaveTextContent('Speaking...');
  });

  it('shows "Something went wrong" for error status', () => {
    render(<VoiceStateIndicator status="error" />);
    expect(screen.getByRole('status')).toHaveTextContent('Something went wrong');
  });

  it('shows processing spinner when status is processing', () => {
    const { container } = render(<VoiceStateIndicator status="processing" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not show spinner when status is idle', () => {
    const { container } = render(<VoiceStateIndicator status="idle" />);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('shows speaking dots animation when status is speaking', () => {
    const { container } = render(<VoiceStateIndicator status="speaking" />);
    expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
  });
});
