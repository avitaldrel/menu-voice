'use client';

import { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import {
  voiceReducer,
  initialVoiceState,
  type VoiceState,
} from '@/lib/voice-state';
import { SpeechManager, isSpeechRecognitionSupported } from '@/lib/speech-recognition';
import { TTSClient } from '@/lib/tts-client';
import { startThinkingChime, stopThinkingChime } from '@/lib/thinking-chime';

export function useVoiceLoop(): {
  voiceState: VoiceState;
  startListening: () => void;
  stopListening: () => void;
  handleTextInput: (text: string) => void;
  isSupported: boolean;
  needsPermissionPrompt: boolean;
  dismissPermissionPrompt: () => void;
  transcript: string;
  response: string;
} {
  const [voiceState, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(true);

  // Refs for SpeechManager and TTSClient instances — lazy creation, SSR safe
  const speechManagerRef = useRef<SpeechManager | null>(null);
  const ttsClientRef = useRef<TTSClient | null>(null);

  // Ref to hold accumulated response text for TranscriptDisplay
  const responseRef = useRef<string>('');
  const [responseText, setResponseText] = useState('');

  // isSupported is stable — evaluated once (SSR safe)
  const isSupported = isSpeechRecognitionSupported();

  // Derived values from voiceState for easy consumption
  const transcript =
    voiceState.status === 'listening' ||
    voiceState.status === 'processing' ||
    voiceState.status === 'speaking'
      ? voiceState.transcript
      : '';

  const response =
    voiceState.status === 'speaking' ? voiceState.response : responseText;

  /**
   * Trigger TTS response with the given transcript.
   * Phase 2 placeholder: plays a simple echo response.
   * Phase 3 will replace this with actual Claude API streaming.
   */
  const triggerResponse = useCallback((text: string) => {
    if (!ttsClientRef.current) return;

    const placeholderResponse = `I heard you say: ${text}. Menu conversation will be available in the next update.`;
    responseRef.current = placeholderResponse;
    setResponseText(placeholderResponse);
    ttsClientRef.current.queueText(placeholderResponse);
    ttsClientRef.current.flush();
  }, []);

  /**
   * Lazily create SpeechManager and TTSClient on first use.
   * Uses refs to avoid re-creation on re-render.
   */
  const ensureInstances = useCallback(() => {
    if (!ttsClientRef.current) {
      ttsClientRef.current = new TTSClient({
        onSpeakingStart: () => {
          dispatch({ type: 'FIRST_AUDIO_READY', response: responseRef.current });
        },
        onSpeakingEnd: () => {
          dispatch({ type: 'PLAYBACK_ENDED' });
          // Auto-restart via state machine: speaking -> listening
          // SpeechManager.start() is called below when state transitions to listening
        },
        onSentenceStart: (sentence: string) => {
          // Stream sentence updates to display
          setResponseText((prev) => (prev ? prev : sentence));
        },
      });
    }

    if (!speechManagerRef.current) {
      speechManagerRef.current = new SpeechManager(
        // onTranscript
        (t: string) => {
          responseRef.current = '';
          setResponseText('');
          dispatch({ type: 'SPEECH_RESULT', transcript: t });
          triggerResponse(t);
        },
        // onError
        (message: string) => {
          dispatch({ type: 'ERROR', message });
        },
        // onRestart — called by SpeechManager after auto-restart delay
        () => {
          dispatch({ type: 'START_LISTENING' });
        },
      );
    }
  }, [triggerResponse]);

  /**
   * Start listening. Creates instances lazily.
   */
  const startListening = useCallback(() => {
    ensureInstances();
    setNeedsPermissionPrompt(false);
    dispatch({ type: 'START_LISTENING' });
    speechManagerRef.current?.start();
  }, [ensureInstances]);

  /**
   * Stop listening. Stops speech manager, TTS, and chime.
   */
  const stopListening = useCallback(() => {
    dispatch({ type: 'STOP' });
    speechManagerRef.current?.stop();
    ttsClientRef.current?.stop();
    stopThinkingChime();
  }, []);

  /**
   * Handle text input (Firefox fallback path).
   * Dispatches SPEECH_RESULT and triggers TTS response.
   */
  const handleTextInput = useCallback((text: string) => {
    ensureInstances();
    responseRef.current = '';
    setResponseText('');
    dispatch({ type: 'SPEECH_RESULT', transcript: text });
    triggerResponse(text);
  }, [ensureInstances, triggerResponse]);

  /**
   * Dismiss the mic permission prompt.
   */
  const dismissPermissionPrompt = useCallback(() => {
    setNeedsPermissionPrompt(false);
  }, []);

  /**
   * Thinking chime effect: starts on processing state, stops on all other states.
   */
  useEffect(() => {
    if (voiceState.status === 'processing') {
      startThinkingChime();
    } else {
      stopThinkingChime();
    }

    return () => {
      stopThinkingChime();
    };
  }, [voiceState.status]);

  /**
   * Auto-restart speech recognition after speaking ends (PLAYBACK_ENDED -> listening).
   * The state machine transitions speaking -> listening on PLAYBACK_ENDED.
   * We need to call speechManager.start() when this happens.
   */
  useEffect(() => {
    if (voiceState.status === 'listening' && speechManagerRef.current) {
      // Only auto-restart if we have a speech manager (was already in use)
      // Don't call start() on the initial mount idle->listening transition
      // (startListening() handles that directly)
    }
  }, [voiceState.status]);

  /**
   * Cleanup on unmount — destroy instances and stop chime.
   */
  useEffect(() => {
    return () => {
      speechManagerRef.current?.destroy();
      speechManagerRef.current = null;
      ttsClientRef.current?.destroy();
      ttsClientRef.current = null;
      stopThinkingChime();
    };
  }, []);

  return {
    voiceState,
    startListening,
    stopListening,
    handleTextInput,
    isSupported,
    needsPermissionPrompt,
    dismissPermissionPrompt,
    transcript,
    response,
  };
}
