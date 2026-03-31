---
phase: 05-allergy-preference-system
plan: 01
subsystem: database
tags: [indexeddb, idb, fake-indexeddb, allergy, profile, testing]

# Dependency graph
requires:
  - phase: 01-foundation-menu-capture
    provides: IndexedDB setup with sessions and settings stores
provides:
  - UserProfile type (allergies, preferences, dislikes string arrays)
  - getProfile() / saveProfile() CRUD functions backed by IndexedDB settings store
  - parseAllergyMarkers() extracting [ALLERGY:X], [DISLIKE:X], [PREFERENCE:X] markers
  - stripMarkers() removing structured markers leaving clean spoken text
  - fake-indexeddb test infrastructure for IndexedDB unit tests
affects:
  - 05-02 (system prompt integration uses UserProfile and marker parsing)
  - 05-03 (voice loop integration uses parseAllergyMarkers and stripMarkers)
  - 05-04 (settings UI uses getProfile/saveProfile)

# Tech tracking
tech-stack:
  added: [fake-indexeddb ^6.2.5]
  patterns:
    - getDB() exported for test store cleanup (avoids deleteDatabase timeout issues)
    - fake-indexeddb/auto imported at top of setup.ts for global jsdom IndexedDB polyfill
    - Regex instances created fresh per parseAllergyMarkers call (avoids /g flag stale lastIndex)
    - stripMarkers cleans up space-before-punctuation left by removed markers

key-files:
  created:
    - src/lib/allergy-marker.ts
    - src/lib/__tests__/indexeddb-profile.test.ts
    - src/lib/__tests__/allergy-marker.test.ts
  modified:
    - src/lib/indexeddb.ts
    - src/test/setup.ts
    - package.json

key-decisions:
  - "getDB() exported from indexeddb.ts to allow test cleanup via db.clear('settings') — deleteDatabase approach caused timeout due to open connection"
  - "fake-indexeddb/auto imported at top of test setup.ts as first import for global polyfill before any idb imports"
  - "Fresh regex instances created per parseAllergyMarkers call — global /g flag reuses lastIndex across calls if regex is module-scoped"
  - "stripMarkers adds space-before-punctuation cleanup (.replace(/\\s+([.,!?;:])/g, '$1')) to handle periods left after trailing marker removal"

patterns-established:
  - "IndexedDB test pattern: use db.clear('settings') in beforeEach via exported getDB(), not deleteDatabase (avoids timeout)"
  - "Marker parsing pattern: /gi flags with fresh regex instances per call for case-insensitive, stateless extraction"

requirements-completed: [ALLERGY-01, ALLERGY-06, ALLERGY-02]

# Metrics
duration: 14min
completed: 2026-03-31
---

# Phase 05 Plan 01: Allergy & Preference Data Layer Summary

**UserProfile IndexedDB CRUD and allergy marker parsing utilities — foundational data layer for all downstream Phase 5 plans**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-31T01:46:48Z
- **Completed:** 2026-03-31T02:00:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed fake-indexeddb and wired it into test setup for IndexedDB unit testing in jsdom
- Added UserProfile type and getProfile()/saveProfile() functions to indexeddb.ts with 5 passing tests
- Created allergy-marker.ts with parseAllergyMarkers() and stripMarkers() utilities with 12 passing tests
- Total: 17 new tests, all green; existing 190 tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Install fake-indexeddb, add UserProfile type and CRUD functions** - `5899725` (feat)
2. **Task 2: Create allergy marker parsing and stripping utilities** - `1f4ab4a` (feat)

**Plan metadata:** (docs commit, see final commit)

## Files Created/Modified
- `src/lib/indexeddb.ts` - Added UserProfile interface, getProfile(), saveProfile(), exported getDB()
- `src/test/setup.ts` - Added `import 'fake-indexeddb/auto'` as first import for global jsdom polyfill
- `src/lib/__tests__/indexeddb-profile.test.ts` - 5 unit tests for UserProfile CRUD
- `src/lib/allergy-marker.ts` - ExtractedMarkers interface, parseAllergyMarkers(), stripMarkers()
- `src/lib/__tests__/allergy-marker.test.ts` - 12 unit tests for marker parsing and stripping
- `package.json` / `package-lock.json` - fake-indexeddb ^6.2.5 added as devDependency

## Decisions Made
- Exported `getDB()` from indexeddb.ts to enable test cleanup via `db.clear('settings')`. The `indexedDB.deleteDatabase()` approach timed out because the idb connection remains open within the module — clearing the store is the correct pattern.
- Added space-before-punctuation cleanup to `stripMarkers()`. When a marker like `[PREFERENCE:vegetarian]` precedes a period, removal leaves `...olives .` — the extra cleanup regex (`.replace(/\s+([.,!?;:])/g, '$1')`) produces clean spoken output.
- Fresh regex instances created per `parseAllergyMarkers()` call. Module-scoped `/g` regex retains `lastIndex` state across calls, causing missed matches on repeated invocations — creating fresh instances per call is the correct pattern per the plan's research notes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed space-before-punctuation in stripMarkers**
- **Found during:** Task 2 (TDD GREEN phase — test 9 failure)
- **Issue:** `stripMarkers('...with olives [PREFERENCE:vegetarian].')` produced `'...with olives .'` — space left before period after marker removal
- **Fix:** Added `.replace(/\s+([.,!?;:])/g, '$1')` step to stripMarkers implementation
- **Files modified:** `src/lib/allergy-marker.ts`
- **Verification:** Test 9 and all 12 tests pass
- **Committed in:** `1f4ab4a` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed beforeEach timeout in indexeddb-profile tests**
- **Found during:** Task 1 (TDD GREEN phase — tests 3-5 timing out)
- **Issue:** `indexedDB.deleteDatabase('menuvoice')` in beforeEach timed out (10s) because the idb module connection was still open; `openDB` without upgrade handler also failed with "No objectStore named settings"
- **Fix:** Exported `getDB()` from indexeddb.ts and used `db.clear('settings')` in beforeEach instead
- **Files modified:** `src/lib/indexeddb.ts`, `src/lib/__tests__/indexeddb-profile.test.ts`
- **Verification:** All 5 tests pass with no timeouts
- **Committed in:** `5899725` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs found during TDD green phase)
**Impact on plan:** Both fixes necessary for correct behavior. No scope creep. Plan's stated implementation was followed; only the test-cleanup mechanism and one missing cleanup step in stripMarkers were corrected.

## Issues Encountered
- Full test suite shows 4 pre-existing flaky timeouts in TextInputFallback.test.tsx — tests pass when run individually but timeout under full parallel suite load. These are out-of-scope and pre-existing (noted in plan: 189+ tests passing before this plan).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `UserProfile` type, `getProfile()`, `saveProfile()` ready for system prompt integration (05-02)
- `parseAllergyMarkers()` and `stripMarkers()` ready for voice loop integration (05-03)
- `fake-indexeddb` test infrastructure established — future IndexedDB tests can follow the same `db.clear('settings')` pattern in beforeEach

---
*Phase: 05-allergy-preference-system*
*Completed: 2026-03-31*
