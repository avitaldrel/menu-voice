# Technology Stack

**Project:** MenuVoice
**Researched:** 2026-03-29
**Note:** WebSearch, WebFetch (partial), and Bash were restricted during research. Findings are based on successfully fetched MDN/GitHub documentation plus training data (cutoff May 2025). Confidence levels are adjusted accordingly -- version numbers and pricing should be verified before committing to dependencies.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js (App Router) | 15.x | Full-stack React framework | App Router gives us server components (keep API keys server-side), Route Handlers for Claude/TTS API proxying, and built-in streaming support via `ReadableStream`. The accessibility-first project benefits from SSR for initial page load screen-reader compatibility. |
| React | 19.x | UI library | Ships with Next.js 15. Server Components reduce client bundle. Concurrent features help keep the UI responsive during streaming audio + conversation. |
| TypeScript | 5.x | Type safety | Non-negotiable for a project handling structured menu data, API payloads, and conversation state. Catches schema drift between Claude responses and UI expectations. |
| Tailwind CSS | 4.x | Styling | Utility-first CSS. For an accessibility app, styling is secondary to structure, but Tailwind keeps it fast to maintain. Use `sr-only` utilities and focus-visible patterns. |

**Confidence:** MEDIUM -- Next.js 15 was stable as of training cutoff. Verify current stable version.

### AI / LLM Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | latest (0.80.x+) | Claude API client | Official TypeScript SDK. Supports streaming via `client.messages.stream()`, vision via base64 image content blocks, and structured JSON output via tool_use. Confirmed from GitHub: MIT licensed, Node 18+, 1.8k stars. |
| Claude Sonnet (claude-sonnet-4-20250514 or latest) | -- | Menu OCR + Conversation | Sonnet is the right tier: fast enough for conversational latency (<3s), capable enough for vision/OCR, and significantly cheaper than Opus. Use Sonnet for both the OCR extraction step and the ongoing conversation. Only escalate to Opus if OCR accuracy on difficult menus proves insufficient. |

**Confidence:** MEDIUM -- SDK version confirmed from GitHub fetch. Model names may have updated since training cutoff.

### Claude Vision for Menu OCR -- Capabilities

Based on training data (flag: verify against current docs):

- **Supported formats:** JPEG, PNG, GIF, WebP. JPEG is ideal for phone camera photos.
- **Max images per request:** Up to 20 images in a single messages API call (each as a separate content block).
- **Max image size:** 20MB per image. Images are resized internally; effective resolution cap is approximately 1568px on the longest edge.
- **Base64 input:** Send images as `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "<base64>" } }` content blocks. This avoids needing a publicly accessible URL -- critical since users are uploading from their phone camera roll.
- **OCR quality:** Claude's vision is strong at reading printed text from photos, including restaurant menus with columns, sections, prices, and decorative fonts. It handles multi-column layouts, varied typography, and partial occlusion reasonably well.
- **Structured output:** Use a system prompt instructing Claude to return menu data as structured JSON (name, description, price, section, dietary flags). Alternatively, use tool_use to force a structured schema. Tool_use is recommended because it guarantees JSON conformance.
- **Multi-page menus:** Send multiple photos in one request. The system prompt should instruct Claude to merge them into a single coherent menu structure and deduplicate items that appear on both photos (e.g., headers repeated across pages).

**Confidence:** MEDIUM -- Vision capabilities are well-established but exact limits/model names should be verified.

### Speech Input (Speech-to-Text)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Web Speech API (SpeechRecognition) | Browser built-in | Voice input from user | Zero cost, zero latency overhead (no network round-trip for STT), already in the browser. For an accessibility app, minimizing external dependencies for input is important. |

**Confirmed from MDN fetch:**

#### Browser Support Matrix

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome (desktop) | YES | Full support. Uses Google's cloud speech service (requires internet). Prefixed as `webkitSpeechRecognition`. |
| Chrome (Android) | YES | Full support. Same cloud-based engine. |
| Edge | YES | Chromium-based, same as Chrome. |
| Safari (macOS) | YES | Supported since Safari 14.1 (2021). Uses on-device recognition on Apple Silicon. |
| Safari (iOS) | YES | Supported since iOS 14.5. On-device on newer devices. |
| Firefox | NO | Not supported. Firefox has never shipped SpeechRecognition. |
| Samsung Internet | YES | Chromium-based. |

#### Key API Properties (confirmed from MDN)

```typescript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;       // Keep listening for multiple utterances
recognition.interimResults = true;   // Show partial results while speaking
recognition.lang = 'en-US';         // Set language
recognition.maxAlternatives = 1;     // Single best result
```

#### Critical Limitations and Mitigations

1. **Chrome sends audio to Google servers** -- Not offline-capable. This is acceptable for MenuVoice (requires internet for Claude API anyway), but must be disclosed in privacy policy.
2. **Auto-stop behavior:** Even with `continuous = true`, Chrome's recognition will stop after ~10-15 seconds of silence. **Mitigation:** Listen for the `end` event and automatically call `recognition.start()` again if the app is still in listening mode.
3. **No Firefox support:** Roughly 3% of global browser share. For blind/VI users, Firefox is rarely the default mobile browser. **Mitigation:** Detect support on app load; show a clear message suggesting Chrome or Safari if unsupported.
4. **Permission prompt:** First use triggers a microphone permission dialog. For screen reader users, this is manageable but should be anticipated in the UX flow.

#### Recommendation: Use Web Speech API, Not a Paid STT Service

Deepgram, AssemblyAI, and Whisper API are alternatives but add cost ($0.006-0.01/minute), latency (network round-trip), and complexity. Web Speech API is free, fast, and sufficient for single-user conversational input. If accuracy proves problematic for specific accents or noisy restaurant environments, revisit with Whisper as a fallback.

**Confidence:** HIGH for the API surface (confirmed from MDN). MEDIUM for browser support specifics (MDN compatibility table was not fully rendered but properties align with well-known state).

### Speech Output (Text-to-Speech)

| Technology | Tier | Purpose | Why |
|------------|------|---------|-----|
| OpenAI TTS API | Primary | High-quality voice output | Best balance of quality, cost, latency, and streaming support for this use case. |
| Browser SpeechSynthesis | Fallback | Zero-cost fallback | Baseline Widely Available since 2018 (confirmed from MDN). Every browser supports it. Quality is robotic but functional. |

#### OpenAI TTS (Recommended Primary)

Based on training data (flag: verify current pricing):

| Aspect | tts-1 (Standard) | tts-1-hd (High Quality) |
|--------|-------------------|-------------------------|
| Latency | ~300-500ms to first byte | ~500-800ms to first byte |
| Quality | Good, slight artifacts | Near-human quality |
| Price | $15.00 / 1M characters | $30.00 / 1M characters |
| Streaming | YES (chunked response) | YES (chunked response) |
| Output formats | mp3, opus, aac, flac, wav, pcm | Same |

**Voices:** alloy, echo, fable, onyx, nova, shimmer (6 voices). For MenuVoice, recommend **nova** (warm, clear, natural) or **alloy** (neutral, professional).

**Why OpenAI TTS over ElevenLabs:**
- **Simpler API:** Single REST endpoint, no voice cloning complexity to manage.
- **Lower cost:** ElevenLabs free tier is 10K characters/month (useless for real usage). Paid plans start at $5/month for 30K characters. OpenAI at $15/1M chars means ~$0.015 per 1000 characters -- a typical menu readout of 500 characters costs $0.0075.
- **Streaming:** Both support streaming, but OpenAI's is a simple chunked HTTP response you can pipe directly to an `<audio>` element. ElevenLabs streaming uses WebSockets which adds complexity.
- **Latency:** Comparable. OpenAI tts-1 optimizes for low latency. ElevenLabs "Turbo v2.5" is similarly fast.

**When to choose ElevenLabs instead:** If voice customization/cloning is critical (it is not for MenuVoice), or if you need non-English languages with native-quality accents (ElevenLabs excels here). For English menu readouts, OpenAI is simpler and cheaper.

**Confidence:** LOW-MEDIUM -- Pricing and model names are from training data. OpenAI and ElevenLabs frequently update pricing. Verify before launch.

#### Browser SpeechSynthesis (Fallback)

- **Availability:** Baseline Widely Available since September 2018 (confirmed from MDN).
- **Usage:** Call `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` -- zero API cost.
- **Limitations:** Robotic voice quality. Voice selection varies wildly by OS/browser. No streaming -- must have full text before speaking.
- **Role in MenuVoice:** Fallback when OpenAI TTS fails (network error, rate limit) or for users who prefer no cloud TTS.

### Audio Streaming in Browser

For playing OpenAI TTS streamed responses in real-time:

**Recommended approach: Fetch + MediaSource Extensions (MSE) or Audio Worklet**

```typescript
// Simplified pattern for streaming TTS playback
const response = await fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text }) });
const reader = response.body.getReader();

// Option A: Accumulate chunks, create blob URL, play via <audio>
// Simplest approach. Slight delay before playback starts but reliable.
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}
const blob = new Blob(chunks, { type: 'audio/mpeg' });
const audio = new Audio(URL.createObjectURL(blob));
audio.play();

// Option B: MediaSource API for true streaming playback
// More complex but starts playing before full response arrives.
// Use for long menu readouts where waiting for full response is noticeable.
```

**Recommendation:** Start with Option A (accumulate-then-play). For menu item descriptions (typically 5-15 seconds of audio), the full response arrives in 1-2 seconds on broadband. True streaming (Option B) is only worth implementing if users complain about the delay when reading full menu sections. MediaSource API has good browser support but adds significant complexity.

**Confidence:** MEDIUM -- Patterns are well-established web audio techniques.

### Local Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| idb | 8.x | IndexedDB wrapper | Simplest option. Tiny (~1KB), just wraps IndexedDB with Promises. No query engine overhead. Perfect for a simple profile/preferences store. |

#### Why idb over Dexie

| Criterion | idb | Dexie |
|-----------|-----|-------|
| Bundle size | ~1KB | ~45KB |
| API style | Thin Promise wrapper over IndexedDB | Full ORM-like query builder |
| Learning curve | Minimal (just IndexedDB + async/await) | Moderate (custom query syntax) |
| React integration | Manual (but trivial for simple reads/writes) | dexie-react-hooks package available |
| Best for | Simple key-value or small object stores | Complex querying, relationships, live queries |

**For MenuVoice, storage needs are simple:**
- User preferences (voice speed, preferred voice, font size, dietary restrictions)
- Saved menus (parsed menu JSON + photo reference)
- Conversation history (optional, for "remind me what I was considering")

This is a handful of object stores with basic CRUD. idb's thin wrapper is sufficient. Dexie would be over-engineering.

**Usage pattern:**
```typescript
import { openDB } from 'idb';

const db = await openDB('menuvoice', 1, {
  upgrade(db) {
    db.createObjectStore('preferences');
    db.createObjectStore('menus', { keyPath: 'id', autoIncrement: true });
  },
});

// Save preference
await db.put('preferences', { speed: 1.2, voice: 'nova' }, 'user-settings');

// Get preference
const prefs = await db.get('preferences', 'user-settings');
```

**Confidence:** MEDIUM -- idb and Dexie are stable, long-lived projects. Version numbers should be verified.

---

## Next.js + Anthropic SDK Integration Pattern

### API Route Handler for Claude (Streaming)

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export async function POST(request: Request) {
  const { messages, menuContext } = await request.json();

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are a helpful restaurant menu assistant for a visually impaired user.
             Here is the parsed menu: ${JSON.stringify(menuContext)}
             Be concise. Read prices clearly. Mention dietary info proactively.`,
    messages,
  });

  // Convert Anthropic SDK stream to Web ReadableStream for Next.js
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
```

### API Route Handler for Menu OCR (Vision)

```typescript
// app/api/ocr/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  const formData = await request.formData();
  const images = formData.getAll('images') as File[];

  const imageContents = await Promise.all(
    images.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: buffer.toString('base64'),
        },
      };
    })
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        ...imageContents,
        {
          type: 'text',
          text: `Extract the complete restaurant menu from these images. Return structured JSON:
          {
            "restaurant_name": "string or null",
            "sections": [
              {
                "name": "string (e.g., Appetizers, Entrees)",
                "items": [
                  {
                    "name": "string",
                    "description": "string or null",
                    "price": "string (e.g., '$12.99')",
                    "dietary": ["vegetarian", "gluten-free", "spicy", etc.]
                  }
                ]
              }
            ]
          }
          Be thorough. Include every item visible. Infer dietary flags from descriptions.`,
        },
      ],
    }],
  });

  // Parse the JSON from Claude's response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/```json?\s*([\s\S]*?)```/) || [null, text];
  const menuData = JSON.parse(jsonMatch[1]?.trim() || text.trim());

  return Response.json(menuData);
}
```

**Confidence:** MEDIUM -- Pattern is sound but model name and exact SDK streaming API may have evolved. The `client.messages.stream()` pattern was documented in the SDK README.

### TTS Proxy Route

```typescript
// app/api/tts/route.ts
export async function POST(request: Request) {
  const { text, voice = 'nova' } = await request.json();

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  return new Response(response.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 (App Router) | Remix, Vite + React SPA | Remix lacks equivalent streaming DX. Pure SPA cannot protect API keys without a separate backend. |
| LLM | Claude Sonnet | GPT-4o, Gemini Pro Vision | Claude's vision quality is competitive and the Anthropic SDK's streaming DX is excellent. Single vendor for both OCR and conversation simplifies the stack. |
| STT | Web Speech API | Deepgram, Whisper API | Free, zero-latency, sufficient for conversational input. Paid STT is unnecessary overhead. |
| TTS | OpenAI TTS API | ElevenLabs, Google Cloud TTS | Simpler API, cheaper at scale, streaming-capable. ElevenLabs adds WebSocket complexity for marginal quality gain. |
| TTS Fallback | Browser SpeechSynthesis | None | Free, universally available. No reason not to include as fallback. |
| Local Storage | idb | Dexie, localForage | idb is 1KB vs 45KB+ for Dexie. MenuVoice needs simple CRUD, not an ORM. localForage falls back to localStorage which has 5MB limit. |
| CSS | Tailwind CSS 4 | CSS Modules, styled-components | Utility-first is fast for an app where visual design is secondary to structure and accessibility. |

---

## Installation

```bash
# Core framework
npx create-next-app@latest menuvoice --typescript --tailwind --app --src-dir

# AI SDKs
npm install @anthropic-ai/sdk

# Local storage
npm install idb

# Dev dependencies
npm install -D @types/dom-speech-recognition
```

**Notes:**
- No ElevenLabs SDK needed -- OpenAI TTS is called via fetch to their REST endpoint.
- `@types/dom-speech-recognition` provides TypeScript types for the Web Speech API which is not in the default DOM lib.
- OpenAI SDK is NOT needed -- the TTS endpoint is simple enough to call with `fetch`. Avoids pulling in the large openai package.

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...      # Claude API for OCR + conversation
OPENAI_API_KEY=sk-...              # OpenAI TTS only
```

Only two API keys needed. Both stay server-side in Next.js Route Handlers -- never exposed to the client.

---

## Cost Estimation (Per User Session)

Assuming a typical session: 2 menu photos OCR'd, 10 conversational turns, 3 menu sections read aloud.

| Operation | Estimated Cost |
|-----------|---------------|
| Menu OCR (2 images, Sonnet) | ~$0.01-0.03 (vision input tokens are priced higher) |
| Conversation (10 turns, Sonnet) | ~$0.005-0.02 |
| TTS (approx 3000 characters) | ~$0.045 (at $15/1M chars) |
| STT (Web Speech API) | $0.00 |
| **Total per session** | **~$0.06-0.10** |

At 1000 sessions/month: approximately $60-100/month in API costs.

**Confidence:** LOW -- Pricing is from training data and may have changed. Anthropic's vision token pricing in particular should be verified.

---

## Sources

- MDN Web API: SpeechRecognition -- fetched 2026-03-29 (confirmed properties, limitations, Chrome server-based engine note)
- MDN Web API: SpeechSynthesis -- fetched 2026-03-29 (confirmed Baseline Widely Available since Sept 2018)
- GitHub: anthropics/anthropic-sdk-typescript -- fetched 2026-03-29 (confirmed MIT license, v0.80.0, Node 18+, 1.8k stars)
- Anthropic Vision docs, OpenAI TTS docs, ElevenLabs docs -- training data only (could not fetch, LOW confidence on specific numbers)
- idb vs Dexie comparison -- training data (MEDIUM confidence, both are stable mature libraries)
