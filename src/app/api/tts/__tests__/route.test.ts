import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — define everything needed inside the factory
// Use vi.hoisted to create the mock function outside the factory so tests can access it
const { mockSpeechCreate } = vi.hoisted(() => ({
  mockSpeechCreate: vi.fn(),
}));

vi.mock('openai', () => {
  function MockOpenAI() {
    return {
      audio: {
        speech: {
          create: mockSpeechCreate,
        },
      },
    };
  }
  return { default: MockOpenAI };
});

import { POST } from '@/app/api/tts/route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/tts', () => {
  it('calls openai.audio.speech.create with tts-1 model and shimmer voice, returns audio/mpeg', async () => {
    const fakeAudioBody = new ReadableStream();
    mockSpeechCreate.mockResolvedValue({ body: fakeAudioBody });

    const request = new Request('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const response = await POST(request);

    expect(mockSpeechCreate).toHaveBeenCalledWith({
      model: 'tts-1',
      voice: 'shimmer',
      input: 'Hello world',
      response_format: 'mp3',
      speed: 1.45,
    });
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(response.status).toBe(200);
  });

  it('returns 400 with error message when text is missing', async () => {
    const request = new Request('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('text is required');
    expect(mockSpeechCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when text is an empty string', async () => {
    const request = new Request('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('text is required');
  });

  it('returns 500 with error message when openai throws', async () => {
    mockSpeechCreate.mockRejectedValue(new Error('OpenAI API unavailable'));

    const request = new Request('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('OpenAI API unavailable');
  });
});
