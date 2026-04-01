'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
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
import { RetakeGuidance } from '@/components/RetakeGuidance';
import { AppStateAnnouncer } from '@/components/AppStateAnnouncer';

const initialState: AppState = { status: 'welcome' };

export default function HomePage() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { extract } = useMenuExtraction(dispatch);
  const menu = state.status === 'results' ? state.menu : null;
  const handleVoiceRetake = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
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
    triggerOverview,
    speakWelcome,
  } = useVoiceLoop(menu, handleVoiceRetake);

  // Hidden file input ref for auto-opening camera after welcome TTS
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Welcome screen: big button tap → mic on + TTS speaks → camera auto-opens
  const handleStart = useCallback(() => {
    dispatch({ type: 'START' });
    startListening();
    // Speak the prompt, then auto-open camera when done
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Welcome to MenuVoice. Please take a picture of the menu.' }),
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
          cameraInputRef.current?.click();
        };
        audio.play();
      })
      .catch(() => {
        // Fallback: browser speech then open camera
        const utterance = new SpeechSynthesisUtterance('Welcome to MenuVoice. Please take a picture of the menu.');
        utterance.onend = () => cameraInputRef.current?.click();
        speechSynthesis.speak(utterance);
      });
  }, []);

  // Handle files from the auto-opened camera
  const handleCameraFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      extract(files);
    }
    e.target.value = '';
  }, [extract]);

  // Periodic TTS reminder during menu extraction so the user knows the app is still working
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (state.status === 'processing') {
      processingIntervalRef.current = setInterval(() => {
        const utterance = new SpeechSynthesisUtterance('Still reading your menu, one moment please.');
        utterance.rate = 1.1;
        speechSynthesis.speak(utterance);
      }, 12000);
    } else {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    }
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    };
  }, [state.status]);

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

  // A11Y-01: Welcome TTS on first user gesture — chained to the first ScanButton tap
  // in idle state to satisfy iOS Safari autoplay policy (audio requires user gesture).
  // speakWelcome is a one-shot — subsequent taps to extract do not repeat the welcome.
  const handleIdleScan = useCallback((files: File[]) => {
    speakWelcome();
    extract(files);
  }, [speakWelcome, extract]);

  // Voice listener for retake state — listens for "retake" or "continue" after TTS prompt
  const handleRetakeVoiceListen = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spoken = event.results[0][0].transcript.toLowerCase();
      if (/retake|re-take|take again|new photo|new picture|scan again/.test(spoken)) {
        dispatch({ type: 'RETRY_CAPTURE' });
      } else if (/continue|proceed|go ahead|what i have|keep going/.test(spoken)) {
        dispatch({ type: 'PROCEED_ANYWAY' });
      }
    };
    recognition.start();
  }, []);

  // MENU-04: Retake handler — increments attemptCount on each retry cycle
  const handleRetake = useCallback((files: File[]) => {
    const attemptCount = state.status === 'retake' ? state.attemptCount + 1 : 1;
    extract(files, attemptCount);
  }, [state, extract]);

  // MENU-05: Proactive overview — triggered once when app enters results state.
  // Replaces Phase 2 D-01 auto-start. Voice loop begins listening automatically
  // after overview TTS finishes (PLAYBACK_ENDED -> listening via state machine).
  useEffect(() => {
    if (state.status === 'results' && voiceState.status === 'idle') {
      triggerOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Tap anywhere on screen to interrupt TTS when speaking
  const handleScreenTap = useCallback(() => {
    if (voiceState.status === 'speaking') {
      stopListening();
      // Brief pause then start listening so user can speak
      setTimeout(() => startListening(), 300);
    }
  }, [voiceState.status, stopListening, startListening]);

  return (
    <div onPointerDown={handleScreenTap}>
      {/* D-01: Screen reader announcement for the landing page */}
      <h1 className="sr-only">MenuVoice. Tap Start to begin.</h1>

      {/* AppStateAnnouncer ARIA live region — ALWAYS in DOM (announces processing/results transitions) */}
      <AppStateAnnouncer appState={state} />

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

      {/* Hidden camera input for auto-open after welcome TTS */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleCameraFiles}
      />

      {/* Welcome state: one giant start button */}
      {state.status === 'welcome' && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <button
            onClick={handleStart}
            className="w-full max-w-md min-h-[200px] text-4xl font-bold bg-accent text-accent-foreground rounded-3xl shadow-2xl active:scale-[0.97] active:bg-accent-hover transition-all focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
            aria-label="Scan My Menu — tap to begin"
          >
            Scan My Menu
          </button>
        </div>
      )}

      {/* Idle state: waiting for camera — shows scan button as fallback */}
      {state.status === 'idle' && (
        <div className="flex flex-col items-center gap-8 pt-12">
          <div className="text-center space-y-2">
            <p className="text-2xl font-semibold">Take a photo of your menu</p>
            <p className="text-muted-foreground">Point your camera at the menu and snap a picture</p>
          </div>
          <div className="w-full max-w-sm">
            <ScanButton onFilesSelected={handleIdleScan} />
          </div>
        </div>
      )}

      {/* Results state: menu summary + voice interface + scan again button */}
      {state.status === 'results' && (
        <div className="space-y-6">
          {/* D-15: Cap MenuSummary height so VoiceButton stays accessible without scrolling */}
          <div className="max-h-[40vh] overflow-y-auto rounded-xl">
            <MenuSummary menu={state.menu} />
          </div>

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

          <div className="pt-4 border-t border-muted">
            <ScanButton
              onFilesSelected={extract}
              disabled={false}
              variant="secondary"
              label="Scan New Menu"
            />
          </div>
        </div>
      )}

      {/* Retake state: guided retake UI with ARIA alert, ScanButton, and conditional proceed button */}
      {state.status === 'retake' && (
        <RetakeGuidance
          guidance={state.guidance}
          attemptCount={state.attemptCount}
          onRetake={handleRetake}
          onProceed={() => dispatch({ type: 'PROCEED_ANYWAY' })}
          onVoiceResponse={handleRetakeVoiceListen}
        />
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
