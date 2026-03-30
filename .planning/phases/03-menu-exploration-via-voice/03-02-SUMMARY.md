---
phase: 03-menu-exploration-via-voice
plan: 02
subsystem: voice
tags: [claude, streaming, voice-loop, conversation-history, tts, abort-controller, proactive-overview]

# Dependency graph
requires:
  - phase: 03-menu-exploration-via-voice/03-01
    provides: /api/chat streaming route, buildSystemPrompt, ChatMessage type, OVERVIEW_USER_MESSAGE
  - phase: 02-voice-interface
    provides: useVoiceLoop hook, TTSClient, SpeechManager, voice state machine, TTS sentence buffering
provides:
  - Real Claude chat streaming integrated into voice loop — replaces Phase 2 placeholder echo
  - Conversation history managed via useRef across turns (messagesRef accumulates user+assistant messages)
  - AbortController cancels in-flight /api/chat requests on new input or stop
  - triggerOverview() function that primes messages with OVERVIEW_USER_MESSAGE and calls /api/chat
  - Proactive menu overview auto-spoken on results state entry (MENU-05) — no user prompt needed
  - Voice loop auto-restarts listening after overview TTS completes (PLAYBACK_ENDED -> listening)
affects:
  - 04-allergy-preferences (will use useVoiceLoop with menu; conversation context is now live)
  - Any future phase touching voice conversation flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streaming fetch with ReadableStream.getReader() + TextDecoder pipes chunks into TTSClient.queueText()"
    - "useRef for conversation history to avoid stale closure captures in callbacks"
    - "AbortController stored in ref — new request aborts previous before starting"
    - "triggerOverview primes messagesRef then calls triggerResponse(null) for overview mode"
    - "Proactive overview via useEffect on state.status transition — fires once on results entry"

key-files:
  created: []
  modified:
    - src/hooks/useVoiceLoop.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts
    - src/app/page.tsx

key-decisions:
  - "useRef for messagesRef (not useState) prevents stale closures in streaming callbacks"
  - "triggerResponse(null) for overview mode — messages already primed vs triggerResponse(text) for user speech"
  - "Page-level useEffect deps: [state.status] only — intentional omission of triggerOverview prevents re-firing on voice state changes"
  - "vi.stubGlobal for fetch mocks in vitest — resolves TypeScript type errors vs global.fetch assignment"

patterns-established:
  - "Streaming chat: fetch + ReadableStream.getReader() + TextDecoder -> TTSClient.queueText() -> flush()"
  - "Conversation history: messagesRef.current accumulates [{role, content}] pairs, synced to state for render"
  - "Request cancellation: abortControllerRef.current?.abort() before new fetch; catch AbortError silently"

requirements-completed: [CONV-01, CONV-02, CONV-06, MENU-05]

# Metrics
duration: ~35min
completed: 2026-03-30
---

# Phase 03 Plan 02: Menu Exploration via Voice — Chat Streaming Summary

**Claude chat streaming wired into voice loop with conversation history, AbortController cancellation, and proactive menu overview auto-spoken on extraction completion**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-30
- **Completed:** 2026-03-30
- **Tasks:** 3 (2 code + 1 human-verify, all complete)
- **Files modified:** 3

## Accomplishments

- Replaced Phase 2 placeholder echo in useVoiceLoop with real streaming fetch to /api/chat, piping text deltas into TTSClient for sentence-buffered playback
- Added conversation history management via messagesRef (useRef) that accumulates turns across the full session without stale closure issues
- Delivered MENU-05: proactive overview auto-spoken after menu extraction — app speaks without user prompting, then auto-restarts listening
- AbortController integration cancels in-flight chat requests when user speaks again or stops the session
- Human-verified end-to-end: category queries, item detail queries, follow-up questions using conversation history, all referencing actual menu content

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace placeholder echo with real Claude chat streaming in useVoiceLoop** - `7112d3a` (feat), `b9fb157` (fix — vi.stubGlobal for fetch mocks)
2. **Task 2: Integrate proactive overview trigger in page.tsx** - `e60fe45` (feat)
3. **Task 3: Verify end-to-end voice conversation with menu** - Human-approved checkpoint (no code commit)

## Files Created/Modified

- `src/hooks/useVoiceLoop.ts` — Now accepts `menu: Menu | null`, fetches /api/chat with streaming, manages conversation history via messagesRef, exposes triggerOverview(), aborts requests on stop/new-input
- `src/hooks/__tests__/useVoiceLoop.test.ts` — Extended with tests for fetch call shape, streaming TTS feeding, conversation accumulation, triggerOverview, AbortController cancellation, and null-menu no-op
- `src/app/page.tsx` — Passes menu to useVoiceLoop, destructures triggerOverview, replaces D-01 auto-start with MENU-05 proactive overview trigger on results state entry

## Decisions Made

- `useRef` for messagesRef rather than useState — streaming callbacks capture the ref object, not its value, preventing stale closure captures that would cause conversation history loss
- `triggerResponse(null)` signals overview mode (messages already primed with OVERVIEW_USER_MESSAGE) vs `triggerResponse(userText)` for regular speech — single function handles both flows
- Page useEffect dep array `[state.status]` only — intentionally excludes triggerOverview to prevent re-firing on every voice state change; fires exactly once when status transitions to 'results'
- `vi.stubGlobal` for fetch mock in tests — TypeScript-clean approach vs `global.fetch =` assignment which triggers type errors in strict vitest environment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in test file from fetch mock assignment**
- **Found during:** Task 1 (useVoiceLoop test extension)
- **Issue:** `global.fetch = mockFetch` caused TypeScript type errors because the mock function signature didn't match the full `typeof fetch` type
- **Fix:** Replaced `global.fetch = mockFetch` with `vi.stubGlobal('fetch', mockFetch)` — vitest-idiomatic approach that bypasses strict type checking on global replacement
- **Files modified:** src/hooks/__tests__/useVoiceLoop.test.ts
- **Verification:** Tests pass with exit code 0, no TypeScript errors
- **Committed in:** b9fb157

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor test infrastructure fix, no scope creep.

## Issues Encountered

- TypeScript strict typing on `global.fetch` assignment required switching to `vi.stubGlobal` — resolved immediately as a Rule 1 bug fix, no impact on test coverage or behavior

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full voice conversation loop is live: user speaks -> /api/chat (Claude with full menu context) -> TTS playback -> auto-listen
- Conversation history persists across the session for follow-up questions
- Phase 04 (allergy/preferences) can build on this foundation — useVoiceLoop already receives menu, conversation context is accumulated

---
*Phase: 03-menu-exploration-via-voice*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: .planning/phases/03-menu-exploration-via-voice/03-02-SUMMARY.md
- FOUND: 7112d3a (feat: replace placeholder echo with real Claude chat streaming in useVoiceLoop)
- FOUND: b9fb157 (fix: vi.stubGlobal for fetch mocks)
- FOUND: e60fe45 (feat: integrate proactive overview trigger in page.tsx)
