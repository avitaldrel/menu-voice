'use client';

import { useState, useEffect } from 'react';

const PROCESSING_MESSAGES = [
  'Reading your menu...',
  'Finding categories...',
  'Almost done...',
  'Just a moment...',
];

interface ProcessingStateProps {
  isVisible: boolean;
  message: string;
}

export function ProcessingState({ isVisible, message }: ProcessingStateProps) {
  const [currentMessage, setCurrentMessage] = useState(PROCESSING_MESSAGES[0]);

  useEffect(() => {
    if (isVisible) {
      // Reset to first message when becoming visible
      setCurrentMessage(PROCESSING_MESSAGES[0]);
      // Cycle through messages every 4 seconds
      let index = 0;
      const id = setInterval(() => {
        index = (index + 1) % PROCESSING_MESSAGES.length;
        setCurrentMessage(PROCESSING_MESSAGES[index]);
      }, 4000);
      return () => clearInterval(id);
    }
  }, [isVisible]);

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
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium transition-opacity duration-300 ease-in-out animate-pulse">
            {currentMessage}
          </p>
        </div>
      )}
    </>
  );
}
