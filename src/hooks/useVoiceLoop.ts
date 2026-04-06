'use client';

import { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  voiceReducer,
  initialVoiceState,
  type VoiceState,
} from '@/lib/voice-state';
import { SpeechManager, isSpeechRecognitionSupported } from '@/lib/speech-recognition';
import { TTSClient } from '@/lib/tts-client';
import { startThinkingChime, stopThinkingChime } from '@/lib/thinking-chime';
import { ChatMessage, OVERVIEW_USER_MESSAGE } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';
import { getProfile, saveProfile, getAndIncrementSessionCount, type UserProfile } from '@/lib/indexeddb';
import { parseAllergyMarkers, stripMarkers } from '@/lib/allergy-marker';

const VOICE_NAV_COMMANDS = [
  { pattern: /(open|go\s+to|take\s+me\s+to)\s+settings/i, action: 'settings' as const, confirmation: 'Opening settings.' },
  { pattern: /(scan\s+new\s+menu|new\s+menu|scan\s+again)/i, action: 'reset' as const, confirmation: 'Starting over. Please take a new photo.' },
];

export function useVoiceLoop(menu: Menu | null, onRetakeRequested?: () => void): {
  voiceState: VoiceState;
  startListening: () => void;
  stopListening: () => void;
  handleTextInput: (text: string) => void;
  isSupported: boolean;
  needsPermissionPrompt: boolean;
  dismissPermissionPrompt: () => void;
  transcript: string;
  response: string;
  triggerOverview: () => void;
  conversationMessages: ChatMessage[];
  speakWelcome: () => void;
  speakText: (text: string) => void;
} {
  const router = useRouter();
  const [voiceState, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(true);

  // Refs for SpeechManager and TTSClient instances — lazy creation, SSR safe
  const speechManagerRef = useRef<SpeechManager | null>(null);
  const ttsClientRef = useRef<TTSClient | null>(null);

  // Tracks previous voice status to detect speaking -> listening transition for auto-restart
  const prevStatusRef = useRef<string>('idle');

  // Ref to hold accumulated response text for TranscriptDisplay
  const responseRef = useRef<string>('');
  const [responseText, setResponseText] = useState('');

  // Conversation history — useRef for stable identity across renders (Pitfall 1)
  const messagesRef = useRef<ChatMessage[]>([]);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);

  // Keep menuRef in sync with the menu prop
  const menuRef = useRef<Menu | null>(null);
  useEffect(() => {
    menuRef.current = menu;
  }, [menu]);

  // Profile ref — loaded on mount, kept in sync when profile is updated by marker extraction
  const profileRef = useRef<UserProfile | null>(null);

  // Load profile from IndexedDB on mount
  useEffect(() => {
    getProfile().then((p) => {
      profileRef.current = p;
    });
  }, []);

  // Load and increment session count on mount (D-16, D-18)
  useEffect(() => {
    getAndIncrementSessionCount().then((count) => {
      sessionCountRef.current = count;
    });
  }, []);

  // Ref for retake callback to avoid stale closures in streaming
  const onRetakeRequestedRef = useRef(onRetakeRequested);
  useEffect(() => {
    onRetakeRequestedRef.current = onRetakeRequested;
  }, [onRetakeRequested]);

  // AbortController for cancelling in-flight fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Minimum post-speech delay before recognition restarts (3 s grace period for user)
  const postSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-shot guard — welcome TTS only plays once per session
  const hasPlayedWelcomeRef = useRef(false);

  // Session count and hint tracking (D-16, D-18)
  const sessionCountRef = useRef<number>(0);
  const hintGivenThisSessionRef = useRef(false);

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
   * Trigger streaming Claude chat response.
   * userText: the user's speech input, or null for the overview call (messages already primed).
   * Aborts any previous in-flight request before starting a new one.
   */
  const triggerResponse = useCallback(async (userText: string | null) => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Voice command short-circuit (D-17) — before chat API call
    if (userText) {
      for (const cmd of VOICE_NAV_COMMANDS) {
        if (cmd.pattern.test(userText)) {
          ttsClientRef.current?.queueText(cmd.confirmation);
          ttsClientRef.current?.flush();
          if (cmd.action === 'settings') {
            router.push('/settings');
          } else if (cmd.action === 'reset') {
            onRetakeRequestedRef.current?.();
          }
          return; // Short-circuit — do not call chat API
        }
      }
    }

    // Build the message list for this request
    const nextMessages: ChatMessage[] =
      userText !== null
        ? [...messagesRef.current, { role: 'user', content: userText }]
        : [...messagesRef.current]; // overview: already primed

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, menu: menuRef.current, profile: profileRef.current }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        dispatch({ type: 'ERROR', message: 'Failed to get response' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      // ttsAccum holds text not yet forwarded to TTS. We hold back from the
      // last '[' onwards to prevent partial markers from reaching the TTS queue.
      let ttsAccum = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        ttsAccum += chunk;

        // Find the last '[' in the accumulated text. Anything before it is safe
        // to forward to TTS (no partial marker can be lurking there). Anything
        // from '[' onwards is withheld until we see the matching ']' or the
        // stream ends — at which point stripMarkers removes complete markers.
        const bracketIdx = ttsAccum.lastIndexOf('[');
        if (bracketIdx === -1) {
          // No '[' at all — entire accumulation is safe
          ttsClientRef.current?.queueText(ttsAccum);
          ttsAccum = '';
        } else {
          // Check if there is a complete marker already (has matching ']' after the '[')
          const closingIdx = ttsAccum.indexOf(']', bracketIdx);
          if (closingIdx !== -1) {
            // The '[...]' bracket is complete — strip it then forward everything
            const safeText = stripMarkers(ttsAccum).replace(/\[RETAKE\]/gi, '');
            if (safeText) ttsClientRef.current?.queueText(safeText);
            ttsAccum = '';
          } else {
            // Partial marker in progress — forward only text before the '['
            const safe = ttsAccum.slice(0, bracketIdx);
            if (safe) ttsClientRef.current?.queueText(safe);
            ttsAccum = ttsAccum.slice(bracketIdx); // keep from '[' onwards
          }
        }
      }

      // Stream ended — check for retake marker before stripping
      const hasRetakeMarker = /\[RETAKE\]/i.test(fullResponse);

      // Extract markers from the full assembled response
      const extracted = parseAllergyMarkers(fullResponse);
      const spokenText = stripMarkers(fullResponse).replace(/\[RETAKE\]/gi, '').trim();

      // Flush any remaining ttsAccum (marker-stripped) then signal end of stream
      if (ttsAccum) {
        const remaining = stripMarkers(ttsAccum).replace(/\[RETAKE\]/gi, '').trim();
        if (remaining) ttsClientRef.current?.queueText(remaining);
      }
      ttsClientRef.current?.flush();

      // Save extracted markers to profile if any found
      if (extracted.allergies.length > 0 || extracted.dislikes.length > 0 || extracted.preferences.length > 0) {
        const existing = profileRef.current ?? { allergies: [], preferences: [], dislikes: [] };
        const updated: UserProfile = {
          allergies: [...new Set([...existing.allergies, ...extracted.allergies])],
          preferences: [...new Set([...existing.preferences, ...extracted.preferences])],
          dislikes: [...new Set([...existing.dislikes, ...extracted.dislikes])],
        };
        await saveProfile(updated);
        profileRef.current = updated;
      }

      // Use spokenText (markers stripped) for display and conversation history
      responseRef.current = spokenText;
      setResponseText(spokenText);

      const updatedMessages: ChatMessage[] = [
        ...nextMessages,
        { role: 'assistant', content: spokenText },
      ];
      messagesRef.current = updatedMessages;
      setConversationMessages([...updatedMessages]);

      // If Claude confirmed a retake, reset to idle after TTS finishes
      if (hasRetakeMarker && onRetakeRequestedRef.current) {
        // Small delay to let TTS start playing the confirmation before resetting
        setTimeout(() => onRetakeRequestedRef.current?.(), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Intentional cancel — flush whatever was buffered before the abort so
        // any food names already received are spoken rather than silently dropped.
        ttsClientRef.current?.flush();
        return;
      }
      dispatch({ type: 'ERROR', message: 'Conversation error' });
    }
  }, [router]);

  /**
   * Trigger the proactive menu overview.
   * Primes the messages array with the overview request, then calls the chat API.
   * No-op if menu is not yet available.
   */
  const triggerOverview = useCallback(() => {
    if (!menuRef.current) return;
    // Lazy-init TTS client (ensureInstances defined later, use ref directly)
    if (!ttsClientRef.current) {
      ttsClientRef.current = new TTSClient({
        onSpeakingStart: () => {
          dispatch({ type: 'FIRST_AUDIO_READY', response: responseRef.current });
        },
        onSpeakingEnd: () => {
          dispatch({ type: 'PLAYBACK_ENDED' });
        },
        onSentenceStart: (sentence: string) => {
          setResponseText((prev) => (prev ? prev : sentence));
        },
      });
    }
    // Prime the messages array with the overview request
    const overviewMessages: ChatMessage[] = [{ role: 'user', content: OVERVIEW_USER_MESSAGE }];
    messagesRef.current = overviewMessages;
    setConversationMessages([...overviewMessages]);
    // Ensure we're in listening state before dispatching SPEECH_RESULT
    // (idle → listening → processing via SPEECH_RESULT)
    dispatch({ type: 'START_LISTENING' });
    dispatch({ type: 'SPEECH_RESULT', transcript: '' });
    // Trigger the chat API call (null = overview mode, messages already primed)
    triggerResponse(null);

    // Hint system (D-16, D-18) — append tutorial or contextual hint after overview
    const count = sessionCountRef.current;
    if (count === 1) {
      // First session: full tutorial (spoken after overview TTS finishes)
      setTimeout(() => {
        ttsClientRef.current?.queueText(
          'Welcome to MenuVoice! You can ask me about any item on the menu, get recommendations, or ask about ingredients. Just tap the microphone and speak naturally.'
        );
        ttsClientRef.current?.flush();
      }, 8000); // Delay to let overview finish first
    } else if (!hintGivenThisSessionRef.current) {
      // Returning sessions: occasional contextual hints
      const chance = count <= 5 ? 0.3 : count <= 10 ? 0.1 : 0.05;
      if (Math.random() < chance) {
        hintGivenThisSessionRef.current = true;
        const hints = [
          'By the way, you can say "open settings" to manage your food allergies.',
          'Just so you know, you can say "scan new menu" to start over with a different menu.',
          'You can ask me to compare dishes, like "what is the difference between the salmon and the chicken?"',
        ];
        const hint = hints[Math.floor(Math.random() * hints.length)];
        setTimeout(() => {
          ttsClientRef.current?.queueText(hint);
          ttsClientRef.current?.flush();
        }, 10000); // Longer delay for returning users
      }
    }
  }, [triggerResponse]);

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
   * Speak the one-shot welcome message on first user interaction.
   * Chained to the first ScanButton tap (user gesture) to satisfy iOS Safari autoplay policy.
   * Uses TTSClient (audio element) per CLAUDE.md — NOT SpeechSynthesis.
   * One-shot via hasPlayedWelcomeRef — never repeats within the same session.
   */
  const speakWelcome = useCallback(() => {
    if (hasPlayedWelcomeRef.current) return;
    hasPlayedWelcomeRef.current = true;
    ensureInstances();
    const welcomeText = 'Welcome to MenuVoice.';
    ttsClientRef.current?.queueText(welcomeText);
    ttsClientRef.current?.flush();
    dispatch({ type: 'SPEECH_RESULT', transcript: '' });
  }, [ensureInstances]);

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
   * Stop listening. Stops speech manager, TTS, chime, aborts in-flight chat requests,
   * and cancels any pending post-speech restart timer.
   */
  const stopListening = useCallback(() => {
    if (postSpeakTimerRef.current !== null) {
      clearTimeout(postSpeakTimerRef.current);
      postSpeakTimerRef.current = null;
    }
    dispatch({ type: 'STOP' });
    speechManagerRef.current?.stop();
    ttsClientRef.current?.stop();
    abortControllerRef.current?.abort();
    stopThinkingChime();
  }, []);

  /**
   * Handle text input (Firefox fallback path).
   * Dispatches SPEECH_RESULT and triggers streaming TTS response.
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
   * Speak arbitrary text through TTSClient (audio element) per CLAUDE.md.
   * Used for processing reminders and RetakeGuidance TTS.
   */
  const speakText = useCallback((text: string) => {
    ensureInstances();
    ttsClientRef.current?.queueText(text);
    ttsClientRef.current?.flush();
  }, [ensureInstances]);

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
   * Guard: only call start() when transitioning FROM speaking — the idle->listening
   * path (initial tap) is handled by startListening() directly to avoid double-start.
   */
  useEffect(() => {
    if (
      voiceState.status === 'listening' &&
      prevStatusRef.current === 'speaking' &&
      speechManagerRef.current
    ) {
      // Auto-restart: speaking -> listening via PLAYBACK_ENDED.
      // Start recognition immediately so the user can speak right away.
      speechManagerRef.current?.start();
    }
    prevStatusRef.current = voiceState.status;
  }, [voiceState.status]);

  /**
   * Cleanup on unmount — destroy instances, abort in-flight request, stop chime.
   */
  useEffect(() => {
    return () => {
      if (postSpeakTimerRef.current !== null) {
        clearTimeout(postSpeakTimerRef.current);
        postSpeakTimerRef.current = null;
      }
      speechManagerRef.current?.destroy();
      speechManagerRef.current = null;
      ttsClientRef.current?.destroy();
      ttsClientRef.current = null;
      abortControllerRef.current?.abort();
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
    triggerOverview,
    conversationMessages,
    speakWelcome,
    speakText,
  };
}
