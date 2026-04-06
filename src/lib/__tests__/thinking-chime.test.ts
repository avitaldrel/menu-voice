/**
 * Thinking chime tests.
 *
 * The thinking-chime module caches AudioContext at module level.
 * We replace window.AudioContext with a spy-friendly mock to capture
 * createBufferSource calls and verify the chime behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startThinkingChime, stopThinkingChime } from '../thinking-chime';

// Shared mock instance — will be the AudioContext returned by `new AudioContext()`
const createBufferSourceMock = vi.fn(() => ({
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

const createBiquadFilterMock = vi.fn(() => ({
  type: 'bandpass' as BiquadFilterType,
  frequency: { value: 0 },
  Q: { value: 0 },
  connect: vi.fn(),
}));

const createGainMock = vi.fn(() => ({
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
}));

const createBufferMock = vi.fn(() => ({
  getChannelData: vi.fn(() => new Float32Array(1024)),
}));

const mockCtx = {
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  createBufferSource: createBufferSourceMock,
  createBiquadFilter: createBiquadFilterMock,
  createGain: createGainMock,
  createBuffer: createBufferMock,
};

const MockAudioContextCtor = vi.fn(function MockAudioContext() {
  return mockCtx;
});

beforeEach(() => {
  vi.useFakeTimers();
  stopThinkingChime(); // ensure clean state before each test
  vi.clearAllMocks();
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContextCtor,
  });
});

afterEach(() => {
  stopThinkingChime();
  vi.useRealTimers();
});

describe('startThinkingChime', () => {
  it('plays a chime immediately on start (calls createBufferSource)', () => {
    startThinkingChime();
    expect(createBufferSourceMock).toHaveBeenCalled();
  });

  it('connects source through filter and gain to destination', () => {
    startThinkingChime();

    const source = createBufferSourceMock.mock.results[0].value;
    const filter = createBiquadFilterMock.mock.results[0].value;
    const gain = createGainMock.mock.results[0].value;

    expect(source.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(mockCtx.destination);
  });

  it('source is started and stopped after the chime duration', () => {
    startThinkingChime();

    const source = createBufferSourceMock.mock.results[0].value;
    expect(source.start).toHaveBeenCalled();
    expect(source.stop).toHaveBeenCalled();
  });

  it('starts an interval that fires every 3000ms', () => {
    startThinkingChime();

    const initialCallCount = createBufferSourceMock.mock.calls.length;

    // Advance 3000ms — one interval tick
    vi.advanceTimersByTime(3000);
    expect(createBufferSourceMock).toHaveBeenCalledTimes(initialCallCount + 1);

    // Advance another 3000ms — second tick
    vi.advanceTimersByTime(3000);
    expect(createBufferSourceMock).toHaveBeenCalledTimes(initialCallCount + 2);
  });

  it('calling startThinkingChime twice does not create duplicate intervals', () => {
    startThinkingChime();
    startThinkingChime(); // second call is guarded by chimeInterval !== null check

    const callCountAfterStarts = createBufferSourceMock.mock.calls.length;

    // Advance 3000ms — only one interval should fire
    vi.advanceTimersByTime(3000);
    expect(createBufferSourceMock).toHaveBeenCalledTimes(callCountAfterStarts + 1);
  });

  it('does nothing silently when AudioContext is not available', () => {
    Object.defineProperty(window, 'AudioContext', { writable: true, value: undefined });

    // Should not throw
    expect(() => startThinkingChime()).not.toThrow();
    // createBufferSource never called because AudioContext was unavailable
    expect(createBufferSourceMock).not.toHaveBeenCalled();
  });
});

describe('stopThinkingChime', () => {
  it('clears the interval so chimes stop firing', () => {
    startThinkingChime();

    const callCountAfterStart = createBufferSourceMock.mock.calls.length;

    stopThinkingChime();

    // Advance 6000ms — should not fire any more chimes
    vi.advanceTimersByTime(6000);
    expect(createBufferSourceMock).toHaveBeenCalledTimes(callCountAfterStart);
  });

  it('can be called multiple times without throwing', () => {
    expect(() => {
      stopThinkingChime();
      stopThinkingChime();
      stopThinkingChime();
    }).not.toThrow();
  });

  it('allows restarting after stop', () => {
    startThinkingChime();
    stopThinkingChime();

    const callCountAfterStop = createBufferSourceMock.mock.calls.length;

    // Restart — should play immediate chime again
    startThinkingChime();
    expect(createBufferSourceMock.mock.calls.length).toBeGreaterThan(callCountAfterStop);

    const callCountAfterRestart = createBufferSourceMock.mock.calls.length;

    // Interval also fires
    vi.advanceTimersByTime(3000);
    expect(createBufferSourceMock).toHaveBeenCalledTimes(callCountAfterRestart + 1);
  });
});
