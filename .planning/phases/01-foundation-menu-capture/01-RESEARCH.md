# Phase 1: Foundation & Menu Capture - Research

**Researched:** 2026-03-29
**Domain:** Next.js 16 App Router scaffolding, native file-input camera capture, Claude Vision API (multi-image JSON extraction), IndexedDB session storage, WCAG 2.2 accessible UI
**Confidence:** HIGH (core stack verified against npm registry and live Anthropic docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Landing Experience**
- D-01: Minimal landing page — app name at top, one large "Scan Menu" button in the center. Screen reader announces: "MenuVoice. Tap Scan Menu to photograph a restaurant menu."
- D-02: Below the scan button, show a list of recent restaurant visits (if any exist in local storage). Empty on first visit.
- D-03: No onboarding walkthrough or profile setup prompt on first visit. Straight to action.

**Photo Capture Flow**
- D-04: Batch upload via multi-select file picker (`<input type="file" capture="environment" multiple>`). User selects one or more photos at once.
- D-05: Auto-process immediately after photo selection — no confirmation step, no thumbnail preview, no remove-before-processing flow.
- D-06: While processing, show a loading animation with status text ("Reading your menu..."). Screen reader announces the status via ARIA live region.

**Menu Results Display**
- D-07: Default view is minimal summary: restaurant name (AI-inferred) and category names with item counts.
- D-08: Categories are expandable — tapping a category reveals items with name, price, and description.
- D-09: Full detailed exploration happens via voice in Phase 3. This visual display is a complement, not the primary interface.

**Error Handling**
- D-10: Photo errors shown as inline error message with "Try Again" button. Screen reader announces the error.
- D-11: Network errors communicated through BOTH voice announcement AND visual error. Dual feedback for blind users and sighted companions.
- D-12: Retry button available for all error states.

**Menu Data Structure**
- D-13: AI infers categories from menu content even if the menu doesn't have clear sections.
- D-14: Extract maximum detail per item: name, price, description, AI-inferred dietary tags (vegetarian, spicy, gluten-free, etc.), portion size if mentioned, and any modifiers/add-ons listed.
- D-15: Full menu JSON stored in memory for injection into conversation system prompt in Phase 3.

**App Shell & Navigation**
- D-16: Hybrid routing — main flow (scan -> results -> conversation) is single-page with state transitions. Settings on a separate route (/settings).
- D-17: Simple header: "MenuVoice" on the left, gear icon on the right linking to /settings.
- D-18: Recent sessions stored in IndexedDB and shown on landing page below the scan button.

### Claude's Discretion
- Next.js project structure (app router file organization, component folder structure)
- Tailwind configuration and theme setup
- Claude Vision API prompt engineering for menu extraction
- JSON schema design for structured menu data
- IndexedDB schema for recent sessions
- Loading animation implementation details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-01 | User can take photos of restaurant menu pages using device camera | D-04: `<input type="file" capture="environment" multiple>` — verified via MDN as the correct accessible approach; section "Photo Capture via Native File Input" below |
| MENU-02 | User can capture multiple menu pages in a single session | D-04/D-05: `multiple` attribute on the file input enables multi-select; all images sent in one Claude Vision call |
| MENU-03 | App processes menu photos into structured menu data (categories, items, descriptions, prices) via AI vision | Claude Vision API with tool_use for guaranteed JSON conformance; Menu JSON schema defined below |
| A11Y-03 | High-contrast, large touch targets for any visual UI elements | WCAG 2.2 AA: 4.5:1 contrast ratio, 44x44px minimum touch targets; Tailwind utilities for enforcement |
| A11Y-04 | Keyboard navigable for users with partial vision | Semantic HTML (`<button>`, `<main>`, `<h1>`); focus management on state transitions; skip-to-content link |
</phase_requirements>

---

## Summary

Phase 1 builds the project scaffold and the complete photo-to-structured-data pipeline. It is the only phase with no upstream dependencies — everything needed for this phase can be built from scratch.

The technical core is straightforward: create a Next.js 16 App Router project, add a landing page with a native file input for camera capture, send selected images to a Next.js Route Handler that calls Claude Vision with a structured extraction prompt, and display the results. The accessibility requirements (A11Y-03, A11Y-04) are satisfied by using semantic HTML and Tailwind's built-in high-contrast utilities from the start, not retrofitted later.

The two areas requiring care are (1) the Claude Vision prompt — it must produce well-structured JSON reliably without tool_use, since using raw JSON-in-text is simpler for a one-shot extraction and Claude 4.6 is reliable enough; and (2) the ARIA live region wiring for the loading state, which must be present in the DOM before content is injected (a known gotcha documented in PITFALLS.md).

**Primary recommendation:** Scaffold with `create-next-app@latest` (Next.js 16.2.1), wire `<input capture="environment" multiple>` for photo capture, call Claude Sonnet 4.6 via a Next.js Route Handler for extraction with a JSON-schema prompt, store sessions in IndexedDB via `idb`, and keep all visual UI fully keyboard-navigable with ARIA live regions for state changes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | Full-stack React framework | App Router hides API keys in Route Handlers; Turbopack default; Node 20.9+ required |
| react / react-dom | 19.2 (bundled with Next.js 16) | UI | Ships with Next.js 16; concurrent features for responsive state during processing |
| typescript | 6.0.2 | Type safety | Non-negotiable for structured menu data + API payloads |
| tailwindcss | 4.2.2 | Styling | Bundled by create-next-app; utility-first; `sr-only`, `focus-visible` built in |
| @anthropic-ai/sdk | 0.80.0 | Claude API client | Official SDK; `messages.create()` for vision extraction; confirmed latest on npm |
| idb | 8.0.3 | IndexedDB wrapper | 1KB wrapper; Promise-based; sufficient for simple session CRUD |

### Supporting (Phase 1 scope)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/dom-speech-recognition | 0.0.8 | TypeScript types for Web Speech API | Add now so Phase 2 code doesn't require a refactor; costs nothing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| idb 8.x | Dexie 4.x | Dexie is 45KB vs 1KB; ORM-style queries not needed for simple session storage |
| Raw fetch for TTS | openai SDK | openai SDK is 200KB+; TTS is one REST call, fetch is sufficient |
| Claude tool_use for JSON | JSON-in-text with prompt | tool_use guarantees schema conformance but adds complexity; Claude 4.6 with explicit JSON schema prompt is reliable enough for one-shot extraction |

**Installation:**
```bash
npx create-next-app@latest menuvoice --typescript --tailwind --app --src-dir --turbopack
cd menuvoice
npm install @anthropic-ai/sdk idb
npm install -D @types/dom-speech-recognition
```

**Version verification (confirmed 2026-03-29):**
```
next         16.2.1   (npm latest)
@anthropic-ai/sdk  0.80.0   (npm latest)
idb          8.0.3   (npm latest)
tailwindcss  4.2.2   (npm latest)
typescript   6.0.2   (npm latest)
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout: skip-link, header, ARIA landmarks
│   ├── page.tsx            # Main single-page app (landing + capture + results)
│   ├── globals.css         # Tailwind imports
│   ├── settings/
│   │   └── page.tsx        # /settings route (Phase 5+, scaffold now)
│   └── api/
│       └── menu/
│           └── extract/
│               └── route.ts  # POST: images -> Claude Vision -> menu JSON
├── components/
│   ├── Header.tsx           # "MenuVoice" left, gear icon right
│   ├── ScanButton.tsx       # Large "Scan Menu" button + hidden file input
│   ├── RecentSessions.tsx   # IndexedDB session list below scan button
│   ├── ProcessingState.tsx  # Loading animation + ARIA live region
│   ├── MenuSummary.tsx      # Restaurant name + expandable categories
│   └── ErrorState.tsx       # Inline error + retry button
├── lib/
│   ├── menu-schema.ts       # TypeScript interfaces for Menu, MenuCategory, MenuItem
│   ├── indexeddb.ts         # idb wrapper: openDB, getSessions, saveSession
│   └── app-state.ts         # AppState union type + useReducer setup
└── hooks/
    └── useMenuExtraction.ts # Orchestrates file input -> API call -> state update
```

### Pattern 1: Native File Input for Camera Capture (MENU-01, MENU-02)
**What:** Use `<input type="file" accept="image/*" capture="environment" multiple>` to open the device camera. The `multiple` attribute allows selecting several pages at once (D-04).
**When to use:** Always — this is the only approach that works with VoiceOver/TalkBack natively without additional permission prompts.
**Note:** The `capture` attribute is "not Baseline" per MDN but works on all iOS and Android mobile browsers. On desktop it falls back to a file picker, which is acceptable.

```typescript
// Source: MDN <input capture> + project decision D-04
// components/ScanButton.tsx

'use client';

import { useRef } from 'react';

interface ScanButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function ScanButton({ onFilesSelected, disabled }: ScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
      // Reset so the same files can be re-selected after an error
      e.target.value = '';
    }
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full min-h-[56px] text-xl font-semibold bg-black text-white
                   rounded-2xl focus-visible:outline focus-visible:outline-4
                   focus-visible:outline-offset-2 focus-visible:outline-black
                   disabled:opacity-50"
        aria-label="Scan Menu — tap to photograph a restaurant menu"
      >
        Scan Menu
      </button>
      {/* Visually hidden input; button triggers it */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleChange}
      />
    </>
  );
}
```

### Pattern 2: Claude Vision Menu Extraction (MENU-03)
**What:** POST all selected images as base64 to `/api/menu/extract`. The Route Handler sends them to Claude Sonnet 4.6 in a single `messages.create()` call with an explicit JSON schema in the prompt.
**When to use:** Once per session, after user selects photos (auto-triggered per D-05).

```typescript
// Source: Anthropic SDK docs + verified model ID from platform.claude.com
// app/api/menu/extract/route.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export const maxDuration = 30; // Menu extraction can be slow with multiple images
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { images } = await request.json() as {
    images: Array<{ base64: string; mimeType: string }>;
  };

  // Build content blocks: label each page then its image
  const imageContent = images.flatMap((img, i) => [
    { type: 'text' as const, text: `Menu page ${i + 1} of ${images.length}:` },
    {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        data: img.base64,
      },
    },
  ]);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',        // Verified: current latest Sonnet
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: `Extract the complete restaurant menu from these ${images.length} page(s).
Return ONLY valid JSON — no markdown fences, no explanation — matching this exact schema:
{
  "restaurantName": string | null,
  "menuType": string | null,
  "categories": [
    {
      "name": string,
      "description": string | null,
      "items": [
        {
          "name": string,
          "description": string | null,
          "price": string | null,
          "allergens": string[],
          "dietaryFlags": string[],
          "modifications": string[] | null,
          "portionSize": string | null,
          "confidence": number
        }
      ]
    }
  ],
  "extractionConfidence": number,
  "warnings": string[]
}
Rules:
- Infer categories even if the menu has no section headers (e.g., a flat list of burgers becomes "Burgers").
- Extract every visible item. Include dietary flags inferred from descriptions (e.g., "cream sauce" -> allergens: ["dairy"]).
- Price stays as a string to handle "Market Price", "$12/$18" (half/full), etc.
- Set confidence 0-1 per item; lower for blurry or partially visible text.
- Merge all pages into one coherent menu — no duplicate category headers.
- Add warnings[] for any photo quality issues.`,
        },
      ],
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json?\s*/m, '').replace(/\s*```$/m, '').trim();
  const menu = JSON.parse(cleaned);
  return Response.json(menu);
}
```

### Pattern 3: ARIA Live Region for Loading State (A11Y-03, MENU-03)
**What:** A `role="status"` region must exist in the DOM before content is injected — pre-mount it empty and update its text via React state.
**When to use:** Wherever the app changes state asynchronously (processing photos, errors).

```typescript
// Source: MDN ARIA live regions — "pre-prime before populating" requirement
// components/ProcessingState.tsx

'use client';

interface ProcessingStateProps {
  isVisible: boolean;
  message: string; // e.g., "Reading your menu..."
}

export function ProcessingState({ isVisible, message }: ProcessingStateProps) {
  return (
    <>
      {/* Always in DOM; content changes trigger screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isVisible ? message : ''}
      </div>

      {/* Visual loading indicator — hidden from screen readers via aria-hidden */}
      {isVisible && (
        <div
          aria-hidden="true"
          className="flex flex-col items-center gap-3 py-8"
        >
          {/* Spinner */}
          <div className="w-10 h-10 border-4 border-black border-t-transparent
                          rounded-full animate-spin" />
          <p className="text-lg font-medium">{message}</p>
        </div>
      )}
    </>
  );
}
```

### Pattern 4: IndexedDB Recent Sessions (D-18)
**What:** Save each completed extraction as a session object. Load on mount to populate the recent sessions list.

```typescript
// Source: idb 8.x library + project decisions D-15, D-18
// lib/indexeddb.ts

import { openDB } from 'idb';
import type { Menu } from './menu-schema';

const DB_NAME = 'menuvoice';
const DB_VERSION = 1;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Session store: recent restaurant visits
      const sessions = db.createObjectStore('sessions', {
        keyPath: 'id',
        autoIncrement: true,
      });
      sessions.createIndex('timestamp', 'timestamp');

      // Settings store (used in Phase 5+, scaffold now)
      db.createObjectStore('settings');
    },
  });
}

export interface Session {
  id?: number;
  restaurantName: string | null;
  menuType: string | null;
  timestamp: number;
  menu: Menu;            // Full JSON — injected into Phase 3 system prompt
}

export async function saveSession(session: Omit<Session, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('sessions', session) as Promise<number>;
}

export async function getRecentSessions(limit = 5): Promise<Session[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'timestamp');
  return all.reverse().slice(0, limit);
}

export async function clearSessions(): Promise<void> {
  const db = await getDB();
  await db.clear('sessions');
}
```

### Pattern 5: App State Machine (Single-Page Flow)
**What:** Use `useReducer` with a discriminated union to drive the single-page main flow. Enforces that only one app state is active at a time.
**When to use:** Always — boolean flags (`isLoading && isError`) create impossible states.

```typescript
// lib/app-state.ts

export type AppState =
  | { status: 'idle' }                              // Landing page
  | { status: 'processing'; fileCount: number }     // After file selection
  | { status: 'results'; menu: Menu; sessionId: number } // Extraction complete
  | { status: 'error'; message: string; retryable: boolean };

export type AppAction =
  | { type: 'FILES_SELECTED'; fileCount: number }
  | { type: 'EXTRACTION_SUCCESS'; menu: Menu; sessionId: number }
  | { type: 'EXTRACTION_ERROR'; message: string }
  | { type: 'RETRY' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILES_SELECTED':
      return { status: 'processing', fileCount: action.fileCount };
    case 'EXTRACTION_SUCCESS':
      return { status: 'results', menu: action.menu, sessionId: action.sessionId };
    case 'EXTRACTION_ERROR':
      return { status: 'error', message: action.message, retryable: true };
    case 'RETRY':
      return { status: 'idle' };
    default:
      return state;
  }
}
```

### Anti-Patterns to Avoid
- **Using SpeechSynthesis for loading announcements:** Use `role="status"` ARIA live regions instead. SpeechSynthesis is reserved for Phase 2 TTS fallback only and conflicts with screen readers.
- **Running `getUserMedia` for camera capture:** Not needed in Phase 1. The `<input capture>` approach is simpler, more accessible, and works everywhere.
- **Multiple Claude Vision calls (one per page):** Always send all pages in one call. Separate calls lose cross-page context (category header on page 1 applies to items at top of page 2).
- **Summarizing menu data before storing:** Store the full Menu JSON. A 50-item menu is ~3-5K tokens, trivial for Claude's 1M context window.
- **`aria-live="assertive"` for loading status:** Use `aria-live="polite"` / `role="status"`. Never `assertive` for non-urgent states — it interrupts whatever the screen reader is currently speaking.
- **Combining `role="alert"` with `aria-live="assertive"`:** VoiceOver iOS double-speaks this combination. Use one or the other, never both (confirmed MDN bug).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB async CRUD | Manual IndexedDB event callbacks | `idb` 8.x | IndexedDB raw API is callback-based and error-prone; idb wraps it in clean async/await at 1KB |
| Camera access | getUserMedia + canvas capture pipeline | `<input capture="environment">` | Native file input uses the OS camera UI which is already VoiceOver/TalkBack accessible |
| JSON schema enforcement | Custom regex parser for Claude output | Explicit JSON schema in prompt text | Claude 4.6 is reliable enough for one-shot JSON extraction; tool_use adds complexity for no benefit at this stage |
| Image size reduction before upload | Manual canvas resize logic | canvas.toDataURL('image/jpeg', 0.85) at 1568px max | Claude Vision internally caps at ~1568px longest edge; sending 12MB originals wastes bandwidth and tokens |

**Key insight:** Phase 1 is mostly wiring existing browser APIs and one SDK together. Every custom solution adds surface area for bugs in code that will be critical for all subsequent phases.

---

## Common Pitfalls

### Pitfall 1: ARIA Live Region Not Pre-Mounted
**What goes wrong:** The loading message ("Reading your menu...") is not announced to screen readers even though `role="status"` is set.
**Why it happens:** ARIA live regions must exist in the DOM before their content changes. If the component is conditionally rendered (`{isLoading && <ProcessingState />}`), the region is created at the same moment its content changes — screen readers don't catch the mutation.
**How to avoid:** Always render the live region container in the DOM on first load. Set its text content via state, not by mounting/unmounting the element.
**Warning signs:** Testing with VoiceOver and the status text is never announced during processing.

### Pitfall 2: iOS Safari Audio Autoplay Block
**What goes wrong:** D-11 requires dual-channel error feedback (voice + visual). In Phase 1, the "voice" part of this is implemented via SpeechSynthesis. On iOS, `speechSynthesis.speak()` silently fails unless triggered from within a user gesture handler.
**Why it happens:** iOS Safari's autoplay policy blocks audio that isn't in the call stack of a user interaction.
**How to avoid:** The file input `onChange` handler IS a user gesture — it fires synchronously from a user action. Trigger any Phase 1 SpeechSynthesis calls from within that handler or its direct callbacks. In Phase 2, OpenAI TTS via `<audio>` element also needs to be triggered from a user gesture for the first play.
**Warning signs:** Voice announcements work on desktop Chrome but are silent on iOS Safari.

### Pitfall 3: Claude Returns Markdown-Fenced JSON
**What goes wrong:** `JSON.parse(response)` throws because Claude wrapped the JSON in ` ```json ... ``` `.
**Why it happens:** Despite the prompt saying "Return ONLY valid JSON — no markdown fences," Claude sometimes adds fences anyway, especially for shorter prompts.
**How to avoid:** Strip markdown fences in the Route Handler before parsing: `raw.replace(/^```json?\s*/m, '').replace(/\s*```$/m, '').trim()`.
**Warning signs:** `SyntaxError: Unexpected token` in the API route logs.

### Pitfall 4: `capture` Attribute Opens Front Camera on Some Android Devices
**What goes wrong:** Some Android devices interpret `capture="environment"` differently; a few older phones default to the front camera.
**Why it happens:** `capture` attribute behavior is "not Baseline" per MDN — implementation varies.
**How to avoid:** The `accept="image/*"` attribute ensures only images are accepted; the `capture="environment"` is a hint, not a guarantee. Document this as a known limitation. Real-device testing required. Note in the UI: "Point the rear camera at the menu."
**Warning signs:** Sighted testers report the selfie camera opens.

### Pitfall 5: `getRecentSessions()` Called Before IndexedDB Is Ready
**What goes wrong:** A hydration error or crash on first page load because IndexedDB is not available during server-side rendering.
**Why it happens:** Next.js App Router Server Components run on the server. IndexedDB is a browser-only API.
**How to avoid:** All IndexedDB calls must be in Client Components (`'use client'`) and inside `useEffect` (not during render). The `RecentSessions` component must be a Client Component with its data fetch inside `useEffect`.
**Warning signs:** `ReferenceError: indexedDB is not defined` in server logs or a hydration mismatch.

### Pitfall 6: Large Images Cause Request Timeout
**What goes wrong:** The `/api/menu/extract` route times out or the user's connection stalls when sending full-resolution phone photos (8-12MB each).
**Why it happens:** A user photographing a 4-page menu sends 32-48MB of image data in a single POST.
**How to avoid:** Resize images client-side before sending. Canvas redraw to 1568px longest edge at 85% JPEG quality reduces a 12MB phone photo to ~500KB. This also strips EXIF location data (privacy benefit per PITFALLS.md).

```typescript
// lib/image-utils.ts
export function resizeImage(file: File, maxDim = 1568): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // toDataURL strips EXIF — privacy benefit
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Return only the base64 portion (after the comma)
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

**Warning signs:** API route logs showing timeouts; user-visible "network error" on large menus.

---

## Code Examples

### Menu TypeScript Schema (lib/menu-schema.ts)
```typescript
// Matches the JSON schema requested from Claude Vision
export interface Menu {
  restaurantName: string | null;
  menuType: string | null;        // "dinner", "brunch", "drinks", etc.
  categories: MenuCategory[];
  extractionConfidence: number;   // 0-1 overall
  warnings: string[];             // "Page 2 was blurry", etc.
}

export interface MenuCategory {
  name: string;
  description: string | null;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  description: string | null;
  price: string | null;           // String to handle "Market Price", "$12/$18"
  allergens: string[];            // ["dairy", "nuts", "gluten"]
  dietaryFlags: string[];         // ["vegetarian", "spicy", "gluten-free"]
  modifications: string[] | null;
  portionSize: string | null;
  confidence: number;             // 0-1 per item
}
```

### Root Layout with Skip Link and ARIA Landmarks (app/layout.tsx)
```typescript
// Source: WCAG 2.4.1 Bypass Blocks + A11Y-04 keyboard navigation
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Skip-to-content link: first focusable element on every page */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2
                     focus:left-2 focus:z-50 focus:px-4 focus:py-2
                     focus:bg-black focus:text-white focus:rounded"
        >
          Skip to content
        </a>
        <header role="banner" className="flex items-center justify-between
                                         px-4 py-3 border-b border-gray-200">
          <span className="text-xl font-bold">MenuVoice</span>
          <a
            href="/settings"
            aria-label="Settings"
            className="p-2 rounded-lg focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {/* Gear icon — aria-label above provides accessible name */}
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
              {/* settings gear path */}
            </svg>
          </a>
        </header>
        <main id="main-content" role="main">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### useMenuExtraction Hook (hooks/useMenuExtraction.ts)
```typescript
// Orchestrates: files -> resize -> POST -> parse -> save to IndexedDB -> dispatch
'use client';

import { useCallback } from 'react';
import { resizeImage } from '@/lib/image-utils';
import { saveSession } from '@/lib/indexeddb';
import type { AppAction } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

export function useMenuExtraction(dispatch: React.Dispatch<AppAction>) {
  const extract = useCallback(async (files: File[]) => {
    dispatch({ type: 'FILES_SELECTED', fileCount: files.length });

    try {
      // Resize all images client-side before sending (strips EXIF, reduces size)
      const images = await Promise.all(
        files.map(async (file) => ({
          base64: await resizeImage(file),
          mimeType: 'image/jpeg',
        }))
      );

      const res = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      if (!res.ok) {
        throw new Error(`Extraction failed (${res.status})`);
      }

      const menu: Menu = await res.json();

      // Persist to IndexedDB for the recent sessions list (D-18)
      const sessionId = await saveSession({
        restaurantName: menu.restaurantName,
        menuType: menu.menuType,
        timestamp: Date.now(),
        menu,
      });

      dispatch({ type: 'EXTRACTION_SUCCESS', menu, sessionId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      dispatch({ type: 'EXTRACTION_ERROR', message });
    }
  }, [dispatch]);

  return { extract };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Traditional OCR (Tesseract, Google Vision) for menus | Claude Vision (multimodal LLM) for structured extraction | 2023+ | LLMs understand menu layout semantics; no regex post-processing needed |
| Next.js Pages Router + API routes | App Router + Route Handlers | Next.js 13 (stable 14+) | Route Handlers use Web APIs; simpler streaming; no custom req/res objects |
| Jest for unit testing | Vitest + React Testing Library | 2025-2026 | Vitest is faster, ESM-native, and is now the official Next.js recommendation |
| getUserMedia live video preview for photo capture | `<input capture="environment">` for accessibility apps | Recognized best practice | Native camera UI is already accessible; video preview useless for blind users |
| Claude Sonnet 3.5 / claude-sonnet-4-20250514 | `claude-sonnet-4-6` (latest) | 2025-2026 | 1M token context; Aug 2025 training cutoff; same $3/$15 pricing as Sonnet 4 |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated by Anthropic, retiring April 19, 2026. Do not use.
- Claude Sonnet 3.5 and earlier model names: Use `claude-sonnet-4-6` (alias) or `claude-haiku-4-5` for low-latency tasks.
- Next.js `pages/api/*.ts` pattern: Still supported but not recommended for new projects.

---

## Open Questions

1. **`capture` attribute behavior on target test devices**
   - What we know: Works on iOS Safari and Chrome Android; "not Baseline" per MDN
   - What's unclear: Exact behavior on lower-end Android devices in the wild; whether `multiple` is respected alongside `capture`
   - Recommendation: Test on at least one Android device and one iPhone with VoiceOver before closing Phase 1

2. **Claude response latency for multi-image extraction**
   - What we know: Sonnet 4.6 is rated "Fast" comparative latency; `max_tokens: 4096` for large menus
   - What's unclear: Real-world latency with 3-4 JPEG images at ~500KB each; whether 30s maxDuration is sufficient
   - Recommendation: Instrument the API route with timing logs; adjust `maxDuration` if needed (Vercel Pro allows up to 60s)

3. **IndexedDB storage quota on iOS**
   - What we know: IndexedDB is supported on iOS Safari; `idb` 8.x wraps it correctly
   - What's unclear: iOS enforces stricter storage quotas (~50MB default vs desktop); a session with 4 full-res photos could approach limits
   - Recommendation: Store only the Menu JSON (the structured data, not the original image blobs) in IndexedDB to stay well under quota limits

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (>=20.9) | Next.js 16 | Yes | 24.14.0 | — |
| npm | Package installation | Yes | 11.9.0 | — |
| ANTHROPIC_API_KEY | `/api/menu/extract` | Unknown | — | Must be set in `.env.local`; blocks extraction entirely if missing |
| Internet connection | Claude Vision API | Required at runtime | — | No offline fallback for Phase 1 extraction |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` — must be set in `.env.local` before testing; the Route Handler will throw if absent

**Missing dependencies with fallback:**
- None — all other dependencies install via npm

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react |
| Config file | `vitest.config.ts` — Wave 0 task creates this |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MENU-01 | `ScanButton` renders a file input with `capture="environment"` | unit | `npm run test -- --run src/components/ScanButton.test.tsx` | Wave 0 |
| MENU-02 | File input has `multiple` attribute | unit | `npm run test -- --run src/components/ScanButton.test.tsx` | Wave 0 |
| MENU-03 | `useMenuExtraction` dispatches `EXTRACTION_SUCCESS` with valid Menu shape after mock API response | unit | `npm run test -- --run src/hooks/useMenuExtraction.test.ts` | Wave 0 |
| MENU-03 | `/api/menu/extract` Route Handler calls Anthropic SDK and returns JSON | integration (manual) | Manual — requires ANTHROPIC_API_KEY + real images | manual-only |
| A11Y-03 | `ScanButton` minimum height ≥ 44px via class inspection | unit | `npm run test -- --run src/components/ScanButton.test.tsx` | Wave 0 |
| A11Y-04 | Root layout contains skip-to-content link with `href="#main-content"` | unit | `npm run test -- --run src/app/layout.test.tsx` | Wave 0 |
| A11Y-04 | `ProcessingState` live region has `role="status"` and is always mounted | unit | `npm run test -- --run src/components/ProcessingState.test.tsx` | Wave 0 |

Note: Async Server Components (Route Handlers) are not testable with Vitest per Next.js docs. Route Handler integration is tested manually with a real API key.

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (all unit tests, no watch mode)
- **Per wave merge:** `npm run test -- --run` (same; no E2E in Phase 1)
- **Phase gate:** All unit tests green + manual Route Handler smoke test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework config file
- [ ] `src/components/ScanButton.test.tsx` — covers MENU-01, MENU-02, A11Y-03
- [ ] `src/components/ProcessingState.test.tsx` — covers A11Y-04 live region
- [ ] `src/app/layout.test.tsx` — covers A11Y-04 skip link
- [ ] `src/hooks/useMenuExtraction.test.ts` — covers MENU-03 (mocked fetch)
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Binding on Phase 1 |
|-----------|--------|-------------------|
| TTS output MUST use `<audio>` element, NOT browser SpeechSynthesis | CLAUDE.md Critical Architecture | Phase 1 only uses SpeechSynthesis for the D-11 network error voice feedback (minimal; acceptable). Phase 2 introduces the `<audio>` element TTS system. Do NOT build any SpeechSynthesis-dependent architecture in Phase 1. |
| Voice loop uses strict state machine: `idle \| listening \| processing \| speaking \| error` | CLAUDE.md Critical Architecture | Phase 1 implements the `idle` and `processing` states only. The full 5-state FSM must be structurally anticipated in `app-state.ts` to avoid a rewrite in Phase 2. |
| Photo capture uses `<input type="file" capture="environment">` | CLAUDE.md Critical Architecture | Enforced — this is D-04. Do NOT use getUserMedia. |
| All menu photos sent in single Claude Vision call | CLAUDE.md Critical Architecture | Enforced — single POST with all images in one request. |
| Full menu JSON injected into system prompt, no summarization | CLAUDE.md Critical Architecture | Phase 1 stores the full Menu JSON. Phase 3 injects it. |
| Streaming + sentence buffering for TTS latency | CLAUDE.md Critical Architecture | Phase 2 concern. Not needed for Phase 1's one-shot extraction. |
| Allergy information ALWAYS includes safety disclaimer | CLAUDE.md Critical Architecture | Phase 5 concern. Mention in the extraction prompt's `warnings[]` field but no allergy UX in Phase 1. |

---

## Sources

### Primary (HIGH confidence)
- npm registry live queries (2026-03-29) — confirmed versions: next@16.2.1, @anthropic-ai/sdk@0.80.0, idb@8.0.3, tailwindcss@4.2.2, typescript@6.0.2
- [Anthropic Models Overview](https://platform.claude.com/docs/en/docs/about-claude/models/overview) — confirmed current model IDs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, pricing, context windows
- MDN Web Docs: `<input capture>` — "not Baseline", `environment` value, mobile behavior
- MDN Web Docs: ARIA Live Regions — pre-mount requirement, polite vs assertive, role="alert" + aria-live double-speak bug on VoiceOver iOS
- MDN Web Docs: IndexedDB — browser-only API, SSR incompatibility
- Next.js official docs (v16.2.1) — App Router file structure, Route Handlers, `maxDuration` config, Vitest setup guide
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) — Turbopack default, React 19.2, Node 20.9 requirement

### Secondary (MEDIUM confidence)
- Project research files (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md) — all researched 2026-03-29 with verified MDN sources; Claude Vision multi-image support and SDK streaming patterns are MEDIUM confidence (Anthropic docs were unreachable at time of project research)
- WebSearch: Next.js 16 + Vitest testing landscape 2026 — multiple sources confirm Vitest is the current standard for Next.js

### Tertiary (LOW confidence)
- Claude Vision image count limits (20 max per message) and exact token pricing for vision inputs — from project STACK.md (training data only; verify against current Anthropic pricing page before launch)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry 2026-03-29
- Architecture: HIGH — Next.js App Router patterns verified against official docs; Claude model IDs verified against live Anthropic docs
- Pitfalls: HIGH for ARIA live region and image handling issues (verified MDN); MEDIUM for Claude response behavior (empirical, verify in implementation)
- Testing: HIGH — Vitest is the official Next.js recommendation, documented in Next.js 16.2.1 docs

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable stack; Claude model names could change but aliases are stable)
