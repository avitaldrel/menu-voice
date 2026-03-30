import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

// Note: We test Header separately since RootLayout is a Server Component
// that wraps <html><body> which cannot be rendered in jsdom.
// The skip-link and layout structure are verified via acceptance criteria grep checks.

describe('Header', () => {
  it('renders "MenuVoice" text', () => {
    render(<Header />);
    expect(screen.getByText('MenuVoice')).toBeInTheDocument();
  });

  it('has role="banner"', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('has settings link with aria-label="Settings"', () => {
    render(<Header />);
    const link = screen.getByLabelText('Settings');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('settings icon is hidden from screen readers', () => {
    const { container } = render(<Header />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
