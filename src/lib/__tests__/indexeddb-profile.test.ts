import { describe, it, expect, beforeEach } from 'vitest';
// @ts-expect-error – internal export used for test cleanup only
import { getDB } from '@/lib/indexeddb';
import { getProfile, saveProfile, getAndIncrementSessionCount } from '@/lib/indexeddb';

// Helper: clear the settings store between tests to ensure fresh state
// Uses the same getDB() that indexeddb.ts uses (includes upgrade handler)
async function clearSettingsStore() {
  const db = await getDB();
  await db.clear('settings');
}

describe('UserProfile IndexedDB CRUD', () => {
  beforeEach(async () => {
    await clearSettingsStore();
  });

  it('Test 1: getProfile() returns null when no profile has been saved (fresh DB)', async () => {
    const result = await getProfile();
    expect(result).toBeNull();
  });

  it('Test 2: saveProfile() persists data and getProfile() retrieves the exact same object', async () => {
    const profile = {
      allergies: ['dairy'],
      preferences: [],
      dislikes: ['cilantro'],
    };
    await saveProfile(profile);
    const result = await getProfile();
    expect(result).toEqual(profile);
  });

  it('Test 3: saveProfile() called twice overwrites the previous profile (last-write-wins)', async () => {
    const first = { allergies: ['gluten'], preferences: ['spicy'], dislikes: [] };
    const second = { allergies: ['dairy'], preferences: [], dislikes: ['cilantro'] };
    await saveProfile(first);
    await saveProfile(second);
    const result = await getProfile();
    expect(result).toEqual(second);
    expect(result?.allergies).not.toContain('gluten');
  });

  it('Test 4: getProfile() returns null after store is cleared (idb undefined -> null coercion)', async () => {
    // Store cleared in beforeEach — nothing saved
    const result = await getProfile();
    expect(result).toBeNull();
    // Verify consistently null, not undefined
    const result2 = await getProfile();
    expect(result2).toBeNull();
    expect(result2).not.toBeUndefined();
  });

  it('Test 5: Profile with empty arrays is saved and retrieved correctly', async () => {
    const empty = { allergies: [], preferences: [], dislikes: [] };
    await saveProfile(empty);
    const result = await getProfile();
    expect(result).toEqual(empty);
    expect(result?.allergies).toEqual([]);
    expect(result?.preferences).toEqual([]);
    expect(result?.dislikes).toEqual([]);
  });
});

describe('getAndIncrementSessionCount', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('returns 1 on first call', async () => {
    const count = await getAndIncrementSessionCount();
    expect(count).toBe(1);
  });

  it('returns 2 on second call', async () => {
    await getAndIncrementSessionCount();
    const count = await getAndIncrementSessionCount();
    expect(count).toBe(2);
  });

  it('returns incrementing values on consecutive calls', async () => {
    const first = await getAndIncrementSessionCount();
    const second = await getAndIncrementSessionCount();
    const third = await getAndIncrementSessionCount();
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(third).toBe(3);
  });
});
