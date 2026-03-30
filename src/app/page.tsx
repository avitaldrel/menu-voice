'use client';

import { useReducer } from 'react';
import { appReducer, type AppState } from '@/lib/app-state';
import { useMenuExtraction } from '@/hooks/useMenuExtraction';
import { ScanButton } from '@/components/ScanButton';
import { ProcessingState } from '@/components/ProcessingState';
import { ErrorState } from '@/components/ErrorState';
import { MenuSummary } from '@/components/MenuSummary';
import { RecentSessions } from '@/components/RecentSessions';

const initialState: AppState = { status: 'idle' };

export default function HomePage() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { extract } = useMenuExtraction(dispatch);

  return (
    <div className="max-w-lg mx-auto">
      {/* D-01: Screen reader announcement for the landing page */}
      <h1 className="sr-only">MenuVoice. Tap Scan Menu to photograph a restaurant menu.</h1>

      {/* ProcessingState ARIA live region — ALWAYS in DOM (prevents screen reader re-mount issues) */}
      <ProcessingState
        isVisible={state.status === 'processing'}
        message={
          state.status === 'processing'
            ? `Reading your menu... (${state.fileCount} ${state.fileCount === 1 ? 'photo' : 'photos'})`
            : ''
        }
      />

      {/* Idle state: scan button + recent sessions */}
      {state.status === 'idle' && (
        <div className="flex flex-col items-center gap-6 pt-8">
          <div className="w-full max-w-sm">
            <ScanButton onFilesSelected={extract} />
          </div>
          <RecentSessions />
        </div>
      )}

      {/* Results state: menu summary + scan again button */}
      {state.status === 'results' && (
        <div className="space-y-6">
          <MenuSummary menu={state.menu} />
          <div className="pt-4 border-t border-gray-200">
            <ScanButton
              onFilesSelected={extract}
              disabled={false}
            />
          </div>
        </div>
      )}

      {/* Error state: error message + retry */}
      {state.status === 'error' && (
        <ErrorState
          message={state.message}
          onRetry={() => dispatch({ type: 'RETRY' })}
        />
      )}
    </div>
  );
}
