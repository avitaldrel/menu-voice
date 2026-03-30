'use client';

import { useState } from 'react';

interface TextInputFallbackProps {
  onSubmit: (text: string) => void;
}

export function TextInputFallback({ onSubmit }: TextInputFallbackProps) {
  const [inputValue, setInputValue] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setInputValue('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="alert"
        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
      >
        <p className="text-base">
          Voice recognition is not available in this browser. Try Chrome or Safari for the full experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your question..."
          className="min-h-[48px] px-4 text-base border border-gray-300 rounded-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black"
        />
        <button
          type="submit"
          className="min-h-[48px] px-6 text-lg font-semibold bg-black text-white rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black active:bg-gray-800 transition-colors"
        >
          Send Question
        </button>
      </form>
    </div>
  );
}
