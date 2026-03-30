import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInputFallback } from '@/components/TextInputFallback';

describe('TextInputFallback', () => {
  it('renders role="alert" warning container', () => {
    render(<TextInputFallback onSubmit={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the Firefox fallback message in role="alert"', () => {
    render(<TextInputFallback onSubmit={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Voice recognition is not available in this browser.'
    );
  });

  it('renders a text input with placeholder', () => {
    render(<TextInputFallback onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText('Type your question...')
    ).toBeInTheDocument();
  });

  it('renders the submit button labeled "Send Question"', () => {
    render(<TextInputFallback onSubmit={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Send Question' })
    ).toBeInTheDocument();
  });

  it('calls onSubmit with input value when form is submitted', async () => {
    const onSubmit = vi.fn();
    render(<TextInputFallback onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Type your question...');
    await userEvent.type(input, 'What are the vegan options?');
    await userEvent.click(screen.getByRole('button', { name: 'Send Question' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('What are the vegan options?');
  });

  it('calls onSubmit when Enter key is pressed', async () => {
    const onSubmit = vi.fn();
    render(<TextInputFallback onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Type your question...');
    await userEvent.type(input, 'Tell me about the salads{enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('Tell me about the salads');
  });

  it('clears input after submit', async () => {
    render(<TextInputFallback onSubmit={vi.fn()} />);
    const input = screen.getByPlaceholderText('Type your question...');
    await userEvent.type(input, 'Some question');
    await userEvent.click(screen.getByRole('button', { name: 'Send Question' }));
    expect(input).toHaveValue('');
  });

  it('does not call onSubmit when input is empty', async () => {
    const onSubmit = vi.fn();
    render(<TextInputFallback onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Send Question' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit for whitespace-only input', async () => {
    const onSubmit = vi.fn();
    render(<TextInputFallback onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Type your question...');
    await userEvent.type(input, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Send Question' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
