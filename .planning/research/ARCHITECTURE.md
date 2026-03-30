# Architecture Patterns

**Domain:** Voice-first accessible web application (restaurant menu navigation for blind/VI users)
**Researched:** 2026-03-29

## Recommended Architecture

MenuVoice is a real-time voice conversation app with an image processing pipeline feeding into an AI chat loop. The architecture has three major subsystems: (1) image capture and menu extraction, (2) the voice conversation loop, and (3) local data persistence. All three converge on a central state machine that manages what the app is doing at any given moment.

### High-Level System Diagram

```
[Camera Capture] --> [Next.js API: /api/menu/extract]
                            |
                     [Claude Vision API]
                            |
                     [Structured Menu JSON]
                            |
                            v
                   [Client State (React)]
                     |              |
              [IndexedDB]    [Voice Conversation Loop]
              (profiles,      |                    ^
               menu cache)    v                    |
                        [SpeechRecognition]         |
                              |                    |
                              v                    |
                   [Next.js API: /api/chat]        |
                              |                    |
                       [Claude API stream] ------->|
                              |                    |
                              v                    |
                   [TTS (AI or Browser)] ----------+
                              |
                         [Audio Output]
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **VoiceManager** | Manages SpeechRecognition lifecycle, handles start/stop/restart, emits transcripts | AppStateMachine, ConversationManager |
| **ConversationManager** | Sends user message + context to API, consumes streamed response, manages conversation history | VoiceManager, TTSManager, API routes |
| **TTSManager** | Queues text chunks for speech output, manages AI TTS vs browser fallback, handles barge-in (interrupt) | VoiceManager (to pause recognition during speech), ConversationManager |
| **MenuExtractor** | Orchestrates photo capture, sends images to vision API, validates extraction quality | CameraCapture, API routes, AppStateMachine |
| **CameraCapture** | getUserMedia, photo capture UI, voice-guided framing hints | MenuExtractor |
| **AppStateMachine** | Top-level state: idle -> capturing -> processing -> conversing -> done | All components |
| **ProfileStore** | IndexedDB wrapper for user allergies, preferences, past sessions | ConversationManager (injects into context) |
| **API: /api/menu/extract** | Receives base64 images, calls Claude Vision, returns structured menu JSON | Claude Vision API |
| **API: /api/chat** | Receives message + menu context + history, streams Claude response | Claude Messages API (streaming) |

### Data Flow

**Phase 1: Menu Capture**
1. User opens app, receives voice greeting
2. App requests camera via `getUserMedia({ video: { facingMode: { exact: "environment" } } })` (rear camera required, HTTPS mandatory -- verified via MDN)
3. User (or sighted companion) captures photos of menu pages
4. Each photo is captured as a canvas snapshot from video stream, converted to base64 JPEG
5. All photos are sent to `/api/menu/extract` in a single request (Claude Vision supports multiple images per message)
6. API returns structured menu JSON; client stores it in React state and optionally caches in IndexedDB

**Phase 2: Voice Conversation**
1. App speaks a proactive overview of the menu via TTS
2. After TTS finishes, SpeechRecognition starts listening
3. User speaks a question; `onresult` event fires with transcript
4. Transcript + menu JSON + conversation history + user profile sent to `/api/chat`
5. Claude streams response; chunks are accumulated into sentence-sized buffers
6. Each sentence is sent to TTS immediately (incremental speech)
7. When TTS finishes the full response, SpeechRecognition restarts
8. Loop continues until user is done

---

## 1. Voice Conversation Loop Architecture

This is the most critical architectural challenge. The loop must feel natural: listen, think, speak, listen again. Latency at every stage compounds.

### State Machine Design

Use an explicit finite state machine (not implicit boolean flags). This is essential for accessibility -- the app must always know what it is doing and communicate that state to the user.

```typescript
type VoiceState =
  | { status: 'idle' }
  | { status: 'listening'; startedAt: number }
  | { status: 'processing'; transcript: string }
  | { status: 'speaking'; utteranceIndex: number; totalUtterances: number }
  | { status: 'error'; error: string; recoveryAction: () => void };
```

**Why a state machine:** Boolean flags like `isListening`, `isSpeaking`, `isProcessing` create impossible states (`isListening && isSpeaking` should never happen but nothing prevents it). A union type enforces exactly one state at a time. Use `useReducer` to manage transitions.

### SpeechRecognition Management

**Verified from MDN documentation:**
- `continuous = false` (default) -- use this, not continuous mode. Continuous mode on Chrome sends audio to Google's servers indefinitely and has reliability issues with long sessions. Instead, use the "listen once, process, restart" pattern.
- `interimResults = true` -- show the user (via screen reader or TTS) that their speech is being captured, providing feedback that the mic is working.
- `lang = 'en-US'` -- set explicitly.
- `recognition.onend` fires when recognition stops; this is the hook to restart if the app should keep listening.
- Chrome requires network (audio sent to server-based engine). Firefox has offline speech recognition via DeepSpeech/Vosk in some builds but browser support is limited.

**Critical Pattern: Recognition Restart with Backoff**

```typescript
// Pseudocode for robust recognition management
class VoiceManager {
  private recognition: SpeechRecognition;
  private consecutiveErrors = 0;
  private maxRetries = 3;

  startListening() {
    this.recognition.start();
    // SpeechRecognition throws if called while already running
    // Always track state to prevent double-start
  }

  onEnd() {
    if (this.state === 'listening') {
      // Unexpected end -- restart with backoff
      if (this.consecutiveErrors < this.maxRetries) {
        setTimeout(() => this.startListening(), 300 * this.consecutiveErrors);
      } else {
        this.emitError('Speech recognition unavailable');
      }
    }
    // If state is 'processing' or 'speaking', do not restart
  }

  onResult(event: SpeechRecognitionEvent) {
    this.consecutiveErrors = 0; // Reset on success
    const transcript = event.results[0][0].transcript;
    this.emit('transcript', transcript);
  }
}
```

### Barge-In (Interrupt) Pattern

Users must be able to interrupt the AI mid-speech. This is essential for accessibility -- blind users cannot see a "stop" button.

```
User speaks during TTS output:
1. SpeechRecognition is NOT running during TTS (they conflict)
2. Instead: monitor for a "tap anywhere" gesture or hardware button
3. On interrupt: speechSynthesis.cancel() immediately
4. Transition to 'listening' state
5. Start SpeechRecognition
```

**Alternative for AI TTS (non-browser):** If using an external TTS API that returns audio, you control the `<audio>` element directly. On interrupt, `audio.pause()` and start recognition.

**Recommendation:** Do NOT run SpeechRecognition and SpeechSynthesis simultaneously. Browser behavior is unpredictable -- the TTS output can feed back into the recognition mic, causing the AI to "hear itself." Always alternate: either speaking OR listening, never both.

---

## 2. Streaming Architecture: Claude API to Incremental TTS

### The Latency Problem

Without streaming, the flow is: user speaks (1-3s) -> send to API (200ms) -> Claude generates full response (2-5s) -> TTS speaks full response (3-10s). Total: 6-18 seconds of silence before the user hears anything.

With streaming + incremental TTS: user speaks (1-3s) -> send to API (200ms) -> first sentence arrives (300-800ms) -> TTS starts speaking first sentence while Claude continues generating. Total time to first audio: ~2-4 seconds.

### Server-Side: Next.js Route Handler Streaming

**Verified from Next.js docs:** App Router route handlers natively support streaming via `ReadableStream`. The example from the official docs shows how to return a `new Response(stream)`.

Use the Anthropic TypeScript SDK's streaming API. The SDK provides a `.stream()` method that returns an async iterator of events.

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { messages, menuContext, userProfile } = await request.json();

  const systemPrompt = buildSystemPrompt(menuContext, userProfile);

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });

  // Convert Anthropic stream to a ReadableStream for the Response
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          // Send each text chunk as SSE
          const data = JSON.stringify({ text: event.delta.text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client-Side: Sentence Buffer for Incremental TTS

Raw streaming chunks are fragments of words/sentences. You cannot TTS every chunk -- you need to buffer until you have a complete sentence.

```typescript
class SentenceBuffer {
  private buffer = '';
  private sentenceEndPattern = /[.!?]\s|[.!?]$/;

  addChunk(text: string): string[] {
    this.buffer += text;
    const sentences: string[] = [];

    // Extract complete sentences
    let match;
    while ((match = this.sentenceEndPattern.exec(this.buffer))) {
      const endIndex = match.index + match[0].length;
      sentences.push(this.buffer.slice(0, endIndex).trim());
      this.buffer = this.buffer.slice(endIndex);
    }

    return sentences; // Each sentence goes to TTS immediately
  }

  flush(): string | null {
    // Call at stream end to get any remaining text
    if (this.buffer.trim()) {
      const remaining = this.buffer.trim();
      this.buffer = '';
      return remaining;
    }
    return null;
  }
}
```

### TTS Queue Architecture

```typescript
class TTSManager {
  private queue: string[] = [];
  private isSpeaking = false;

  async speak(text: string): Promise<void> {
    this.queue.push(text);
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isSpeaking = true;
    while (this.queue.length > 0) {
      const text = this.queue.shift()!;
      await this.speakOne(text);
    }
    this.isSpeaking = false;
    this.onFinished(); // Signal to restart SpeechRecognition
  }

  private speakOne(text: string): Promise<void> {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Don't block queue on errors
      speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    this.queue = [];
    speechSynthesis.cancel();
    this.isSpeaking = false;
  }
}
```

### AI TTS vs Browser TTS Decision

**Browser SpeechSynthesis (verified from MDN):**
- Widely supported since September 2018
- Free, no API calls
- Voice quality varies wildly by OS/browser
- Works offline (the synthesis is local)
- Cannot stream -- must provide complete text upfront per utterance
- Potential conflicts with screen readers

**AI TTS (e.g., OpenAI TTS API, ElevenLabs):**
- Higher quality, more natural voices
- Costs money per character
- Requires network
- Returns audio data (MP3/PCM) that you play via `<audio>` or AudioContext
- Some support streaming audio (ElevenLabs WebSocket API)
- No screen reader conflicts (plays as audio element)

**Recommendation:** Use browser SpeechSynthesis as the default and primary TTS engine. It is free, works offline, and integrates naturally with accessibility tools. Offer AI TTS as a premium/optional upgrade for users who want better voice quality. The sentence-buffer approach works identically for both -- you just swap the `speakOne` implementation.

**Rationale for browser-first:** The target users (blind/VI) likely already use screen readers. Browser TTS is the familiar paradigm. Adding a premium AI voice is a differentiator, not a requirement.

---

## 3. Menu Data Structure for Conversational Queries

### Structured Menu JSON Schema

The output of Claude Vision extraction should follow a consistent schema that enables efficient conversational queries.

```typescript
interface Menu {
  restaurantName?: string;        // Extracted if visible
  menuType?: string;              // "dinner", "brunch", "drinks", etc.
  categories: MenuCategory[];
  extractionConfidence: number;   // 0-1 overall confidence
  rawPageCount: number;           // How many photos were processed
  warnings: string[];             // "Page 2 was blurry", etc.
}

interface MenuCategory {
  name: string;                   // "Appetizers", "Entrees", etc.
  description?: string;           // Category-level description if any
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  description?: string;           // Full description from menu
  price?: string;                 // Keep as string ("$12.95", "Market Price")
  allergens: string[];            // Extracted or inferred: ["nuts", "dairy"]
  dietaryFlags: string[];         // ["vegetarian", "gluten-free", "spicy"]
  modifications?: string[];       // Available modifications if listed
  confidence: number;             // Per-item extraction confidence
}
```

### Why This Structure

- **Categories** enable "What appetizers do you have?" queries naturally
- **Allergens and dietaryFlags** at item level enable the proactive warning requirement: every item mentioned triggers an allergy check against user profile
- **Confidence scores** let the conversation say "I'm not fully sure about this item's description -- the photo was a bit blurry"
- **Price as string** avoids parsing issues with "Market Price", "MP", "$12 / $18" (half/full) patterns

### Injecting Menu Data into Conversation Context

The entire menu JSON goes into Claude's system prompt. For a typical restaurant menu (30-80 items), the JSON is roughly 3-8KB of text, which is well within Claude's context window (200K tokens for Claude 3.5 Sonnet / Claude 4 models).

```typescript
function buildSystemPrompt(menu: Menu, profile: UserProfile): string {
  return `You are a helpful restaurant menu assistant for a blind/visually impaired diner.

## Menu Data
${JSON.stringify(menu, null, 2)}

## User Profile
- Allergies: ${profile.allergies.join(', ') || 'None specified'}
- Dislikes: ${profile.dislikes.join(', ') || 'None specified'}
- Dietary preferences: ${profile.dietaryPreferences.join(', ') || 'None specified'}

## Instructions
- When mentioning ANY menu item, ALWAYS check against the user's allergies and dislikes.
- If an allergen match is found, warn immediately and suggest asking the server about modifications.
- Keep responses concise (2-4 sentences) since they will be spoken aloud.
- Use natural conversational language, not robotic lists.
- When listing items, group by category and mention prices.
- If confidence is low on an item, mention uncertainty.`;
}
```

**Key insight:** Do NOT summarize the menu for the system prompt. Send the full JSON. Claude handles large context well and summaries lose the detail needed for specific questions like "Does the Caesar salad have anchovies?"

---

## 4. Conversation Context Management

### Message History Strategy

Each conversation turn adds to the message array sent to Claude. The full pattern:

```typescript
interface ConversationState {
  menu: Menu;                        // Set once after extraction
  userProfile: UserProfile;          // Loaded from IndexedDB on start
  messages: ConversationMessage[];   // Accumulates over conversation
  sessionAllergens: string[];        // Allergens discovered mid-conversation
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Context Window Budget:**
- System prompt with menu JSON: ~2,000-6,000 tokens (depending on menu size)
- Each conversation turn: ~50-200 tokens
- A 20-turn conversation: ~2,000-4,000 tokens
- Total: ~4,000-10,000 tokens -- well under Claude's context limit

**No need for sliding window or summarization** for v1. A restaurant menu conversation is typically 5-20 turns. Even at 50 turns, you stay under 15K tokens. This is a major architectural simplification.

### Mid-Conversation Preference Capture

The project requirement says users can mention allergies mid-conversation (e.g., "Oh, I'm also allergic to shellfish"). Handle this by:

1. Including an instruction in the system prompt: "If the user mentions a new allergy or food preference, acknowledge it and apply it going forward. Output a structured tag like [NEW_ALLERGY: shellfish] so the app can save it."
2. Client-side: parse each assistant response for `[NEW_ALLERGY: ...]` or `[NEW_PREFERENCE: ...]` tags
3. Save to IndexedDB profile and inject into subsequent system prompts

This is simpler and more reliable than trying to use Claude's tool_use for this purpose. The tags are stripped before TTS.

---

## 5. Image Processing Pipeline

### Multi-Page Menu Capture Flow

```
[Camera Preview] -> [Capture Button / Voice "take photo"] -> [Review]
       |                                                        |
       |<-- "Take another page" --------------------------------|
       |                                                        |
       |                                            [All pages captured]
       |                                                        |
       v                                                        v
[getUserMedia stream]                              [Send all images to API]
  - facingMode: environment                                     |
  - min resolution: 1280x720                                    v
  - HTTPS required (verified MDN)                    [/api/menu/extract]
                                                               |
                                                     [Claude Vision call]
                                                     (all images in one message)
                                                               |
                                                               v
                                                     [Structured Menu JSON]
```

### Claude Vision API Usage

Claude Vision accepts multiple images in a single message. For a multi-page menu, send all pages in one API call rather than one call per page. This gives Claude cross-page context (e.g., a category header on page 1 applies to items at the top of page 2).

```typescript
// app/api/menu/extract/route.ts
export async function POST(request: Request) {
  const { images } = await request.json();
  // images: Array<{ base64: string; mimeType: string }>

  const imageContent = images.map((img, index) => ([
    {
      type: 'text' as const,
      text: `Menu page ${index + 1} of ${images.length}:`,
    },
    {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mimeType,
        data: img.base64,
      },
    },
  ])).flat();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: `Extract the complete restaurant menu from these ${images.length} page(s).
Return a JSON object matching this exact schema:
{
  "restaurantName": string | null,
  "menuType": string | null,
  "categories": [{
    "name": string,
    "description": string | null,
    "items": [{
      "name": string,
      "description": string | null,
      "price": string | null,
      "allergens": string[],
      "dietaryFlags": string[],
      "modifications": string[] | null,
      "confidence": number
    }]
  }],
  "extractionConfidence": number,
  "warnings": string[]
}
Include allergens you can infer from descriptions (e.g., "cream sauce" -> ["dairy"]).
Set confidence lower for items that are blurry or partially visible.
Add warnings for any quality issues with the photos.
Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    }],
  });

  // Parse and validate the response
  const menuJson = JSON.parse(response.content[0].text);
  return Response.json(menuJson);
}
```

### Image Size Optimization

Phone cameras produce 3-12MB images. Claude Vision accepts images up to ~20MB but larger images cost more tokens (they are resized internally). Resize client-side before sending:

```typescript
function captureAndResize(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  // Target: 1568px on longest side (Claude's internal max before downscaling)
  const maxDim = 1568;
  const scale = Math.min(maxDim / videoElement.videoWidth,
                         maxDim / videoElement.videoHeight, 1);
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85); // 85% quality JPEG
}
```

### Quality Validation

After extraction, check the `extractionConfidence` and `warnings` fields. If confidence is below a threshold (e.g., 0.6), prompt the user to retake the photo with voice guidance: "The photo of page 2 seems blurry. Could you try taking it again?"

---

## 6. Offline / Degraded Mode Strategy

### What Requires Network

| Component | Network Required | Reason |
|-----------|-----------------|--------|
| SpeechRecognition (Chrome) | YES | Audio sent to Google servers (verified MDN) |
| SpeechSynthesis | NO | Local synthesis engine |
| Claude Vision API | YES | Server-side AI processing |
| Claude Chat API | YES | Server-side AI processing |
| AI TTS (OpenAI/ElevenLabs) | YES | Server-side synthesis |
| IndexedDB | NO | Fully client-side |
| Camera (getUserMedia) | NO | Local hardware (but HTTPS required) |

### Degradation Levels

**Level 1: Full connectivity** -- Everything works as designed.

**Level 2: Slow/intermittent network** -- The most common real-world scenario (restaurant basements, crowded areas).
- Menu extraction: Add retry with exponential backoff. Show "Processing your menu photos..." with voice updates on progress. This is a one-time operation, so a 10-30 second wait is acceptable.
- Conversation: Streaming helps here -- even on slow connections, chunks arrive incrementally. Add a timeout (15s) and voice feedback: "Still thinking..." at 5s.
- AI TTS: Fall back to browser SpeechSynthesis if AI TTS request takes >3s.

**Level 3: Network lost after menu extraction** -- Menu data is already in client memory/IndexedDB. This is the most interesting degradation case.
- SpeechRecognition stops working (Chrome). Fall back to a text input field (which a screen reader user can type into).
- Claude API unavailable. Cache the last few responses and the full menu JSON locally. Provide basic keyword search over the menu data client-side: "Search results for 'chicken': Chicken Parmesan ($16.95), Grilled Chicken Salad ($13.95)..."
- Browser TTS continues working.

**Level 4: No network from start** -- App cannot function meaningfully. Display/speak a clear message: "MenuVoice needs an internet connection to process menu photos and answer questions. Please check your connection."

### Implementation: Network Status Monitor

```typescript
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### IndexedDB Caching Strategy

Cache extracted menu data in IndexedDB after successful extraction. If the user accidentally closes the browser and reopens within the same restaurant visit, they do not need to re-photograph the menu.

```typescript
// Database schema
const DB_NAME = 'menuvoice';
const DB_VERSION = 1;

// Object stores:
// 'profiles' - user allergy/preference profiles (key: 'default')
// 'sessions' - recent menu sessions (key: auto-increment)
//   { menu: Menu, timestamp: Date, conversationHistory: Message[] }
// 'settings' - app settings (key: setting name)
//   { ttsVoice: string, speechRate: number, ... }
```

Use a wrapper library like `idb` (by Jake Archibald) to simplify IndexedDB usage with promises instead of the raw event-based API. It is a tiny (~1KB) library that provides a clean async/await interface.

---

## 7. Next.js App Router vs Pages Router

**Use App Router.** This is not a close decision.

### Why App Router

| Factor | App Router | Pages Router |
|--------|-----------|--------------|
| Route Handlers (API) | Native `route.ts` files with full Web API support (verified from Next.js docs) | `pages/api/*.ts` with custom request/response objects |
| Streaming | First-class `ReadableStream` support in route handlers (verified) | Possible but requires workarounds |
| Server Components | Yes -- can pre-render the minimal UI server-side | No |
| Layouts | Nested layouts for consistent accessible UI shell | Manual layout management |
| Status | Current recommended approach (Next.js 13+, stable since 14) | Legacy, still supported but not recommended for new projects |
| React 18+ features | Full support (Suspense, streaming SSR) | Limited |

### App Router File Structure

```
app/
  layout.tsx              # Root layout: accessibility meta, skip links
  page.tsx                # Main app page (single-page app effectively)
  globals.css             # Tailwind imports
  api/
    menu/
      extract/
        route.ts          # POST: photo(s) -> Claude Vision -> menu JSON
    chat/
      route.ts            # POST: message + context -> streamed Claude response
    tts/
      route.ts            # POST: text -> AI TTS audio (optional, for premium voice)
  components/
    VoiceManager.tsx      # SpeechRecognition hook/component
    TTSManager.tsx        # TTS queue management
    ConversationView.tsx  # Visual conversation display (for sighted companions)
    CameraCapture.tsx     # Menu photo capture
    MenuReview.tsx        # Show extracted menu (accessible)
    ProfileEditor.tsx     # Allergy/preference management
  lib/
    state-machine.ts      # App state machine
    menu-schema.ts        # TypeScript types for menu data
    indexeddb.ts           # IndexedDB wrapper (using idb)
    sentence-buffer.ts    # Streaming text -> sentence chunker
    prompts.ts            # System prompt builders
  hooks/
    useVoice.ts           # Custom hook for speech recognition
    useTTS.ts             # Custom hook for TTS
    useConversation.ts    # Custom hook for chat + streaming
    useMenu.ts            # Custom hook for menu state
    useProfile.ts         # Custom hook for IndexedDB profile
```

### Why a Single Page

This is effectively a single-page application with one main view that transitions through states (welcome -> capture -> processing -> conversation). Use the App Router for its API route capabilities and layout system, but the user-facing UI is a single `page.tsx` with state-driven rendering. Multiple routes would create navigation events that disrupt screen readers and voice flow.

---

## 8. API Route Design

### Separate Endpoints (Recommended)

Use three distinct API routes rather than a unified endpoint.

| Endpoint | Method | Purpose | Response Type |
|----------|--------|---------|---------------|
| `/api/menu/extract` | POST | Photos -> structured menu JSON | JSON (non-streaming) |
| `/api/chat` | POST | Conversation message -> AI response | SSE stream (text/event-stream) |
| `/api/tts` | POST | Text -> audio | Binary audio stream (optional) |

### Why Separate, Not Unified

1. **Different response types:** Menu extraction returns JSON, chat returns an SSE stream, TTS returns audio. A unified endpoint would need response type negotiation.
2. **Different latency profiles:** Menu extraction is slow (5-15s) and called once. Chat is called every turn and must stream. TTS is called per sentence. Different timeout and retry strategies for each.
3. **Independent scaling:** If deployed on Vercel, each route can have different `maxDuration` settings. Menu extraction might need 30s, chat 15s, TTS 5s.
4. **Cleaner error handling:** A chat error should not affect menu extraction state. Separate routes have isolated error boundaries.
5. **Security:** Each route validates different inputs. Menu extraction validates image data, chat validates message format, TTS validates text length.

### API Route Configuration

```typescript
// app/api/menu/extract/route.ts
export const maxDuration = 30; // Menu extraction can be slow with multiple images
export const dynamic = 'force-dynamic';

// app/api/chat/route.ts
export const maxDuration = 15; // Streaming response, but cap it
export const dynamic = 'force-dynamic';

// app/api/tts/route.ts (optional, only if using AI TTS)
export const maxDuration = 10;
export const dynamic = 'force-dynamic';
```

---

## Patterns to Follow

### Pattern 1: Event-Driven Voice Loop with State Machine

**What:** Use a reducer-based state machine to control the voice conversation loop. Each state transition triggers the appropriate action (start listening, send to API, start speaking). Components subscribe to state changes.

**When:** Always. This is the core architectural pattern.

```typescript
type Action =
  | { type: 'START_LISTENING' }
  | { type: 'TRANSCRIPT_RECEIVED'; transcript: string }
  | { type: 'RESPONSE_STARTED' }
  | { type: 'SENTENCE_READY'; sentence: string }
  | { type: 'SPEAKING_FINISHED' }
  | { type: 'ERROR'; error: string }
  | { type: 'INTERRUPT' }
  | { type: 'RESET' };

function voiceReducer(state: VoiceState, action: Action): VoiceState {
  switch (action.type) {
    case 'START_LISTENING':
      return { status: 'listening', startedAt: Date.now() };
    case 'TRANSCRIPT_RECEIVED':
      return { status: 'processing', transcript: action.transcript };
    case 'RESPONSE_STARTED':
      return { status: 'speaking', utteranceIndex: 0, totalUtterances: 0 };
    case 'SPEAKING_FINISHED':
      return { status: 'listening', startedAt: Date.now() };
    case 'INTERRUPT':
      return { status: 'listening', startedAt: Date.now() };
    case 'ERROR':
      return { status: 'error', error: action.error,
               recoveryAction: () => {} };
    default:
      return state;
  }
}
```

### Pattern 2: Incremental Streaming TTS

**What:** Buffer Claude's streamed text into sentences, then speak each sentence as it becomes available rather than waiting for the full response.

**When:** During every conversation turn. This pattern cuts perceived latency by 50-70%.

### Pattern 3: System Prompt Injection for Menu Context

**What:** Place the full menu JSON and user profile in Claude's system prompt. Conversation messages contain only the actual dialogue. This keeps the context clean and avoids re-sending menu data in every user message.

**When:** Every API call to `/api/chat`.

### Pattern 4: Optimistic State Transitions

**What:** When the user finishes speaking, immediately provide audio feedback ("Let me think about that...") while the API request is in flight. Do not wait in silence.

**When:** Anytime there might be a perceptible delay between user input and AI response.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Recognition and Synthesis Simultaneously

**What:** Starting SpeechRecognition while SpeechSynthesis is actively speaking.
**Why bad:** The microphone picks up the TTS audio output, causing the AI to "hear itself." Feedback loops, garbled transcripts, ghost conversations.
**Instead:** Strict state machine alternation. Either listening OR speaking, never both. Use the state machine to enforce this.

### Anti-Pattern 2: Storing Conversation State in a Global Store (Redux/Zustand)

**What:** Putting the voice state machine, conversation history, and menu data in a global state management library.
**Why bad:** Over-engineering for what is a single-page, single-user, single-session app. Global state adds complexity, devtools dependencies, and boilerplate. Also, the conversation is ephemeral -- it does not need persistence across components.
**Instead:** Use React `useReducer` + Context for the voice state machine. Keep menu data in a `useRef` or simple `useState` at the top level. Use IndexedDB only for data that persists across sessions (profile, cached menus).

### Anti-Pattern 3: Polling for Speech Recognition Results

**What:** Using `setInterval` to check if recognition has produced results.
**Why bad:** SpeechRecognition is event-driven. Polling wastes CPU and adds latency.
**Instead:** Use the `onresult`, `onend`, and `onerror` event handlers directly.

### Anti-Pattern 4: Sending One Image Per API Call

**What:** Making separate Claude Vision calls for each menu page, then merging results.
**Why bad:** Claude loses cross-page context (categories spanning pages). Also more expensive (per-call overhead) and slower (sequential calls).
**Instead:** Send all pages in a single Claude Vision request. Claude handles multi-image inputs natively.

### Anti-Pattern 5: Summarizing Menu Data for Context

**What:** Reducing the menu JSON to a summary before injecting into Claude's system prompt.
**Why bad:** Loses detail needed for specific questions ("Does the pasta have pine nuts?"). Claude's context window is more than large enough for full menu data.
**Instead:** Send the complete structured menu JSON. A 50-item menu is roughly 3,000-5,000 tokens -- trivial for Claude's 200K context window.

---

## Scalability Considerations

| Concern | At 1 user (dev) | At 100 users | At 10K users |
|---------|-----------------|--------------|--------------|
| **API costs** | Negligible | ~$50-200/mo (Claude API) | ~$5K-20K/mo; consider caching common menu queries |
| **API rate limits** | No issue | Monitor Anthropic rate limits (RPM) | May need Anthropic rate limit tier upgrade |
| **Vercel function duration** | Default fine | Default fine | May need Vercel Pro for extended function timeouts |
| **Image processing** | Instant | No issue (each user is independent) | Consider image compression queue |
| **Browser TTS** | Local, no concern | Local, no concern | Local, no concern |
| **AI TTS** | Negligible | ~$30-100/mo (if offered) | Significant; consider TTS response caching for common phrases |

For v1, scalability is not a concern. This is a personal-use / small-audience accessibility tool. The architecture does not need to handle 10K concurrent users. Focus on latency and reliability for single-user sessions.

---

## Sources

- MDN: SpeechRecognition API (https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) -- verified, fetched 2026-03-29
- MDN: SpeechSynthesis API (https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) -- verified, fetched 2026-03-29
- MDN: IndexedDB API (https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) -- verified, fetched 2026-03-29
- MDN: getUserMedia (https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) -- verified, fetched 2026-03-29
- MDN: ReadableStream (https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) -- verified, fetched 2026-03-29
- Next.js: Route Handlers (https://nextjs.org/docs/app/api-reference/file-conventions/route) -- verified, fetched 2026-03-29
- Anthropic: Claude API streaming -- based on training data knowledge of SDK patterns (MEDIUM confidence)
- Anthropic: Claude Vision API -- based on training data knowledge (MEDIUM confidence; image size limits and multi-image support should be verified against current docs)

### Confidence Notes

| Area | Confidence | Reason |
|------|------------|--------|
| Web Speech API behavior | HIGH | Verified against MDN documentation |
| Next.js App Router streaming | HIGH | Verified against official Next.js docs |
| IndexedDB patterns | HIGH | Verified against MDN documentation |
| Camera/getUserMedia | HIGH | Verified against MDN documentation |
| Claude Vision multi-image | MEDIUM | Based on training data; Anthropic docs were unreachable for verification |
| Claude streaming event types | MEDIUM | Based on training data; Anthropic streaming docs were unreachable for verification |
| Vercel AI SDK integration | LOW | Could not verify current API; mentioned in Next.js docs example but details unverified |
| AI TTS streaming capabilities | MEDIUM | Based on training data knowledge of OpenAI/ElevenLabs APIs |
