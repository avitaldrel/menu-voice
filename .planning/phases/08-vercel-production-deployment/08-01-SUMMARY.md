---
phase: 08-vercel-production-deployment
plan: 01
subsystem: infra
tags: [vercel, next.js, csp, security-headers, edge-runtime, usage-logging, content-type-validation]

# Dependency graph
requires:
  - phase: 07-polish-frontend-refinement
    provides: Complete, polished Next.js app with all three API routes

provides:
  - Security headers on all HTTP responses (CSP, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  - Edge Runtime on /api/menu/extract per D-08/DEPLOY-04
  - Content-Type validation (415) on all three API routes
  - Structured JSON usage logging on all three API routes (event, ip, timestamp)
  - OPENAI_API_KEY env check in TTS route
  - Production build verified (next build exit 0, Edge bundle ~110 KB gzipped)

affects: [08-02-deploy, vercel-deployment, production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Security headers via next.config.ts async headers() — applies to all routes with source '/(.*)''"
    - "Edge Runtime declared with export const runtime = 'edge' in route file"
    - "Usage logging via console.log(JSON.stringify({event, ip, ...})) — captured by Vercel Runtime Logs"
    - "Content-Type validation returns 415 before any body parsing"
    - "IP extraction from x-forwarded-for header, first segment only"

key-files:
  created: []
  modified:
    - next.config.ts
    - src/app/api/menu/extract/route.ts
    - src/app/api/chat/route.ts
    - src/app/api/tts/route.ts

key-decisions:
  - "CSP includes media-src 'self' blob: — required for TTS audio blob: URLs per CLAUDE.md hard constraint"
  - "Permissions-Policy: microphone=*, camera=* — required for Web Speech API and menu photo capture"
  - "unsafe-inline and unsafe-eval in script-src — required by Next.js App Router hydration (D-13: no strict CSP for v1)"
  - "export const runtime = 'edge' on /api/menu/extract per locked D-08/DEPLOY-04 — Edge bundle gzips to ~110 KB (well under 1MB Hobby limit)"
  - "maxDuration = 30 retained on extract route even with Edge Runtime — silently ignored by Edge but documents intent as safety cap"
  - "OpenAI client moved from module-level to inside POST handler in TTS route — prevents throw at import time when OPENAI_API_KEY is missing"
  - "Content-Type check is first validation in all routes before body parsing — rejects malformed requests with 415 per D-12/DEPLOY-02"

patterns-established:
  - "Usage log shape: {event: string, ip: string, [route-specific fields], timestamp: ISO string}"
  - "IP extraction: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'"

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 8 Plan 01: Vercel Production Deployment — Code Prep Summary

**Security headers (CSP with blob:, Permissions-Policy microphone/camera), Edge Runtime on extract route, Content-Type 415 validation, and structured JSON usage logging on all three API routes — production build passes, Edge bundle is 110 KB gzipped**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-05T21:32:59Z
- **Completed:** 2026-04-05T21:37:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added full security header suite to `next.config.ts`: CSP (with `blob:` for TTS audio per CLAUDE.md requirement, `https:` for API calls), Permissions-Policy allowing microphone and camera, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- Migrated `/api/menu/extract` to Edge Runtime (`export const runtime = 'edge'`) per locked decision D-08/DEPLOY-04; Edge bundle gzips to ~110 KB, well within Vercel Hobby 1MB limit
- Added Content-Type validation (HTTP 415) as the first check in all three API routes, plus structured JSON usage logging capturing event type, client IP, route-specific context, and timestamp
- Verified production build exits 0 with no TypeScript errors; all 296 existing tests pass with no regressions
- Moved OpenAI client instantiation inside the POST handler in TTS route to prevent module-load crash when `OPENAI_API_KEY` is absent; added explicit env check returning HTTP 500

## Task Commits

1. **Task 1: Security headers, Edge Runtime, Content-Type validation, usage logging** — `1f7922c` (feat)
2. **Task 2: Production build verification** — no code changes; build success documented here

## Files Created/Modified

- `next.config.ts` — Added `async headers()` with CSP, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- `src/app/api/menu/extract/route.ts` — Added `export const runtime = 'edge'`, Content-Type 415 validation, `menu_extract` usage logging
- `src/app/api/chat/route.ts` — Added Content-Type 415 validation, `chat_turn` usage logging with messageCount
- `src/app/api/tts/route.ts` — Added OPENAI_API_KEY env check, Content-Type 415 validation, `tts` usage logging with textLength; moved OpenAI client into handler

## Decisions Made

- **CSP blob: for TTS audio:** `media-src 'self' blob:` is mandatory per CLAUDE.md hard constraint (TTS must use `<audio>` element with blob: URLs). Without this, TTS audio would be silently blocked by CSP in production.
- **unsafe-inline/unsafe-eval in CSP:** Required by Next.js App Router for client-side hydration. Per D-13, no strict CSP nonce-based approach for v1 — this is acceptable.
- **Edge Runtime bundle size is safe:** Build output confirms the main Edge chunk gzips to 110 KB. The 1MB Hobby tier Edge bundle limit is not a concern for this app. `@anthropic-ai/sdk@0.80.0` is Edge-compatible.
- **maxDuration = 30 retained on Edge route:** Edge Runtime silently ignores this setting, but it is kept as documentation of intent. Research guidance explicitly says "do not remove it."
- **OpenAI client moved into handler:** Module-level `new OpenAI()` would throw at import time if `OPENAI_API_KEY` is absent. Moving it inside the handler ensures the explicit env check returns a clean 500 first.

## Deviations from Plan

None — plan executed exactly as written. All four file changes matched the plan specification. The TTS `openai` client relocation was explicitly called out in the plan action (step D.4).

## Issues Encountered

- The `npm test` run after changes confirmed all 296 tests pass (23 test files). No regressions from the Content-Type validation additions — existing TTS route tests already pass `Content-Type: application/json`, so they continue to work.
- Build warning: "Using edge runtime on a page currently disables static generation for that page" — this is expected and benign for an API route; it only applies to page-level static generation.

## Edge Runtime Risk Assessment (for Task 2)

The production build confirms:
- `/api/menu/extract` compiles as an Edge function
- `/api/chat` and `/api/tts` compile as standard serverless (Dynamic, `ƒ`) functions  
- Edge bundle for `/api/menu/extract`: ~381 KB uncompressed, **~110 KB gzipped** — well within Vercel Hobby 1MB Edge limit

Residual risk: `/api/menu/extract` is a blocking (non-streaming) call. If a complex multi-page menu takes >25s for Claude Vision to process, the Edge Runtime first-byte deadline will trigger a 504. This is noted in RESEARCH.md Pitfall 7. For v1 with typical 1-3 page menus, this is acceptable.

## User Setup Required

None for this plan — all changes are code-level. Vercel project linking and environment variable configuration happen in Plan 02.

## Next Phase Readiness

- `next.config.ts` has all required security headers — Vercel will serve them on first deployment
- All three API routes are deployment-ready: validated inputs, usage logging, correct runtime assignments
- Production build verified locally — push to Vercel-connected branch will succeed
- Plan 02 can proceed: Vercel project creation, GitHub repo connection, environment variable configuration, and deployment

---
*Phase: 08-vercel-production-deployment*
*Completed: 2026-04-05*
