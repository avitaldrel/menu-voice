---
phase: 01-foundation-menu-capture
plan: 03
subsystem: api
tags: [claude, anthropic-sdk, vision, ocr, indexeddb, react-hooks, next-api-routes]

# Dependency graph
requires:
  - phase: 01-foundation-menu-capture plan 01
    provides: "menu-schema.ts (Menu/MenuCategory/MenuItem types), image-utils.ts (resizeImage), indexeddb.ts (saveSession), app-state.ts (AppAction/AppState)"

provides:
  - "POST /api/menu/extract — sends base64 images to Claude Vision, returns structured Menu JSON"
  - "useMenuExtraction hook — full pipeline: resize -> API -> IndexedDB save -> state dispatch"

affects: [02-voice-ui, 03-conversation-engine, 04-user-profile, phase2, phase3]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js App Router API route with maxDuration=30 and force-dynamic for AI calls"
    - "Labeled image content blocks (page N of M) for multi-page Claude Vision context"
    - "Markdown fence stripping on Claude response before JSON.parse"
    - "Client-side image resize before API call to prevent timeouts"
    - "useCallback hook with [dispatch] dependency for stable function reference"

key-files:
  created:
    - src/app/api/menu/extract/route.ts
    - src/hooks/useMenuExtraction.ts
  modified: []

key-decisions:
  - "Model claude-sonnet-4-6 used for menu extraction per RESEARCH.md recommendation"
  - "Images labeled 'Menu page N of M' in content blocks for cross-page context"
  - "All images sent in single API call (no batching) per CLAUDE.md architecture decision"
  - "mimeType always set to image/jpeg because canvas.toDataURL always produces JPEG"
  - "IndexedDB save occurs before EXTRACTION_SUCCESS dispatch to ensure persistence before UI transition"

patterns-established:
  - "API route pattern: validate env key first, validate input second, call Claude, strip fences, parse JSON"
  - "Hook pattern: dispatch loading state first, process async work, dispatch result or error"

requirements-completed: [MENU-03]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 01 Plan 03: Claude Vision Extraction API and Hook Summary

**POST /api/menu/extract sends labeled multi-page images to claude-sonnet-4-6 and returns structured Menu JSON; useMenuExtraction hook orchestrates the full resize-to-dispatch pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T03:00:00Z
- **Completed:** 2026-03-30T03:05:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- API route at `/api/menu/extract` receives base64 image arrays, labels each image by page number, sends to Claude Vision in a single call, strips markdown fences, and returns parsed Menu JSON
- Full error handling: 400 for missing/invalid input, 500 for missing `ANTHROPIC_API_KEY`, 502 for Claude API failures and JSON parse failures
- `useMenuExtraction` hook auto-processes files immediately on selection (D-05): dispatches `FILES_SELECTED`, resizes images client-side, calls API, saves to IndexedDB, dispatches `EXTRACTION_SUCCESS` or `EXTRACTION_ERROR`

## Task Commits

Each task was committed atomically:

1. **Task 1: Claude Vision API route handler** - `acd201b` (feat)
2. **Task 2: useMenuExtraction hook orchestrating the full pipeline** - `1a4337a` (feat)

**Plan metadata:** (to follow in final commit)

## Files Created/Modified
- `src/app/api/menu/extract/route.ts` — Next.js Route Handler; POST endpoint that builds labeled image content blocks, calls claude-sonnet-4-6, strips fences, returns Menu JSON
- `src/hooks/useMenuExtraction.ts` — React hook orchestrating resize -> API fetch -> IndexedDB save -> state dispatch

## Decisions Made
- Used `claude-sonnet-4-6` model (current latest Sonnet) per RESEARCH.md
- Set `maxDuration = 30` on route to allow time for multi-image Claude processing
- `dynamic = 'force-dynamic'` prevents Next.js from caching the AI route
- All images in single Claude call (not batched) per CLAUDE.md architectural rule
- `mimeType` always `image/jpeg` because `canvas.toDataURL('image/jpeg')` always produces JPEG regardless of source format
- IndexedDB `saveSession` called before `EXTRACTION_SUCCESS` dispatch to guarantee session persists before UI transitions

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — TypeScript compiled cleanly on first attempt for both files.

## User Setup Required
ANTHROPIC_API_KEY environment variable must be set in `.env.local` for the extraction route to function. Without it, the route returns HTTP 500 with a descriptive error message.

## Known Stubs
None — both files are fully wired to their dependencies.

## Next Phase Readiness
- `/api/menu/extract` and `useMenuExtraction` are ready to be consumed by UI components (Plan 01-04 and beyond)
- The hook accepts `File[]` and `dispatch` — compatible with the `ScanButton` `onFilesSelected` callback and `appReducer` from Plan 01-01
- Phase 2 (voice UI) can wire `useMenuExtraction` into the conversation state machine without changes

---
*Phase: 01-foundation-menu-capture*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: src/app/api/menu/extract/route.ts
- FOUND: src/hooks/useMenuExtraction.ts
- FOUND: .planning/phases/01-foundation-menu-capture/01-03-SUMMARY.md
- FOUND commit: acd201b (Task 1 — Claude Vision API route)
- FOUND commit: 1a4337a (Task 2 — useMenuExtraction hook)
