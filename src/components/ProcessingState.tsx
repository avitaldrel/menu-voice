'use client';

interface ProcessingStateProps {
  isVisible: boolean;
  message: string;
}

export function ProcessingState({ isVisible, message }: ProcessingStateProps) {
  return (
    <>
      {/* ALWAYS in DOM — content change triggers screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isVisible ? message : ''}
      </div>

      {/* Visual loading indicator — hidden from screen readers */}
      {isVisible && (
        <div
          aria-hidden="true"
          className="flex flex-col items-center gap-3 py-8"
        >
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">{message}</p>
        </div>
      )}
    </>
  );
}
