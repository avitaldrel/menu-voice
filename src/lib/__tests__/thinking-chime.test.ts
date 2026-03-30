/**
 * Thinking chime tests.
 *
 * The thinking-chime module caches AudioContext at module level.
 * We replace window.AudioContext with a spy-friendly mock to capture
 * createOscillator calls and verify the chime behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startThinkingChime, stopThinkingChime } from '../thinking-chime';

// Shared mock instance — will be the AudioContext returned by `new AudioContext()`
// We use a single instance to track all calls (module caches AudioContext)
const createOscillatorMock = vi.fn(() => ({
  type: 'sine' as OscillatorType,
  frequency: { value: 440 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

const createGainMock = vi.fn(() => ({
  gain: { value: 1 },
  connect: vi.fn(),
}));

const mockCtx = {
  destination: {},
  currentTime: 0,
  createOscillator: createOscillatorMock,
  createGain: createGainMock,
};

// Replace AudioContext with a constructor that returns our tracked mock
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
  it('plays a chime immediately on start (calls createOscillator)', () => {
    startThinkingChime();
    expect(createOscillatorMock).toHaveBeenCalled();
  });

  it('connects oscillator through gain to destination', () => {
    startThinkingChime();

    const osc = createOscillatorMock.mock.results[0].value;
    const gain = createGainMock.mock.results[0].value;

    expect(osc.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(mockCtx.destination);
  });

  it('oscillator is started and stopped after 0.2s (200ms beep)', () => {
    startThinkingChime();

    const osc = createOscillatorMock.mock.results[0].value;
    expect(osc.start).toHaveBeenCalled();
    // stop is called with currentTime + 0.2
    expect(osc.stop).toHaveBeenCalledWith(0.2);
  });

  it('starts an interval that fires every 2000ms', () => {
    startThinkingChime();

    const initialCallCount = createOscillatorMock.mock.calls.length;

    // Advance 2000ms — one interval tick
    vi.advanceTimersByTime(2000);
    expect(createOscillatorMock).toHaveBeenCalledTimes(initialCallCount + 1);

    // Advance another 2000ms — second tick
    vi.advanceTimersByTime(2000);
    expect(createOscillatorMock).toHaveBeenCalledTimes(initialCallCount + 2);
  });

  it('calling startThinkingChime twice does not create duplicate intervals', () => {
    startThinkingChime();
    startThinkingChime(); // second call is guarded by chimeInterval !== null check

    const callCountAfterStarts = createOscillatorMock.mock.calls.length;

    // Advance 2000ms — only one interval should fire
    vi.advanceTimersByTime(2000);
    expect(createOscillatorMock).toHaveBeenCalledTimes(callCountAfterStarts + 1);
  });

  it('does nothing silently when AudioContext is not available', () => {
    Object.defineProperty(window, 'AudioContext', { writable: true, value: undefined });

    // Should not throw
    expect(() => startThinkingChime()).not.toThrow();
    // createOscillator never called because AudioContext was unavailable
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });
});

describe('stopThinkingChime', () => {
  it('clears the interval so chimes stop firing', () => {
    startThinkingChime();

    const callCountAfterStart = createOscillatorMock.mock.calls.length;

    stopThinkingChime();

    // Advance 4000ms — should not fire any more chimes
    vi.advanceTimersByTime(4000);
    expect(createOscillatorMock).toHaveBeenCalledTimes(callCountAfterStart);
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

    const callCountAfterStop = createOscillatorMock.mock.calls.length;

    // Restart — should play immediate chime again
    startThinkingChime();
    expect(createOscillatorMock.mock.calls.length).toBeGreaterThan(callCountAfterStop);

    const callCountAfterRestart = createOscillatorMock.mock.calls.length;

    // Interval also fires
    vi.advanceTimersByTime(2000);
    expect(createOscillatorMock).toHaveBeenCalledTimes(callCountAfterRestart + 1);
  });
});
