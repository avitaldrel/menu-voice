---
phase: 01-foundation-menu-capture
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, accessibility, wcag, aria, indexeddb]

# Dependency graph
requires:
  - phase: 01-foundation-menu-capture/01-01
    provides: menu-schema.ts, app-state.ts, indexeddb.ts type definitions and utilities

provides:
  - Root layout with skip-to-content link and ARIA landmarks
  - Header component with app name and settings gear icon
  - ScanButton component with native camera file input (capture=environment, multiple)
  - ProcessingState component with always-mounted ARIA live region
  - ErrorState component with role=alert and retry button
  - MenuSummary component with expandable categories and dietary flags
  - RecentSessions component loading from IndexedDB on mount

affects:
  - 01-03 (API route) — no direct dependency but page will use these components
  - 01-04 (main page wiring) — directly imports and uses all these components

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Always-mounted ARIA live region pattern for screen reader announcements (ProcessingState)
    - Hidden file input triggered by visible button (ScanButton)
    - IndexedDB loaded in useEffect only, never during SSR (RecentSessions)
    - focus-visible:outline on all interactive elements for keyboard users
    - min-h-[56px] on primary CTA, min-h-[48px] on secondary buttons for WCAG touch targets

key-files:
  created:
    - src/components/Header.tsx
    - src/components/ScanButton.tsx
    - src/components/ProcessingState.tsx
    - src/components/ErrorState.tsx
    - src/components/MenuSummary.tsx
    - src/components/RecentSessions.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "ProcessingState role=status div always in DOM — conditional mounting prevents screen reader announcements"
  - "ErrorState uses role=alert without aria-live=assertive — role=alert implies assertive, adding both causes VoiceOver iOS double-speak"
  - "ScanButton file input is sr-only + aria-hidden + tabIndex=-1 — fully removed from accessibility tree while remaining functional"
  - "RecentSessions returns null when loading or empty — avoids hydration flash and shows nothing on first visit per D-02"

patterns-established:
  - "ARIA live region pattern: role=status div always rendered, content change triggers announcement"
  - "Touch target sizing: min-h-[56px] for primary actions, min-h-[48px] for secondary buttons"
  - "Keyboard accessibility: focus-visible:outline with 2-4px width on all interactive elements"
  - "Browser-only APIs in useEffect: IndexedDB, Web Speech API never called during SSR"

requirements-completed: [MENU-01, MENU-02, A11Y-03, A11Y-04]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 01 Plan 02: UI Components Summary

**Seven accessible React components implementing the full Phase 1 interface: skip-link layout, camera-capture scan button, ARIA live loading state, error recovery, expandable menu results, and IndexedDB recent sessions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T03:03:08Z
- **Completed:** 2026-03-30T03:05:58Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Root layout replaces Next.js default with skip-to-content link as first focusable element, MenuVoice Header, and main landmark
- ScanButton uses native file input with `capture="environment"` and `multiple` for accessible rear-camera multi-photo capture; file input is hidden from assistive technology
- ProcessingState implements the always-mounted ARIA live region pattern — `role="status"` div permanently in DOM so content changes trigger screen reader announcements
- ErrorState uses `role="alert"` for immediate error announcement without doubling up with `aria-live="assertive"` (prevents VoiceOver iOS double-speak)
- MenuSummary displays restaurant name, category/item counts, expandable categories with `aria-expanded`, item details (name, price, description, dietary flags), and extraction warnings
- RecentSessions loads from IndexedDB only in `useEffect` (never SSR), handles private browsing errors silently, returns null when empty per D-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Root layout with skip-link, header, and ARIA landmarks** - `7d0112c` (feat)
2. **Task 2: ScanButton, ProcessingState, and ErrorState components** - `e6b452a` (feat)
3. **Task 3: MenuSummary and RecentSessions components** - `5cd8784` (feat)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout: skip-link, Header, main landmark with id="main-content"
- `src/components/Header.tsx` - App header: "MenuVoice" text + settings gear icon linking to /settings
- `src/components/ScanButton.tsx` - Primary CTA: 56px button triggering hidden file input (capture=environment, multiple)
- `src/components/ProcessingState.tsx` - Loading state: always-mounted status div + visual spinner
- `src/components/ErrorState.tsx` - Error state: role=alert wrapper + "Try Again" button
- `src/components/MenuSummary.tsx` - Menu results: restaurant name, expandable categories with items
- `src/components/RecentSessions.tsx` - Recent visits: IndexedDB-backed list, hidden when empty

## Decisions Made
- ProcessingState `role="status"` div is always rendered (never conditionally mounted). If conditionally rendered, the screen reader misses the announcement because the live region needs to exist before content is injected — this is PITFALLS.md Pitfall 1.
- ErrorState uses only `role="alert"` without adding `aria-live="assertive"`. The `role="alert"` attribute already implies assertive live region semantics. Adding both causes VoiceOver on iOS to announce the message twice.
- ScanButton file input has `aria-hidden="true"`, `tabIndex={-1}`, and `className="sr-only"` to be completely removed from the accessibility tree. The visible button handles all user interaction and is the only focusable element.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 component files ready for Plan 04 (main page wiring) to import and compose
- Components depend on types from Plan 01 (menu-schema.ts, app-state.ts, indexeddb.ts) which are already in place
- Plan 03 (API route) can proceed independently — no component dependency
- Known: RecentSessions will show empty on first use (by design, per D-02)

---
*Phase: 01-foundation-menu-capture*
*Completed: 2026-03-30*

## Self-Check: PASSED

All files created and all task commits verified present:
- FOUND: src/app/layout.tsx
- FOUND: src/components/Header.tsx
- FOUND: src/components/ScanButton.tsx
- FOUND: src/components/ProcessingState.tsx
- FOUND: src/components/ErrorState.tsx
- FOUND: src/components/MenuSummary.tsx
- FOUND: src/components/RecentSessions.tsx
- FOUND: .planning/phases/01-foundation-menu-capture/01-02-SUMMARY.md
- FOUND commit: 7d0112c
- FOUND commit: e6b452a
- FOUND commit: 5cd8784
