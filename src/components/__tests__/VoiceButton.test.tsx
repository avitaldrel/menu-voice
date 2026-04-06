import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceButton } from '@/components/VoiceButton';
import type { VoiceState } from '@/lib/voice-state';

describe('VoiceButton', () => {
  it('has correct aria-label for idle state', () => {
    render(<VoiceButton status="idle" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Tap to start listening'
    );
  });

  it('has correct aria-label for listening state', () => {
    render(<VoiceButton status="listening" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Listening for your question. Tap to stop.'
    );
  });

  it('has correct aria-label for processing state', () => {
    render(<VoiceButton status="processing" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Thinking. Please wait.'
    );
  });

  it('has correct aria-label for speaking state', () => {
    render(<VoiceButton status="speaking" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Speaking your answer. Tap to stop.'
    );
  });

  it('has correct aria-label for error state', () => {
    render(<VoiceButton status="error" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Error occurred. Tap to try again.'
    );
  });

  it('calls onTap when clicked', async () => {
    const onTap = vi.fn();
    render(<VoiceButton status="idle" onTap={onTap} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('is disabled during processing state', () => {
    render(<VoiceButton status="processing" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is not disabled during idle state', () => {
    render(<VoiceButton status="idle" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('is not disabled during listening state', () => {
    render(<VoiceButton status="listening" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('has bg-accent class for idle state (D-01 teal accent)', () => {
    render(<VoiceButton status="idle" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('bg-accent');
  });

  it('has bg-muted class for processing state (warm muted)', () => {
    render(<VoiceButton status="processing" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('bg-muted');
  });

  it('has bg-muted class for error state (warm muted, subdued)', () => {
    render(<VoiceButton status="error" onTap={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('bg-muted');
  });

  it('respects explicit disabled prop', () => {
    render(<VoiceButton status="idle" onTap={vi.fn()} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders inline SVG mic icon with aria-hidden', () => {
    const { container } = render(<VoiceButton status="idle" onTap={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('has 128px circle classes (w-32 h-32 rounded-full)', () => {
    render(<VoiceButton status="idle" onTap={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-32');
    expect(button).toHaveClass('h-32');
    expect(button).toHaveClass('rounded-full');
  });
});
