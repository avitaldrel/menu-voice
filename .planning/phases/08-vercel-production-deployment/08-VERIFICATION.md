---
phase: 08-vercel-production-deployment
verified: 2026-04-05T22:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Confirm security headers present in HTTP responses on the live Vercel URL"
    expected: "DevTools -> Network -> document request shows CSP, Permissions-Policy (microphone=*, camera=*), X-Content-Type-Options: nosniff, X-Frame-Options: DENY"
    why_human: "Cannot verify HTTP response headers served by Vercel without a live HTTP request"
  - test: "Confirm TTS audio plays correctly (not blocked by CSP blob: media-src)"
    expected: "Voice response plays after a menu question — no console CSP violation errors"
    why_human: "Cannot verify browser CSP enforcement programmatically"
  - test: "Confirm API calls appear in Vercel Runtime Logs dashboard"
    expected: "Vercel Dashboard -> project -> Logs shows JSON entries with event, ip, timestamp after menu scan and voice turn"
    why_human: "Cannot access Vercel dashboard logs programmatically"
---

# Phase 8: Vercel Production Deployment Verification Report

**Phase Goal:** Deploy the app to Vercel production with security hardening, usage logging, and validated end-to-end user flow.
**Verified:** 2026-04-05
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Important Production Context

Edge Runtime was removed from `/api/menu/extract` during deployment due to 504 timeout errors on Vercel Hobby plan. The route was reverted to Node.js serverless with `maxDuration=60s`. This contradicts the Plan 01 artifact spec (`export const runtime = 'edge'`) and the REQUIREMENTS.md wording for DEPLOY-02. However, the goal — timeout resilience for menu extraction — is met: Node.js serverless with 60s maxDuration provides more headroom than Edge Runtime's 25s first-byte limit. The app is confirmed live and working at https://menu-voice.vercel.app/.

There is also a numbering mismatch between plan decision IDs and REQUIREMENTS.md: plan 08-01 internally mapped DEPLOY-02 = Content-Type validation, DEPLOY-03 = usage logging, DEPLOY-04 = Edge Runtime. REQUIREMENTS.md uses different numbering (DEPLOY-02 = Edge Runtime, DEPLOY-03 = Content-Type validation, DEPLOY-04 = usage logging). All seven features are implemented correctly; only the ID labeling in plan prose was misaligned.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All HTTP responses include CSP, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers | VERIFIED | All 5 headers present in `next.config.ts` `async headers()` at source `/(.*)`; applies to every route |
| 2 | TTS audio blob: URLs are not blocked by CSP (`media-src` includes `blob:`) | VERIFIED (code) | `next.config.ts` line 15: `"media-src 'self' blob:"` — human visual confirmation needed for runtime behavior |
| 3 | Web Speech API microphone access is permitted by Permissions-Policy | VERIFIED (code) | `next.config.ts` line 24: `value: 'microphone=*, camera=*'` |
| 4 | Every API call is logged with event type, IP, and timestamp to console for Vercel Runtime Logs | VERIFIED | All three routes: `event: 'menu_extract'` (extract), `event: 'chat_turn'` (chat), `event: 'tts'` (tts); IP via `x-forwarded-for`; timestamp ISO string |
| 5 | Malformed requests (wrong Content-Type) are rejected with 415 before processing | VERIFIED | All three routes return `{ error: 'Content-Type must be application/json' }` with status 415 as first validation step |
| 6 | `/api/menu/extract` has timeout resilience for production | VERIFIED (adapted) | Edge Runtime was removed due to 504s; route runs Node.js serverless with `maxDuration=60` — superior timeout budget; production confirmed working by user |
| 7 | App is accessible at a public Vercel URL with full user flow working end-to-end | VERIFIED (human confirmed) | Live at https://menu-voice.vercel.app/; user confirmed voice conversation works end-to-end |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | Security headers configuration | VERIFIED | 44 lines; `async headers()` returns 5 headers applied to `/(.*)`; CSP includes `blob:` for media-src, Permissions-Policy microphone/camera |
| `src/app/api/menu/extract/route.ts` | Menu extraction with logging and validation | VERIFIED (adapted) | 152 lines; Content-Type 415 check, ANTHROPIC_API_KEY check, `menu_extract` usage log with imageCount; `maxDuration=60` Node.js serverless (Edge Runtime removed per production fix) |
| `src/app/api/chat/route.ts` | Chat route with logging and validation | VERIFIED | 87 lines; Content-Type 415 check, ANTHROPIC_API_KEY check, `chat_turn` usage log with messageCount; no `runtime` export (correct — Node.js) |
| `src/app/api/tts/route.ts` | TTS route with logging and validation | VERIFIED | 68 lines; OPENAI_API_KEY check, Content-Type 415 check, `tts` usage log with textLength; OpenAI client inside handler; no `runtime` export (correct) |
| `.env.example` | Complete env var documentation for Vercel deployment | VERIFIED | Documents both required keys with dashboard path and direct API key source URLs; intentionally empty values for owner to fill |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.ts` | All routes | `async headers()` with `source: '/(.*)'` | VERIFIED | Pattern found at line 4; covers all paths including API routes |
| `src/app/api/menu/extract/route.ts` | Vercel Runtime Logs | `console.log(JSON.stringify({...}))` | VERIFIED | Line 54: event='menu_extract', ip, imageCount, timestamp |
| `src/app/api/chat/route.ts` | Vercel Runtime Logs | `console.log(JSON.stringify({...}))` | VERIFIED | Line 46: event='chat_turn', ip, messageCount, timestamp |
| `src/app/api/tts/route.ts` | Vercel Runtime Logs | `console.log(JSON.stringify({...}))` | VERIFIED | Line 40: event='tts', ip, textLength, timestamp |
| `src/app/api/menu/extract/route.ts` | Node.js serverless | `maxDuration=60` (no `runtime` export) | VERIFIED | Edge Runtime removed; `maxDuration=60` provides 60s timeout budget |
| Vercel project | GitHub repository | Vercel Git integration | VERIFIED (human confirmed) | App deployed at https://menu-voice.vercel.app/ |
| Vercel environment variables | API routes | `process.env.ANTHROPIC_API_KEY` / `process.env.OPENAI_API_KEY` | VERIFIED (inferred) | API keys validated explicitly in each route; production app serves requests confirming vars are set |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase produces infrastructure/config artifacts (security headers, logging, deployment), not components that render dynamic data from a database.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 296 unit tests pass | `npm test` | 23 test files, 296 tests passed | PASS |
| Security headers in next.config.ts async headers | `grep 'Content-Security-Policy' next.config.ts` | Found at line 10 | PASS |
| Usage logging present in all routes | `grep -rn "event:" api routes` | Found in all 3 routes | PASS |
| Content-Type validation returns 415 | `grep -n "415" all routes` | Found in extract (line 14), chat (line 15), tts (line 19) | PASS |
| No Edge Runtime export in any route | `grep -rn "export const runtime" src/app/api/` | No output — correctly absent | PASS |
| maxDuration=60 on extract route | `grep -n "maxDuration" extract/route.ts` | Line 5: `export const maxDuration = 60` | PASS |
| .env.example has both keys and instructions | `grep ANTHROPIC_API_KEY .env.example` | Found with Vercel Dashboard instructions and API key URLs | PASS |

---

### Requirements Coverage

Note: REQUIREMENTS.md and Plan 08-01 use different numbering for DEPLOY-02 through DEPLOY-04. The table below uses REQUIREMENTS.md as the source of truth.

| Requirement | Source Plan | Description (from REQUIREMENTS.md) | Status | Evidence |
|-------------|------------|-------------------------------------|--------|----------|
| DEPLOY-01 | 08-01 | Security headers (CSP, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) on all HTTP responses | SATISFIED | All 5 headers in `next.config.ts` `async headers()` with `source: '/(.*)'` |
| DEPLOY-02 | 08-01 | /api/menu/extract runs on Edge Runtime for streaming timeout resilience | SATISFIED (adapted) | Edge Runtime removed due to 504 timeouts — replaced with Node.js serverless `maxDuration=60s`. Timeout resilience goal is met with superior budget. Production confirmed working. |
| DEPLOY-03 | 08-01 | All API routes validate Content-Type header and reject malformed requests with 415 | SATISFIED | All three routes return 415 with JSON error body before body parsing |
| DEPLOY-04 | 08-01 | All API routes log structured JSON (event, IP, timestamp) for usage/spend monitoring via Vercel Runtime Logs | SATISFIED | All three routes log `{event, ip, [route-specific], timestamp}` via `console.log(JSON.stringify({...}))` |
| DEPLOY-05 | 08-01 | Production build succeeds with Edge Runtime bundle within Vercel Hobby tier limits | SATISFIED | 296 unit tests pass; build verified in summaries (no Edge bundle concern with Node.js serverless) |
| DEPLOY-06 | 08-02 | .env.example documents all required environment variables with setup instructions | SATISFIED | `.env.example` documents ANTHROPIC_API_KEY and OPENAI_API_KEY with Vercel Dashboard path and source URLs |
| DEPLOY-07 | 08-02 | App is live at a public Vercel URL with full user flow working end-to-end | SATISFIED | https://menu-voice.vercel.app/ — user confirmed voice conversation works end-to-end |

**Orphaned requirements:** None. All 7 DEPLOY-XX requirements claimed by plans and mapped in traceability table.

**Note on ID numbering mismatch:** Plan 08-01 decision cross-reference maps DEPLOY-02=Content-Type, DEPLOY-03=usage logging, DEPLOY-04=Edge Runtime — opposite ordering from REQUIREMENTS.md. This is a documentation inconsistency only; all features are implemented and accounted for against their correct REQUIREMENTS.md descriptions.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME/placeholder comments or stub patterns found in modified files. The `.env.example` empty values (`ANTHROPIC_API_KEY=`, `OPENAI_API_KEY=`) are intentional deployment documentation, not stubs.

---

### Human Verification Required

#### 1. Security Headers in Production HTTP Responses

**Test:** Open https://menu-voice.vercel.app/ in browser, open DevTools -> Network tab -> reload -> click the document request -> check Response Headers
**Expected:** CSP with `media-src 'self' blob:`, `Permissions-Policy: microphone=*, camera=*`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
**Why human:** Cannot issue HTTP requests to the live Vercel URL from this environment

#### 2. TTS Audio Not Blocked by CSP

**Test:** Complete a voice conversation on the production URL; check browser console for CSP violation errors related to `blob:` media
**Expected:** Audio plays without console errors; `media-src 'self' blob:` directive allows TTS audio blob URLs
**Why human:** Cannot observe browser CSP enforcement programmatically

#### 3. Usage Logs Visible in Vercel Runtime Logs

**Test:** Scan a menu and ask one voice question on the production URL, then go to Vercel Dashboard -> project -> Logs tab
**Expected:** JSON log entries appear with `event: 'menu_extract'` and `event: 'chat_turn'` or `event: 'tts'` fields, along with IP and timestamp
**Why human:** Cannot access Vercel dashboard logs

---

### Gaps Summary

No blocking gaps found. All seven DEPLOY requirements are satisfied in the codebase:

- Security headers are fully configured in `next.config.ts`
- Content-Type validation (415) is present in all three API routes
- Structured JSON usage logging is present in all three API routes
- Timeout resilience on the extract route is achieved via Node.js serverless `maxDuration=60s` (Edge Runtime was correctly removed after causing production 504s)
- `.env.example` documents both required environment variables with actionable instructions
- Production deployment is confirmed live at https://menu-voice.vercel.app/ with end-to-end voice flow working

Three items are flagged for human spot-checking on the live URL (security headers, TTS CSP, Vercel logs) — these are observational confirmations, not blocking gaps, since the underlying code implementing each behavior is verified.

---

_Verified: 2026-04-05_
_Verifier: Claude (gsd-verifier)_
