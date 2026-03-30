'use client';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-8 px-4"
    >
      <p className="text-lg font-medium text-red-700 text-center">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="min-h-[48px] px-6 text-lg font-semibold bg-black text-white rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black active:bg-gray-800 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
