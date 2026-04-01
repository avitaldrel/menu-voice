import { openDB } from 'idb';
import type { Menu } from './menu-schema';

const DB_NAME = 'menuvoice';
const DB_VERSION = 1;

export function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const sessions = db.createObjectStore('sessions', {
        keyPath: 'id',
        autoIncrement: true,
      });
      sessions.createIndex('timestamp', 'timestamp');
      db.createObjectStore('settings');
    },
  });
}

export interface Session {
  id?: number;
  restaurantName: string | null;
  menuType: string | null;
  timestamp: number;
  menu: Menu;
}

export async function saveSession(session: Omit<Session, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('sessions', session) as Promise<number>;
}

export async function getRecentSessions(limit = 5): Promise<Session[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'timestamp');
  return all.reverse().slice(0, limit);
}

export async function clearSessions(): Promise<void> {
  const db = await getDB();
  await db.clear('sessions');
}

export interface UserProfile {
  allergies: string[];
  preferences: string[];
  dislikes: string[];
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDB();
  return (await db.get('settings', 'profile')) ?? null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('settings', profile, 'profile');
}

/**
 * Get current session count and increment it for next time.
 * Uses 'settings' store with key 'sessionCount' — no DB migration needed.
 * Returns the NEW count (1 on first visit, 2 on second, etc.)
 */
export async function getAndIncrementSessionCount(): Promise<number> {
  const db = await getDB();
  const count: number = (await db.get('settings', 'sessionCount')) ?? 0;
  await db.put('settings', count + 1, 'sessionCount');
  return count + 1;
}
