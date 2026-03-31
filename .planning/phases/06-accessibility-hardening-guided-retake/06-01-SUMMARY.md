---
phase: 06-accessibility-hardening-guided-retake
plan: 01
subsystem: ui
tags: [accessibility, aria, react, nextjs, typescript, vitest]

# Dependency graph
requires:
  - phase: 05-allergy-preference-system
    provides: app-state.ts with idle/processing/results/error variants and appReducer
provides:
  - AppState retake variant with menu, sessionId, attemptCount, guidance fields
  - EXTRACTION_LOW_QUALITY, PROCEED_ANYWAY, RETRY_CAPTURE actions in AppAction
  - AppStateAnnouncer component — always-in-DOM sr-only ARIA live region for state transitions
  - settings/layout.tsx server component providing metadata title "Settings - MenuVoice"
  - Updated main layout title "MenuVoice - Scan a Menu" for route announcer
affects: [06-02-guided-retake-flow, accessibility-audits]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Always-in-DOM ARIA live region pattern for AppState transitions (same as ProcessingState/VoiceStateIndicator)
    - Server component layout wrapper for Next.js route announcer metadata per-route

key-files:
  created:
    - src/lib/app-state.ts (extended)
    - src/components/AppStateAnnouncer.tsx
    - src/components/__tests__/AppStateAnnouncer.test.tsx
    - src/lib/__tests__/app-state.test.ts (extended)
    - src/app/settings/layout.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "AppStateAnnouncer only announces results and processing — retake announcements delegated to RetakeGuidance component (Plan 02)"
  - "EXTRACTION_LOW_QUALITY action carries attemptCount from caller rather than incrementing in reducer — caller knows current count and can pass correct next value"
  - "Settings layout is server component (no use client) so Next.js App Router can export metadata from it"

patterns-established:
  - "Always-in-DOM sr-only div for ARIA live announcements — never conditionally mount, change content to trigger screen reader"
  - "Server component layout.tsx wrapping use-client page.tsx provides per-route metadata for Next.js route announcer"

requirements-completed: [A11Y-02]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 6 Plan 1: AppState Retake Variant, AppStateAnnouncer, and Route Announcer Titles Summary

**Extended AppState with retake variant (5 status values), AppStateAnnouncer sr-only live region for extraction transitions, and per-route page titles for Next.js route announcer — 15 new tests, 255 total passing**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-31T03:20:40Z
- **Completed:** 2026-03-31T03:23:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended AppState union to 5 variants: idle, processing, results, retake, error
- Added 3 new actions (EXTRACTION_LOW_QUALITY, PROCEED_ANYWAY, RETRY_CAPTURE) with reducer cases
- Created AppStateAnnouncer component that announces "Menu loaded. {name} is ready." on results, "Reading your menu, N photo(s)." on processing, and empty string for all other states
- Created settings/layout.tsx server component providing "Settings - MenuVoice" title for Next.js route announcer
- Updated main page title to "MenuVoice - Scan a Menu" for descriptive route announcement

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AppState with retake variant and create AppStateAnnouncer** - `d4701ea` (feat)
2. **Task 2: Add settings layout for route announcer and update main page title** - `237ce0f` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Task 1 used TDD — RED (failing tests) then GREEN (implementation)._

## Files Created/Modified
- `src/lib/app-state.ts` - Extended with retake variant and 3 new actions/reducer cases
- `src/lib/__tests__/app-state.test.ts` - Added 4 new reducer transition tests
- `src/components/AppStateAnnouncer.tsx` - New always-in-DOM sr-only ARIA live region component
- `src/components/__tests__/AppStateAnnouncer.test.tsx` - New test file with 11 behavioral tests
- `src/app/settings/layout.tsx` - New server component with metadata title "Settings - MenuVoice"
- `src/app/layout.tsx` - Updated title from "MenuVoice" to "MenuVoice - Scan a Menu"

## Decisions Made
- AppStateAnnouncer produces empty string for retake status — RetakeGuidance component (Plan 02) will handle retake-specific announcements, keeping separation of concerns
- EXTRACTION_LOW_QUALITY carries attemptCount as action payload rather than incrementing in reducer — caller determines the correct next count value, enabling flexibility
- Settings layout.tsx has no 'use client' directive so Next.js can export metadata from a server component wrapping the existing use-client page.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AppState retake variant is ready for Plan 02 to build the guided retake UI flow
- AppStateAnnouncer must be mounted in page.tsx (Plan 02 or separate wiring task) to activate live region announcements
- Route announcer titles are active immediately — Next.js reads metadata.title on navigation automatically

---
*Phase: 06-accessibility-hardening-guided-retake*
*Completed: 2026-03-31*
