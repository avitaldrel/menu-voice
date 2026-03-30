---
phase: 02-voice-interface
plan: 04
subsystem: voice
tags: [react, hooks, voice, speech-recognition, tts, state-machine, accessibility, a11y]

requires:
  - phase: 02-voice-interface-01
    provides: voiceReducer state machine, VoiceState/VoiceAction types
  - phase: 02-voice-interface-02
    provides: SpeechManager, TTSClient, startThinkingChime/stopThinkingChime
  - phase: 02-voice-interface-03
    provides: VoiceButton, VoiceStateIndicator, TranscriptDisplay, MicPermissionPrompt, TextInputFallback

provides:
  - useVoiceLoop: orchestrator hook wiring speech recognition, TTS client, thinking chime, and voice state machine
  - page.tsx: updated with full voice interface integrated into results state

affects: [03-conversation, voice-conversation-loop, auto-start-listening]

tech-stack:
  added: []
  patterns:
    - "vi.hoisted() + function constructor for vitest mock constructors shared between factory and test body"
    - "Lazy SpeechManager and TTSClient creation via useRef (SSR safe, avoids constructor in module scope)"
    - "useEffect watching voiceState.status drives thinking chime start/stop"
    - "D-01 auto-start: useEffect with [state.status, isSupported] deps (intentionally excludes voiceState.status)"
    - "VoiceStateIndicator placed outside conditionals in page.tsx (ARIA live region always in DOM per A11Y-06)"
    - "Phase 2 placeholder TTS response — Phase 3 replaces with actual Claude API streaming"

key-files:
  created:
    - src/hooks/useVoiceLoop.ts
    - src/hooks/__tests__/useVoiceLoop.test.ts
  modified:
    - src/app/page.tsx

key-decisions:
  - "useVoiceLoop creates SpeechManager and TTSClient lazily in startListening — avoids SSR issues from constructors at hook initialization"
  - "Phase 2 TTS response is a placeholder echo — Phase 3 (AI Conversation) will replace triggerResponse with real Claude streaming"
  - "D-01 auto-start useEffect intentionally omits voiceState.status and startListening from deps — fires only on app state transition to results, not on every voice state change"
  - "vi.hoisted() required for mock constructors in useVoiceLoop tests — same pattern as Plans 01-03"

patterns-established:
  - "Lazy ref creation: useRef(null) + ensureInstances() pattern for browser-only objects in SSR-safe hooks"
  - "Phase 2 placeholder: clearly labeled triggerResponse() function for easy Phase 3 replacement"

requirements-completed: [VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, A11Y-05, A11Y-06]

duration: 5min
completed: 2026-03-30
---

# Phase 2 Plan 04: useVoiceLoop Hook and Page Integration Summary

**useVoiceLoop hook wires SpeechManager, TTSClient, and thinking chime through the voiceReducer state machine; page.tsx integrates the complete voice UI into the results state with auto-start listening (D-01), 14 passing tests, 155 total suite green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T18:25:59Z
- **Completed:** 2026-03-30T18:30:47Z
- **Tasks:** 2 automated + 1 human-verify checkpoint
- **Files modified:** 3

## Accomplishments

- useVoiceLoop hook uses useReducer(voiceReducer) for strict state machine (idle|listening|processing|speaking|error)
- SpeechManager and TTSClient created lazily via useRef — SSR safe, no constructor at module scope
- Thinking chime starts/stops via useEffect watching voiceState.status
- Phase 2 placeholder TTS response (echo) in triggerResponse() — clearly marked for Phase 3 replacement
- needsPermissionPrompt state starts true, cleared on startListening() or dismissPermissionPrompt()
- page.tsx: VoiceStateIndicator always in DOM (outside conditionals) per A11Y-06
- page.tsx: handleMicTap switch maps button taps to correct voice state transitions
- page.tsx: D-01 useEffect auto-starts listening when app enters results state
- page.tsx: TextInputFallback shown when !isSupported (Firefox users)
- All Phase 1 functionality fully preserved
- 14 new tests for useVoiceLoop; 155 total tests all pass

## Task Commits

1. **Task 1: useVoiceLoop hook** - `c1bfb49` (feat)
2. **Task 2: Page integration** - `426e997` (feat)

## Files Created/Modified

- `src/hooks/useVoiceLoop.ts` - main orchestrator hook wiring speech, TTS, chime, state machine
- `src/hooks/__tests__/useVoiceLoop.test.ts` - 14 tests: initial state, isSupported, startListening, stopListening, handleTextInput, thinking chime, auto-restart
- `src/app/page.tsx` - updated with useVoiceLoop, VoiceButton, VoiceStateIndicator, TranscriptDisplay, MicPermissionPrompt, TextInputFallback, D-01 auto-start

## Decisions Made

- SpeechManager and TTSClient are created lazily in ensureInstances() called from startListening() — this avoids SSR failures since the constructors reference browser APIs (SpeechRecognition, HTMLAudioElement).
- Phase 2 triggerResponse() uses a placeholder echo response. This is intentional and clearly documented — Phase 3 (AI Conversation) will replace it with actual Claude API streaming.
- D-01 auto-start useEffect has [state.status, isSupported] deps only. voiceState.status and startListening are intentionally excluded — the effect should fire once on results state entry, not loop on every voice state change.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

**Phase 2 TTS placeholder response (intentional, documented)**
- **File:** `src/hooks/useVoiceLoop.ts`
- **Function:** `triggerResponse()`
- **Stub:** Echo response — `"I heard you say: ${text}. Menu conversation will be available in the next update."`
- **Reason:** Phase 2 scope is voice loop wiring only. Actual Claude API conversation is Phase 3 (03-ai-conversation). The stub allows end-to-end voice loop testing (speak -> hear response -> auto-restart) before Phase 3 is implemented.
- **Resolution:** Phase 3 Plan XX will replace triggerResponse() with real Claude streaming via the conversation API route.

## Checkpoint: Human Verification Required

Task 3 is a `checkpoint:human-verify` gate requiring end-to-end testing of the voice loop.

### What was built

The complete voice conversation loop is wired. When a user scans a menu and reaches the results state:

1. **Auto-start:** Voice recognition automatically starts (D-01) — no manual tap needed
2. **Mic permission pre-prompt:** Shown before browser dialog on first visit
3. **Mic button:** 80px circle with state-driven aria-labels and visual cues
4. **Speak a question:** SpeechManager captures transcript
5. **Thinking chime:** Soft 440Hz tone plays every 2s during processing
6. **TTS response:** Placeholder response plays via OpenAI TTS through `<audio>` element
7. **Auto-restart:** After response finishes, mic automatically starts listening again
8. **ARIA announcements:** VoiceStateIndicator announces state changes to screen readers
9. **Firefox fallback:** TextInputFallback shown when Web Speech API unavailable

### Steps to verify (see Task 3 for full detail)

1. `npm run dev` → http://localhost:3000 in Chrome or Safari
2. Scan any menu photo to reach results state
3. Mic should auto-start listening without any tap
4. Speak a question → hear thinking chime → hear spoken response
5. After response ends, mic auto-restarts
6. Tap during speaking to interrupt → returns to idle
7. Check transcript display shows question and response text
8. Optional: Firefox → yellow warning + text input
9. Optional: VoiceOver → verify "Listening...", "Thinking...", "Speaking..." announcements

## User Setup Required

`OPENAI_API_KEY` must be set in `.env.local` for TTS to work via `/api/tts`. If not set, TTS falls back to browser SpeechSynthesis automatically.

## Next Phase Readiness

- Phase 3 (AI Conversation) will replace `triggerResponse()` placeholder with real Claude API streaming
- Voice loop state machine, all components, and page integration are complete and tested
- All 8 Phase 2 requirements addressed: VOICE-01 through VOICE-06, A11Y-05, A11Y-06

---
*Phase: 02-voice-interface*
*Completed: 2026-03-30*
