# MenuVoice Research Summary

## Critical Decisions From Research

### 1. TTS Output: Use `<audio>` element, NOT SpeechSynthesis
**Why:** SpeechSynthesis conflicts with screen readers (VoiceOver, NVDA) which share the same audio channel. Using `<audio>` element for AI TTS output avoids this collision entirely.
**Impact:** Architecture decision — must be made before any code is written.

### 2. Photo Capture: Use `<input type="file" capture="environment">`
**Why:** Native OS camera UI is already accessible to VoiceOver/TalkBack, requires no permission prompts, works on all mobile browsers. A live video preview is useless for blind users.
**Impact:** Simpler implementation, better accessibility out of the box.

### 3. Voice Loop: Strict State Machine
**Why:** SpeechRecognition and TTS output conflict when run simultaneously (mic picks up TTS). Must be either listening OR speaking, never both.
**States:** `idle | listening | processing | speaking | error`
**Impact:** Core architecture pattern — useReducer-based FSM.

### 4. Streaming + Sentence Buffering for Low Latency
**Why:** Cuts perceived latency 50-70%. Claude streams text → buffer into sentences → send each to TTS → play immediately. First audio in ~2-4 seconds vs 6-18 without streaming.
**Impact:** Phase 2 architecture requirement.

### 5. All Menu Photos in Single Vision Call
**Why:** Multi-image support gives Claude cross-page context (categories spanning pages). Separate calls lose context and cost more.
**Impact:** Single API call design for menu extraction.

### 6. Full Menu JSON in System Prompt
**Why:** 50-item menu is ~3-5K tokens, trivial against 200K context window. Summarization loses allergen details needed for safety.
**Impact:** No need for RAG or search — just inject full menu.

### 7. Allergy Disclaimers Are Non-Negotiable
**Why:** Safety-critical liability. AI must NEVER present allergy info as definitive. Hard-coded disclaimers in system prompt and spoken before allergy-related responses.
**Impact:** System prompt design, conversation flow.

## Tech Stack Recommendations

| Component | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | API routes hide keys, streaming support, SSR for initial a11y |
| AI Backend | Claude Sonnet (Anthropic SDK) | Single vendor for OCR + conversation |
| Speech Input | Web Speech API | Free, browser-native; Chrome/Edge/Safari only |
| Voice Output | OpenAI TTS via `<audio>` element | Natural voice, avoids screen reader conflict |
| Voice Fallback | Browser SpeechSynthesis | Free, works offline, familiar to blind users |
| Storage | IndexedDB via idb (~1KB) | Minimal bundle, simple CRUD for profiles |
| Styling | Tailwind CSS | Utility-first, minimal visual UI needed |

## Cost Estimate
~$0.06-0.10 per user session (2 menu photos + 10 conversation turns + TTS)

## Top Risks

1. **Screen reader + TTS collision** → Mitigated by `<audio>` element approach
2. **Web Speech API browser support** → Chrome-only for v1; consider Whisper fallback later
3. **Allergy safety liability** → Hard-coded disclaimers, never present as definitive
4. **iOS Safari VoiceOver quirks** → Must test on real devices from Phase 1
5. **TTS latency** → Streaming + sentence buffering + "thinking" audio cue

## Competitive Landscape
No existing app does structured menu extraction + conversational exploration. Be My Eyes, Seeing AI, Envision AI all read text linearly. MenuVoice's conversational decision support is its unique differentiator.

## Phase Ordering Insight
Research suggests: voice loop foundation first (highest risk) → conversation streaming → menu OCR (simpler one-shot call) → allergy system → polish. This de-risks the hardest technical pieces early.
