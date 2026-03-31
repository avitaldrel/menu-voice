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
import { ChatMessage, OVERVIEW_USER_MESSAGE } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';
import { getProfile, saveProfile, type UserProfile } from '@/lib/indexeddb';
import { parseAllergyMarkers, stripMarkers } from '@/lib/allergy-marker';

export function useVoiceLoop(menu: Menu | null): {
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
} {
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

  // AbortController for cancelling in-flight fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // One-shot guard — welcome TTS only plays once per session
  const hasPlayedWelcomeRef = useRef(false);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        ttsClientRef.current?.queueText(chunk);
      }

      // Extract markers from the full assembled response
      const extracted = parseAllergyMarkers(fullResponse);
      const spokenText = stripMarkers(fullResponse);

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
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Intentional cancel — silent
        return;
      }
      dispatch({ type: 'ERROR', message: 'Conversation error' });
    }
  }, []);

  /**
   * Trigger the proactive menu overview.
   * Primes the messages array with the overview request, then calls the chat API.
   * No-op if menu is not yet available.
   */
  const triggerOverview = useCallback(() => {
    if (!menuRef.current) return;
    // Prime the messages array with the overview request
    const overviewMessages: ChatMessage[] = [{ role: 'user', content: OVERVIEW_USER_MESSAGE }];
    messagesRef.current = overviewMessages;
    setConversationMessages([...overviewMessages]);
    // Dispatch processing state with empty transcript (overview has no user speech)
    dispatch({ type: 'SPEECH_RESULT', transcript: '' });
    // Trigger the chat API call (null = overview mode, messages already primed)
    triggerResponse(null);
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
    const welcomeText = 'Welcome to MenuVoice. Tap Scan Menu to photograph a restaurant menu.';
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
   * Stop listening. Stops speech manager, TTS, chime, and aborts in-flight chat requests.
   */
  const stopListening = useCallback(() => {
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
      // Auto-restart: speaking -> listening via PLAYBACK_ENDED
      // startListening() handles the initial idle -> listening path,
      // so we only call start() here for the post-speaking restart.
      speechManagerRef.current.start();
    }
    prevStatusRef.current = voiceState.status;
  }, [voiceState.status]);

  /**
   * Cleanup on unmount — destroy instances, abort in-flight request, stop chime.
   */
  useEffect(() => {
    return () => {
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
  };
}
