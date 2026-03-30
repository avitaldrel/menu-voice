---
phase: 02-voice-interface
plan: 05
subsystem: voice
tags: [react-hooks, web-speech-api, tts, state-machine, vitest]

# Dependency graph
requires:
  - phase: 02-voice-interface
    provides: useVoiceLoop hook with voice state machine, SpeechManager, TTSClient wired together

provides:
  - Auto-restart of speech recognition after TTS playback ends (PLAYBACK_ENDED -> listening)
  - prevStatusRef guard preventing double-start on initial idle->listening tap
  - Tests 14 (strengthened), 15, 16 verifying hardware restart behaviour

affects:
  - 03-ai-conversation (relies on continuous voice loop being functional end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prevStatusRef pattern: track previous state in a ref to detect specific transitions inside useEffect"

key-files:
  created: []
  modified:
    - src/hooks/useVoiceLoop.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts

key-decisions:
  - "prevStatusRef.current === 'speaking' guard ensures useEffect only calls start() on the post-speaking auto-restart path, not on the initial idle->listening tap (startListening() handles that)"

patterns-established:
  - "prevStatusRef pattern: when a useEffect watches a state value but must only act on specific transitions (not all entrances to a given state), track the previous value in a ref and guard on it"

requirements-completed: [VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, A11Y-05, A11Y-06]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 2 Plan 05: Voice Interface Gap Closure Summary

**Auto-restart gap closed: useEffect now calls speechManagerRef.current.start() on the speaking->listening transition, enabling continuous hands-free voice conversation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T15:42:00Z
- **Completed:** 2026-03-30T15:46:00Z
- **Tasks:** 1 (TDD: RED commit + GREEN commit)
- **Files modified:** 2

## Accomplishments

- Fixed empty useEffect body in `useVoiceLoop.ts` — after TTS playback ends, speech recognition now actually restarts the Web Speech API session via `speechManagerRef.current.start()`
- Added `prevStatusRef` to detect the `speaking -> listening` transition specifically, preventing double-start on the initial `idle -> listening` tap path
- Strengthened Test 14 and added Tests 15 and 16 to assert hardware microphone restart and guard against regression
- Full test suite remains green: 157 tests, 0 failures (up from 155 before this plan)

## Task Commits

Each task was committed atomically (TDD pattern: RED then GREEN):

1. **Task 1 RED: add failing tests for auto-restart** - `28e3de8` (test)
2. **Task 1 GREEN: fix auto-restart useEffect** - `2d46222` (feat)

_TDD task: test commit followed immediately by implementation commit._

## Files Created/Modified

- `src/hooks/useVoiceLoop.ts` — Added `prevStatusRef`, fixed empty useEffect body with guard and `speechManagerRef.current.start()` call
- `src/hooks/__tests__/useVoiceLoop.test.ts` — Strengthened Test 14 with `toHaveBeenCalledTimes(2)`, added Test 15 (no-double-start), added Test 16 (full cycle regression)

## Decisions Made

- **prevStatusRef guard pattern**: rather than checking a "was previously speaking" boolean flag, we track the entire previous status string in a ref. This is more explicit and handles future state additions cleanly. The guard `prevStatusRef.current === 'speaking'` is the minimal precise condition for the auto-restart path.

## Deviations from Plan

None — plan executed exactly as written. Implementation steps, test names, and expected call counts all matched the plan spec.

## Issues Encountered

None. The fix was straightforward: add `prevStatusRef`, update the empty useEffect body, and the tests confirmed correct behaviour on first run.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None introduced in this plan. The existing `triggerResponse` placeholder echo in `useVoiceLoop.ts` (Phase 2 intentional stub, replaced in Phase 3) is unchanged and was documented in 02-04-SUMMARY.md.

## Next Phase Readiness

- VOICE-06 unblocked: continuous voice conversation loop is now functional end-to-end at the unit-test level
- Phase 2 success criterion 5 satisfied: "After the app finishes speaking, speech recognition automatically restarts for the next utterance"
- Phase 3 (AI Conversation) can proceed: the voice loop correctly restarts listening after each response, enabling natural back-and-forth dialogue
- Human verification of hardware microphone activation still required (cannot verify browser API behaviour programmatically)

---
*Phase: 02-voice-interface*
*Completed: 2026-03-30*

## Self-Check: PASSED

- `src/hooks/useVoiceLoop.ts` — FOUND
- `src/hooks/__tests__/useVoiceLoop.test.ts` — FOUND
- `.planning/phases/02-voice-interface/02-05-SUMMARY.md` — FOUND
- Commit `28e3de8` (RED: failing tests) — FOUND
- Commit `2d46222` (GREEN: implementation fix) — FOUND
