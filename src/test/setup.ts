import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// SpeechRecognition mock — needed for voice tests in jsdom
// jsdom does not implement the Web Speech API, so we provide stubs
export const mockRecognitionInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onresult: null as ((event: SpeechRecognitionEvent) => void) | null,
  onerror: null as ((event: SpeechRecognitionErrorEvent) => void) | null,
  onend: null as (() => void) | null,
  onstart: null as (() => void) | null,
  lang: 'en-US',
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
};

const MockSpeechRecognition = vi.fn(function () { return mockRecognitionInstance; });

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

// AudioContext mock — needed for thinking chime tests in jsdom
class MockAudioContext {
  destination = {};
  currentTime = 0;
  state = 'running' as AudioContextState;
  resume = vi.fn(() => Promise.resolve());
  createOscillator = vi.fn(() => ({
    type: 'sine' as OscillatorType,
    frequency: { value: 440 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  }));
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// speechSynthesis mock — needed for TTS fallback tests in jsdom
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    onvoiceschanged: null,
  },
});
