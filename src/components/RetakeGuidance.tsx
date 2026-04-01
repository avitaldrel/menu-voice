'use client';

import { useEffect, useRef } from 'react';
import { ScanButton } from '@/components/ScanButton';

interface RetakeGuidanceProps {
  guidance: string;
  attemptCount: number;
  onRetake: (files: File[]) => void;
  onProceed: () => void;
  onVoiceResponse?: () => void;
}

export function RetakeGuidance({ guidance, attemptCount, onRetake, onProceed, onVoiceResponse }: RetakeGuidanceProps) {
  // Deduplication prefix for VoiceOver iOS (RESEARCH.md Pitfall 3 — content must change per announcement)
  const announcementText = attemptCount > 1 ? `Attempt ${attemptCount}: ${guidance}` : guidance;

  // Speak the retake guidance + ask "retake or continue?" then listen for voice response
  const spokenRef = useRef(false);
  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true;
      const fullMessage = `${announcementText} Would you like to retake the picture, or continue with what I have?`;
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullMessage }),
      })
        .then(res => {
          if (res.ok) return res.blob();
          throw new Error('TTS failed');
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            // Start listening for voice response after TTS finishes
            if (onVoiceResponse) onVoiceResponse();
          };
          audio.play();
        })
        .catch(() => {
          const utterance = new SpeechSynthesisUtterance(fullMessage);
          utterance.onend = () => {
            if (onVoiceResponse) onVoiceResponse();
          };
          speechSynthesis.speak(utterance);
        });
    }
  }, [announcementText, onVoiceResponse]);

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

      {/* Visible guidance panel — warm warning palette (D-14) */}
      <p className="text-base text-warning-text bg-warning-surface border border-warning-border rounded-xl p-4">{guidance}</p>

      {/* Retake button */}
      <ScanButton onFilesSelected={onRetake} />

      {/* Conditional proceed button — shown after 2+ attempts (subdued secondary per D-04) */}
      {attemptCount >= 2 && (
        <button
          onClick={onProceed}
          aria-label="Proceed with partial menu data"
          className="min-h-[72px] px-6 text-2xl font-semibold bg-muted text-foreground rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Proceed with what I have
        </button>
      )}
    </div>
  );
}
