import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// vi.hoisted() — variables shared between vi.mock factory and test body
// (Per STATE.md decision: vi.hoisted() + function constructor required for
// vitest vi.mock when mock fn must be shared between factory and test body)
const {
  mockSpeechManagerStart,
  mockSpeechManagerStop,
  mockSpeechManagerDestroy,
  MockSpeechManager,
  getCapturedCallbacks,
  mockIsSupported,
  mockTTSQueueText,
  mockTTSFlush,
  mockTTSStop,
  mockTTSDestroy,
  MockTTSClient,
  getCapturedTTSOptions,
  mockStartThinkingChime,
  mockStopThinkingChime,
} = vi.hoisted(() => {
  const mockSpeechManagerStart = vi.fn();
  const mockSpeechManagerStop = vi.fn();
  const mockSpeechManagerDestroy = vi.fn();

  let _capturedOnTranscript: ((t: string) => void) | null = null;
  let _capturedOnError: ((m: string) => void) | null = null;
  let _capturedOnRestart: (() => void) | null = null;

  const MockSpeechManager = vi.fn(function (
    this: unknown,
    onTranscript: (t: string) => void,
    onError: (m: string) => void,
    onRestart: () => void,
  ) {
    _capturedOnTranscript = onTranscript;
    _capturedOnError = onError;
    _capturedOnRestart = onRestart;
    (this as Record<string, unknown>).start = mockSpeechManagerStart;
    (this as Record<string, unknown>).stop = mockSpeechManagerStop;
    (this as Record<string, unknown>).destroy = mockSpeechManagerDestroy;
  });

  const getCapturedCallbacks = () => ({
    onTranscript: _capturedOnTranscript,
    onError: _capturedOnError,
    onRestart: _capturedOnRestart,
  });

  const mockIsSupported = { value: true };

  const mockTTSQueueText = vi.fn();
  const mockTTSFlush = vi.fn();
  const mockTTSStop = vi.fn();
  const mockTTSDestroy = vi.fn();

  let _capturedTTSOptions: {
    onSpeakingStart?: () => void;
    onSpeakingEnd?: () => void;
    onSentenceStart?: (s: string) => void;
  } = {};

  const MockTTSClient = vi.fn(function (
    this: unknown,
    options: {
      onSpeakingStart?: () => void;
      onSpeakingEnd?: () => void;
      onSentenceStart?: (s: string) => void;
    },
  ) {
    _capturedTTSOptions = options;
    (this as Record<string, unknown>).queueText = mockTTSQueueText;
    (this as Record<string, unknown>).flush = mockTTSFlush;
    (this as Record<string, unknown>).stop = mockTTSStop;
    (this as Record<string, unknown>).destroy = mockTTSDestroy;
  });

  const getCapturedTTSOptions = () => _capturedTTSOptions;

  const mockStartThinkingChime = vi.fn();
  const mockStopThinkingChime = vi.fn();

  return {
    mockSpeechManagerStart,
    mockSpeechManagerStop,
    mockSpeechManagerDestroy,
    MockSpeechManager,
    getCapturedCallbacks,
    mockIsSupported,
    mockTTSQueueText,
    mockTTSFlush,
    mockTTSStop,
    mockTTSDestroy,
    MockTTSClient,
    getCapturedTTSOptions,
    mockStartThinkingChime,
    mockStopThinkingChime,
  };
});

vi.mock('@/lib/speech-recognition', () => ({
  isSpeechRecognitionSupported: () => mockIsSupported.value,
  SpeechManager: MockSpeechManager,
}));

vi.mock('@/lib/tts-client', () => ({
  TTSClient: MockTTSClient,
}));

vi.mock('@/lib/thinking-chime', () => ({
  startThinkingChime: mockStartThinkingChime,
  stopThinkingChime: mockStopThinkingChime,
}));

import { useVoiceLoop } from '@/hooks/useVoiceLoop';

describe('useVoiceLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupported.value = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Initial state
  it('returns initial idle state', () => {
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.voiceState.status).toBe('idle');
    expect(result.current.transcript).toBe('');
    expect(result.current.response).toBe('');
  });

  // Test 2: isSupported returns true when SpeechRecognition mock is present
  it('isSupported returns true when SpeechRecognition mock is present', () => {
    mockIsSupported.value = true;
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.isSupported).toBe(true);
  });

  // Test 3: isSupported returns false when not supported
  it('isSupported returns false when SpeechRecognition is not supported', () => {
    mockIsSupported.value = false;
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.isSupported).toBe(false);
  });

  // Test 4: startListening dispatches START_LISTENING (transitions to listening)
  it('startListening dispatches START_LISTENING', () => {
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.voiceState.status).toBe('idle');

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');
    expect(mockSpeechManagerStart).toHaveBeenCalled();
  });

  // Test 5: stopListening dispatches STOP (transitions to idle)
  it('stopListening dispatches STOP', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');

    act(() => {
      result.current.stopListening();
    });

    expect(result.current.voiceState.status).toBe('idle');
  });

  // Test 6: handleTextInput dispatches SPEECH_RESULT
  it('handleTextInput dispatches SPEECH_RESULT transitioning to processing', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');

    act(() => {
      result.current.handleTextInput('What are the vegetarian options?');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(result.current.transcript).toBe('What are the vegetarian options?');
  });

  // Test 7: thinking chime starts on processing state
  it('starts thinking chime when entering processing state', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      result.current.handleTextInput('Test question');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(mockStartThinkingChime).toHaveBeenCalled();
  });

  // Test 8: thinking chime stops on non-processing state
  it('stops thinking chime when leaving processing state', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      result.current.handleTextInput('Test question');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(mockStartThinkingChime).toHaveBeenCalled();

    // Simulate TTS onSpeakingStart -> FIRST_AUDIO_READY -> speaking
    act(() => {
      getCapturedTTSOptions().onSpeakingStart?.();
    });

    expect(result.current.voiceState.status).toBe('speaking');
    // stopThinkingChime called when leaving processing (status !== 'processing')
    expect(mockStopThinkingChime).toHaveBeenCalled();
  });

  // Test 9: onTranscript callback transitions state to processing
  it('SpeechManager onTranscript transitions state to processing', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    const { onTranscript } = getCapturedCallbacks();
    expect(onTranscript).not.toBeNull();

    act(() => {
      onTranscript!('What are the specials today?');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(result.current.transcript).toBe('What are the specials today?');
  });

  // Test 10: onError callback transitions state to error
  it('SpeechManager onError transitions state to error', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    const { onError } = getCapturedCallbacks();
    expect(onError).not.toBeNull();

    act(() => {
      onError!('Microphone permission denied');
    });

    expect(result.current.voiceState.status).toBe('error');
  });

  // Test 11: needsPermissionPrompt starts true
  it('needsPermissionPrompt starts true', () => {
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.needsPermissionPrompt).toBe(true);
  });

  // Test 12: dismissPermissionPrompt sets needsPermissionPrompt to false
  it('dismissPermissionPrompt sets needsPermissionPrompt to false', () => {
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.needsPermissionPrompt).toBe(true);

    act(() => {
      result.current.dismissPermissionPrompt();
    });

    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  // Test 13: startListening sets needsPermissionPrompt to false
  it('startListening sets needsPermissionPrompt to false', () => {
    const { result } = renderHook(() => useVoiceLoop());
    expect(result.current.needsPermissionPrompt).toBe(true);

    act(() => {
      result.current.startListening();
    });

    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  // Test 14: PLAYBACK_ENDED auto-restarts listening
  it('PLAYBACK_ENDED (via TTS onSpeakingEnd) auto-restarts to listening', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      result.current.handleTextInput('Some question');
    });

    // TTS fires onSpeakingStart -> FIRST_AUDIO_READY -> speaking
    act(() => {
      getCapturedTTSOptions().onSpeakingStart?.();
    });

    expect(result.current.voiceState.status).toBe('speaking');

    // TTS fires onSpeakingEnd -> PLAYBACK_ENDED -> auto-restart listening
    act(() => {
      getCapturedTTSOptions().onSpeakingEnd?.();
    });

    expect(result.current.voiceState.status).toBe('listening');
    // Verify speechManager.start() was called twice:
    // 1st from startListening(), 2nd from auto-restart useEffect
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(2);
  });

  // Test 15: No double-start on initial idle->listening transition
  it('does not double-call speechManager.start() on initial startListening', () => {
    const { result } = renderHook(() => useVoiceLoop());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');
    // startListening() calls start() once; the useEffect must NOT add a second call
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(1);
  });

  // Test 16: Full voice loop cycle — start, speak, process, play, auto-restart
  it('completes full voice loop cycle with auto-restart calling start() twice', () => {
    const { result } = renderHook(() => useVoiceLoop());

    // 1. User starts listening
    act(() => {
      result.current.startListening();
    });
    expect(result.current.voiceState.status).toBe('listening');
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(1);

    // 2. User speaks -> processing
    act(() => {
      result.current.handleTextInput('What desserts do you have?');
    });
    expect(result.current.voiceState.status).toBe('processing');

    // 3. TTS starts playing -> speaking
    act(() => {
      getCapturedTTSOptions().onSpeakingStart?.();
    });
    expect(result.current.voiceState.status).toBe('speaking');

    // 4. TTS finishes -> PLAYBACK_ENDED -> auto-restart listening
    act(() => {
      getCapturedTTSOptions().onSpeakingEnd?.();
    });
    expect(result.current.voiceState.status).toBe('listening');
    // start() called a 2nd time by auto-restart useEffect
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(2);
  });
});
