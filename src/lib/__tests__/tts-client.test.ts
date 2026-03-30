import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { splitSentences, TTSClient } from '../tts-client';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// Mock Audio constructor
let mockAudioInstance: {
  src: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  onended: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

vi.stubGlobal(
  'Audio',
  vi.fn(function (this: typeof mockAudioInstance) {
    mockAudioInstance = {
      src: '',
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      onended: null,
      onerror: null,
    };
    return mockAudioInstance;
  })
);

describe('splitSentences', () => {
  it('splits two sentences with period', () => {
    const result = splitSentences('Hello world. How are you?');
    expect(result).toEqual(['Hello world.', 'How are you?']);
  });

  it('returns single sentence unchanged', () => {
    const result = splitSentences('Yes.');
    expect(result).toEqual(['Yes.']);
  });

  it('returns text without punctuation as single item', () => {
    const result = splitSentences('No punctuation');
    expect(result).toEqual(['No punctuation']);
  });

  it('handles exclamation marks', () => {
    const result = splitSentences('Great! That is amazing.');
    expect(result).toEqual(['Great!', 'That is amazing.']);
  });

  it('handles question marks', () => {
    const result = splitSentences('What is this? Let me explain.');
    expect(result).toEqual(['What is this?', 'Let me explain.']);
  });

  it('trims whitespace from results', () => {
    const result = splitSentences('First sentence.  Second sentence!');
    expect(result).toEqual(['First sentence.', 'Second sentence!']);
  });
});

describe('TTSClient', () => {
  let client: TTSClient;
  let onSpeakingStart: ReturnType<typeof vi.fn>;
  let onSpeakingEnd: ReturnType<typeof vi.fn>;
  let onSentenceStart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSpeakingStart = vi.fn();
    onSpeakingEnd = vi.fn();
    onSentenceStart = vi.fn();
    client = new TTSClient({ onSpeakingStart, onSpeakingEnd, onSentenceStart });
  });

  afterEach(() => {
    client.destroy();
  });

  it('fetches /api/tts with POST and text body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('Hello world.');
    client.flush();

    // Allow async to settle
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledWith('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world.' }),
    });
  });

  it('creates blob URL, sets audio.src, and calls audio.play()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('Test sentence.');
    client.flush();

    await new Promise((r) => setTimeout(r, 20));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAudioInstance.src).toBe('blob:mock-url');
    expect(mockAudioInstance.play).toHaveBeenCalled();
  });

  it('revokes blob URL on audio ended (memory cleanup)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('Memory test.');
    client.flush();

    await new Promise((r) => setTimeout(r, 20));

    // Simulate audio ending
    if (mockAudioInstance.onended) {
      mockAudioInstance.onended(new Event('ended'));
    }

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to speechSynthesis.speak() when fetch returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    client.queueText('Fallback test.');
    client.flush();

    // Wait for async fetch rejection and fallback path
    await new Promise((r) => setTimeout(r, 30));

    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('retries OpenAI every 5 requests after entering fallback mode', async () => {
    // First request fails — enters fallback
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // Requests 2-5 are handled by speechSynthesis (no fetch call)
    // Request 6 is a retry — mock it succeeding
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    // Queue 6 sentences and flush all
    for (let i = 1; i <= 6; i++) {
      client.queueText(`Sentence ${i}.`);
    }
    client.flush();

    // Wait for fetch to fail and fallback to kick in for sentence 1
    await new Promise((r) => setTimeout(r, 30));

    // Now drive 5 sentences through fallback by triggering utterance onend
    const speakMock = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 10));
      const lastCall = speakMock.mock.calls[speakMock.mock.calls.length - 1];
      if (lastCall?.[0]?.onend) {
        lastCall[0].onend();
      }
    }

    // Allow retry fetch for sentence 6
    await new Promise((r) => setTimeout(r, 30));

    // fetch should have been called twice: once on sentence 1 (fail), once on sentence 6 (retry)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('queueText buffers text and enqueues complete sentences', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    // Add partial text — not a complete sentence yet
    client.queueText('Hello world');
    // Before flush, nothing should play
    await new Promise((r) => setTimeout(r, 5));
    expect(mockFetch).not.toHaveBeenCalled();

    // Complete the sentence — now "Hello world." should flush
    client.queueText('. How are you?');
    await new Promise((r) => setTimeout(r, 20));

    // "Hello world." was a complete sentence and should trigger playback
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tts',
      expect.objectContaining({
        body: JSON.stringify({ text: 'Hello world.' }),
      })
    );
  });

  it('stop() pauses audio, cancels speechSynthesis, and clears queue', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('First sentence. Second sentence. Third sentence.');
    client.flush();

    await new Promise((r) => setTimeout(r, 20));

    client.stop();

    expect(mockAudioInstance.pause).toHaveBeenCalled();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('calls onSpeakingStart on first sentence', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('First sentence.');
    client.flush();

    await new Promise((r) => setTimeout(r, 20));

    expect(onSpeakingStart).toHaveBeenCalledOnce();
  });

  it('calls onSentenceStart with sentence text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    client.queueText('Test sentence.');
    client.flush();

    await new Promise((r) => setTimeout(r, 20));

    expect(onSentenceStart).toHaveBeenCalledWith('Test sentence.');
  });
});
