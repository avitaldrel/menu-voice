---
phase: 02-voice-interface
plan: 03
subsystem: ui
tags: [react, tailwind, aria, accessibility, voice, web-speech-api]

requires:
  - phase: 02-voice-interface-01
    provides: VoiceState type and voiceReducer state machine

provides:
  - VoiceButton: 80px circle mic button with state-driven aria-labels, pulse ring (listening), disabled (processing)
  - VoiceStateIndicator: always-mounted ARIA live region (role=status) + visible label with visual cues per state
  - TranscriptDisplay: user transcript + streaming assistant response display with aria-live=off
  - MicPermissionPrompt: pre-browser-dialog accessible prompt with dismiss action
  - TextInputFallback: Firefox/no-WebSpeechAPI text input with role=alert warning

affects: [02-04-useVoiceLoop, voice-interface-integration, a11y-hardening]

tech-stack:
  added: []
  patterns:
    - "VoiceState['status'] union type drives both visual appearance and aria-label in VoiceButton"
    - "ARIA live region always mounted in DOM — content change (not mount/unmount) triggers screen reader announcement"
    - "Processing spinner reused from Phase 1 ProcessingState pattern (border-t-transparent animate-spin)"
    - "Speaking indicator uses 3-dot bounce animation with staggered animationDelay (0ms/150ms/300ms)"
    - "TextInputFallback uses form wrapper with e.preventDefault + trim guard for accessible keyboard submit"

key-files:
  created:
    - src/components/VoiceButton.tsx
    - src/components/VoiceStateIndicator.tsx
    - src/components/TranscriptDisplay.tsx
    - src/components/MicPermissionPrompt.tsx
    - src/components/TextInputFallback.tsx
    - src/components/__tests__/VoiceButton.test.tsx
    - src/components/__tests__/VoiceStateIndicator.test.tsx
    - src/components/__tests__/TextInputFallback.test.tsx
  modified: []

key-decisions:
  - "VoiceStateIndicator renders both sr-only ARIA live region AND visible <p> label — screen reader gets live region, sighted users get visual label"
  - "Processing state uses Phase 1 spinner pattern (border-black border-t-transparent rounded-full animate-spin) for visual consistency"
  - "Speaking dots use inline style animationDelay for stagger — Tailwind doesn't have stagger utilities out of the box"
  - "TranscriptDisplay returns null when both props are empty — no empty container rendered"

patterns-established:
  - "Role=status always in DOM: content change triggers announcement, never conditional mount"
  - "State-driven aria-label: ARIA_LABELS record maps VoiceState['status'] to string for clean lookup"
  - "Form submit pattern: e.preventDefault + trim guard + clear input after onSubmit call"

requirements-completed: [A11Y-06]

duration: 15min
completed: 2026-03-30
---

# Phase 2 Plan 03: Voice UI Components Summary

**Five accessible voice UI components — VoiceButton (80px mic with state aria-labels), VoiceStateIndicator (always-mounted ARIA live region), TranscriptDisplay, MicPermissionPrompt, TextInputFallback — with 41 passing tests**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-30T18:06:02Z
- **Completed:** 2026-03-30T18:21:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- VoiceButton renders 80px circle with 5 state-driven aria-labels and visual state classes (bg-black, bg-gray-400, bg-gray-200), pulse ring on listening, disabled on processing
- VoiceStateIndicator always keeps role=status in the DOM (screen reader pattern) with polite/atomic live region and per-state text; visible label adds processing spinner and speaking 3-dot bounce
- TranscriptDisplay shows user utterance with "You:" prefix and streaming assistant response; returns null when empty; aria-live=off per UI-SPEC
- MicPermissionPrompt renders pre-dialog accessible warning with role=status and dismiss button following Phase 1 button pattern
- TextInputFallback provides role=alert Firefox fallback with text input form, Enter-key submit, empty/whitespace guard, and input clear after submit

## Task Commits

1. **Task 1: VoiceButton and VoiceStateIndicator components** - `f82420d` (feat)
2. **Task 2: TranscriptDisplay, MicPermissionPrompt, and TextInputFallback components** - `a0bc6ed` (feat)

## Files Created/Modified

- `src/components/VoiceButton.tsx` - 80px circle mic button, state-driven aria-label, SVG mic icon, visual state classes
- `src/components/VoiceStateIndicator.tsx` - always-mounted role=status ARIA live region + visible label with spinner/dots
- `src/components/TranscriptDisplay.tsx` - user transcript and assistant streaming response display
- `src/components/MicPermissionPrompt.tsx` - pre-browser-dialog microphone permission prompt
- `src/components/TextInputFallback.tsx` - Firefox/no-WebSpeechAPI text input fallback with role=alert
- `src/components/__tests__/VoiceButton.test.tsx` - 16 tests: aria-labels, onClick, disabled, bg classes, SVG, dimensions
- `src/components/__tests__/VoiceStateIndicator.test.tsx` - 14 tests: role=status always in DOM across all 5 states, aria-live/atomic, text per state, spinner, dots
- `src/components/__tests__/TextInputFallback.test.tsx` - 9 tests: role=alert, Firefox message, submit with value, Enter key, clear after submit, empty guard

## Decisions Made

- VoiceStateIndicator renders two elements: sr-only ARIA live region (always in DOM) + visible `<p>` label. This matches the Phase 1 ProcessingState pattern and ensures screen readers get announcements on state change without mount/unmount.
- Speaking visual cue uses inline `style={{ animationDelay }}` on three span elements — Tailwind animate-bounce works but doesn't have stagger utilities, so stagger is done via inline style.
- TranscriptDisplay returns null when both props are empty — prevents an empty gray box from appearing in the UI before any conversation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Pre-existing thinking-chime test failures (out of scope):** 4 tests in `src/lib/__tests__/thinking-chime.test.ts` fail due to AudioContext module-level cache state leakage between tests (`Cannot read properties of null (reading 'createOscillator')`). These failures are pre-existing from Plan 01 and not caused by Plan 03 changes. Logged to `deferred-items.md`.

## Known Stubs

None — all five components are fully implemented. TranscriptDisplay renders its props directly; no hardcoded empty values that flow to UI rendering.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All five voice UI components ready for integration into `useVoiceLoop` hook (Plan 04)
- Components accept VoiceState-derived props — no internal state; pure presentation
- A11Y-06 (ARIA live region) requirement satisfied by VoiceStateIndicator
- TextInputFallback ready for Plan 04 to wire up to speech recognition availability check

---
*Phase: 02-voice-interface*
*Completed: 2026-03-30*

## Self-Check: PASSED

- All 8 component/test files created and exist on disk
- Commit f82420d (Task 1) confirmed in git log
- Commit a0bc6ed (Task 2) confirmed in git log
