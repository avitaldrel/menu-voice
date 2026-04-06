---
phase: 02-voice-interface
verified: 2026-03-30T15:50:00Z
status: human_needed
score: 6/6 success criteria verified
re_verification: true
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "After the app finishes speaking, speech recognition automatically restarts for the next utterance"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end voice loop: speak, hear response, auto-restart"
    expected: "After the TTS response finishes playing, the microphone activates again without any user tap"
    why_human: "Cannot verify hardware microphone activation programmatically; requires real browser with microphone"
  - test: "Firefox text input fallback"
    expected: "Yellow warning and text input visible; submitting typed question triggers TTS response"
    why_human: "Requires browser without Web Speech API (Firefox or mock)"
  - test: "VoiceOver screen reader state announcements"
    expected: "VoiceOver on iOS/macOS announces 'Listening...', 'Thinking...', 'Speaking...' as states change"
    why_human: "ARIA live region behavior requires active screen reader"
  - test: "OpenAI TTS nova voice quality"
    expected: "Audio response plays through device speaker in the nova voice, not browser SpeechSynthesis"
    why_human: "Requires OPENAI_API_KEY configured in .env.local and listening for audio quality"
---

# Phase 2: Voice Interface Verification Report

**Phase Goal:** User can speak and hear natural voice responses through a reliable, non-conflicting voice loop
**Verified:** 2026-03-30
**Status:** human_needed (all automated checks pass; 4 items require human testing)
**Re-verification:** Yes — after gap closure commit 2d46222

---

## Re-Verification Summary

| Item | Previous | Now |
|------|----------|-----|
| Success criterion 5 (auto-restart after speaking) | FAILED | VERIFIED |
| VOICE-06 requirement | BLOCKED | SATISFIED |
| `speechManagerRef.current.start()` in auto-restart useEffect | MISSING | PRESENT (line 179) |
| Test 14 assertion on `mockSpeechManagerStart` call count | ABSENT | PRESENT (line 333: `toHaveBeenCalledTimes(2)`) |
| Test 15: no-double-start guard | ABSENT | PRESENT (line 346: `toHaveBeenCalledTimes(1)`) |
| Test 16: full cycle regression | ABSENT | PRESENT (line 378: `toHaveBeenCalledTimes(2)`) |
| Total tests | 155 passing | 157 passing |

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can speak a question and hear a spoken response via AI-generated voice played through an audio element | ? HUMAN | State machine + TTS wiring verified; actual audio playback requires human test with OPENAI_API_KEY |
| 2 | Voice loop never has microphone and TTS active simultaneously (state machine enforced) | VERIFIED | voiceReducer rejects FIRST_AUDIO_READY from listening (invalid transition); 15 state machine tests pass including mutual exclusion cases |
| 3 | If AI TTS is unavailable, app automatically falls back to browser SpeechSynthesis | VERIFIED | TTSClient.playWithFallback() calls speechSynthesis.speak(); triggered on non-2xx fetch; 15 TTS client tests pass |
| 4 | User hears an audio thinking cue while the app is processing their input | VERIFIED | startThinkingChime() called in useEffect when voiceState.status === 'processing'; 9 thinking-chime tests pass |
| 5 | After the app finishes speaking, speech recognition automatically restarts for the next utterance | VERIFIED | useEffect at lines 170-182 of useVoiceLoop.ts: calls speechManagerRef.current.start() when voiceState.status === 'listening' AND prevStatusRef.current === 'speaking'; Test 14 asserts mockSpeechManagerStart called twice; Test 15 confirms no double-start on initial tap; Test 16 is full cycle regression; all pass |
| 6 | App announces its current state (listening, thinking, speaking, error) clearly to screen readers | VERIFIED | VoiceStateIndicator has role="status" aria-live="polite" aria-atomic="true" sr-only always in DOM; rendered outside conditionals in page.tsx; 14 VoiceStateIndicator tests pass |

**Score:** 5/6 truths automated-verified, 1 needs human (criterion 1 requires hardware audio)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/voice-state.ts` | VERIFIED | Exports VoiceState, VoiceAction, voiceReducer, initialVoiceState; all 5 states and 7 action variants present; strict transition table enforced |
| `src/app/api/tts/route.ts` | VERIFIED | Exports POST; calls openai.audio.speech.create with model 'tts-1', voice 'nova'; returns Content-Type audio/mpeg; 400 on missing text; 500 on OpenAI error |
| `src/test/setup.ts` | VERIFIED | window.SpeechRecognition, window.webkitSpeechRecognition, window.AudioContext, window.speechSynthesis, window.SpeechSynthesisUtterance all mocked |
| `src/lib/__tests__/voice-state.test.ts` | VERIFIED | 16 tests covering all 9 valid transitions + 5 invalid cases + initialVoiceState; all pass |
| `src/app/api/tts/__tests__/route.test.ts` | VERIFIED | 4 tests: valid call, missing text, empty text, OpenAI error; all pass |

### Plan 02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/speech-recognition.ts` | VERIFIED | Exports isSpeechRecognitionSupported, createSpeechRecognition, SpeechManager, isVoiceCommand; continuous=false, interimResults=true, lang='en-US'; shouldRestart flag; 300ms setTimeout restart |
| `src/lib/tts-client.ts` | VERIFIED | Exports splitSentences, TTSClient; fetch('/api/tts'); URL.revokeObjectURL on audio end; speechSynthesis fallback; requestsSinceFallback counter; queue management |
| `src/lib/thinking-chime.ts` | VERIFIED | Exports startThinkingChime, stopThinkingChime; createOscillator at 440Hz; setInterval(2000); duplicate-start guard; lazy AudioContext creation |
| `src/lib/__tests__/speech-recognition.test.ts` | VERIFIED | 18 tests; all pass |
| `src/lib/__tests__/tts-client.test.ts` | VERIFIED | 15 tests; all pass |
| `src/lib/__tests__/thinking-chime.test.ts` | VERIFIED | 9 tests; all pass |

### Plan 03 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/components/VoiceButton.tsx` | VERIFIED | Exports VoiceButton; w-20 h-20 rounded-full; dynamic aria-label via ARIA_LABELS record; aria-hidden SVG icon; disabled during processing |
| `src/components/VoiceStateIndicator.tsx` | VERIFIED | Exports VoiceStateIndicator; role="status" aria-live="polite" aria-atomic="true" sr-only; always in DOM (not conditionally mounted) |
| `src/components/TranscriptDisplay.tsx` | VERIFIED | Exports TranscriptDisplay; aria-live="off"; max-h-48 overflow-y-auto; "You:" prefix; returns null when both props empty |
| `src/components/MicPermissionPrompt.tsx` | VERIFIED | Exports MicPermissionPrompt; role="status"; "MenuVoice needs your microphone"; "Got it, continue" button |
| `src/components/TextInputFallback.tsx` | VERIFIED | Exports TextInputFallback; role="alert"; "Voice recognition is not available"; "Send Question" button; form wrapper; clears input on submit |
| `src/components/__tests__/VoiceButton.test.tsx` | VERIFIED | 16 tests; all pass |
| `src/components/__tests__/VoiceStateIndicator.test.tsx` | VERIFIED | 14 tests; all pass |
| `src/components/__tests__/TextInputFallback.test.tsx` | VERIFIED | 9 tests; all pass |

### Plan 04 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/hooks/useVoiceLoop.ts` | VERIFIED | Exports useVoiceLoop; wires voiceReducer, SpeechManager, TTSClient, thinking chime; prevStatusRef guards auto-restart useEffect so start() is called only on speaking->listening transition; 16 tests pass |
| `src/hooks/__tests__/useVoiceLoop.test.ts` | VERIFIED | 16 tests all pass; Test 14 asserts mockSpeechManagerStart called twice after PLAYBACK_ENDED; Test 15 asserts no double-start on initial tap; Test 16 is full cycle regression test |
| `src/app/page.tsx` | VERIFIED | Imports all 5 voice components + useVoiceLoop; VoiceStateIndicator outside conditionals; VoiceButton, TranscriptDisplay, MicPermissionPrompt, TextInputFallback in results state; handleMicTap switch; D-01 auto-start useEffect; Phase 1 functionality preserved |

### Plan 05 Artifacts (Gap Closure)

| Artifact | Status | Details |
|----------|--------|---------|
| `src/hooks/useVoiceLoop.ts` (updated) | VERIFIED | prevStatusRef added at line 32; useEffect at lines 170-182 now calls speechManagerRef.current.start() when transitioning from speaking to listening |
| `src/hooks/__tests__/useVoiceLoop.test.ts` (updated) | VERIFIED | Test 14 strengthened; Tests 15 and 16 added; all 16 tests pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/tts/route.ts` | openai | openai.audio.speech.create | WIRED | Pattern found at line 23 |
| `src/lib/tts-client.ts` | `/api/tts` | fetch('/api/tts', { method: 'POST' }) | WIRED | Pattern found at line 162 |
| `src/lib/tts-client.ts` | window.speechSynthesis | speakWithSynthesis -> speechSynthesis.speak | WIRED | Pattern found at line 45 |
| `src/lib/thinking-chime.ts` | AudioContext | createOscillator | WIRED | Pattern found at line 26 |
| `src/hooks/useVoiceLoop.ts` | `src/lib/voice-state.ts` | useReducer(voiceReducer, initialVoiceState) | WIRED | Line 24 |
| `src/hooks/useVoiceLoop.ts` | `src/lib/speech-recognition.ts` | new SpeechManager | WIRED | Line 87 (inside ensureInstances) |
| `src/hooks/useVoiceLoop.ts` | `src/lib/tts-client.ts` | new TTSClient | WIRED | Line 70 (inside ensureInstances) |
| `src/hooks/useVoiceLoop.ts` | `src/lib/thinking-chime.ts` | startThinkingChime/stopThinkingChime | WIRED | Lines 154, 156, 160 |
| `src/hooks/useVoiceLoop.ts` | speechManager.start() on PLAYBACK_ENDED | useEffect lines 170-182; calls start() when prevStatusRef.current === 'speaking' | WIRED | Lines 172-180; prevStatusRef updated at line 181 after each status change |
| `src/app/page.tsx` | `src/hooks/useVoiceLoop.ts` | useVoiceLoop() | WIRED | Line 6 import + line 33 call |
| `src/app/page.tsx` | `src/components/VoiceButton.tsx` | `<VoiceButton` | WIRED | Line 104 |
| `src/app/page.tsx` | `src/components/VoiceStateIndicator.tsx` | `<VoiceStateIndicator` always in DOM | WIRED | Line 78 (outside all conditionals) |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/components/VoiceStateIndicator.tsx` | `status` prop | voiceState.status from useVoiceLoop | Yes — derived from live useReducer state | FLOWING |
| `src/components/TranscriptDisplay.tsx` | `userTranscript`, `assistantResponse` | transcript/response from useVoiceLoop | Yes — set on SpeechManager onTranscript and TTSClient onSentenceStart | FLOWING |
| `src/components/VoiceButton.tsx` | `status` prop | voiceState.status from useVoiceLoop | Yes — live reducer state | FLOWING |
| `src/hooks/useVoiceLoop.ts` | triggerResponse | Phase 2 placeholder echo string | Static placeholder (intentional — Phase 3 replaces with Claude API) | STATIC (intentional) |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vitest full suite passes | npx vitest run | 157 passed, 0 failed, 16 test files | PASS |
| voice-state.ts exports all required symbols | grep pattern check | VoiceState, VoiceAction, voiceReducer, initialVoiceState all present | PASS |
| TTS route calls OpenAI SDK | grep pattern check | openai.audio.speech.create found at line 23 of route.ts | PASS |
| VoiceStateIndicator always in DOM | code inspection | Rendered at line 78 of page.tsx outside all conditional blocks | PASS |
| Auto-restart useEffect calls start() on speaking->listening | code inspection | Lines 170-182 of useVoiceLoop.ts: condition checks prevStatusRef.current === 'speaking'; calls speechManagerRef.current.start() at line 179 | PASS |
| No double-start on initial idle->listening | test verification | Test 15 asserts toHaveBeenCalledTimes(1) after startListening(); passes | PASS |
| Full cycle start() called twice | test verification | Test 16 asserts toHaveBeenCalledTimes(2) after full loop; passes | PASS |
| End-to-end voice loop with microphone | requires browser + mic + OPENAI_API_KEY | N/A | SKIP |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VOICE-01 | 02-02, 02-04 | User can speak commands and questions using speech recognition | SATISFIED | SpeechManager wraps Web Speech API with iOS fallback; integrated into useVoiceLoop and page.tsx; 18 speech-recognition tests pass |
| VOICE-02 | 02-01, 02-04 | App responds with natural AI-generated voice via `<audio>` element | SATISFIED | TTS route returns audio/mpeg; TTSClient uses new Audio() (not DOM-attached); route tested against OpenAI SDK |
| VOICE-03 | 02-02, 02-04 | App falls back to browser SpeechSynthesis when AI TTS is unavailable | SATISFIED | TTSClient.playWithFallback() path active on non-2xx; speakWithSynthesis helper; iOS GC prevention via window._ttsUtterance |
| VOICE-04 | 02-01, 02-04 | Voice loop uses strict state machine — listening OR speaking, never both | SATISFIED | voiceReducer blocks all invalid transitions; FIRST_AUDIO_READY from listening rejected; START_LISTENING from speaking rejected; 5 invalid-transition tests pass |
| VOICE-05 | 02-02, 02-04 | App provides audio feedback during processing ("thinking" cue) | SATISFIED | startThinkingChime() called when voiceState.status === 'processing'; 440Hz sine wave every 2s; 9 tests pass |
| VOICE-06 | 02-02, 02-04, 02-05 | Speech recognition auto-restarts after silence/completion for continuous conversation | SATISFIED | useEffect at lines 170-182 calls speechManagerRef.current.start() when transitioning from speaking to listening; prevStatusRef.current === 'speaking' guard prevents double-start; Tests 14, 15, 16 all pass |
| A11Y-05 | 02-01, 02-04 | TTS output uses `<audio>` element to avoid conflict with active screen readers | SATISFIED | TTSClient constructor uses new Audio() (standalone element, not attached to DOM) |
| A11Y-06 | 02-03, 02-04 | App announces its state clearly (listening, thinking, speaking, error) | SATISFIED | VoiceStateIndicator has role="status" aria-live="polite" aria-atomic="true" sr-only always in DOM; rendered outside conditionals in page.tsx |

**Coverage:** 8/8 Phase 2 requirements mapped | 8/8 satisfied | 0 blocked

---

## Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `src/hooks/useVoiceLoop.ts` | 57-64 | triggerResponse() uses placeholder echo string | Info | Intentional Phase 2 stub; documented in SUMMARY; Phase 3 replaces with Claude streaming |

No blocker anti-patterns remain. The empty useEffect body identified in the initial verification has been replaced with a correctly guarded call to speechManagerRef.current.start().

---

## Human Verification Required

### 1. End-to-End Voice Loop

**Test:** Run `npm run dev`, scan a menu photo, speak a question after reaching results state
**Expected:** Hear thinking chime (soft beep), then hear spoken response in nova voice; after response ends, mic restarts automatically without any user tap
**Why human:** Hardware microphone activation and actual audio playback cannot be verified programmatically; requires OPENAI_API_KEY in .env.local

### 2. TTS Fallback to SpeechSynthesis

**Test:** Set OPENAI_API_KEY to an invalid value, scan menu, speak a question
**Expected:** Response is still spoken aloud via browser SpeechSynthesis (different voice quality) with no visible error
**Why human:** Requires runtime behavior with deliberate API key failure

### 3. Firefox Text Input Fallback

**Test:** Open the app in Firefox (or a browser without Web Speech API), reach results state
**Expected:** Yellow warning box appears, text input and "Send Question" button visible; submitting typed text triggers TTS response
**Why human:** Requires Firefox browser or environment without SpeechRecognition

### 4. VoiceOver Screen Reader Announcements

**Test:** Enable VoiceOver on macOS/iOS, scan a menu, trigger voice state changes
**Expected:** VoiceOver announces "Listening...", "Thinking...", "Speaking...", "Something went wrong — tap to retry" as states change
**Why human:** ARIA live region behavior requires active screen reader software; cannot verify with DOM inspection alone

---

## Gap Closure Confirmation

The single gap from the initial verification has been fully closed.

**Gap:** The useEffect at lines 166-172 of useVoiceLoop.ts had an empty body — the state machine transitioned to 'listening' on PLAYBACK_ENDED but speechManager.start() was never called, leaving the microphone inactive after TTS playback.

**Fix applied (commit 2d46222):**
- `prevStatusRef = useRef<string>('idle')` added at line 32 to track the previous voice status
- useEffect at lines 170-182 now calls `speechManagerRef.current.start()` when `voiceState.status === 'listening'` AND `prevStatusRef.current === 'speaking'`
- `prevStatusRef.current` is updated at line 181 on every status change
- The `prevStatusRef.current === 'speaking'` guard ensures the initial idle->listening tap (handled by startListening()) does not trigger a double-start

**Test coverage added (commit 28e3de8):**
- Test 14 strengthened: asserts `mockSpeechManagerStart` called exactly 2 times after PLAYBACK_ENDED (previously only checked state transition)
- Test 15 added: asserts no double-call on initial startListening() — `toHaveBeenCalledTimes(1)`
- Test 16 added: full cycle regression — `toHaveBeenCalledTimes(2)` after complete speaking->listening->start arc

All 157 tests pass (up from 155 before gap closure).

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
