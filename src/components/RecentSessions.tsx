'use client';

import { useState, useEffect } from 'react';
import { getRecentSessions, type Session } from '@/lib/indexeddb';

export function RecentSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecentSessions(5)
      .then(setSessions)
      .catch(() => {
        // IndexedDB may fail in private browsing; silently ignore
      })
      .finally(() => setLoaded(true));
  }, []);

  // Don't show anything until first load completes (avoids flash of empty state)
  if (!loaded) return null;

  // D-02: Empty on first visit
  if (sessions.length === 0) return null;

  return (
    <section aria-label="Recent restaurant visits" className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Recent Visits</h2>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="p-3 border border-gray-200 rounded-lg"
          >
            <p className="font-medium">
              {session.restaurantName ?? 'Unknown Restaurant'}
            </p>
            <p className="text-sm text-gray-500">
              {session.menuType && <span className="capitalize">{session.menuType} — </span>}
              {new Date(session.timestamp).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
