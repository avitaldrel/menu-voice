# Phase 2: Voice Interface - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the complete voice interaction loop: Web Speech API for speech recognition input, OpenAI TTS via `<audio>` element for spoken output, a strict state machine (idle|listening|processing|speaking|error), audio thinking cue during processing, auto-restart after speaking completes, and screen reader state announcements. Browser SpeechSynthesis as TTS fallback only.

</domain>

<decisions>
## Implementation Decisions

### Voice Loop Behavior
- Auto-start listening after menu overview is spoken — blind users expect immediate voice interaction after menu extraction
- Auto-restart speech recognition after 3s silence timeout — keeps loop alive for natural pauses
- Voice commands ("stop", "pause") for hands-free control of the voice loop
- Short repeating gentle tone (soft chime every 2s) as audio thinking cue during processing — non-intrusive, clearly audible

### TTS & Audio Output
- OpenAI TTS API as primary voice output — plays via `<audio>` element to avoid screen reader conflict (critical for VoiceOver/TalkBack users)
- Sentence buffering for streaming — stream Claude response, buffer by sentence, queue audio segments for continuous playback
- "nova" voice — warm, clear, gender-neutral, good for accessibility
- Auto-detect fallback on first OpenAI TTS failure, switch silently to browser SpeechSynthesis, retry OpenAI every 5 requests

### State Machine & Screen Reader Integration
- Separate `useVoiceLoop` hook with its own state machine (idle|listening|processing|speaking|error) — composes with existing appReducer, doesn't merge
- ARIA live region with `aria-live="polite"` showing current state text ("Listening...", "Thinking...", "Speaking...")
- Text input fallback for browsers without speech recognition (Firefox) — show clear message: "Voice not available in this browser. Try Chrome or Safari."
- Pre-prompt with accessible explanation before browser permission dialog: "MenuVoice needs your microphone to hear your questions"

### Claude's Discretion
- OpenAI TTS API integration details (endpoint, model selection, audio format)
- Thinking chime audio implementation (Web Audio API oscillator vs embedded audio file)
- Speech recognition configuration (language, interim results, continuous mode)
- Voice command parsing approach
- Error recovery strategies for transient mic/network failures

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/app-state.ts` — AppState discriminated union (idle|processing|results|error), AppAction, appReducer
- `src/lib/menu-schema.ts` — Menu, MenuCategory, MenuItem types
- `src/hooks/useMenuExtraction.ts` — Pattern for hooks that dispatch AppActions
- `src/components/ProcessingState.tsx` — ARIA live region pattern (always-mounted `role="status"`)
- `src/components/ErrorState.tsx` — Error display with `role="alert"` pattern

### Established Patterns
- Discriminated union state machines with useReducer
- Components use `role="status"` and `role="alert"` for screen reader announcements
- ProcessingState div always in DOM (conditional content, not conditional mount) for ARIA live region reliability
- Hooks accept dispatch function and return action methods

### Integration Points
- Voice loop hook will compose alongside useMenuExtraction in page.tsx
- New voice states need to coordinate with existing app states (especially results → start listening)
- New API route needed for OpenAI TTS at `/api/tts`
- Thinking chime plays during the existing "processing" state

</code_context>

<specifics>
## Specific Ideas

- The `<audio>` element for TTS is a HARD requirement — SpeechSynthesis conflicts with screen readers (CLAUDE.md critical decision)
- Voice state machine must be separate from app state machine but coordinate transitions (e.g., results state triggers voice loop start)
- Sentence buffering reduces perceived latency — don't wait for full Claude response before speaking
- Mic permission pre-prompt is important for blind users who can't see the browser's permission dialog clearly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-voice-interface*
*Context gathered: 2026-03-30*
