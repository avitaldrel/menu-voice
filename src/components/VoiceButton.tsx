'use client';

import type { VoiceState } from '@/lib/voice-state';

interface VoiceButtonProps {
  status: VoiceState['status'];
  onTap: () => void;
  disabled?: boolean;
}

const ARIA_LABELS: Record<VoiceState['status'], string> = {
  idle: 'Tap to start listening',
  listening: 'Listening for your question. Tap to stop.',
  processing: 'Thinking. Please wait.',
  speaking: 'Speaking your answer. Tap to stop.',
  error: 'Error occurred. Tap to try again.',
};

function getButtonClasses(status: VoiceState['status']): string {
  const base =
    'w-20 h-20 rounded-full flex items-center justify-center ' +
    'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black ' +
    'transition-colors';

  switch (status) {
    case 'idle':
      return `${base} bg-black text-white`;
    case 'listening':
      return `${base} bg-black text-white ring-4 ring-blue-600 ring-offset-2 animate-pulse`;
    case 'processing':
      return `${base} bg-gray-400 text-white`;
    case 'speaking':
      return `${base} bg-gray-400 text-white`;
    case 'error':
      return `${base} bg-gray-200 text-gray-600`;
  }
}

export function VoiceButton({ status, onTap, disabled }: VoiceButtonProps) {
  const isDisabled = disabled || status === 'processing';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-label={ARIA_LABELS[status]}
      className={getButtonClasses(status)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </button>
  );
}
