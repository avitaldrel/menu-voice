---
phase: 01-foundation-menu-capture
plan: "01"
subsystem: foundation
tags: [scaffolding, typescript, nextjs, vitest, shared-types]
dependency_graph:
  requires: []
  provides:
    - src/lib/menu-schema.ts (Menu, MenuCategory, MenuItem interfaces)
    - src/lib/app-state.ts (AppState, AppAction, appReducer)
    - src/lib/indexeddb.ts (Session CRUD via idb)
    - src/lib/image-utils.ts (resizeImage client-side compression)
    - vitest test infrastructure
  affects:
    - All subsequent Phase 1 plans (01-02, 01-03, 01-04) import from src/lib/
tech_stack:
  added:
    - Next.js 16.2.1 (App Router, TypeScript, Tailwind v4, Turbopack)
    - "@anthropic-ai/sdk ^0.80.0"
    - idb ^8.0.3
    - vitest ^4.1.2
    - "@vitejs/plugin-react ^6.0.1"
    - "@testing-library/react ^16.3.2"
    - "@testing-library/jest-dom ^6.9.1"
    - "@testing-library/user-event ^14.6.1"
    - jsdom ^29.0.1
    - "@types/dom-speech-recognition ^0.0.8"
  patterns:
    - Discriminated union state machine (idle|processing|results|error)
    - idb openDB with upgrade callback for IndexedDB schema
    - Canvas-based client-side image resizing (1568px max, 85% JPEG)
key_files:
  created:
    - src/lib/menu-schema.ts
    - src/lib/app-state.ts
    - src/lib/indexeddb.ts
    - src/lib/image-utils.ts
    - vitest.config.ts
    - src/test/setup.ts
    - package.json
    - tsconfig.json
    - next.config.ts
    - .env.example
  modified: []
decisions:
  - "Scaffolded into temp dir then moved files to avoid npm naming restriction on 'menu voice' (space in name)"
  - "Added passWithNoTests: true to vitest.config.ts so test script exits 0 when no tests exist yet"
metrics:
  duration_minutes: 7
  tasks_completed: 3
  files_created: 6
  files_modified: 1
  completed_date: "2026-03-30"
---

# Phase 1 Plan 1: Project Scaffolding and Shared Libraries Summary

Next.js 16 App Router project with TypeScript strict mode, Tailwind v4, all Phase 1 dependencies, four shared library files (menu-schema, app-state, indexeddb, image-utils), and Vitest test infrastructure ready for subsequent plans.

## What Was Built

### Task 1: Next.js Scaffolding and Dependencies
Scaffolded Next.js 16 with App Router, TypeScript, Tailwind v4, and src/ directory structure. Installed all production dependencies (`@anthropic-ai/sdk`, `idb`) and dev dependencies (`vitest`, testing library stack, `@types/dom-speech-recognition`). Created `.env.example` documenting the required `ANTHROPIC_API_KEY`. The project root had a space in its directory name ("menu voice") which caused `create-next-app` to reject it — scaffolded into a temp directory and moved all files to the project root as a workaround.

### Task 2: Shared Type Definitions and Utility Libraries
Created four files in `src/lib/` that every subsequent plan depends on:
- `menu-schema.ts`: TypeScript interfaces for Menu, MenuCategory, MenuItem with full detail fields (allergens, dietaryFlags, modifications, portionSize, confidence)
- `app-state.ts`: 4-variant discriminated union state machine (idle, processing, results, error) with AppAction type and appReducer function
- `indexeddb.ts`: idb wrapper with `saveSession`, `getRecentSessions`, `clearSessions` using DB "menuvoice" v1
- `image-utils.ts`: `resizeImage` function with 1568px max dimension, 85% JPEG quality, strips EXIF as privacy benefit

### Task 3: Vitest Test Infrastructure
Configured Vitest with jsdom environment, React plugin, jest-dom matchers, and `@` path alias for `src/`. Added `passWithNoTests: true` so test runner exits 0 when no test files exist yet (subsequent plans will write tests).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 2526ebe | chore(01-01): scaffold Next.js project with all Phase 1 dependencies |
| Task 2 | 012e296 | feat(01-01): add shared type definitions and utility libraries |
| Task 3 | 5de2671 | chore(01-01): configure Vitest test infrastructure with React/jsdom support |

## Verification Results

1. `npx next build` — completed without errors (Next.js 16, Turbopack)
2. `npx tsc --noEmit` — exit 0, zero TypeScript errors, strict mode
3. `npx vitest run --reporter=verbose` — exit 0, "No test files found" (expected)
4. All four `src/lib/*.ts` files exist with correct exports
5. `.env.example` documents `ANTHROPIC_API_KEY`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scaffolded into temp dir due to npm naming restriction**
- **Found during:** Task 1
- **Issue:** `create-next-app` rejects directory names with spaces ("menu voice"). The `--package-name` flag does not exist in this version.
- **Fix:** Scaffolded into `/tmp/menu-voice/` then moved all files (excluding `.git` and `node_modules`) to the project root. Dependencies were then freshly installed in the project root.
- **Files modified:** All scaffolded files (package.json, tsconfig.json, etc.)
- **Commit:** 2526ebe

**2. [Rule 2 - Missing functionality] Added passWithNoTests to vitest config**
- **Found during:** Task 3
- **Issue:** `vitest run` exits with code 1 when no test files exist, which would fail CI checks at this phase
- **Fix:** Added `passWithNoTests: true` to `vitest.config.ts` test configuration
- **Files modified:** vitest.config.ts
- **Commit:** 5de2671

## Known Stubs

None — this plan creates foundational types and infrastructure, not UI components or data-fetching code. No stub values flow to rendering.

## Self-Check: PASSED
