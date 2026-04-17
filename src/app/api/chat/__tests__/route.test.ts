import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Async iterable helper for mock streams
function makeStream(chunks: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of chunks) {
        yield { choices: [{ delta: { content: text } }] };
      }
    },
  };
}

// A stream that never resolves (for abort/cancel tests)
function makeHangingStream(signal: AbortSignal) {
  return {
    [Symbol.asyncIterator]: async function* () {
      await new Promise<void>((_, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      });
    },
  };
}

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('openai', () => {
  function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }
  return { default: MockOpenAI };
});

const { mockBuildSystemPrompt } = vi.hoisted(() => {
  const mockBuildSystemPrompt = vi.fn().mockReturnValue('MOCK_SYSTEM_PROMPT');
  return { mockBuildSystemPrompt };
});

vi.mock('@/lib/chat-prompt', () => ({
  buildSystemPrompt: mockBuildSystemPrompt,
}));

import { POST } from '@/app/api/chat/route';

const testMenu = {
  restaurantName: 'Bella Italia',
  menuType: 'dinner',
  categories: [],
  extractionConfidence: 0.95,
  warnings: [],
};

const testMessages = [{ role: 'user', content: 'What do you recommend?' }];

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  vi.clearAllMocks();
  mockCreate.mockResolvedValue(makeStream([]));
  mockBuildSystemPrompt.mockReturnValue('MOCK_SYSTEM_PROMPT');
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe('POST /api/chat', () => {
  it('returns 500 with error when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('OPENAI_API_KEY not configured');
  });

  it('returns 400 with error on malformed JSON body', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json{{{',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when messages array is missing', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu: testMenu }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/messages/i);
  });

  it('returns 400 when messages array is empty', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], menu: testMenu }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/messages/i);
  });

  it('calls client.chat.completions.create() with correct model, max_tokens, system message, and messages', async () => {
    mockCreate.mockResolvedValue(makeStream([]));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    await response.body?.cancel();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 512,
        stream: true,
        messages: [
          { role: 'system', content: 'MOCK_SYSTEM_PROMPT' },
          ...testMessages,
        ],
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('response has Content-Type text/plain; charset=utf-8', async () => {
    mockCreate.mockResolvedValue(makeStream([]));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('streams text chunks from OpenAI stream to response body', async () => {
    mockCreate.mockResolvedValue(makeStream(['Hello ', 'world']));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const chunks: string[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(decoder.decode(value));
    }

    expect(chunks.join('')).toContain('Hello ');
    expect(chunks.join('')).toContain('world');
  });

  it('cancelling the ReadableStream aborts the OpenAI request', async () => {
    mockCreate.mockImplementation(async (_params: unknown, opts: { signal: AbortSignal }) => {
      return makeHangingStream(opts.signal);
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    // Cancel should not throw
    await expect(response.body?.cancel()).resolves.toBeUndefined();
  });

  it('passes profile to buildSystemPrompt when provided in request body', async () => {
    mockCreate.mockResolvedValue(makeStream([]));

    const testProfile = { allergies: ['dairy'], preferences: [], dislikes: [] };

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu, profile: testProfile }),
    });

    const response = await POST(request);
    await response.body?.cancel();

    expect(mockBuildSystemPrompt).toHaveBeenCalledWith(testMenu, testProfile);
  });

  it('works without profile in request body', async () => {
    mockCreate.mockResolvedValue(makeStream([]));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    await response.body?.cancel();

    expect(mockBuildSystemPrompt).toHaveBeenCalledWith(testMenu, undefined);
  });
});
