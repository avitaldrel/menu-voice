---
phase: 05-allergy-preference-system
plan: 02
subsystem: api
tags: [claude, chat-prompt, system-prompt, allergy, indexeddb, tts, voice-loop, markers]

# Dependency graph
requires:
  - phase: 05-01
    provides: UserProfile CRUD (getProfile/saveProfile), allergy-marker utilities (parseAllergyMarkers/stripMarkers)
  - phase: 03-menu-exploration-via-voice
    provides: buildSystemPrompt, /api/chat route, useVoiceLoop streaming pattern
provides:
  - buildSystemPrompt(menu, profile?) with backward-compatible allergy/preference rules injection
  - /api/chat route accepting optional profile in request body
  - useVoiceLoop loading profile on mount, sending to API, extracting markers, saving captures, stripping from display
affects: [05-03, phase-06-accessibility, any future plan touching chat-prompt or useVoiceLoop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Allergy section appended to system prompt only when profile has data — empty profile = no section
    - Markers placed at END of Claude responses; stripped before TTS history storage
    - profileRef pattern: useRef + useEffect(getProfile) on mount for SSR-safe profile access

key-files:
  created: []
  modified:
    - src/lib/chat-prompt.ts
    - src/lib/__tests__/chat-prompt.test.ts
    - src/app/api/chat/route.ts
    - src/app/api/chat/__tests__/route.test.ts
    - src/hooks/useVoiceLoop.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts

key-decisions:
  - "Allergy section appended only when profile has data — empty profile returns no section (backward compatible, Tests 1-3)"
  - "Markers instructed at END of Claude response so streaming TTS receives clean sentence text before markers arrive"
  - "spokenText (stripMarkers result) stored in conversation history — raw markers never appear in display or multi-turn context"
  - "profileRef useRef pattern mirrors menuRef pattern already established in useVoiceLoop"

patterns-established:
  - "System prompt builder accepts optional typed profile param — returns same prompt when absent (zero-config fallback)"
  - "Streaming hook: extract markers from fullResponse after stream loop, strip before storing to history"

requirements-completed: [ALLERGY-02, ALLERGY-03, ALLERGY-04, ALLERGY-05]

# Metrics
duration: 11min
completed: 2026-03-31
---

# Phase 05 Plan 02: Allergy Profile Integration Summary

**Allergy-aware system prompt with proactive warning, once-per-session disclaimer, in-conversation marker capture, and profile piped from IndexedDB through useVoiceLoop to /api/chat on every turn**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-03-31T02:03:31Z
- **Completed:** 2026-03-31T02:14:04Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended `buildSystemPrompt(menu, profile?)` with 7 allergy rules: proactive warning (ALLERGY-03), modification suggestion (ALLERGY-04), once-per-session safety disclaimer (ALLERGY-05), uncertain allergen flagging, overview mention, in-conversation capture trigger, and marker emission instructions (ALLERGY-02)
- Wired profile data from IndexedDB through useVoiceLoop (mount load) to /api/chat (body field) to buildSystemPrompt (parameter) on every turn
- Integrated parseAllergyMarkers + stripMarkers post-stream: markers extracted, new allergies/dislikes saved to IndexedDB, stripped text stored in conversation history and TTS display

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend buildSystemPrompt with allergy profile rules and marker emission instructions** - `6526861` (feat, TDD)
2. **Task 2: Wire profile through /api/chat route and integrate marker extraction in useVoiceLoop** - `2cb2920` (feat)

**Plan metadata:** (docs commit — see final state)

_Note: Task 1 used TDD (RED → GREEN) — wrote 17 failing tests, then implemented._

## Files Created/Modified
- `src/lib/chat-prompt.ts` — Added `buildAllergySection()` helper and optional profile param to `buildSystemPrompt()`
- `src/lib/__tests__/chat-prompt.test.ts` — Added 17 new allergy profile tests (33 total, all green)
- `src/app/api/chat/route.ts` — Added UserProfile import, profile in body type, profile destructure, passes to buildSystemPrompt
- `src/app/api/chat/__tests__/route.test.ts` — Refactored buildSystemPrompt mock to use vi.hoisted, added 2 profile tests (10 total)
- `src/hooks/useVoiceLoop.ts` — Added profileRef, getProfile on mount, profile in fetch body, marker extraction post-stream, spokenText for history
- `src/hooks/__tests__/useVoiceLoop.test.ts` — Added mocks for indexeddb and allergy-marker, 5 new profile/marker tests (29 total)

## Decisions Made
- Allergy section injected only when profile has non-empty allergies OR dislikes OR preferences — empty profile produces no section (backward compatible)
- Markers instructed at END of Claude response by system prompt so streaming TTS receives clean sentence text before any markers arrive; residual marker text in last TTS buffer is a known v1 limitation
- `profileRef` uses same useRef+useEffect pattern as `menuRef` already in useVoiceLoop — consistent, SSR-safe

## Deviations from Plan

None — plan executed exactly as written. The route test mock refactoring (adding vi.hoisted for buildSystemPrompt) was a straightforward prerequisite to verify call arguments and follows established project patterns.

## Issues Encountered
None — all tests passed on first run after implementation.

## Known Stubs
None — allergy data flows end-to-end: IndexedDB profile → useVoiceLoop → /api/chat → system prompt. Marker extraction persists captures back to IndexedDB. No placeholder data.

## Next Phase Readiness
- Plan 05-02 complete: allergy rules in prompt, profile piped through all layers, marker capture wired
- Plan 05-03 (Settings Page) can now build on the UserProfile CRUD already working (05-01) and the allergy integration complete (05-02)
- No blockers for 05-03

## Self-Check: PASSED

- FOUND: src/lib/chat-prompt.ts
- FOUND: src/lib/__tests__/chat-prompt.test.ts
- FOUND: src/app/api/chat/route.ts
- FOUND: src/app/api/chat/__tests__/route.test.ts
- FOUND: src/hooks/useVoiceLoop.ts
- FOUND: src/hooks/__tests__/useVoiceLoop.test.ts
- FOUND: .planning/phases/05-allergy-preference-system/05-02-SUMMARY.md
- FOUND commit: 6526861 (Task 1)
- FOUND commit: 2cb2920 (Task 2)
- All 240 tests pass (21 test files)

---
*Phase: 05-allergy-preference-system*
*Completed: 2026-03-31*
