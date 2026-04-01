---
phase: 07-polish-frontend-refinement
plan: "03"
subsystem: voice-commands-hints
tags: [voice-navigation, indexeddb, session-count, hint-system, accessibility]
dependency_graph:
  requires: [07-02]
  provides: [voice-command-routing, session-count-persistence, hint-frequency-system]
  affects: [useVoiceLoop, indexeddb, useVoiceLoop-tests, indexeddb-tests]
tech_stack:
  added: []
  patterns:
    - "VOICE_NAV_COMMANDS module-level const array — short-circuits before fetch in triggerResponse"
    - "useRouter from next/navigation inside hook — router.push for settings navigation"
    - "sessionCountRef + hintGivenThisSessionRef refs — no re-render on count update"
    - "getAndIncrementSessionCount uses settings store key sessionCount — no DB migration needed"
    - "Hint probability: 30% (sessions 2-5), 10% (sessions 6-10), 5% (sessions 11+)"
key_files:
  created: []
  modified:
    - src/lib/indexeddb.ts
    - src/hooks/useVoiceLoop.ts
    - src/lib/__tests__/indexeddb-profile.test.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts
decisions:
  - "Removed add-allergy voice command pattern (i'm allergic) — conflicts with allergy extraction via chat; phrase goes through chat API to extract allergy markers instead of routing to settings"
  - "triggerResponse useCallback includes router in deps array — router is a stable Next.js ref but included for React linting correctness"
  - "Hint setTimeout delays: 8000ms for first-session tutorial (let overview TTS finish), 10000ms for returning users (longer since they know the app)"
metrics:
  duration: "8 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 4
requirements_satisfied:
  - D-12
  - D-16
  - D-17
  - D-18
---

# Phase 7 Plan 3: Voice Commands, Hint System, and Scan New Menu Summary

Voice command routing short-circuits "open settings" and "scan new menu" before the chat API call, IndexedDB persists session count across reloads, and a decreasing-frequency hint system plays full tutorial on first session and contextual hints on returning visits.

## What Was Built

### Task 1: IndexedDB session count and voice command routing

**src/lib/indexeddb.ts** — Added `getAndIncrementSessionCount()` function using the existing `settings` object store with key `sessionCount`. Returns the new count (1 on first call, 2 on second, etc.). No DB version bump needed — the `settings` store was already created in upgrade().

**src/hooks/useVoiceLoop.ts** — Major additions:

1. Added `import { useRouter } from 'next/navigation'` and `import { getAndIncrementSessionCount }` from indexeddb.
2. Added `VOICE_NAV_COMMANDS` module-level constant with two commands:
   - `(open|go to|take me to) settings` → navigates to `/settings` with TTS "Opening settings."
   - `(scan new menu|new menu|scan again)` → calls `onRetakeRequested()` with TTS "Starting over. Please take a new photo."
3. Added `const router = useRouter()` inside the hook.
4. Added `sessionCountRef` and `hintGivenThisSessionRef` refs for hint tracking.
5. Added `useEffect` to call `getAndIncrementSessionCount()` on mount and store result in `sessionCountRef`.
6. Modified `triggerResponse` to check `VOICE_NAV_COMMANDS` BEFORE the fetch call — if matched, speaks confirmation, routes, and returns early (D-17).
7. Modified `triggerOverview` to add hint system after the overview API call:
   - Session 1: queues full tutorial text with 8-second delay
   - Sessions 2+: 30%/10%/5% chance of one contextual hint with 10-second delay

### Task 2: Wire voice commands and hints in page.tsx, add tests

**src/app/page.tsx** — No changes needed. All wiring was already correct from Plans 01 and 02:
- `handleVoiceRetake` dispatches `RESET` and is passed to `useVoiceLoop(menu, handleVoiceRetake)`
- `speakText={speakText}` passed to `RetakeGuidance`
- Results footer `ScanButton` has `variant="secondary" label="Scan New Menu" onFilesSelected={extract}`
- `handleStart` deps are `[startListening, speakWelcome]`

**src/lib/__tests__/indexeddb-profile.test.ts** — Added `describe('getAndIncrementSessionCount')` with 3 tests:
- Returns 1 on first call
- Returns 2 on second call
- Returns incrementing values on consecutive calls

**src/hooks/__tests__/useVoiceLoop.test.ts** — Added mocks for `useRouter` and `getAndIncrementSessionCount`, plus `describe('voice command routing')` with 5 tests:
- "open settings" routes to /settings without calling chat API
- "go to settings" routes to /settings
- "scan new menu" calls onRetakeRequested without calling chat API
- Normal speech ("what are the settings for seating") does NOT trigger navigation, DOES call chat API
- TTS confirmation is spoken before navigation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed "I'm allergic" voice command pattern**
- **Found during:** Task 1 test run
- **Issue:** The plan's VOICE_NAV_COMMANDS included `(i'm|i am) allergic` to route to settings. However, the existing allergy extraction system (Plan 05-02) works by routing "I am allergic to X" through the chat API which responds with `[ALLERGY:X]` markers. The voice command short-circuit fired before the chat API call, causing tests 27-29 (allergy marker extraction tests) to fail with 0 calls to `parseAllergyMarkers`.
- **Fix:** Removed the allergy trigger from VOICE_NAV_COMMANDS. Users saying "I'm allergic to X" get the better behavior: Claude confirms the allergy AND it gets saved to their profile via the marker system. Users wanting to manage allergies can say "open settings" explicitly.
- **Files modified:** `src/hooks/useVoiceLoop.ts`
- **Commit:** 1612379

## Known Stubs

None — all voice commands are fully wired through VOICE_NAV_COMMANDS with real router.push and onRetakeRequested calls. Session count persists via IndexedDB. Hint text is hardcoded strings (not placeholders — these are the final tutorial/hint strings).

## Self-Check: PASSED

Files modified verified:
- `src/lib/indexeddb.ts` — contains `export async function getAndIncrementSessionCount` ✓
- `src/hooks/useVoiceLoop.ts` — contains `VOICE_NAV_COMMANDS`, `router.push('/settings')`, `sessionCountRef`, `hintGivenThisSessionRef`, tutorial text ✓
- `src/lib/__tests__/indexeddb-profile.test.ts` — contains `describe('getAndIncrementSessionCount')` ✓
- `src/hooks/__tests__/useVoiceLoop.test.ts` — contains `describe('voice command routing')`, mockRouterPush ✓

Commits verified:
- 1612379: feat(07-03): IndexedDB session count, voice command routing, and hint system ✓
- 3152fbc: test(07-03): add session count and voice command routing tests ✓

Test results: 277 passing, 11 pre-existing failures (not caused by this plan) ✓
