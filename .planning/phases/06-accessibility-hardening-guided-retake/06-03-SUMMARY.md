---
phase: 06-accessibility-hardening-guided-retake
plan: 03
subsystem: ui
tags: [tts, accessibility, voiceover, ios-safari, welcome-message, tdd]

# Dependency graph
requires:
  - phase: 06-accessibility-hardening-guided-retake/06-01
    provides: AppStateAnnouncer ARIA live region and page titles for route announcer
  - phase: 06-accessibility-hardening-guided-retake/06-02
    provides: RetakeGuidance component and quality-based extraction routing
  - phase: 02-voice-interface
    provides: useVoiceLoop hook, TTSClient, VoiceState machine
provides:
  - speakWelcome() one-shot function in useVoiceLoop — queues welcome TTS via audio element on first user gesture
  - handleIdleScan in page.tsx — chains welcome TTS to first ScanButton tap for iOS Safari autoplay compliance
  - Human-verified complete VoiceOver end-to-end flow (A11Y-01 satisfied)
affects: [any future voice flow changes, useVoiceLoop consumers]

# Tech tracking
tech-stack:
  added: []
  patterns: [one-shot ref guard for welcome TTS, user-gesture-chained audio for iOS Safari autoplay compliance]

key-files:
  created: []
  modified:
    - src/hooks/useVoiceLoop.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts
    - src/app/page.tsx

key-decisions:
  - "speakWelcome chained to first ScanButton tap (user gesture) — satisfies iOS Safari autoplay policy; cannot fire on page mount"
  - "hasPlayedWelcomeRef one-shot guard — welcome message plays exactly once per session, never repeats"
  - "TTSClient.queueText + flush used (audio element pipeline) — NOT SpeechSynthesis, avoids VoiceOver conflict per CLAUDE.md"
  - "SPEECH_RESULT with empty transcript dispatched after queueText — enters processing/speaking flow via existing state machine"
  - "handleIdleScan wraps idle ScanButton only — results-state bottom ScanButton keeps extract directly (no welcome on re-scan)"

patterns-established:
  - "Welcome TTS pattern: chain audio to first user gesture via callback wrapper, guard with useRef to prevent repeats"
  - "iOS Safari autoplay: any audio playback must be synchronously triggered from a user gesture handler, not useEffect or setTimeout"

requirements-completed: [A11Y-01]

# Metrics
duration: ~5min
completed: 2026-03-30
---

# Phase 6 Plan 03: Welcome TTS on First Interaction Summary

**One-shot welcome TTS wired to first ScanButton tap via TTSClient audio element, satisfying iOS Safari autoplay policy and completing A11Y-01 VoiceOver end-to-end accessibility**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-30T23:26:53Z
- **Completed:** 2026-03-30T23:29:02Z (code), human verification approved 2026-03-31
- **Tasks:** 2 (1 auto TDD + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- speakWelcome() added to useVoiceLoop with hasPlayedWelcomeRef one-shot guard — queues "Welcome to MenuVoice. Tap Scan Menu to photograph a restaurant menu." via TTSClient (audio element, not SpeechSynthesis)
- page.tsx handleIdleScan chains speakWelcome to first ScanButton tap, ensuring the iOS Safari autoplay policy is satisfied (audio triggered from user gesture)
- Human verified complete VoiceOver end-to-end flow: welcome message, scan, processing ARIA announcement, results announcement, menu exploration via voice, settings navigation with route announcer, guided retake (where testable)

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD RED — failing tests for speakWelcome** - `ff564e8` (test)
2. **Task 1: TDD GREEN — implement speakWelcome and wire page.tsx** - `ccad785` (feat)
3. **Task 2: VoiceOver end-to-end flow verification** — human checkpoint, approved

_Note: TDD task produced two commits (test RED then feat GREEN)_

## Files Created/Modified

- `src/hooks/useVoiceLoop.ts` — Added hasPlayedWelcomeRef, speakWelcome callback, updated return type and return object
- `src/hooks/__tests__/useVoiceLoop.test.ts` — Added 3 new test cases (Tests 30-32) for speakWelcome behavior
- `src/app/page.tsx` — Added handleIdleScan callback, wired idle ScanButton to it instead of extract directly

## Decisions Made

- speakWelcome chained to ScanButton tap (user gesture) rather than page mount — iOS Safari blocks audio before user interaction; chaining to the tap is the only compliant approach
- One-shot ref guard ensures welcome never repeats on subsequent interactions, as required by the plan
- TTSClient used (audio element) per CLAUDE.md hard constraint — SpeechSynthesis would conflict with VoiceOver
- SPEECH_RESULT with empty transcript dispatched after queueText — enters existing state machine flow without special-casing the welcome path
- Idle ScanButton gets handleIdleScan; results-page bottom ScanButton keeps extract directly — welcome should not replay on menu re-scans

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TDD flow was clean: tests failed (RED) as expected, then passed (GREEN) after implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 6 is complete. All three plans executed:
- 06-01: AppStateAnnouncer (A11Y-02) + page titles for route announcer
- 06-02: RetakeGuidance component (MENU-04) + quality detection in useMenuExtraction
- 06-03: Welcome TTS on first interaction (A11Y-01) + human VoiceOver verification

Requirements satisfied: A11Y-01, A11Y-02, MENU-04.

The full accessibility hardening is complete. A blind user can independently complete the entire flow — open app, hear welcome, scan menu, hear overview, ask questions, navigate settings — without sighted assistance.

---
*Phase: 06-accessibility-hardening-guided-retake*
*Completed: 2026-03-30*
