---
phase: 03-menu-exploration-via-voice
verified: 2026-03-30T18:55:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "After menu extraction, app speaks a proactive overview without user interaction"
    expected: "App transitions to processing state automatically, TTS plays a spoken overview of the restaurant type and menu categories within a few seconds of extraction completing"
    why_human: "Cannot invoke browser TTS and real extraction pipeline in unit test environment"
  - test: "User asks about a menu category by voice and hears items listed"
    expected: "App transcribes speech, sends to /api/chat with full menu JSON, streams Claude response describing items in that category (max 5, with descriptions, no prices unless asked)"
    why_human: "Requires real browser speech recognition, real Anthropic API, and real TTS playback"
  - test: "User asks about a specific item and hears its description"
    expected: "App responds with the item name, description, and ingredients from the menu. No price unless asked."
    why_human: "Requires live voice round-trip with Claude"
  - test: "Conversation history persists across turns — follow-up questions work"
    expected: "After asking about an item, user can say 'How much is that?' and app correctly references the prior item without restating the full question"
    why_human: "Multi-turn coherence requires live Claude API call with accumulated messagesRef"
  - test: "Voice loop auto-restarts listening after overview TTS completes"
    expected: "After the proactive overview finishes speaking, the voice state machine transitions speaking -> listening automatically and the microphone indicator shows listening state"
    why_human: "PLAYBACK_ENDED -> listening auto-restart requires real TTS audio completion event in browser"
---

# Phase 3: Menu Exploration via Voice — Verification Report

**Phase Goal:** User can ask about the menu by voice and get accurate spoken answers about categories, items, and prices
**Verified:** 2026-03-30T18:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Full menu JSON appears unsummarized in the system prompt sent to Claude | VERIFIED | `buildSystemPrompt` calls `JSON.stringify(menu, null, 2)` and embeds it under "MENU DATA:" header. Confirmed in `src/lib/chat-prompt.ts` lines 12-15. 6 unit tests pass covering JSON embedding, restaurant name, category names, item names |
| 2  | POST /api/chat accepts { messages, menu } and returns a streaming text response | VERIFIED | `src/app/api/chat/route.ts` exports `POST`, accepts `{ messages: ChatMessage[], menu: Menu }`, returns `new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`. 8 route tests pass |
| 3  | When the client disconnects mid-stream, the Anthropic API connection is aborted | VERIFIED | `ReadableStream.cancel()` calls `stream.abort()` in route.ts line 61. Verified by dedicated test "calls stream.abort() when ReadableStream.cancel() is triggered" |
| 4  | After menu extraction completes, the app proactively speaks a menu overview without the user saying anything | VERIFIED (automated) / NEEDS HUMAN | `page.tsx` useEffect fires `triggerOverview()` when `state.status === 'results'`. `triggerOverview()` in `useVoiceLoop.ts` primes `messagesRef` with `OVERVIEW_USER_MESSAGE` and calls `/api/chat`. Unit test confirms no-fetch-without-menu guard. End-to-end TTS playback requires human |
| 5  | User can ask about menu categories and hear items listed with descriptions | NEEDS HUMAN | Code path is wired: speech -> `triggerResponse(t)` -> fetch `/api/chat` with full menu JSON -> stream into `TTSClient.queueText()`. Unit tests verify the fetch call shape and streaming. Actual spoken output requires browser + Anthropic API |
| 6  | User can ask about a specific item and hear its details | NEEDS HUMAN | Same code path as T5. Full menu context passed to Claude ensures item details are available. Requires live verification |
| 7  | Conversation history accumulates across turns — Claude remembers prior exchanges | VERIFIED | `messagesRef.current` accumulates `[user, assistant, user, assistant, ...]` across calls. Test "conversation history accumulates across turns" verifies second fetch body includes `[user1, assistant1, user2]`. `useRef` pattern prevents stale closure issues |
| 8  | Rapid voice input cancels the previous in-flight request before starting a new one | VERIFIED | `abortControllerRef.current?.abort()` called at start of every `triggerResponse`. `stopListening` also calls abort. Test "starting a new request aborts the previous in-flight request" verifies first controller is aborted when second request starts |

**Score:** 8/8 truths have supporting implementation; 5 verified fully by automated tests, 3 require human verification for the end-to-end voice/audio layer.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/chat-prompt.ts` | buildSystemPrompt(menu), ChatMessage type, OVERVIEW_USER_MESSAGE | VERIFIED | Exports all three. 26 lines, no stubs. `JSON.stringify(menu, null, 2)` embedded in returned string |
| `src/lib/__tests__/chat-prompt.test.ts` | Unit tests for system prompt construction | VERIFIED | 8 tests, all pass — covers JSON embedding, persona, 3 sentences, 5 items, prices rule, markdown rule, ChatMessage type, OVERVIEW_USER_MESSAGE |
| `src/app/api/chat/route.ts` | Streaming POST endpoint for Claude conversation | VERIFIED | Exports POST, maxDuration=30, dynamic='force-dynamic'. Validates API key (500), JSON (400), messages (400). Uses `client.messages.stream()` with claude-sonnet-4-6, max_tokens 512. Aborts on cancel |
| `src/app/api/chat/__tests__/route.test.ts` | Unit tests for chat API route | VERIFIED | 8 tests, all pass — covers all error cases, stream params, Content-Type, text delta streaming, abort-on-cancel |
| `src/hooks/useVoiceLoop.ts` | Voice loop with real Claude chat streaming, conversation history, triggerOverview | VERIFIED | Accepts `menu: Menu | null`. Contains fetch `/api/chat`, messagesRef, abortControllerRef, triggerOverview, conversationMessages. No placeholder echo remaining |
| `src/app/page.tsx` | Page with proactive overview trigger on results state entry | VERIFIED | `const menu = state.status === 'results' ? state.menu : null`, `useVoiceLoop(menu)`, `triggerOverview` destructured, useEffect fires `triggerOverview()` on `state.status === 'results'` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/chat/route.ts` | `src/lib/chat-prompt.ts` | `import { buildSystemPrompt }` | WIRED | Line 2: `import { buildSystemPrompt, type ChatMessage } from '@/lib/chat-prompt'`. Called at line 36: `const systemPrompt = buildSystemPrompt(menu)` |
| `src/app/api/chat/route.ts` | `@anthropic-ai/sdk` | `client.messages.stream()` | WIRED | Line 38: `const stream = client.messages.stream({ model: 'claude-sonnet-4-6', max_tokens: 512, system: systemPrompt, messages })` |
| `src/hooks/useVoiceLoop.ts` | `/api/chat` | `fetch('/api/chat', ...) with ReadableStream.getReader()` | WIRED | Lines 87-108: `fetch('/api/chat', { method: 'POST', ... })` + `res.body.getReader()` + while loop reading chunks |
| `src/hooks/useVoiceLoop.ts` | `src/lib/tts-client.ts` | `ttsClientRef.current.queueText(chunk)` | WIRED | Line 108: `ttsClientRef.current?.queueText(chunk)` inside read loop; line 111: `ttsClientRef.current?.flush()` after loop |
| `src/hooks/useVoiceLoop.ts` | `src/lib/chat-prompt.ts` | `import { ChatMessage, OVERVIEW_USER_MESSAGE }` | WIRED | Line 12: `import { ChatMessage, OVERVIEW_USER_MESSAGE } from '@/lib/chat-prompt'`. OVERVIEW_USER_MESSAGE used at line 141 in triggerOverview |
| `src/app/page.tsx` | `src/hooks/useVoiceLoop.ts` | `useVoiceLoop(menu)` — passes menu data, calls triggerOverview on results entry | WIRED | Line 23: `const menu = state.status === 'results' ? state.menu : null`; line 35: `useVoiceLoop(menu)`; line 34: `triggerOverview` destructured; line 57: `triggerOverview()` in useEffect |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `useVoiceLoop.ts` (streaming response) | `fullResponse` | `fetch('/api/chat')` -> Anthropic SDK -> `client.messages.stream()` with real menu JSON system prompt | Yes — real Anthropic API call with full menu context. `menuRef.current` populated from `page.tsx` state.menu (extracted by Claude Vision in Phase 1) | FLOWING |
| `page.tsx` (menu to voice loop) | `menu` | `state.menu` from `appReducer` results state, set by `useMenuExtraction` after API call to `/api/menu/extract` | Yes — actual extracted menu JSON from Claude Vision OCR | FLOWING |
| `useVoiceLoop.ts` (conversation history) | `messagesRef.current` | Accumulated `[{ role, content }, ...]` pairs across `triggerResponse` calls | Yes — real user transcripts + Claude assistant responses appended each turn | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for browser-dependent behaviors (voice recognition, TTS audio playback). The following automated proxy checks were run instead:

| Behavior | Command/Check | Result | Status |
|----------|--------------|--------|--------|
| All 181 tests pass | `npx vitest run` | 18 test files, 181 tests, 0 failures | PASS |
| TypeScript in production files | `npx tsc --noEmit` (checking Phase 3 files only) | No errors in `chat-prompt.ts`, `route.ts`, `useVoiceLoop.ts`, `page.tsx` | PASS |
| TypeScript errors present | Pre-existing Phase 2 test files (`speech-recognition.test.ts`, `tts-client.test.ts`) have type errors | 5 errors in Phase 2 test files, unchanged from before Phase 3 | INFO (pre-existing, not introduced by Phase 3) |
| Placeholder echo removed | Grep for "I heard you say:" in useVoiceLoop.ts | No matches | PASS |
| No TODO/FIXME/stub patterns in Phase 3 files | Grep for placeholder patterns | No matches in any Phase 3 production files | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONV-01 | 03-01, 03-02 | User can ask about menu categories ("What pasta do you have?") | SATISFIED | `useVoiceLoop` sends user speech to `/api/chat` with full menu JSON. Claude can answer category queries from the unsummarized menu in system prompt. Test 17 verifies correct fetch call shape |
| CONV-02 | 03-01, 03-02 | User can ask about specific items — ingredients, preparation, description | SATISFIED | Same code path as CONV-01. Full item JSON (name, description, price, allergens, dietaryFlags, modifications) included in system prompt. Response rules instruct Claude to answer item detail queries |
| CONV-06 | 03-01, 03-02 | App uses full extracted menu data in conversation context (no summarization) | SATISFIED | `buildSystemPrompt` uses `JSON.stringify(menu, null, 2)` verbatim. No truncation, summarization, or filtering. Test 1 in chat-prompt.test.ts verifies restaurant name, all category names, and all item names appear in prompt output |
| MENU-05 | 03-02 | App presents a proactive spoken overview of the restaurant type and menu categories after processing | SATISFIED (automated) | `page.tsx` useEffect triggers `triggerOverview()` on `state.status === 'results'`. `triggerOverview` primes messages with `OVERVIEW_USER_MESSAGE` and calls `/api/chat`. Test 20 verifies fetch is called with OVERVIEW_USER_MESSAGE. End-to-end audio playback requires human verification |

**Requirements not in scope for Phase 3:** CONV-04 (Phase 4), all ALLERGY requirements (Phase 5), remaining A11Y requirements (Phase 6). All Phase 3 requirements are accounted for.

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps CONV-01, CONV-02, CONV-06, MENU-05 to Phase 3. All four appear in plan frontmatter. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/__tests__/speech-recognition.test.ts` | 77, 117 | TypeScript type errors (pre-existing Phase 2) | INFO | Test-only; does not affect production code or runtime behavior. Pre-dates Phase 3 by several commits |
| `src/lib/__tests__/tts-client.test.ts` | 82 (x3) | TypeScript type errors (pre-existing Phase 2) | INFO | Test-only; does not affect production code or runtime behavior. Pre-dates Phase 3 |

No blockers or warnings found in Phase 3 production files. No stubs, placeholders, or hardcoded empty returns in any Phase 3 artifact.

### Human Verification Required

The automated layer is fully verified. The following behaviors require a human to run the app with a real menu photo, real microphone, and real speakers/headphones:

#### 1. Proactive Menu Overview

**Test:** Run `npm run dev`, open http://localhost:3000, capture/upload a menu photo and wait for extraction to complete.
**Expected:** Within a few seconds of extraction completing, the app begins speaking a brief overview describing the restaurant type, listing the menu category names, and stating the total number of items — without the user saying or tapping anything.
**Why human:** Real TTS audio playback and the automatic `state.status === 'results'` trigger require a browser runtime.

#### 2. Category Query Voice Flow

**Test:** After the overview finishes, the mic should auto-activate (listening state). Ask "What [category name] do you have?" using the menu category visible in the MenuSummary.
**Expected:** App transcribes speech, sends to Claude, and speaks back a list of items in that category with brief descriptions. No prices unless you asked. Max 5 items before "Want to hear more?"
**Why human:** Speech recognition, Anthropic streaming, and TTS all require browser runtime.

#### 3. Item Detail Query

**Test:** Ask "Tell me more about [specific item name]" for any item in the menu.
**Expected:** App speaks the item name, description, and key details (preparation, allergens if relevant). Price NOT mentioned unless explicitly requested.
**Why human:** Requires live Claude response with menu context.

#### 4. Conversation History Continuity

**Test:** Ask "How much is that?" immediately after asking about a specific item.
**Expected:** Claude correctly references the item from the previous turn and states its price — demonstrating conversation history is intact.
**Why human:** Multi-turn coherence requires real API interaction with accumulated messagesRef.

#### 5. Voice Auto-Restart After Overview

**Test:** Watch the VoiceStateIndicator after the proactive overview finishes speaking.
**Expected:** State transitions: idle -> processing -> speaking (overview) -> listening (auto-restart). Microphone indicator shows "Listening..." after TTS completes.
**Why human:** The PLAYBACK_ENDED -> listening auto-restart depends on the real TTS `onSpeakingEnd` callback firing after actual audio completion.

### Gaps Summary

No gaps found. All 8 must-have truths have complete implementation. All 6 artifacts exist, are substantive, and are wired. All 6 key links are verified. All 4 requirement IDs (CONV-01, CONV-02, CONV-06, MENU-05) are covered. The full test suite passes with 181/181 tests.

The human_needed status reflects the inherent limitation of verifying browser-native voice I/O (Web Speech API + audio element TTS) without running the app. The automated verification confirms all code paths exist and are correctly wired; human verification confirms they actually produce intelligible spoken output in the browser.

---

_Verified: 2026-03-30T18:55:00Z_
_Verifier: Claude (gsd-verifier)_
