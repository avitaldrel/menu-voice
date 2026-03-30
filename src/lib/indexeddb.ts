import { openDB } from 'idb';
import type { Menu } from './menu-schema';

const DB_NAME = 'menuvoice';
const DB_VERSION = 1;

function getDB() {
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
