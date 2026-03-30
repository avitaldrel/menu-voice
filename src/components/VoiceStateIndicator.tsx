'use client';

import type { VoiceState } from '@/lib/voice-state';

interface VoiceStateIndicatorProps {
  status: VoiceState['status'];
}

const STATE_LABELS: Record<VoiceState['status'], string> = {
  idle: 'Tap to start listening',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  error: 'Something went wrong — tap to retry',
};

function VisualCue({ status }: { status: VoiceState['status'] }) {
  if (status === 'processing') {
    return (
      <span
        aria-hidden="true"
        className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin align-middle ml-1"
      />
    );
  }

  if (status === 'speaking') {
    return (
      <span aria-hidden="true" className="inline-flex items-center gap-0.5 ml-1 align-middle">
        <span
          className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </span>
    );
  }

  return null;
}

function getLabelClasses(status: VoiceState['status']): string {
  const base = 'text-sm';
  switch (status) {
    case 'listening':
      return `${base} text-blue-600`;
    case 'error':
      return `${base} text-red-700`;
    default:
      return `${base} text-gray-600`;
  }
}

export function VoiceStateIndicator({ status }: VoiceStateIndicatorProps) {
  const label = STATE_LABELS[status];

  return (
    <div>
      {/* ARIA live region — ALWAYS in DOM so screen reader announces state changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {label}
      </div>

      {/* Visible label with visual cue */}
      <p className={getLabelClasses(status)}>
        {label}
        <VisualCue status={status} />
      </p>
    </div>
  );
}
