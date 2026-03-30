import type { Menu } from './menu-schema';

export type AppState =
  | { status: 'idle' }
  | { status: 'processing'; fileCount: number }
  | { status: 'results'; menu: Menu; sessionId: number }
  | { status: 'error'; message: string; retryable: boolean };

export type AppAction =
  | { type: 'FILES_SELECTED'; fileCount: number }
  | { type: 'EXTRACTION_SUCCESS'; menu: Menu; sessionId: number }
  | { type: 'EXTRACTION_ERROR'; message: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILES_SELECTED':
      return { status: 'processing', fileCount: action.fileCount };
    case 'EXTRACTION_SUCCESS':
      return { status: 'results', menu: action.menu, sessionId: action.sessionId };
    case 'EXTRACTION_ERROR':
      return { status: 'error', message: action.message, retryable: true };
    case 'RETRY':
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}
