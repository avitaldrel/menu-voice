import type { Menu } from './menu-schema';

export type AppState =
  | { status: 'welcome' }
  | { status: 'idle' }
  | { status: 'processing'; fileCount: number }
  | { status: 'results'; menu: Menu; sessionId: number }
  | { status: 'retake'; menu: Menu; sessionId: number; attemptCount: number; guidance: string }
  | { status: 'error'; message: string; retryable: boolean };

export type AppAction =
  | { type: 'FILES_SELECTED'; fileCount: number }
  | { type: 'EXTRACTION_SUCCESS'; menu: Menu; sessionId: number }
  | { type: 'EXTRACTION_ERROR'; message: string }
  | { type: 'EXTRACTION_LOW_QUALITY'; menu: Menu; sessionId: number; guidance: string; attemptCount: number }
  | { type: 'PROCEED_ANYWAY' }
  | { type: 'RETRY_CAPTURE' }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'START' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILES_SELECTED':
      return { status: 'processing', fileCount: action.fileCount };
    case 'EXTRACTION_SUCCESS':
      return { status: 'results', menu: action.menu, sessionId: action.sessionId };
    case 'EXTRACTION_ERROR':
      return { status: 'error', message: action.message, retryable: true };
    case 'EXTRACTION_LOW_QUALITY':
      return {
        status: 'retake',
        menu: action.menu,
        sessionId: action.sessionId,
        attemptCount: action.attemptCount,
        guidance: action.guidance,
      };
    case 'PROCEED_ANYWAY':
      if (state.status !== 'retake') return state;
      return { status: 'results', menu: state.menu, sessionId: state.sessionId };
    case 'RETRY_CAPTURE':
      return { status: 'welcome' };
    case 'START':
      return { status: 'idle' };
    case 'RETRY':
    case 'RESET':
      return { status: 'welcome' };
    default:
      return state;
  }
}
