export type VoiceState =
  | { status: 'idle' }
  | { status: 'listening'; transcript: string }
  | { status: 'processing'; transcript: string }
  | { status: 'speaking'; transcript: string; response: string }
  | { status: 'error'; message: string };

export type VoiceAction =
  | { type: 'START_LISTENING' }
  | { type: 'SPEECH_RESULT'; transcript: string }
  | { type: 'FIRST_AUDIO_READY'; response: string }
  | { type: 'PLAYBACK_ENDED' }
  | { type: 'STOP' }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' };

export const initialVoiceState: VoiceState = { status: 'idle' };

/**
 * Voice loop state machine reducer.
 *
 * Enforces strict mutual exclusion between listening and speaking states:
 * - No transition from speaking directly to listening (must go through processing)
 * - No transition from listening directly to speaking (must go through processing)
 *
 * Allowed transitions:
 *   idle        -> listening   (START_LISTENING)
 *   listening   -> processing  (SPEECH_RESULT)
 *   listening   -> idle        (STOP)
 *   listening   -> error       (ERROR)
 *   processing  -> speaking    (FIRST_AUDIO_READY)
 *   processing  -> error       (ERROR)
 *   speaking    -> listening   (PLAYBACK_ENDED — auto-restart)
 *   speaking    -> idle        (STOP — user interrupt)
 *   speaking    -> error       (ERROR)
 *   error       -> idle        (RETRY)
 *   any         -> error       (ERROR)
 *
 * Any action not matching an allowed transition returns the current state unchanged.
 */
export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (state.status) {
    case 'idle':
      switch (action.type) {
        case 'START_LISTENING':
          return { status: 'listening', transcript: '' };
        case 'ERROR':
          return { status: 'error', message: action.message };
        default:
          return state;
      }

    case 'listening':
      switch (action.type) {
        case 'SPEECH_RESULT':
          return { status: 'processing', transcript: action.transcript };
        case 'STOP':
          return { status: 'idle' };
        case 'ERROR':
          return { status: 'error', message: action.message };
        default:
          return state;
      }

    case 'processing':
      switch (action.type) {
        case 'FIRST_AUDIO_READY':
          return { status: 'speaking', transcript: state.transcript, response: action.response };
        case 'ERROR':
          return { status: 'error', message: action.message };
        default:
          return state;
      }

    case 'speaking':
      switch (action.type) {
        case 'PLAYBACK_ENDED':
          // Auto-restart listening — resets transcript to empty for new utterance
          return { status: 'listening', transcript: '' };
        case 'STOP':
          // User interrupt — go to idle, not back to listening
          return { status: 'idle' };
        case 'ERROR':
          return { status: 'error', message: action.message };
        default:
          return state;
      }

    case 'error':
      switch (action.type) {
        case 'RETRY':
          return { status: 'idle' };
        case 'ERROR':
          return { status: 'error', message: action.message };
        default:
          return state;
      }
  }
}
