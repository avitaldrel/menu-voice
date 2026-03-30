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
import { OVERVIEW_USER_MESSAGE } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal ReadableStream that emits the given chunks then closes. */
function makeReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });
}

/** Return a resolved fetch mock for the given text chunks. */
function makeFetchMock(chunks: string[]): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    body: makeReadableStream(chunks),
  });
}

// ─── Test fixture ────────────────────────────────────────────────────────────

const testMenu: Menu = {
  restaurantName: 'Test Bistro',
  menuType: 'dinner',
  categories: [
    {
      name: 'Pasta',
      description: null,
      items: [
        {
          name: 'Spaghetti Carbonara',
          description: 'Classic Roman pasta',
          price: '$18',
          allergens: ['dairy', 'eggs'],
          dietaryFlags: [],
          modifications: null,
          portionSize: null,
          confidence: 0.95,
        },
      ],
    },
  ],
  extractionConfidence: 0.9,
  warnings: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useVoiceLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupported.value = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // Test 1: Initial state
  it('returns initial idle state', () => {
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.voiceState.status).toBe('idle');
    expect(result.current.transcript).toBe('');
    expect(result.current.response).toBe('');
  });

  // Test 2: isSupported returns true when SpeechRecognition mock is present
  it('isSupported returns true when SpeechRecognition mock is present', () => {
    mockIsSupported.value = true;
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.isSupported).toBe(true);
  });

  // Test 3: isSupported returns false when not supported
  it('isSupported returns false when SpeechRecognition is not supported', () => {
    mockIsSupported.value = false;
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.isSupported).toBe(false);
  });

  // Test 4: startListening dispatches START_LISTENING (transitions to listening)
  it('startListening dispatches START_LISTENING', () => {
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.voiceState.status).toBe('idle');

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');
    expect(mockSpeechManagerStart).toHaveBeenCalled();
  });

  // Test 5: stopListening dispatches STOP (transitions to idle)
  it('stopListening dispatches STOP', () => {
    const { result } = renderHook(() => useVoiceLoop(null));

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
  it('handleTextInput dispatches SPEECH_RESULT transitioning to processing', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['response text']));
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');

    await act(async () => {
      result.current.handleTextInput('What are the vegetarian options?');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(result.current.transcript).toBe('What are the vegetarian options?');
  });

  // Test 7: thinking chime starts on processing state
  it('starts thinking chime when entering processing state', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['test response']));
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
      result.current.handleTextInput('Test question');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(mockStartThinkingChime).toHaveBeenCalled();
  });

  // Test 8: thinking chime stops on non-processing state
  it('stops thinking chime when leaving processing state', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['test response']));
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
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
  it('SpeechManager onTranscript transitions state to processing', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['specials response']));
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    const { onTranscript } = getCapturedCallbacks();
    expect(onTranscript).not.toBeNull();

    await act(async () => {
      onTranscript!('What are the specials today?');
    });

    expect(result.current.voiceState.status).toBe('processing');
    expect(result.current.transcript).toBe('What are the specials today?');
  });

  // Test 10: onError callback transitions state to error
  it('SpeechManager onError transitions state to error', () => {
    const { result } = renderHook(() => useVoiceLoop(null));

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
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.needsPermissionPrompt).toBe(true);
  });

  // Test 12: dismissPermissionPrompt sets needsPermissionPrompt to false
  it('dismissPermissionPrompt sets needsPermissionPrompt to false', () => {
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.needsPermissionPrompt).toBe(true);

    act(() => {
      result.current.dismissPermissionPrompt();
    });

    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  // Test 13: startListening sets needsPermissionPrompt to false
  it('startListening sets needsPermissionPrompt to false', () => {
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(result.current.needsPermissionPrompt).toBe(true);

    act(() => {
      result.current.startListening();
    });

    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  // Test 14: PLAYBACK_ENDED auto-restarts listening
  it('PLAYBACK_ENDED (via TTS onSpeakingEnd) auto-restarts to listening', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['some answer']));
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
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
    const { result } = renderHook(() => useVoiceLoop(null));

    act(() => {
      result.current.startListening();
    });

    expect(result.current.voiceState.status).toBe('listening');
    // startListening() calls start() once; the useEffect must NOT add a second call
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(1);
  });

  // Test 16: Full voice loop cycle — start, speak, process, play, auto-restart
  it('completes full voice loop cycle with auto-restart calling start() twice', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['We have tiramisu and gelato.']));
    const { result } = renderHook(() => useVoiceLoop(null));

    // 1. User starts listening
    act(() => {
      result.current.startListening();
    });
    expect(result.current.voiceState.status).toBe('listening');
    expect(mockSpeechManagerStart).toHaveBeenCalledTimes(1);

    // 2. User speaks -> processing
    await act(async () => {
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

  // ─── New tests for streaming Claude chat ──────────────────────────────────

  // Test 17: triggerResponse sends fetch to /api/chat with correct body
  it('handleTextInput sends fetch to /api/chat with correct body', async () => {
    const fetchMock = makeFetchMock(['pasta response']);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
      result.current.handleTextInput('What pasta do you have?');
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chat');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: string }>;
      menu: Menu;
    };
    expect(body.messages).toEqual([
      { role: 'user', content: 'What pasta do you have?' },
    ]);
    expect(body.menu).toEqual(testMenu);
  });

  // Test 18: streaming response feeds into TTSClient
  it('streaming response feeds chunks into TTSClient and flushes', async () => {
    vi.stubGlobal('fetch', makeFetchMock(['Spaghetti ', 'Carbonara.']));

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
      result.current.handleTextInput('What pasta do you have?');
    });

    expect(mockTTSQueueText).toHaveBeenCalledWith('Spaghetti ');
    expect(mockTTSQueueText).toHaveBeenCalledWith('Carbonara.');
    expect(mockTTSFlush).toHaveBeenCalledOnce();
  });

  // Test 19: conversation history accumulates across turns
  it('conversation history accumulates across turns', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, body: makeReadableStream(['First answer.']) })
      .mockResolvedValueOnce({ ok: true, body: makeReadableStream(['Second answer.']) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    act(() => {
      result.current.startListening();
    });

    // First turn
    await act(async () => {
      result.current.handleTextInput('Question one');
    });

    // Second turn — check that the second fetch includes full history
    await act(async () => {
      result.current.handleTextInput('Question two');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
    const secondBody = JSON.parse(secondOptions.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    // Second call should include: user1, assistant1, user2
    expect(secondBody.messages).toEqual([
      { role: 'user', content: 'Question one' },
      { role: 'assistant', content: 'First answer.' },
      { role: 'user', content: 'Question two' },
    ]);
  });

  // Test 20: triggerOverview primes messages with OVERVIEW_USER_MESSAGE
  it('triggerOverview primes messages with OVERVIEW_USER_MESSAGE and calls /api/chat', async () => {
    const fetchMock = makeFetchMock(['This is a dinner bistro with 3 categories.']);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    await act(async () => {
      result.current.triggerOverview();
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chat');
    const body = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages).toEqual([
      { role: 'user', content: OVERVIEW_USER_MESSAGE },
    ]);
  });

  // Test 21: triggerOverview is a no-op when menu is null
  it('triggerOverview is a no-op when menu is null', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVoiceLoop(null));

    await act(async () => {
      result.current.triggerOverview();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Test 22: AbortController cancels previous in-flight request
  it('starting a new request aborts the previous in-flight request', async () => {
    // Track abort calls across controller instances
    const abortCalls: boolean[] = [];
    let callCount = 0;

    // Must use function constructor (not arrow) for mock constructors — vitest requirement
    vi.stubGlobal('AbortController', vi.fn(function (this: Record<string, unknown>) {
      const myIndex = callCount++;
      abortCalls.push(false);
      this.signal = { aborted: false };
      this.abort = vi.fn(() => {
        abortCalls[myIndex] = true;
      });
    }));

    const fetchMock = vi.fn()
      .mockReturnValueOnce(new Promise(() => { /* first request hangs */ }))
      .mockResolvedValueOnce({ ok: true, body: makeReadableStream(['quick answer']) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    act(() => {
      result.current.startListening();
    });

    // Start first request (hangs)
    act(() => {
      result.current.handleTextInput('First question');
    });

    // Immediately start second request — should abort the first controller
    await act(async () => {
      result.current.handleTextInput('Second question');
    });

    // abortCalls[0] should be true — first controller was aborted when second request started
    expect(abortCalls[0]).toBe(true);

    vi.unstubAllGlobals();
  });

  // Test 23: fetch error dispatches error state
  it('fetch failure dispatches ERROR state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, body: null }));

    const { result } = renderHook(() => useVoiceLoop(testMenu));

    act(() => {
      result.current.startListening();
    });

    await act(async () => {
      result.current.handleTextInput('Test question');
    });

    expect(result.current.voiceState.status).toBe('error');
  });

  // Test 24: conversationMessages is exposed in return value
  it('exposes conversationMessages in return value', () => {
    const { result } = renderHook(() => useVoiceLoop(null));
    expect(Array.isArray(result.current.conversationMessages)).toBe(true);
    expect(result.current.conversationMessages).toHaveLength(0);
  });
});
