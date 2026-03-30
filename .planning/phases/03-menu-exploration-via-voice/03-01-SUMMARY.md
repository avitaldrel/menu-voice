---
phase: 03-menu-exploration-via-voice
plan: 01
subsystem: api
tags: [anthropic, streaming, chat, system-prompt, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-menu-capture
    provides: Menu/MenuCategory/MenuItem type definitions from menu-schema.ts
  - phase: 02-voice-interface
    provides: voice loop state machine — POST /api/chat will feed responses into speaking state
provides:
  - buildSystemPrompt(menu) — injects full menu JSON into Claude system prompt
  - ChatMessage type (role: user|assistant, content: string)
  - OVERVIEW_USER_MESSAGE constant for proactive overview turn
  - POST /api/chat — streaming Claude conversation endpoint accepting { messages, menu }
affects:
  - 03-02 (voice-conversation-loop) — will call POST /api/chat and read streaming text response

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ReadableStream wrapping Anthropic stream.on('text') for plain-text streaming
    - vi.hoisted() + function constructor mock pattern for Anthropic SDK in vitest
    - stream.abort() in ReadableStream.cancel() for clean client-disconnect cleanup

key-files:
  created:
    - src/lib/chat-prompt.ts
    - src/lib/__tests__/chat-prompt.test.ts
    - src/app/api/chat/route.ts
    - src/app/api/chat/__tests__/route.test.ts
  modified: []

key-decisions:
  - "claude-sonnet-4-6 with max_tokens 512 for chat responses (concise voice answers)"
  - "Full menu JSON via JSON.stringify(menu, null, 2) — no summarization per CLAUDE.md"
  - "Plain-text streaming response (Content-Type: text/plain) — client reads chunks directly into TTS pipeline"
  - "Response.json() used in chat route for error cases (consistent with tts route pattern)"

patterns-established:
  - "vi.hoisted() + function constructor (not arrow function) required for Anthropic SDK mock — same pattern as Phase 2 OpenAI mock"
  - "ReadableStream start/cancel pattern: start() attaches stream.on('text') + awaits finalMessage(), cancel() calls stream.abort()"

requirements-completed: [CONV-06, CONV-01, CONV-02]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 3 Plan 01: Chat API Summary

**Streaming Claude chat endpoint with full-menu system prompt injection using ReadableStream + Anthropic stream.on('text') pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T21:34:28Z
- **Completed:** 2026-03-30T21:38:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `buildSystemPrompt(menu)` embeds complete unsummarized menu JSON in Claude system prompt with persona and voice-optimized response rules
- `POST /api/chat` streams Claude text deltas as plain text, validates all inputs, and properly aborts Anthropic connection on client disconnect
- 16 new tests (8 per file), full suite grows from 157 to 173 passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create buildSystemPrompt utility and tests** - `f473f6c` (feat)
2. **Task 2: Create /api/chat streaming route and tests** - `20731d1` (feat)

**Plan metadata:** (this commit, docs)

_Note: Both tasks used TDD — tests written first (RED), then implementation (GREEN)._

## Files Created/Modified

- `src/lib/chat-prompt.ts` — Exports `buildSystemPrompt(menu)`, `ChatMessage` interface, `OVERVIEW_USER_MESSAGE` constant
- `src/lib/__tests__/chat-prompt.test.ts` — 8 unit tests covering JSON embedding, persona, all response rules, type shape
- `src/app/api/chat/route.ts` — Streaming POST endpoint: validates env/body/messages, builds system prompt, streams Anthropic text deltas, aborts on disconnect
- `src/app/api/chat/__tests__/route.test.ts` — 8 route tests: 500/400 error cases, stream param validation, Content-Type, text delta streaming, abort-on-cancel

## Decisions Made

- Used `claude-sonnet-4-6` with `max_tokens: 512` — concise voice answers; same model as menu extraction for consistency
- Full `JSON.stringify(menu, null, 2)` in system prompt per CLAUDE.md constraint (no summarization)
- Plain-text streaming response so the voice loop can pipe chunks directly into TTS sentence buffering
- `Response.json()` (not `NextResponse.json()`) for error cases — consistent with tts/route.ts which uses the same native Response API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required (ANTHROPIC_API_KEY was already in use by Phase 1 menu extraction).

## Next Phase Readiness

- `POST /api/chat` is ready for the voice loop to call — accepts `{ messages: ChatMessage[], menu: Menu }`, returns streaming `text/plain`
- `OVERVIEW_USER_MESSAGE` is exported and ready for 03-02 to trigger the proactive menu overview on first load
- No blockers for Phase 3 Plan 02 (voice conversation loop wiring)

---
*Phase: 03-menu-exploration-via-voice*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: src/lib/chat-prompt.ts
- FOUND: src/lib/__tests__/chat-prompt.test.ts
- FOUND: src/app/api/chat/route.ts
- FOUND: src/app/api/chat/__tests__/route.test.ts
- FOUND: .planning/phases/03-menu-exploration-via-voice/03-01-SUMMARY.md
- FOUND commit: f473f6c (feat(03-01): create buildSystemPrompt utility and ChatMessage type)
- FOUND commit: 20731d1 (feat(03-01): create streaming /api/chat route for Claude conversation)
