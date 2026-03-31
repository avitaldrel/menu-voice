---
phase: 06-accessibility-hardening-guided-retake
plan: 02
subsystem: ui
tags: [react, aria, accessibility, voiceover, tdd, vitest, tailwind]

# Dependency graph
requires:
  - phase: 06-accessibility-hardening-guided-retake/06-01
    provides: AppState retake variant, EXTRACTION_LOW_QUALITY action, AppStateAnnouncer component

provides:
  - RetakeGuidance component with role=alert ARIA announcement, yellow warning panel, ScanButton retake action, conditional proceed button
  - useMenuExtraction quality detection — dispatches EXTRACTION_LOW_QUALITY for confidence < 0.3 or warnings present
  - page.tsx wired with retake state rendering, handleRetake with attemptCount threading, AppStateAnnouncer always-in-DOM

affects:
  - 06-03-accessibility (voiceOver testing, A11Y hardening)
  - future regression tests

# Tech tracking
tech-stack:
  added: []
  patterns:
    - role=alert for assertive ARIA announcements (NO explicit aria-live — avoids VoiceOver iOS double-speak)
    - Attempt-N deduplication prefix in alert text (VoiceOver iOS Pitfall 3 — content must differ per announcement)
    - Quality detection gate in extraction hook before IndexedDB save

key-files:
  created:
    - src/components/RetakeGuidance.tsx
    - src/components/__tests__/RetakeGuidance.test.tsx
  modified:
    - src/hooks/useMenuExtraction.ts
    - src/hooks/__tests__/useMenuExtraction.test.ts
    - src/app/page.tsx

key-decisions:
  - "role=alert without aria-live — role=alert implies assertive, adding both causes VoiceOver iOS double-speak"
  - "Attempt N: prefix for deduplication — VoiceOver iOS won't re-announce identical content; prefix ensures content differs on each retry"
  - "Quality detection before IndexedDB save — low-quality extractions still saved for session history but routed to retake state"
  - "attemptCount threads through retake cycles — handleRetake reads state.attemptCount and increments for each retry"

patterns-established:
  - "RetakeGuidance pattern: sr-only role=alert + visible warning panel + ScanButton + conditional proceed after 2+ attempts"
  - "Extraction quality gate: check confidence < 0.3 || warnings.length > 0 before dispatching success"

requirements-completed: [MENU-04]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 06 Plan 02: Guided Retake Flow Summary

**RetakeGuidance component with VoiceOver-safe ARIA alert, quality detection in useMenuExtraction dispatching EXTRACTION_LOW_QUALITY for low-confidence/warned extractions, and page.tsx fully wired for retake cycle with attemptCount threading**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T23:26:00Z
- **Completed:** 2026-03-30T23:30:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created RetakeGuidance component with always-in-DOM sr-only role=alert ARIA announcement (no explicit aria-live to prevent VoiceOver iOS double-speak), yellow warning panel, ScanButton for retake, and conditional "Proceed with what I have" button after 2+ attempts
- Extended useMenuExtraction.extract() with optional attemptCount param and quality detection gate — dispatches EXTRACTION_LOW_QUALITY when confidence < 0.3 or warnings are present
- Wired page.tsx with AppStateAnnouncer (always in DOM), handleRetake callback incrementing attemptCount, and RetakeGuidance rendering in retake state
- 21 new tests added (12 RetakeGuidance + 9 useMenuExtraction quality detection); full suite 275 tests across 23 files — all passing

## Task Commits

1. **Task 1: RetakeGuidance component and quality detection in useMenuExtraction** - `cb8b445` (feat)
2. **Task 2: Wire retake flow and AppStateAnnouncer into page.tsx** - `ccad785` (feat, included in parallel 06-03 commit)

## Files Created/Modified

- `src/components/RetakeGuidance.tsx` — Retake guidance panel: role=alert sr-only ARIA, yellow warning panel, ScanButton, conditional proceed button
- `src/components/__tests__/RetakeGuidance.test.tsx` — 12 tests covering all RetakeGuidance behaviors
- `src/hooks/useMenuExtraction.ts` — Added attemptCount param, quality detection gate dispatching EXTRACTION_LOW_QUALITY
- `src/hooks/__tests__/useMenuExtraction.test.ts` — 9 new quality detection test cases added
- `src/app/page.tsx` — Added RetakeGuidance and AppStateAnnouncer imports, handleRetake callback, retake state block

## Decisions Made

- **role=alert without aria-live:** role=alert already implies assertive live region; adding aria-live="assertive" causes VoiceOver iOS to speak the text twice. Per RESEARCH.md Pitfall guidance — omit explicit aria-live.
- **Attempt N: deduplication prefix:** VoiceOver iOS won't re-announce identical content. The "Attempt 2:" prefix ensures the text differs on each retry cycle, forcing announcement. Pattern from RESEARCH.md Pitfall 3.
- **Quality detection before IndexedDB save:** Low-quality extractions are still saved to session history (user may proceed later), but the dispatch routes to retake state rather than results.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Parallel agent collision on page.tsx:** The 06-03 parallel agent committed page.tsx at ccad785 which absorbed my Task 2 additions (they were already applied to the working tree when 06-03 staged the file). The retake flow changes are present in the repository as verified by grep checks and test suite pass.

## Known Stubs

None — all RetakeGuidance data is threaded through real app state (guidance, attemptCount from EXTRACTION_LOW_QUALITY action).

## Next Phase Readiness

- Guided retake flow complete — MENU-04 fully satisfied
- RetakeGuidance component ready for VoiceOver/TalkBack device testing (Phase 06 verification)
- Full test suite at 275 tests; no regressions

---
*Phase: 06-accessibility-hardening-guided-retake*
*Completed: 2026-03-30*
