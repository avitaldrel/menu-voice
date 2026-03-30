import { describe, it, expect } from 'vitest';
import { voiceReducer, initialVoiceState, type VoiceState } from '@/lib/voice-state';

describe('voiceReducer', () => {
  // Valid transitions

  it('transitions from idle to listening on START_LISTENING', () => {
    const state: VoiceState = { status: 'idle' };
    const result = voiceReducer(state, { type: 'START_LISTENING' });
    expect(result).toEqual({ status: 'listening', transcript: '' });
  });

  it('transitions from listening to processing on SPEECH_RESULT', () => {
    const state: VoiceState = { status: 'listening', transcript: '' };
    const result = voiceReducer(state, { type: 'SPEECH_RESULT', transcript: 'hello' });
    expect(result).toEqual({ status: 'processing', transcript: 'hello' });
  });

  it('transitions from processing to speaking on FIRST_AUDIO_READY', () => {
    const state: VoiceState = { status: 'processing', transcript: 'hello' };
    const result = voiceReducer(state, { type: 'FIRST_AUDIO_READY', response: 'Hi there' });
    expect(result).toEqual({ status: 'speaking', transcript: 'hello', response: 'Hi there' });
  });

  it('transitions from speaking to listening on PLAYBACK_ENDED (auto-restart)', () => {
    const state: VoiceState = { status: 'speaking', transcript: 'hello', response: 'Hi there' };
    const result = voiceReducer(state, { type: 'PLAYBACK_ENDED' });
    expect(result).toEqual({ status: 'listening', transcript: '' });
  });

  it('transitions from speaking to idle on STOP', () => {
    const state: VoiceState = { status: 'speaking', transcript: 'hello', response: 'Hi there' };
    const result = voiceReducer(state, { type: 'STOP' });
    expect(result).toEqual({ status: 'idle' });
  });

  it('transitions from listening to idle on STOP', () => {
    const state: VoiceState = { status: 'listening', transcript: '' };
    const result = voiceReducer(state, { type: 'STOP' });
    expect(result).toEqual({ status: 'idle' });
  });

  it('transitions from any state to error on ERROR', () => {
    const states: VoiceState[] = [
      { status: 'idle' },
      { status: 'listening', transcript: '' },
      { status: 'processing', transcript: 'hi' },
      { status: 'speaking', transcript: 'hi', response: 'Hello' },
    ];
    for (const state of states) {
      const result = voiceReducer(state, { type: 'ERROR', message: 'error msg' });
      expect(result).toEqual({ status: 'error', message: 'error msg' });
    }
  });

  it('transitions from error to idle on RETRY', () => {
    const state: VoiceState = { status: 'error', message: 'something went wrong' };
    const result = voiceReducer(state, { type: 'RETRY' });
    expect(result).toEqual({ status: 'idle' });
  });

  it('preserves transcript on speaking -> listening (PLAYBACK_ENDED resets to empty)', () => {
    const state: VoiceState = { status: 'speaking', transcript: 'what do you have', response: 'We have pasta' };
    const result = voiceReducer(state, { type: 'PLAYBACK_ENDED' });
    expect(result).toEqual({ status: 'listening', transcript: '' });
  });

  // Invalid transitions — must return current state unchanged

  it('ignores SPEECH_RESULT from idle (invalid transition)', () => {
    const state: VoiceState = { status: 'idle' };
    const result = voiceReducer(state, { type: 'SPEECH_RESULT', transcript: 'hello' });
    expect(result).toBe(state);
  });

  it('ignores PLAYBACK_ENDED from idle (invalid transition)', () => {
    const state: VoiceState = { status: 'idle' };
    const result = voiceReducer(state, { type: 'PLAYBACK_ENDED' });
    expect(result).toBe(state);
  });

  it('ignores FIRST_AUDIO_READY from listening (invalid transition — enforces mutual exclusion)', () => {
    const state: VoiceState = { status: 'listening', transcript: 'hello' };
    const result = voiceReducer(state, { type: 'FIRST_AUDIO_READY', response: 'Hi there' });
    expect(result).toBe(state);
  });

  it('ignores START_LISTENING from speaking (enforces mutual exclusion — no bypass of processing)', () => {
    const state: VoiceState = { status: 'speaking', transcript: 'hello', response: 'Hi there' };
    const result = voiceReducer(state, { type: 'START_LISTENING' });
    expect(result).toBe(state);
  });

  it('ignores RETRY from non-error state (invalid transition)', () => {
    const state: VoiceState = { status: 'idle' };
    const result = voiceReducer(state, { type: 'RETRY' });
    expect(result).toBe(state);
  });

  // initialVoiceState

  it('initialVoiceState has status idle', () => {
    expect(initialVoiceState).toEqual({ status: 'idle' });
  });
});
