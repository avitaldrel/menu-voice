# Deferred Items

## Pre-existing Test Failures (Out of Scope)

### thinking-chime.test.ts — 4 failing tests

**File:** `src/lib/__tests__/thinking-chime.test.ts`
**Discovered during:** 02-03 execution (full test suite run)
**Status:** Pre-existing failures from Plan 01; not caused by Plan 03 changes

**Failing tests:**
- `startThinkingChime > starts an interval that fires every 2000ms`
- `startThinkingChime > calling startThinkingChime twice does not create duplicate intervals`
- `stopThinkingChime > clears the interval so chimes stop firing after stop`
- `stopThinkingChime > allows restarting after stop`

**Root cause:** `Cannot read properties of null (reading 'createOscillator')` — AudioContext module-level cache causes state leakage between tests when `vi.restoreAllMocks()` nullifies the prototype spies mid-test-run. The `thinking-chime` module caches a single AudioContext instance at module level; after `stopThinkingChime` is called in `afterEach`, the cached context is set to null by the module's internal logic, so subsequent test calls to `startThinkingChime` call `null.createOscillator`.

**Action:** Deferred — requires fixing either the thinking-chime module's context caching logic or the test isolation approach. Not related to voice UI components.
