---
phase: 02-voice-interface
plan: 02
subsystem: voice
tags: [speech-recognition, tts-client, thinking-chime, web-speech-api, web-audio-api, ios-fallback]

# Dependency graph
requires:
  - phase: 02-voice-interface
    plan: 01
    provides: voice-state.ts types, test mocks for SpeechRecognition/AudioContext/speechSynthesis

provides:
  - SpeechManager class with single-turn recognition, shouldRestart flag, 300ms delay restart
  - isSpeechRecognitionSupported() feature detection with SSR guard
  - createSpeechRecognition() factory with iOS-compatible configuration
  - isVoiceCommand() helper for stop/pause detection
  - TTSClient class with sentence buffering, audio queue, blob URL management, SpeechSynthesis fallback
  - splitSentences() utility for terminal punctuation splitting
  - startThinkingChime() / stopThinkingChime() Web Audio API oscillator chime

affects: [02-03, 02-04, useVoiceLoop hook]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SpeechRecognition single-turn (continuous=false) + onend restart with shouldRestart flag"
    - "iOS isFinal=false workaround via interimResults=true + transcript.length > 0 fallback"
    - "Blob URL lifecycle: createObjectURL on fetch success, revokeObjectURL in onended handler"
    - "SpeechSynthesis fallback with window._ttsUtterance reference to prevent iOS GC bug"
    - "AudioContext lazy creation (in playChime, after user gesture) to avoid autoplay policy"
    - "vi.fn(function() {...}) not arrow function for mock constructors in vitest"

key-files:
  created:
    - src/lib/speech-recognition.ts
    - src/lib/__tests__/speech-recognition.test.ts
    - src/lib/tts-client.ts
    - src/lib/__tests__/tts-client.test.ts
    - src/lib/thinking-chime.ts
    - src/lib/__tests__/thinking-chime.test.ts
  modified:
    - src/test/setup.ts

key-decisions:
  - "vi.fn(function() {...}) not arrow function for mock constructors — arrow functions are not constructors and throw when new-called"
  - "SpeechSynthesisUtterance mock added to setup.ts — jsdom does not define it; TTS fallback path requires it"
  - "TTSClient requestsSinceFallback increments in playWithFallback — tracks fallback usage to trigger OpenAI retry every 5 requests"
  - "AudioContext cached at module level in thinking-chime — created once after first user gesture, reused for all subsequent chimes"

# Metrics
duration: 16min
completed: 2026-03-30
---

# Phase 2 Plan 02: Voice Utility Modules Summary

**SpeechManager (single-turn recognition with iOS fallback and auto-restart), TTSClient (sentence buffering, audio queue, blob URL cleanup, SpeechSynthesis fallback with retry), and ThinkingChime (440Hz Web Audio API oscillator every 2s) — all fully tested**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-03-30T18:06:10Z
- **Completed:** 2026-03-30T18:22:06Z
- **Tasks:** 3 completed
- **Files modified:** 7

## Accomplishments

- SpeechManager wraps Web Speech API with iOS isFinal=false workaround, shouldRestart flag, 300ms restart delay to avoid rate limiting, and voice command detection (stop/pause) per CONTEXT.md
- TTSClient buffers streaming text into sentences, queues them, plays via HTMLAudioElement (CLAUDE.md requirement), revokes blob URLs to prevent memory leaks, and falls back silently to SpeechSynthesis on fetch failure with OpenAI retry every 5 requests
- ThinkingChime plays 440Hz sine wave every 2 seconds during processing state, with lazy AudioContext creation and safe stop/restart lifecycle
- 141 total tests passing (18 speech-recognition + 15 tts-client + 9 thinking-chime + 99 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Speech recognition utility** - `b9f1b2b` (feat)
2. **Task 2: TTS client with sentence buffering and fallback** - `a77444f` (feat)
3. **Task 3: Thinking chime utility** - `1ae742e` (feat)

## Files Created/Modified

- `src/lib/speech-recognition.ts` — isSpeechRecognitionSupported, createSpeechRecognition, SpeechManager, isVoiceCommand
- `src/lib/__tests__/speech-recognition.test.ts` — 18 tests covering feature detection, start/stop, transcript extraction, iOS fallback, restart, voice commands
- `src/lib/tts-client.ts` — splitSentences, TTSClient (queue, audio element, blob URL, fallback, retry)
- `src/lib/__tests__/tts-client.test.ts` — 15 tests covering sentence splitting, queue, blob URL revocation, fallback, retry, stop, callbacks
- `src/lib/thinking-chime.ts` — startThinkingChime, stopThinkingChime (AudioContext oscillator)
- `src/lib/__tests__/thinking-chime.test.ts` — 9 tests covering immediate chime, interval, duplicate-start guard, unavailable AudioContext, stop, restart
- `src/test/setup.ts` — Fixed MockSpeechRecognition to use regular function (not arrow) for constructor compatibility; added SpeechSynthesisUtterance mock

## Decisions Made

- **vi.fn(function() {...}) for mock constructors** — Arrow functions throw `is not a constructor` when called with `new`. The existing `MockSpeechRecognition = vi.fn(() => ...)` pattern failed. Using regular function syntax fixes this.
- **SpeechSynthesisUtterance mock in setup.ts** — jsdom does not provide `SpeechSynthesisUtterance`. The TTS fallback path requires it. Added alongside other browser API mocks.
- **requestsSinceFallback increment in playWithFallback** — Counting fallback usages in the method ensures the OpenAI retry fires correctly on every 5th fallback request (modulo 5 check). Increment on sentence 1 failure gives retry on sentence 6.
- **Module-level audioCtx in thinking-chime** — AudioContext is cached at module level per research Pattern 5. This is intentional: create once after user gesture, reuse for all chimes in the session. Tests work around this by using a consistent mock instance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MockSpeechRecognition arrow function not usable as constructor**
- **Found during:** Task 1 (speech-recognition tests)
- **Issue:** `vi.fn(() => mockRecognitionInstance)` uses arrow function which cannot be `new`-called. All SpeechManager tests failed with "is not a constructor"
- **Fix:** Changed `vi.fn(() => ...)` to `vi.fn(function() { return mockRecognitionInstance; })` in setup.ts
- **Files modified:** `src/test/setup.ts`
- **Verification:** All 18 speech-recognition tests pass
- **Committed in:** b9f1b2b (Task 1 commit)

**2. [Rule 2 - Missing Critical] SpeechSynthesisUtterance not mocked in jsdom**
- **Found during:** Task 2 (tts-client tests, fallback path)
- **Issue:** jsdom does not define `SpeechSynthesisUtterance`. The `speakWithSynthesis` function throws `ReferenceError: SpeechSynthesisUtterance is not defined` when the fallback path is hit
- **Fix:** Added `MockSpeechSynthesisUtterance` class and `Object.defineProperty(window, 'SpeechSynthesisUtterance', ...)` to setup.ts
- **Files modified:** `src/test/setup.ts`
- **Verification:** All 15 tts-client tests pass including fallback test
- **Committed in:** a77444f (Task 2 commit)

**3. [Rule 1 - Bug] Thinking chime test approach — vi.spyOn on instance methods**
- **Found during:** Task 3 (thinking-chime tests)
- **Issue:** `vi.spyOn(proto, 'createOscillator')` failed because `MockAudioContext` defines methods as instance properties, not prototype methods. Required restructuring test to use a test-local mock constructor that captures the shared context instance.
- **Fix:** Replaced prototype spy approach with a test-file-level mock constructor (`MockAudioContextCtor = vi.fn(function() { return mockCtx; })`) replacing `window.AudioContext` in `beforeEach`
- **Files modified:** `src/lib/__tests__/thinking-chime.test.ts`
- **Verification:** All 9 thinking-chime tests pass
- **Committed in:** 1ae742e (Task 3 commit)

## Known Stubs

None — all three modules are fully implemented with real logic. No placeholder values.

---

*Phase: 02-voice-interface*
*Completed: 2026-03-30*

## Self-Check: PASSED

All required files exist and all task commits verified:
- src/lib/speech-recognition.ts: FOUND
- src/lib/tts-client.ts: FOUND
- src/lib/thinking-chime.ts: FOUND
- src/lib/__tests__/speech-recognition.test.ts: FOUND
- src/lib/__tests__/tts-client.test.ts: FOUND
- src/lib/__tests__/thinking-chime.test.ts: FOUND
- .planning/phases/02-voice-interface/02-02-SUMMARY.md: FOUND
- Commit b9f1b2b (Task 1): FOUND
- Commit a77444f (Task 2): FOUND
- Commit 1ae742e (Task 3): FOUND
