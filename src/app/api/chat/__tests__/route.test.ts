import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to create mock functions accessible outside the factory
const { mockMessagesStream, mockStreamOn, mockStreamFinalMessage, mockStreamAbort } = vi.hoisted(() => {
  const mockStreamOn = vi.fn();
  const mockStreamFinalMessage = vi.fn().mockResolvedValue({});
  const mockStreamAbort = vi.fn();

  const mockMessagesStream = vi.fn().mockReturnValue({
    on: mockStreamOn,
    finalMessage: mockStreamFinalMessage,
    abort: mockStreamAbort,
  });

  return { mockMessagesStream, mockStreamOn, mockStreamFinalMessage, mockStreamAbort };
});

vi.mock('@anthropic-ai/sdk', () => {
  function MockAnthropic() {
    return {
      messages: {
        stream: mockMessagesStream,
      },
    };
  }
  return { default: MockAnthropic };
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
  process.env.ANTHROPIC_API_KEY = 'test-key';
  vi.clearAllMocks();
  // Restore default mock implementations after clearAllMocks
  mockStreamFinalMessage.mockResolvedValue({});
  mockMessagesStream.mockReturnValue({
    on: mockStreamOn,
    finalMessage: mockStreamFinalMessage,
    abort: mockStreamAbort,
  });
  mockBuildSystemPrompt.mockReturnValue('MOCK_SYSTEM_PROMPT');
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe('POST /api/chat', () => {
  it('returns 500 with error when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('ANTHROPIC_API_KEY not configured');
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

  it('calls client.messages.stream() with correct model, max_tokens, system prompt, and messages', async () => {
    // Make stream.on capture callback but never call it; finalMessage resolves immediately
    mockStreamOn.mockImplementation(() => {});

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    // Consume the stream to trigger the start callback
    await response.body?.cancel();

    expect(mockMessagesStream).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'MOCK_SYSTEM_PROMPT',
      messages: testMessages,
    });
  });

  it('response has Content-Type text/plain; charset=utf-8', async () => {
    mockStreamOn.mockImplementation(() => {});

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('streams text deltas from Anthropic stream.on("text") event to response body', async () => {
    let capturedTextCallback: ((text: string) => void) | undefined;

    mockStreamOn.mockImplementation((event: string, callback: (text: string) => void) => {
      if (event === 'text') {
        capturedTextCallback = callback;
      }
    });

    // Make finalMessage wait until we've sent text deltas
    let resolveFinalMessage: () => void;
    mockStreamFinalMessage.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveFinalMessage = resolve;
      })
    );

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Send text deltas then close the stream
    capturedTextCallback!('Hello ');
    capturedTextCallback!('world');
    resolveFinalMessage!();

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

  it('calls stream.abort() when ReadableStream.cancel() is triggered (client disconnect)', async () => {
    mockStreamOn.mockImplementation(() => {});
    // Keep finalMessage pending so the stream stays open
    mockStreamFinalMessage.mockReturnValue(new Promise(() => {}));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);

    // Cancel the readable stream to simulate client disconnect
    await response.body?.cancel();

    expect(mockStreamAbort).toHaveBeenCalled();
  });

  it('passes profile to buildSystemPrompt when provided in request body', async () => {
    mockStreamOn.mockImplementation(() => {});

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

  it('works without profile in request body (backward compatible)', async () => {
    mockStreamOn.mockImplementation(() => {});

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: testMessages, menu: testMenu }),
    });

    const response = await POST(request);
    await response.body?.cancel();

    // profile is undefined when not provided — buildSystemPrompt called with (menu, undefined)
    expect(mockBuildSystemPrompt).toHaveBeenCalledWith(testMenu, undefined);
  });
});
