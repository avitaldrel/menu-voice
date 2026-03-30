---
phase: 02-voice-interface
plan: 01
subsystem: voice
tags: [voice-state-machine, openai-tts, speech-recognition, audio-context, vitest-mocks]

# Dependency graph
requires:
  - phase: 01-foundation-menu-capture
    provides: app-state.ts discriminated union pattern, vitest setup, Next.js route handler pattern

provides:
  - VoiceState discriminated union type (idle|listening|processing|speaking|error)
  - VoiceAction type (7 action variants)
  - voiceReducer enforcing 9 valid transitions with mutual exclusion
  - initialVoiceState constant
  - POST /api/tts route returning audio/mpeg via OpenAI tts-1/nova
  - SpeechRecognition mock for jsdom test environment
  - AudioContext mock for jsdom test environment
  - speechSynthesis mock for jsdom test environment

affects: [02-02, 02-03, 02-04, all subsequent voice plans]

# Tech tracking
tech-stack:
  added: [openai@latest]
  patterns:
    - "Voice state machine as discriminated union with strict transition table (extends app-state.ts pattern)"
    - "vi.hoisted() for sharing mock references across vi.mock() factory and test body"
    - "Object.defineProperty(window, ...) for jsdom browser API mocks in setup.ts"

key-files:
  created:
    - src/lib/voice-state.ts
    - src/lib/__tests__/voice-state.test.ts
    - src/app/api/tts/route.ts
    - src/app/api/tts/__tests__/route.test.ts
    - .env.example
  modified:
    - src/test/setup.ts
    - package.json
    - package-lock.json

key-decisions:
  - "voiceReducer returns current state reference (not new object) for invalid transitions — enables reference equality checks in tests and downstream useReducer optimization"
  - "PLAYBACK_ENDED resets transcript to empty string (not inherited) — new utterance starts fresh"
  - "vi.hoisted() required to share mock fn reference between vi.mock factory (hoisted) and test body"
  - "Object.defineProperty used instead of direct window.X assignment for reliable jsdom mock registration"

patterns-established:
  - "Pattern: vi.hoisted() + vi.mock() for module mocks that need shared fn references"
  - "Pattern: Object.defineProperty(window, 'APIName', { writable: true, value: MockClass }) for jsdom browser API mocks"

requirements-completed: [VOICE-02, VOICE-04, A11Y-05]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 2 Plan 01: Voice State Machine and TTS Foundation Summary

**Voice state machine discriminated union (idle|listening|processing|speaking|error) with strict transition enforcement plus OpenAI TTS proxy route (tts-1/nova) and jsdom mocks for SpeechRecognition, AudioContext, and speechSynthesis**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-30T17:56:16Z
- **Completed:** 2026-03-30T18:02:37Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Voice state machine with 5 states, 7 actions, 9 valid transitions, and strict mutual exclusion (no speaking-to-listening shortcut that bypasses processing)
- OpenAI TTS API proxy route at POST /api/tts returning audio/mpeg via tts-1/nova, with proper validation and error handling
- Extended test setup with SpeechRecognition, AudioContext, and speechSynthesis mocks enabling all future voice tests to run in jsdom
- 58 total tests passing (15 new voice-state, 4 new TTS route, 39 existing Phase 1)

## Task Commits

Each task was committed atomically:

1. **Task 1: Voice state machine types and reducer** - `b84af20` (feat)
2. **Task 2: Test infrastructure mocks + TTS API route** - `c597148` (feat)

**Plan metadata:** (docs commit — next)

_Note: Task 1 used TDD (RED → GREEN). Task 2 was standard auto._

## Files Created/Modified

- `src/lib/voice-state.ts` - VoiceState, VoiceAction types, voiceReducer, initialVoiceState
- `src/lib/__tests__/voice-state.test.ts` - 15 tests covering all valid transitions and 5 invalid cases
- `src/app/api/tts/route.ts` - POST /api/tts proxying to OpenAI audio.speech.create, returns audio/mpeg
- `src/app/api/tts/__tests__/route.test.ts` - 4 tests: valid call, missing text, empty text, openai error
- `src/test/setup.ts` - Added SpeechRecognition, webkitSpeechRecognition, AudioContext, speechSynthesis mocks
- `.env.example` - Added OPENAI_API_KEY entry
- `package.json` - Added openai dependency
- `package-lock.json` - Updated lockfile

## Decisions Made

- **voiceReducer returns current state reference for invalid transitions** — enables reference equality (`toBe`) checks and avoids unnecessary React re-renders in downstream `useReducer` usage
- **PLAYBACK_ENDED resets transcript to empty string** — when auto-restarting listening after speaking, the transcript is cleared so the next utterance starts fresh
- **vi.hoisted() pattern for mock sharing** — when vi.mock factory is hoisted and a mock fn needs to be referenced in both the factory and the test body, `vi.hoisted()` is the correct vitest pattern (plain `const` before `vi.mock` fails due to TDZ)
- **Object.defineProperty for jsdom mocks** — direct `window.SpeechRecognition = ...` assignment fails silently in strict jsdom; `Object.defineProperty` with `writable: true` is reliable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock factory arrow-function constructor error**
- **Found during:** Task 2 (TTS route tests)
- **Issue:** Initial `vi.mock('openai', () => ({ default: vi.fn(() => mockObj) }))` caused "is not a constructor" because arrow functions cannot be `new`-called
- **Fix:** Changed mock to use a named function declaration `function MockOpenAI() { return { ... } }` inside the factory
- **Files modified:** src/app/api/tts/__tests__/route.test.ts
- **Verification:** Test suite passes after fix
- **Committed in:** c597148 (Task 2 commit)

**2. [Rule 1 - Bug] Temporal dead zone (TDZ) in vi.mock with shared mock reference**
- **Found during:** Task 2 (TTS route tests, second attempt)
- **Issue:** `const mockSpeechCreate = vi.fn()` defined before `vi.mock(...)` causes TDZ error because `vi.mock` is hoisted above all `const` declarations
- **Fix:** Used `vi.hoisted()` to create the mock fn before hoisting: `const { mockSpeechCreate } = vi.hoisted(() => ({ mockSpeechCreate: vi.fn() }))`
- **Files modified:** src/app/api/tts/__tests__/route.test.ts
- **Verification:** All 4 TTS route tests pass
- **Committed in:** c597148 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs in test mock setup)
**Impact on plan:** Both fixes were needed for the test file itself — no production code changes. No scope creep.

## Issues Encountered

- `.env.example` was in `.gitignore` (caught by `.env*` pattern). Used `git add -f` since `.env.example` intentionally contains no secrets and is meant for sharing.

## User Setup Required

The OpenAI API key must be configured before the TTS route will work:

1. Copy `.env.example` to `.env.local`
2. Add your OpenAI API key: `OPENAI_API_KEY=sk-...` (from https://platform.openai.com/api-keys)
3. Restart the dev server

## Next Phase Readiness

- Voice state machine is ready for `useVoiceLoop` hook (Plan 02) to consume via `useReducer(voiceReducer, initialVoiceState)`
- TTS route is ready for the voice loop to call with `fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text }) })`
- Test mocks in `src/test/setup.ts` are ready for all subsequent voice component and hook tests
- OPENAI_API_KEY must be set in `.env.local` before runtime TTS works (dev and production)

---
*Phase: 02-voice-interface*
*Completed: 2026-03-30*

## Self-Check: PASSED

All required files exist and all task commits verified:
- src/lib/voice-state.ts: FOUND
- src/lib/__tests__/voice-state.test.ts: FOUND
- src/app/api/tts/route.ts: FOUND
- src/app/api/tts/__tests__/route.test.ts: FOUND
- src/test/setup.ts: FOUND
- .env.example: FOUND
- .planning/phases/02-voice-interface/02-01-SUMMARY.md: FOUND
- Commit b84af20 (Task 1): FOUND
- Commit c597148 (Task 2): FOUND
