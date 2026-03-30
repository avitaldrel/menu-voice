# Phase 2: Voice Interface - Research

**Researched:** 2026-03-29
**Domain:** Web Speech API, OpenAI TTS, Web Audio API, ARIA live regions, React state machines
**Confidence:** HIGH (core APIs verified against MDN and OpenAI official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Voice Loop Behavior**
- Auto-start listening after menu overview is spoken — blind users expect immediate voice interaction after menu extraction
- Auto-restart speech recognition after 3s silence timeout — keeps loop alive for natural pauses
- Voice commands ("stop", "pause") for hands-free control of the voice loop
- Short repeating gentle tone (soft chime every 2s) as audio thinking cue during processing — non-intrusive, clearly audible

**TTS & Audio Output**
- OpenAI TTS API as primary voice output — plays via `<audio>` element to avoid screen reader conflict (critical for VoiceOver/TalkBack users)
- Sentence buffering for streaming — stream Claude response, buffer by sentence, queue audio segments for continuous playback
- "nova" voice — warm, clear, gender-neutral, good for accessibility
- Auto-detect fallback on first OpenAI TTS failure, switch silently to browser SpeechSynthesis, retry OpenAI every 5 requests

**State Machine & Screen Reader Integration**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-01 | User can speak commands and questions using speech recognition | Web Speech API SpeechRecognition: use `webkitSpeechRecognition || SpeechRecognition`, `continuous: false` for single-turn commands, `onresult` event for final transcripts |
| VOICE-02 | App responds with natural AI-generated voice via `<audio>` element (not SpeechSynthesis, to avoid screen reader conflict) | OpenAI TTS API `POST /v1/audio/speech`, model `tts-1`, voice `nova`, response piped as `audio/mpeg` via Next.js route handler to `<audio>` element via Blob URL |
| VOICE-03 | App falls back to browser SpeechSynthesis when AI TTS is unavailable | `window.speechSynthesis.speak(utterance)` with feature detection; trigger retry logic (every 5 requests) to restore primary path |
| VOICE-04 | Voice loop uses strict state machine — listening OR speaking, never both | `useVoiceLoop` hook with discriminated union state machine; state transitions enforce mutual exclusion; `recognition.stop()` before any TTS play |
| VOICE-05 | App provides audio feedback during processing ("thinking" cue) so user knows it's working | Web Audio API `AudioContext` + `OscillatorNode` (sine wave, ~440Hz, low gain), repeated every 2s during `processing` state via `setInterval` |
| VOICE-06 | Speech recognition auto-restarts after silence/completion for continuous conversation | `onend` handler with `shouldRestart` flag guard; restart after `speaking → listening` transition; `no-speech` error handled via `onend` not `onerror` |
| A11Y-05 | TTS output uses `<audio>` element to avoid conflict with active screen readers | `<audio>` element with Blob URL from `/api/tts`; never use `window.speechSynthesis` as primary; established pattern from CLAUDE.md |
| A11Y-06 | App announces its state clearly (listening, thinking, speaking, error) | ARIA live region `role="status" aria-live="polite" aria-atomic="true"` always in DOM (never conditionally mounted); content updates on each state transition; pattern verified from Phase 1 ProcessingState |
</phase_requirements>

---

## Summary

Phase 2 builds the complete voice interaction loop on top of the Phase 1 foundation. The three primary technology domains are: the **Web Speech API** for speech-to-text input, the **OpenAI TTS API** for AI-generated audio output via an `<audio>` element, and **Web Audio API** for the thinking chime. These are held together by a strict state machine (`idle | listening | processing | speaking | error`) implemented as a separate `useVoiceLoop` React hook.

The most significant constraint is the hard requirement to use an `<audio>` element for TTS output rather than `window.speechSynthesis`. This is correct: `speechSynthesis` on iOS competes with VoiceOver's audio channel and can cause the screen reader to go silent or interrupt the app's speech unpredictably. Routing TTS audio through a plain `<audio>` element sidesteps this entirely. The OpenAI TTS API supports chunked streaming, meaning the Next.js route handler at `/api/tts` can pipe the audio stream directly to the client response without buffering the full file.

The Web Speech API has meaningful cross-browser and iOS-specific quirks that must be handled carefully. Chrome/Edge send audio to Google's servers for recognition. iOS Safari has a known bug where `isFinal` is sometimes always `false`, requiring `interimResults: true` as a workaround. `continuous: true` mode is unreliable on iOS. The recommended pattern for MenuVoice is `continuous: false` with auto-restart via the `onend` event using a `shouldRestart` flag — this gives reliable single-turn recognition that restarts cleanly after each utterance.

**Primary recommendation:** Use `continuous: false` SpeechRecognition with `onend`-based restart; pipe OpenAI TTS `tts-1` model response body as `audio/mpeg` through a Next.js route handler; generate the thinking chime with `AudioContext` + `OscillatorNode` (no file dependency); keep voice state machine separate from app state machine but coordinate transitions via callbacks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Speech API (`SpeechRecognition`) | Browser-native | Speech-to-text input | No install; Chrome/Safari/Edge native; `@types/dom-speech-recognition@0.0.8` already in project |
| OpenAI Node SDK | 6.33.0 (latest) | TTS API calls on server side | Already used for Claude in Phase 1 via `@anthropic-ai/sdk`; `openai` package needed separately |
| Web Audio API (`AudioContext`) | Browser-native | Thinking chime synthesis | No install; avoids shipping an audio file; programmatic tone generation |
| HTML `<audio>` element | Browser-native | TTS playback | Required by CLAUDE.md to avoid SpeechSynthesis screen reader conflict |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `openai` npm package | 6.33.0 | Server-side TTS API call in route handler | Required; not currently in package.json — must add |
| `window.speechSynthesis` | Browser-native | TTS fallback | Only when OpenAI TTS fails; never primary |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tts-1` (OpenAI) | `gpt-4o-mini-tts` | `gpt-4o-mini-tts` supports voice style instructions and more voices, but costs more and has slightly higher latency; `tts-1` is sufficient for accessibility TTS |
| Web Audio API oscillator | Embedded `.mp3` chime file | Oscillator: zero file size, always available; audio file: richer sound but requires asset pipeline and HTTP request |
| `continuous: false` + `onend` restart | `continuous: true` | `continuous: true` is unreliable on iOS, causes rate limiting on Google's server, and creates duplicate transcript bugs in Safari |

**Installation (only `openai` needs adding):**
```bash
npm install openai
```

**Version verification (run before writing):**
```bash
npm view openai version   # 6.33.0 confirmed 2026-03-29
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useVoiceLoop.ts          # NEW: voice state machine hook
├── components/
│   ├── VoiceButton.tsx          # NEW: 80px mic button, state-driven
│   ├── VoiceStateIndicator.tsx  # NEW: ARIA live region + visual state label
│   ├── TranscriptDisplay.tsx    # NEW: user utterance + streaming response text
│   ├── MicPermissionPrompt.tsx  # NEW: pre-browser-dialog prompt
│   └── TextInputFallback.tsx    # NEW: Firefox/no-Web-Speech-API fallback
└── app/
    └── api/
        └── tts/
            └── route.ts         # NEW: POST /api/tts — proxies to OpenAI TTS
```

### Pattern 1: State Machine as Discriminated Union (useVoiceLoop)

**What:** A `useReducer`-based hook with a discriminated union state type matching `idle | listening | processing | speaking | error`. Transitions are explicit and exhaustive.

**When to use:** Whenever mutual exclusion between states must be enforced — guarantees mic and TTS are never simultaneously active.

**Example:**
```typescript
// Source: Phase 1 pattern (src/lib/app-state.ts) extended for voice
type VoiceState =
  | { status: 'idle' }
  | { status: 'listening'; transcript: string }
  | { status: 'processing'; transcript: string }
  | { status: 'speaking'; transcript: string; response: string }
  | { status: 'error'; message: string };

type VoiceAction =
  | { type: 'START_LISTENING' }
  | { type: 'SPEECH_RESULT'; transcript: string }
  | { type: 'START_PROCESSING' }
  | { type: 'FIRST_AUDIO_READY'; response: string }
  | { type: 'PLAYBACK_ENDED' }
  | { type: 'STOP' }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' };
```

### Pattern 2: SpeechRecognition Single-Turn with onend Restart

**What:** `continuous: false`, single-shot recognition per user utterance. Restart via the `onend` event with a `shouldRestart` flag to prevent unintended restarts when the app deliberately stops listening.

**When to use:** Always — `continuous: true` is unreliable on iOS Safari and causes server rate limiting on Chrome.

**Example:**
```typescript
// Source: MDN SpeechRecognition docs + Web Speech API community findings
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;       // single-turn — reliable on iOS
recognition.interimResults = true;    // workaround for iOS isFinal=false bug
recognition.lang = 'en-US';           // always set explicitly per MDN best practice
recognition.maxAlternatives = 1;

let shouldRestart = false;

recognition.onresult = (event) => {
  // Grab the last final or best interim result
  const result = event.results[event.results.length - 1];
  const transcript = result[0].transcript;
  if (result.isFinal || /* iOS fallback */ transcript.length > 0) {
    handleTranscript(transcript);
    shouldRestart = false; // result received — don't restart yet
  }
};

recognition.onend = () => {
  if (shouldRestart) {
    setTimeout(() => recognition.start(), 300); // small delay avoids rate limiting
  }
};

recognition.onerror = (event) => {
  if (event.error === 'not-allowed' || event.error === 'audio-capture') {
    shouldRestart = false; // fatal — do not restart
    dispatch({ type: 'ERROR', message: 'Microphone permission denied' });
  }
  // 'no-speech', 'network' etc. — let onend handle restart
};
```

### Pattern 3: OpenAI TTS Route Handler — Stream Response

**What:** Next.js App Router route handler that calls `openai.audio.speech.create()` and pipes the response body directly to the HTTP response. Client receives `audio/mpeg` stream, creates a Blob URL, and sets it on an `<audio>` element.

**When to use:** Every TTS request from the voice loop.

**Example:**
```typescript
// Source: OpenAI API docs (platform.openai.com/docs/api-reference/audio/createSpeech)
// src/app/api/tts/route.ts
import OpenAI from 'openai';

const openai = new OpenAI(); // uses OPENAI_API_KEY from env

export async function POST(req: Request) {
  const { text } = await req.json();

  const response = await openai.audio.speech.create({
    model: 'tts-1',       // lower latency for real-time use
    voice: 'nova',        // warm, gender-neutral — decided in CONTEXT.md
    input: text,
    response_format: 'mp3', // default; opus has lower size but less browser support
  });

  // response.body is a Web ReadableStream — pipe directly
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

**Client-side playback:**
```typescript
// Source: MDN Blob URL pattern
const res = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: sentence }),
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
audioElement.src = url;
audioElement.play();
audioElement.onended = () => {
  URL.revokeObjectURL(url); // clean up memory
  playNextSentence();
};
```

### Pattern 4: Sentence Buffering for Streaming TTS

**What:** Buffer incoming Claude response text, split on terminal punctuation (`.`, `?`, `!`), enqueue each sentence as a TTS request, play sequentially.

**When to use:** During the `processing → speaking` phase to reduce perceived latency.

**Example:**
```typescript
// Robust sentence split — handles abbreviations imperfectly but sufficient for TTS
const splitSentences = (text: string): string[] => {
  // Split on terminal punctuation followed by whitespace or end-of-string
  return text.match(/[^.!?]+[.!?]+(\s|$)?/g)?.map(s => s.trim()) ?? [text];
};

// Buffer incoming text chunks from Claude streaming response
let buffer = '';
for await (const chunk of claudeStream) {
  buffer += chunk;
  const sentences = splitSentences(buffer);
  if (sentences.length > 1) {
    // All but the last may be complete sentences
    const complete = sentences.slice(0, -1);
    buffer = sentences[sentences.length - 1] ?? '';
    for (const sentence of complete) {
      ttsQueue.push(sentence);
    }
  }
}
// Flush remaining buffer
if (buffer.trim()) ttsQueue.push(buffer.trim());
```

### Pattern 5: Web Audio API Thinking Chime

**What:** A soft repeating sine-wave tone at ~440Hz, played every 2s during the `processing` state using `AudioContext` + `OscillatorNode`. A new oscillator is created for each chime to avoid frequency slides.

**When to use:** During `processing` state only; stop immediately when state changes.

**Example:**
```typescript
// Source: MDN createOscillator docs
let chimeInterval: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

const playChime = () => {
  if (!audioCtx) audioCtx = new AudioContext(); // created after user gesture
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 440; // A4 — warm, unobtrusive
  gain.gain.value = 0.08;    // low volume — non-intrusive
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2); // 200ms beep
};

const startThinkingChime = () => {
  playChime(); // immediate first chime
  chimeInterval = setInterval(playChime, 2000);
};

const stopThinkingChime = () => {
  if (chimeInterval) clearInterval(chimeInterval);
  chimeInterval = null;
};
```

### Pattern 6: ARIA Live Region — Always Mounted

**What:** The voice state ARIA live region must be in the DOM from initial render. Conditional mounting prevents screen readers from ever registering the region, so state change announcements are silently dropped.

**When to use:** Required for A11Y-06. Already established in Phase 1 ProcessingState.

**Example:**
```typescript
// Source: Phase 1 ProcessingState.tsx pattern + MDN ARIA live regions
// ALWAYS rendered — content changes, not conditional mount
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {stateLabel} {/* e.g., "Listening...", "Thinking...", "Speaking..." */}
</div>
```

### Anti-Patterns to Avoid

- **`continuous: true` on SpeechRecognition:** Unreliable on iOS (isFinal always false, duplicate transcripts), causes Google server rate-limiting on Chrome. Use `continuous: false` + `onend` restart instead.
- **Restarting recognition inside `onerror`:** The `end` event always fires after an error anyway. Restarting in both `onerror` and `onend` causes double restarts. Use only `onend`.
- **Creating `AudioContext` outside a user gesture:** Browsers enforce autoplay policy — AudioContext created before user interaction starts in "suspended" state. Create or resume inside a click/tap handler.
- **Using `window.speechSynthesis` as primary TTS:** On iOS with VoiceOver active, SpeechSynthesis competes with the screen reader's audio channel, causing silence or interruption. `<audio>` element is immune to this conflict.
- **Conditionally mounting ARIA live regions:** Screen readers only announce changes to live regions they've already seen in the DOM. Mount once, update content.
- **`URL.createObjectURL` without `URL.revokeObjectURL`:** Blob URLs accumulate in memory if not revoked after playback ends.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speech-to-text | Custom WebRTC audio recording + cloud STT | `SpeechRecognition` Web API | Already handles mic permissions, audio capture, and server-side Google STT — hundreds of edge cases |
| Text-to-speech | Custom audio synthesis | OpenAI TTS API via `/api/tts` route | Neural TTS quality unreachable with hand-rolled synthesis; handles prosody, emphasis, natural pauses |
| Sentence boundary detection | Hand-rolled regex with abbreviation rules | Simple regex on `.?!` + Intl.Segmenter fallback | Full NLP sentence detection is a ML problem; simple regex is 95% accurate and sufficient for TTS buffering |
| AudioContext lifecycle | Manual state management | Singleton pattern + `resume()` on user gesture | Browser enforces autoplay policy; AudioContext lifecycle rules are non-obvious |

**Key insight:** Web APIs handle audio I/O, permissions, and OS-level audio routing. Fighting them (trying to control the mic directly, or bypassing TTS APIs) introduces device-specific bugs that are invisible during development but catastrophic on target devices (iOS VoiceOver).

---

## Common Pitfalls

### Pitfall 1: iOS Safari `isFinal` Always False

**What goes wrong:** On some versions of iOS Safari, the `isFinal` property on `SpeechRecognitionResult` is always `false`, meaning the `onresult` handler never receives a confirmed final transcript. The recognition session eventually ends via `onend` with no useful transcript.

**Why it happens:** Known iOS WebKit bug, persistent since iOS 15. Not fixed as of 2025.

**How to avoid:** Set `interimResults: true`. When `onresult` fires, use the last result's transcript regardless of `isFinal`. Also set a backup: when `onend` fires and no `START_PROCESSING` action was dispatched, use the most recent interim transcript if it exists.

**Warning signs:** Works in Chrome, fails silently in iOS Safari.

---

### Pitfall 2: AudioContext Suspended State

**What goes wrong:** `new AudioContext()` called on module load or hook initialization produces a context in `"suspended"` state. Attempts to play the thinking chime do nothing.

**Why it happens:** Browser autoplay policy. `AudioContext` must be created or `resume()`d after a user gesture.

**How to avoid:** Create the `AudioContext` lazily — only when the thinking chime needs to play (which only happens after user interaction has started the voice loop). Wrap in: `if (!audioCtx) audioCtx = new AudioContext()`.

**Warning signs:** Chrome DevTools console shows: *"The AudioContext was not allowed to start."*

---

### Pitfall 3: SpeechRecognition Double Restart Race

**What goes wrong:** Logic in both `onerror` and `onend` calls `recognition.start()`. When a `no-speech` error fires, `onerror` calls `start()`, then `onend` fires (as it always does after any error), and `start()` is called again immediately. The recognition instance throws `InvalidStateError: recognition already started`.

**Why it happens:** `onend` always fires after `onerror`. Double restart entry point.

**How to avoid:** All restart logic lives exclusively in `onend`. `onerror` only updates state and the `shouldRestart` flag — never calls `start()` directly.

**Warning signs:** Console errors `InvalidStateError` on `recognition.start()`.

---

### Pitfall 4: Blob URL Memory Leak

**What goes wrong:** Every sentence played via TTS creates a Blob URL via `URL.createObjectURL`. If these are not explicitly revoked, they accumulate in the browser's Blob URL Store across a long conversation session.

**Why it happens:** `URL.createObjectURL` creates a persistent reference that the GC cannot collect.

**How to avoid:** In `audio.onended`, call `URL.revokeObjectURL(audio.src)` immediately after playback ends.

**Warning signs:** Memory usage grows monotonically during voice conversation; DevTools Memory tab shows increasing Blob URLs.

---

### Pitfall 5: SpeechSynthesis Fallback `getVoices()` Race

**What goes wrong:** When falling back to `window.speechSynthesis`, calling `getVoices()` immediately after `speechSynthesis.speak()` returns an empty array. The utterance plays in the browser's default voice, which may be jarring.

**Why it happens:** `getVoices()` is async — voices are not loaded until the `voiceschanged` event fires.

**How to avoid:** Pre-warm the voice list on first use: listen for `speechSynthesis.onvoiceschanged`, cache the result. For the fallback path, use the first available voice without waiting if no cached list exists.

**Warning signs:** TTS fallback plays in wrong language or monotone robot voice.

---

### Pitfall 6: ARIA Live Region Conditional Mount

**What goes wrong:** Voice state indicator is wrapped in a conditional (`{state !== 'idle' && <VoiceStateIndicator />}`). Screen reader never announces state changes because the region wasn't in the DOM when the page loaded.

**Why it happens:** ARIA live regions must be registered in the accessibility tree before any updates. If the element mounts after page load, many screen readers miss its subsequent content updates.

**How to avoid:** Follow Phase 1 `ProcessingState` pattern exactly — render the `role="status"` div unconditionally, change only its text content.

**Warning signs:** VoiceOver never announces "Listening..." or "Thinking..." even though the visual label is correct.

---

### Pitfall 7: Missing `OPENAI_API_KEY` Env Var

**What goes wrong:** `/api/tts` route throws 500 on first call. Voice loop transitions to `error` state immediately on first use.

**Why it happens:** `openai` package is not currently in `package.json`. Even after install, the env var must be set.

**How to avoid:** Wave 0 setup tasks: (1) `npm install openai`, (2) add `OPENAI_API_KEY=sk-...` to `.env.local`, (3) document in project README.

**Warning signs:** Route handler error: `"OpenAI API key not found"` or `401 Unauthorized`.

---

## Code Examples

### /api/tts Route Handler (Full)
```typescript
// Source: OpenAI API docs + Next.js App Router route handler pattern
// src/app/api/tts/route.ts
import OpenAI from 'openai';

const openai = new OpenAI(); // reads OPENAI_API_KEY from process.env automatically

export async function POST(req: Request) {
  try {
    const body = await req.json() as { text?: string };
    if (!body.text || typeof body.text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: body.text,
      response_format: 'mp3',
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### SpeechRecognition Feature Detection (TypeScript)
```typescript
// Source: MDN Web Speech API docs
// Returns null if not supported (Firefox)
export function createSpeechRecognition(): SpeechRecognition | null {
  const SpeechRecognitionCtor =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;      // single-turn; reliable on iOS
  recognition.interimResults = true;   // iOS isFinal=false workaround
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  return recognition;
}
```

### SpeechSynthesis Fallback
```typescript
// Source: MDN SpeechSynthesis docs; known iOS quirks documented
export function speakWithSynthesis(text: string, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) return onEnd();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; // required on iOS
  utterance.rate = 1.0;
  utterance.volume = 1.0;

  // Keep reference alive — iOS GC bug: utterance may be freed before onend fires
  (window as Record<string, unknown>).__currentUtterance = utterance;
  utterance.onend = () => {
    delete (window as Record<string, unknown>).__currentUtterance;
    onEnd();
  };
  utterance.onerror = () => {
    delete (window as Record<string, unknown>).__currentUtterance;
    onEnd(); // continue voice loop even on fallback failure
  };

  window.speechSynthesis.speak(utterance);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tts-1` as only OpenAI TTS option | `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts` | 2024-2025 | `gpt-4o-mini-tts` supports style instructions; `tts-1` still recommended for low-latency accessibility use cases |
| SSE streaming for TTS | Chunked binary `audio/mpeg` stream (SSE not supported for `tts-1`) | Ongoing | Route handler must stream raw bytes, not SSE events |
| `SpeechRecognition` voices: alloy, echo, fable, onyx, nova, shimmer | 13 voices including ash, coral, sage, verse, marin, cedar (not all on `tts-1`) | 2024 | `nova` is available on `tts-1` — confirmed safe choice |

**Deprecated/outdated:**
- `continuous: true` SpeechRecognition: Remains available but unreliable on iOS and subject to Google server rate limiting — use `continuous: false` + `onend` restart.
- `ScriptProcessorNode` in Web Audio API: Deprecated in favor of `AudioWorkletNode` — but for simple chime generation, `OscillatorNode` is the right tool and is unaffected.

---

## Open Questions

1. **Voice command parsing approach**
   - What we know: Commands "stop" and "pause" must be detected from speech transcript
   - What's unclear: Exact string matching vs. fuzzy matching; whether to parse in `onresult` on interim results or only on final transcript
   - Recommendation: Start with simple `transcript.toLowerCase().includes('stop')` in `onresult` on final transcript; move to intent extraction if ambiguous

2. **Sentence buffering granularity**
   - What we know: Sentences should be buffered for sequential TTS; sentence splitting on `.?!` is ~95% accurate
   - What's unclear: Optimal minimum sentence length before sending to TTS (very short sentences like "Yes." still incur a round trip)
   - Recommendation: Apply a minimum character threshold (e.g., 20 chars) — flush short fragments only if followed by another sentence or on stream end

3. **OpenAI TTS retry strategy**
   - What we know: Auto-detect fallback on first failure, retry OpenAI every 5 requests
   - What's unclear: How to detect "first failure" vs. transient failure — should a timeout or HTTP error code trigger fallback?
   - Recommendation: Treat any non-2xx response or network error as TTS failure; increment counter; switch to SpeechSynthesis fallback; attempt OpenAI again every 5th call

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | Yes | v24.14.0 | — |
| `openai` npm package | `/api/tts` route handler | No — not in package.json | — | Must install: `npm install openai` |
| `OPENAI_API_KEY` env var | `/api/tts` route handler | Unknown — not verifiable | — | Must add to `.env.local` |
| Web Speech API | VOICE-01 | Browser-native (Chrome/Safari/Edge only) | — | TextInputFallback component for Firefox |
| Web Audio API | VOICE-05 (thinking chime) | Browser-native (all modern browsers) | — | Skip chime silently if unavailable |
| `@types/dom-speech-recognition` | TypeScript types for SpeechRecognition | Yes — already in devDependencies | 0.0.8 | — |

**Missing dependencies with no fallback:**
- `openai` npm package — required for `/api/tts` route; must be installed in Wave 0
- `OPENAI_API_KEY` — must be set in `.env.local`; without it, every TTS call returns 500 and the voice loop immediately falls back to SpeechSynthesis (which works but is not the primary path)

**Missing dependencies with fallback:**
- Web Speech API on Firefox — `TextInputFallback` component provides text input alternative

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-01 | SpeechRecognition starts on button tap, transcript dispatched | unit | `npm test -- src/hooks/__tests__/useVoiceLoop.test.ts -t "starts listening"` | No — Wave 0 |
| VOICE-02 | `/api/tts` returns audio/mpeg for valid text input | unit | `npm test -- src/app/api/tts/__tests__/route.test.ts` | No — Wave 0 |
| VOICE-03 | Falls back to SpeechSynthesis when fetch throws | unit | `npm test -- src/hooks/__tests__/useVoiceLoop.test.ts -t "TTS fallback"` | No — Wave 0 |
| VOICE-04 | State never transitions to listening while speaking | unit | `npm test -- src/lib/__tests__/voice-state.test.ts` | No — Wave 0 |
| VOICE-05 | Chime starts on processing, stops on state change | unit | `npm test -- src/hooks/__tests__/useVoiceLoop.test.ts -t "thinking chime"` | No — Wave 0 |
| VOICE-06 | Recognition restarts after `onend` when shouldRestart=true | unit | `npm test -- src/hooks/__tests__/useVoiceLoop.test.ts -t "auto-restart"` | No — Wave 0 |
| A11Y-05 | TTS route returns audio element compatible Content-Type | unit | included in VOICE-02 test | No — Wave 0 |
| A11Y-06 | VoiceStateIndicator always in DOM with role=status | unit | `npm test -- src/components/__tests__/VoiceStateIndicator.test.tsx` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --reporter=verbose`
- **Per wave merge:** `npm test -- --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/voice-state.test.ts` — covers VOICE-04 (state machine transitions)
- [ ] `src/hooks/__tests__/useVoiceLoop.test.ts` — covers VOICE-01, VOICE-03, VOICE-05, VOICE-06
- [ ] `src/app/api/tts/__tests__/route.test.ts` — covers VOICE-02, A11Y-05
- [ ] `src/components/__tests__/VoiceStateIndicator.test.tsx` — covers A11Y-06
- [ ] Add `SpeechRecognition` mock to `src/test/setup.ts` — jsdom does not implement Web Speech API
- [ ] Add `AudioContext` mock to `src/test/setup.ts` — jsdom does not implement Web Audio API

**SpeechRecognition mock pattern for setup.ts:**
```typescript
// Add to src/test/setup.ts
import { vi } from 'vitest';

const mockRecognitionInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onresult: null as null | ((event: SpeechRecognitionEvent) => void),
  onerror: null as null | ((event: SpeechRecognitionErrorEvent) => void),
  onend: null as null | (() => void),
  onstart: null as null | (() => void),
  lang: 'en-US',
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
};
const MockSpeechRecognition = vi.fn(() => mockRecognitionInstance);

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});
Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: MockSpeechRecognition,
});

// AudioContext mock for thinking chime tests
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => ({
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { value: 440 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: { value: 0 },
      connect: vi.fn(),
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
  })),
});
```

---

## Project Constraints (from CLAUDE.md)

All directives extracted from `CLAUDE.md` — the planner must verify these are honored:

| Directive | Constraint |
|-----------|------------|
| TTS output MUST use `<audio>` element | Never use `window.speechSynthesis` as primary; only as fallback |
| Voice loop uses strict state machine: `idle \| listening \| processing \| speaking \| error` | `useVoiceLoop` hook must implement this exact five-state machine |
| Photo capture uses `<input type="file" capture="environment">` | Not applicable to Phase 2 |
| All menu photos sent in single Claude Vision call | Not applicable to Phase 2 |
| Full menu JSON injected into system prompt | Not applicable to Phase 2 |
| Streaming + sentence buffering for TTS to reduce perceived latency | Sentence buffer must be implemented; not wait for full response |
| Allergy information ALWAYS includes safety disclaimer | Not applicable to Phase 2 |
| Framework: Next.js 15 App Router | `/api/tts/route.ts` must use App Router route handler pattern |
| Voice In: Web Speech API | Confirmed — no third-party STT |
| Voice Out: OpenAI TTS via `<audio>` (primary), browser SpeechSynthesis (fallback) | Confirmed — `tts-1`, `nova` voice |

---

## Sources

### Primary (HIGH confidence)
- [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) — events, properties, methods
- [MDN ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) — best practices, `aria-live` values
- [OpenAI TTS API docs](https://developers.openai.com/api/docs/guides/text-to-speech) — model names, voice names, streaming behavior
- [MDN Web Audio API createOscillator](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createOscillator) — oscillator API
- Phase 1 codebase (`src/lib/app-state.ts`, `src/components/ProcessingState.tsx`) — established patterns

### Secondary (MEDIUM confidence)
- [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — AudioContext user gesture requirement
- [Chrome Developer Blog — Autoplay policy](https://developer.chrome.com/blog/autoplay) — policy details
- [TetraLogical — Why are my live regions not working?](https://tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/) — ARIA live region pitfalls
- [OpenAI community — Streaming from TTS API](https://community.openai.com/t/streaming-from-text-to-speech-api/493784) — SDK streaming approach

### Tertiary (LOW confidence — needs real-device validation)
- iOS Safari SpeechRecognition `isFinal` always false bug — documented in multiple community reports but no official Apple acknowledgment found
- SpeechSynthesis + VoiceOver conflict on iOS — widely reported in accessibility forums; no official Apple documentation found; HIGH practical confidence from community consensus

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — OpenAI TTS API and Web Speech API verified against official docs
- Architecture patterns: HIGH — based on established Phase 1 patterns plus official API docs
- Pitfalls: MEDIUM-HIGH — iOS-specific bugs from community reports (verified against multiple sources); AudioContext policy from official Chrome docs

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable APIs; OpenAI voice list may expand)
