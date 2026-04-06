import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockRecognitionInstance } from '../../test/setup';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  SpeechManager,
  isVoiceCommand,
} from '../speech-recognition';

describe('isSpeechRecognitionSupported', () => {
  it('returns true when window.SpeechRecognition exists', () => {
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it('returns false when both SpeechRecognition and webkitSpeechRecognition are undefined', () => {
    const origSR = window.SpeechRecognition;
    const origWSR = window.webkitSpeechRecognition;
    Object.defineProperty(window, 'SpeechRecognition', { writable: true, value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { writable: true, value: undefined });
    expect(isSpeechRecognitionSupported()).toBe(false);
    Object.defineProperty(window, 'SpeechRecognition', { writable: true, value: origSR });
    Object.defineProperty(window, 'webkitSpeechRecognition', { writable: true, value: origWSR });
  });
});

describe('createSpeechRecognition', () => {
  it('returns a SpeechRecognition instance with correct configuration', () => {
    const recognition = createSpeechRecognition();
    expect(recognition).not.toBeNull();
    expect(recognition!.continuous).toBe(true);
    expect(recognition!.interimResults).toBe(true);
    expect(recognition!.lang).toBe('en-US');
    expect(recognition!.maxAlternatives).toBe(1);
  });

  it('returns null when speech recognition is not supported', () => {
    const origSR = window.SpeechRecognition;
    const origWSR = window.webkitSpeechRecognition;
    Object.defineProperty(window, 'SpeechRecognition', { writable: true, value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { writable: true, value: undefined });
    expect(createSpeechRecognition()).toBeNull();
    Object.defineProperty(window, 'SpeechRecognition', { writable: true, value: origSR });
    Object.defineProperty(window, 'webkitSpeechRecognition', { writable: true, value: origWSR });
  });
});

describe('isVoiceCommand', () => {
  it('returns true for "stop" command', () => {
    expect(isVoiceCommand('stop')).toBe(true);
    expect(isVoiceCommand('STOP')).toBe(true);
    expect(isVoiceCommand('  stop  ')).toBe(true);
  });

  it('returns true for "pause" command', () => {
    expect(isVoiceCommand('pause')).toBe(true);
    expect(isVoiceCommand('PAUSE')).toBe(true);
  });

  it('returns false for regular speech', () => {
    expect(isVoiceCommand('what are the pasta options')).toBe(false);
    expect(isVoiceCommand('tell me about the chicken')).toBe(false);
    expect(isVoiceCommand('')).toBe(false);
  });
});

describe('SpeechManager', () => {
  let onTranscript: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onRestart: ReturnType<typeof vi.fn>;
  let manager: SpeechManager;

  beforeEach(() => {
    vi.clearAllMocks();
    onTranscript = vi.fn();
    onError = vi.fn();
    onRestart = vi.fn();
    manager = new SpeechManager(onTranscript, onError, onRestart);
  });

  afterEach(() => {
    manager.destroy();
  });

  it('calls recognition.start() when start() is called', () => {
    manager.start();
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
  });

  it('calls recognition.stop() when stop() is called', () => {
    manager.start();
    manager.stop();
    expect(mockRecognitionInstance.stop).toHaveBeenCalledOnce();
  });

  it('extracts transcript from last result in onresult event after 2s silence', () => {
    vi.useFakeTimers();
    manager.start();
    if (mockRecognitionInstance.onresult) {
      const evt = {
        results: [
          Object.assign([{ transcript: 'what are the pasta options' }], { isFinal: true }),
        ],
      } as unknown as SpeechRecognitionEvent;
      mockRecognitionInstance.onresult(evt);
    }
    // Not called immediately — waiting for 2s silence
    expect(onTranscript).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onTranscript).toHaveBeenCalledWith('what are the pasta options');
    vi.useRealTimers();
  });

  it('handles iOS isFinal=false by using transcript length fallback after 2s silence', () => {
    vi.useFakeTimers();
    manager.start();
    if (mockRecognitionInstance.onresult) {
      const evt = {
        results: [
          Object.assign([{ transcript: 'some speech here' }], { isFinal: false }),
        ],
      } as unknown as SpeechRecognitionEvent;
      mockRecognitionInstance.onresult(evt);
    }
    expect(onTranscript).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onTranscript).toHaveBeenCalledWith('some speech here');
    vi.useRealTimers();
  });

  it('does not restart when onend fires after stop()', () => {
    vi.useFakeTimers();
    manager.start();
    manager.stop(); // sets shouldRestart = false
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    vi.runAllTimers();
    // start was called once initially, should not be called again
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('restarts with 300ms delay when onend fires while shouldRestart is true', () => {
    vi.useFakeTimers();
    manager.start();
    // Trigger onresult first to set shouldRestart = false, then manually reset
    // Instead, fire onend without a result (no-speech scenario means shouldRestart stays true)
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    // Before timer fires, start should only have been called once
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(300);
    // After 300ms, should restart
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(2);
    expect(onRestart).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('sets shouldRestart=false and calls onError on not-allowed error', () => {
    vi.useFakeTimers();
    manager.start();
    if (mockRecognitionInstance.onerror) {
      mockRecognitionInstance.onerror({ error: 'not-allowed' } as SpeechRecognitionErrorEvent);
    }
    // Fire onend after onerror — should not restart
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    vi.runAllTimers();
    expect(onError).toHaveBeenCalledWith('Microphone permission denied');
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce(); // only the initial start
    vi.useRealTimers();
  });

  it('leaves shouldRestart unchanged on no-speech error (handled via onend)', () => {
    vi.useFakeTimers();
    manager.start();
    if (mockRecognitionInstance.onerror) {
      mockRecognitionInstance.onerror({ error: 'no-speech' } as SpeechRecognitionErrorEvent);
    }
    // onError should NOT be called for no-speech
    expect(onError).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('detects voice commands and calls stop() without invoking onTranscript', () => {
    manager.start();
    if (mockRecognitionInstance.onresult) {
      const evt = {
        results: [
          Object.assign([{ transcript: 'stop' }], { isFinal: true }),
        ],
      } as unknown as SpeechRecognitionEvent;
      mockRecognitionInstance.onresult(evt);
    }
    expect(onTranscript).not.toHaveBeenCalled();
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
  });

  it('detects pause voice command', () => {
    manager.start();
    if (mockRecognitionInstance.onresult) {
      const evt = {
        results: [
          Object.assign([{ transcript: 'pause' }], { isFinal: true }),
        ],
      } as unknown as SpeechRecognitionEvent;
      mockRecognitionInstance.onresult(evt);
    }
    expect(onTranscript).not.toHaveBeenCalled();
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
  });

  it('audio-capture error also sets shouldRestart=false and calls onError', () => {
    vi.useFakeTimers();
    manager.start();
    if (mockRecognitionInstance.onerror) {
      mockRecognitionInstance.onerror({ error: 'audio-capture' } as SpeechRecognitionErrorEvent);
    }
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    vi.runAllTimers();
    expect(onError).toHaveBeenCalledWith('Microphone permission denied');
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
