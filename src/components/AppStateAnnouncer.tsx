'use client';

import type { AppState } from '@/lib/app-state';

interface AppStateAnnouncerProps {
  appState: AppState;
}

function getAnnouncementText(appState: AppState): string {
  if (appState.status === 'results') {
    const name = appState.menu.restaurantName ?? 'Restaurant menu';
    return `Menu loaded. ${name} is ready.`;
  }
  if (appState.status === 'processing') {
    const count = appState.fileCount;
    return `Reading your menu, ${count} photo${count === 1 ? '' : 's'}.`;
  }
  return '';
}

export function AppStateAnnouncer({ appState }: AppStateAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {getAnnouncementText(appState)}
    </div>
  );
}
