'use client';

import { useReducer, useCallback, useEffect } from 'react';
import { appReducer, type AppState } from '@/lib/app-state';
import { useMenuExtraction } from '@/hooks/useMenuExtraction';
import { useVoiceLoop } from '@/hooks/useVoiceLoop';
import { ScanButton } from '@/components/ScanButton';
import { ProcessingState } from '@/components/ProcessingState';
import { ErrorState } from '@/components/ErrorState';
import { MenuSummary } from '@/components/MenuSummary';
import { RecentSessions } from '@/components/RecentSessions';
import { VoiceButton } from '@/components/VoiceButton';
import { VoiceStateIndicator } from '@/components/VoiceStateIndicator';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';
import { MicPermissionPrompt } from '@/components/MicPermissionPrompt';
import { TextInputFallback } from '@/components/TextInputFallback';

const initialState: AppState = { status: 'idle' };

export default function HomePage() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { extract } = useMenuExtraction(dispatch);
  const {
    voiceState,
    startListening,
    stopListening,
    handleTextInput,
    isSupported,
    needsPermissionPrompt,
    dismissPermissionPrompt,
    transcript,
    response,
  } = useVoiceLoop();

  // Map mic button taps to voice state transitions per UI-SPEC State Machine Interaction Contract
  const handleMicTap = useCallback(() => {
    switch (voiceState.status) {
      case 'idle':
      case 'error':
        startListening();
        break;
      case 'listening':
      case 'speaking':
        stopListening();
        break;
      // processing: button is disabled, no-op
    }
  }, [voiceState.status, startListening, stopListening]);

  // D-01: Auto-start listening when app enters results state and voice is supported.
  // Phase 2 approximation: triggers on results state entry.
  // Phase 3 will refine this to trigger after the menu overview TTS has finished speaking (MENU-05).
  useEffect(() => {
    if (state.status === 'results' && isSupported && voiceState.status === 'idle') {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, isSupported]);
  // Note: intentionally omit voiceState.status and startListening from deps —
  // we only want this to fire on app state transition to 'results', not on every voice state change.

  return (
    <div className="max-w-lg mx-auto">
      {/* D-01: Screen reader announcement for the landing page */}
      <h1 className="sr-only">MenuVoice. Tap Scan Menu to photograph a restaurant menu.</h1>

      {/* ProcessingState ARIA live region — ALWAYS in DOM (prevents screen reader re-mount issues) */}
      <ProcessingState
        isVisible={state.status === 'processing'}
        message={
          state.status === 'processing'
            ? `Reading your menu... (${state.fileCount} ${state.fileCount === 1 ? 'photo' : 'photos'})`
            : ''
        }
      />

      {/* VoiceStateIndicator ARIA live region — ALWAYS in DOM (A11Y-06: announces state changes) */}
      <VoiceStateIndicator status={voiceState.status} />

      {/* Idle state: scan button + recent sessions */}
      {state.status === 'idle' && (
        <div className="flex flex-col items-center gap-6 pt-8">
          <div className="w-full max-w-sm">
            <ScanButton onFilesSelected={extract} />
          </div>
          <RecentSessions />
        </div>
      )}

      {/* Results state: menu summary + voice interface + scan again button */}
      {state.status === 'results' && (
        <div className="space-y-6">
          <MenuSummary menu={state.menu} />

          {/* Voice interface section */}
          <div className="space-y-4">
            {/* Mic permission pre-prompt (shown once before browser dialog) */}
            {needsPermissionPrompt && isSupported && (
              <MicPermissionPrompt onDismiss={dismissPermissionPrompt} />
            )}

            {/* Microphone button — centered, maps taps to voice state machine */}
            <div className="flex flex-col items-center gap-4 py-6">
              <VoiceButton
                status={voiceState.status}
                onTap={handleMicTap}
                disabled={voiceState.status === 'processing'}
              />
            </div>

            {/* Transcript display — shows question and streaming response */}
            <TranscriptDisplay
              userTranscript={transcript}
              assistantResponse={response}
            />

            {/* Firefox / no Web Speech API fallback */}
            {!isSupported && (
              <TextInputFallback onSubmit={handleTextInput} />
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <ScanButton
              onFilesSelected={extract}
              disabled={false}
            />
          </div>
        </div>
      )}

      {/* Error state: error message + retry */}
      {state.status === 'error' && (
        <ErrorState
          message={state.message}
          onRetry={() => dispatch({ type: 'RETRY' })}
        />
      )}
    </div>
  );
}
