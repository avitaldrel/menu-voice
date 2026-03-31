'use client';

import { ScanButton } from '@/components/ScanButton';

interface RetakeGuidanceProps {
  guidance: string;
  attemptCount: number;
  onRetake: (files: File[]) => void;
  onProceed: () => void;
}

export function RetakeGuidance({ guidance, attemptCount, onRetake, onProceed }: RetakeGuidanceProps) {
  // Deduplication prefix for VoiceOver iOS (RESEARCH.md Pitfall 3 — content must change per announcement)
  const announcementText = attemptCount > 1 ? `Attempt ${attemptCount}: ${guidance}` : guidance;

  return (
    <div className="flex flex-col gap-4 py-6">
      {/* ARIA alert — always in DOM, assertive announcement (role=alert implies assertive, no explicit aria-live to avoid VoiceOver iOS double-speak) */}
      <div
        role="alert"
        aria-atomic="true"
        className="sr-only"
      >
        {announcementText}
      </div>

      {/* Visible guidance panel */}
      <p className="text-base text-yellow-800 bg-yellow-50 rounded-lg p-4">{guidance}</p>

      {/* Retake button */}
      <ScanButton onFilesSelected={onRetake} />

      {/* Conditional proceed button — shown after 2+ attempts */}
      {attemptCount >= 2 && (
        <button
          onClick={onProceed}
          aria-label="Proceed with partial menu data"
          className="min-h-[48px] px-6 text-xl font-semibold bg-gray-700 text-white rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Proceed with what I have
        </button>
      )}
    </div>
  );
}
