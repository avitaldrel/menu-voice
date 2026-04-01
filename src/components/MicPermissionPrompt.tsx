'use client';

interface MicPermissionPromptProps {
  onDismiss: () => void;
}

export function MicPermissionPrompt({ onDismiss }: MicPermissionPromptProps) {
  return (
    <div
      role="status"
      className="bg-muted border border-muted rounded-lg p-4 text-base"
    >
      <p>
        MenuVoice needs your microphone to hear your questions. When prompted, tap Allow.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 min-h-[48px] px-6 text-lg font-semibold bg-accent text-accent-foreground rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-accent-hover transition-colors"
      >
        Got it, continue
      </button>
    </div>
  );
}
