# Phase 5: Allergy & Preference System - Research

**Researched:** 2026-03-30
**Domain:** IndexedDB profile persistence, Claude structured markers, system prompt injection, React settings UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Profile Storage & Access**
- Voice-first allergy management: say "I'm allergic to shellfish" in conversation and it's captured automatically (ALLERGY-02). Settings page for explicit setup/review.
- Profile stored in existing IndexedDB `settings` store: `{ allergies: string[], preferences: string[], dislikes: string[] }`
- Profile injected into system prompt alongside menu JSON — Claude sees allergies on every turn
- Allergy captures require confirmation: Claude confirms before saving — "I'll remember that you're allergic to shellfish. Is that right?"

**In-Conversation Allergy Capture**
- Claude outputs a structured marker (e.g., `[ALLERGY:shellfish]`) when user mentions allergy — client parses and saves to IndexedDB
- Natural conversation triggers: "I'm allergic to X", "I can't eat X", "I don't like Y" — Claude recognizes and confirms
- Claude distinguishes allergies from dislikes by asking: "Is that an allergy or just a preference?" — different safety level for each
- If profile has allergies, Claude mentions them in the overview: "I have your shellfish and peanut allergies noted"

**Proactive Warning & Safety Disclaimer**
- Allergen warnings delivered every time a menu item with a matching allergen is discussed — proactive, before user asks (ALLERGY-03)
- Warning format: "Heads up — the alfredo has dairy. You could ask if they can make it dairy-free." Combines warning + modification suggestion (ALLERGY-04)
- Safety disclaimer spoken once per session, after the first allergen warning: "Just so you know, allergy information is based on the menu text — always confirm with your server" (ALLERGY-05)
- Uncertain allergen info: if menu item has no allergen data but description hints at allergens (e.g., "cream sauce"), Claude flags it: "This might contain dairy based on the description — worth checking with your server"

### Claude's Discretion
- Exact structured marker format for allergy capture
- Settings page UI design and layout
- Profile migration strategy if DB version needs incrementing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALLERGY-01 | User can create a profile with allergies and food preferences stored locally | IndexedDB `settings` store with `put('settings', profile, 'profile')` key; settings page CRUD |
| ALLERGY-02 | User can mention allergies/dislikes during conversation and app captures them on the fly | `[ALLERGY:X]` / `[DISLIKE:X]` marker parsing in streaming response reader; confirmation loop via system prompt rule |
| ALLERGY-03 | App proactively warns when a mentioned menu item contains a known allergen or disliked ingredient | Allergens already in `MenuItem.allergens[]`; injecting profile into system prompt enables Claude to cross-reference |
| ALLERGY-04 | App suggests asking the server if a dish can be made without the allergen/disliked ingredient | System prompt rule; `MenuItem.modifications[]` already extracted provides factual basis |
| ALLERGY-05 | App includes spoken safety disclaimer that allergy info is based on menu text and should be confirmed with staff | System prompt rule: once-per-session disclaimer after first allergen warning; Claude tracks via session context |
| ALLERGY-06 | Profile persists across sessions via local browser storage (IndexedDB) | Existing `settings` object store in `menuvoice` DB version 1; no DB version bump needed |
</phase_requirements>

---

## Summary

Phase 5 builds on a well-established foundation. The IndexedDB `settings` store already exists in DB version 1 — it was created in Phase 1 but never had read/write functions added. The `MenuItem.allergens[]` field is already populated by the Phase 1 menu extraction. `buildSystemPrompt()` in `chat-prompt.ts` is already the single injection point for all Claude instructions. The three new capabilities — profile persistence, in-conversation capture, proactive warnings — all layer onto existing infrastructure without requiring new DB stores, new API routes, or new voice loop mechanics.

The most architecturally novel part of this phase is the structured-marker extraction pattern: Claude emits `[ALLERGY:shellfish]` inline in its streaming text response, and the client parses these markers out while also speaking the surrounding natural text. This requires a post-stream processing step that strips markers from the spoken text and persists extracted items to IndexedDB. This is new ground in this codebase — all prior streaming consumers passed chunks directly to TTS without any post-processing.

The settings page is a placeholder that needs a full React component implementation with IndexedDB reads/writes. It is the only new page UI in this phase. All existing tests pass (189 tests) and the test infrastructure (Vitest + jsdom, `vi.hoisted` pattern, `vi.stubGlobal` for fetch) is mature and consistent.

**Primary recommendation:** Build four focused units — (1) IndexedDB profile CRUD functions, (2) `buildSystemPrompt()` extension accepting optional profile, (3) marker extraction utility that strips `[ALLERGY:X]`/`[DISLIKE:X]` from response text and saves to DB, (4) Settings page React component. Wire them together through `useVoiceLoop` and `/api/chat`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb | 8.0.3 | IndexedDB wrapper | Already in project; settings store already created |
| @anthropic-ai/sdk | ^0.80.0 | Claude streaming | Already in project; all streaming infra built |
| React 19 | 19.2.4 | Settings page UI | Already in project; existing pattern for page.tsx |
| Next.js App Router | 16.2.1 | Routing + page | Already in project; settings/page.tsx placeholder exists |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest + jsdom | ^4.1.2 | Unit tests | All new modules need tests; existing test infra |
| @testing-library/react | ^16.3.2 | Component tests | Settings page tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `[ALLERGY:X]` inline marker | Tool use / structured output | Tool use requires non-streaming response; inline markers work in streaming context at cost of client-side parsing |
| IndexedDB direct | localStorage | localStorage string serialization is fragile; idb already present and used |
| Single profile key | Per-allergy keys | Single `profile` key is simpler; no partial-update advantage worth the complexity |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── indexeddb.ts          # Add: getProfile(), saveProfile(), updateProfile()
│   ├── chat-prompt.ts        # Modify: buildSystemPrompt(menu, profile?)
│   ├── allergy-marker.ts     # New: parseAllergyMarkers(), stripMarkers()
│   └── menu-schema.ts        # No change — allergens[] already there
├── hooks/
│   └── useVoiceLoop.ts       # Modify: load profile, pass to API, post-process markers
├── app/
│   ├── api/chat/route.ts     # Modify: accept profile in request body
│   └── settings/page.tsx     # Replace placeholder with full React component
└── test/
    └── setup.ts              # No change needed
```

### Pattern 1: IndexedDB Key/Value for Profile
**What:** The `settings` store was created without a keyPath — it is a key/value store where the key is passed explicitly. Use the string key `'profile'` for the user profile object.
**When to use:** Any profile read or write.
**Example:**
```typescript
// src/lib/indexeddb.ts additions
export interface UserProfile {
  allergies: string[];
  preferences: string[];
  dislikes: string[];
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDB();
  return (await db.get('settings', 'profile')) ?? null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('settings', profile, 'profile');
}
```
Note: `db.get('settings', 'profile')` returns `undefined` (not `null`) when missing — coerce with `?? null` for clean typing.

### Pattern 2: System Prompt Profile Injection
**What:** `buildSystemPrompt(menu, profile?)` accepts an optional `UserProfile`. When present, it appends allergy rules after the existing RESPONSE RULES block.
**When to use:** Every chat API call.
**Example:**
```typescript
// src/lib/chat-prompt.ts — updated signature
export function buildSystemPrompt(menu: Menu, profile?: UserProfile | null): string {
  const menuJson = JSON.stringify(menu, null, 2);
  const allergySection = buildAllergySection(profile);
  return `...existing prompt...${allergySection}`;
}

function buildAllergySection(profile?: UserProfile | null): string {
  if (!profile || (profile.allergies.length === 0 && profile.dislikes.length === 0)) {
    return '';
  }
  const lines: string[] = ['\nALLERGY & PREFERENCE PROFILE:'];
  if (profile.allergies.length > 0) {
    lines.push(`- Allergies (safety-critical): ${profile.allergies.join(', ')}`);
  }
  if (profile.dislikes.length > 0) {
    lines.push(`- Dislikes (preference only): ${profile.dislikes.join(', ')}`);
  }
  return '\n' + lines.join('\n');
}
```

### Pattern 3: Inline Structured Marker Extraction
**What:** Claude emits `[ALLERGY:shellfish]` or `[DISLIKE:nuts]` inline in its response text. Client strips these from the spoken text and saves extracted items to IndexedDB.
**When to use:** After the full streaming response is assembled in `triggerResponse()`.
**Example:**
```typescript
// src/lib/allergy-marker.ts
const ALLERGY_MARKER = /\[ALLERGY:([^\]]+)\]/gi;
const DISLIKE_MARKER = /\[DISLIKE:([^\]]+)\]/gi;
const PREFERENCE_MARKER = /\[PREFERENCE:([^\]]+)\]/gi;

export interface ExtractedMarkers {
  allergies: string[];
  dislikes: string[];
  preferences: string[];
}

export function parseAllergyMarkers(text: string): ExtractedMarkers {
  const allergies: string[] = [];
  const dislikes: string[] = [];
  const preferences: string[] = [];
  let match;
  while ((match = ALLERGY_MARKER.exec(text)) !== null) allergies.push(match[1].toLowerCase());
  while ((match = DISLIKE_MARKER.exec(text)) !== null) dislikes.push(match[1].toLowerCase());
  while ((match = PREFERENCE_MARKER.exec(text)) !== null) preferences.push(match[1].toLowerCase());
  return { allergies, dislikes, preferences };
}

export function stripMarkers(text: string): string {
  return text.replace(ALLERGY_MARKER, '').replace(DISLIKE_MARKER, '').replace(PREFERENCE_MARKER, '').trim();
}
```
Important: regex objects with `/g` flag are stateful — reset `lastIndex` or recreate them per call. Use fresh regex literals inside the function or reset `lastIndex = 0` before each `exec` loop.

### Pattern 4: Profile Loading in useVoiceLoop
**What:** Profile loaded once on mount via `useEffect`, stored in a ref. Passed to `triggerResponse()` on every fetch call.
**When to use:** Hook initialization and after any profile save.
**Example:**
```typescript
// Inside useVoiceLoop
const profileRef = useRef<UserProfile | null>(null);

// Load on mount
useEffect(() => {
  getProfile().then((p) => { profileRef.current = p; });
}, []);

// After marker extraction saves new items, reload profile
const reloadProfile = useCallback(async () => {
  profileRef.current = await getProfile();
}, []);
```

### Pattern 5: Marker Processing After Stream Completion
**What:** After `ttsClientRef.current?.flush()` and before storing the assistant message, extract markers from `fullResponse`, strip them for display, and merge into profile.
**When to use:** In `triggerResponse()` after the streaming loop completes.
**Example:**
```typescript
// In triggerResponse(), after stream loop:
const { allergies, dislikes, preferences } = parseAllergyMarkers(fullResponse);
const spokenText = stripMarkers(fullResponse);

if (allergies.length > 0 || dislikes.length > 0 || preferences.length > 0) {
  const existing = profileRef.current ?? { allergies: [], preferences: [], dislikes: [] };
  const updated: UserProfile = {
    allergies: [...new Set([...existing.allergies, ...allergies])],
    preferences: [...new Set([...existing.preferences, ...preferences])],
    dislikes: [...new Set([...existing.dislikes, ...dislikes])],
  };
  await saveProfile(updated);
  profileRef.current = updated;
}

// Store spokenText (markers stripped) in conversation history
// Pass spokenText to display, not fullResponse
```

### Pattern 6: /api/chat Route Extension
**What:** Accept `profile` in the request body alongside `messages` and `menu`. Pass to `buildSystemPrompt()`.
**When to use:** Every POST to `/api/chat`.
**Example:**
```typescript
// src/app/api/chat/route.ts
let body: { messages: ChatMessage[]; menu: Menu; profile?: UserProfile | null };
// ...
const { messages, menu, profile } = body;
const systemPrompt = buildSystemPrompt(menu, profile);
```

### Anti-Patterns to Avoid
- **Parsing markers from streaming chunks:** Markers may arrive split across chunk boundaries. Always parse from `fullResponse` (full assembled text) after the stream loop completes, not from individual chunks.
- **Sending markers to TTS:** Strip markers BEFORE passing text to TTS and before storing in `conversationMessages`. Claude should never speak `[ALLERGY:shellfish]` aloud.
- **Bumping DB version for the settings store:** The `settings` store already exists in DB version 1. No migration needed. Adding `get`/`put` functions to the existing store does not require a version bump.
- **Re-creating profile state in React:** Profile lives in `profileRef` inside `useVoiceLoop`. Settings page reads/writes via IndexedDB functions directly — no prop drilling needed.
- **Global regex with `/g` flag reused across calls:** `/g` flag makes regex stateful (`lastIndex` carries over). Always use fresh regex instances or reset `lastIndex = 0` before each use.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB transactions | Manual IDBRequest event handlers | `idb` (already installed) | idb wraps all IDBRequest callbacks in Promises; manual handling is error-prone and verbose |
| Deduplication of allergies on save | Custom array diffing | `Set` spread: `[...new Set([...existing, ...new])]` | Single line; no library needed |
| Profile schema validation | Zod/Yup schema | TypeScript interface + defensive defaults | Profile is a simple flat object; runtime validation would be over-engineering for local data |

**Key insight:** The `settings` store was designed for this exact use case in Phase 1. The entire infrastructure exists; this phase adds the data layer functions and wires them into existing hooks.

---

## Common Pitfalls

### Pitfall 1: Markers Arriving Split Across Streaming Chunks
**What goes wrong:** A chunk arrives as `...I'll note [ALLERGY:shell` and the next chunk is `fish] for you`. Parsing the first chunk alone yields no match. Parsing the second chunk alone yields no match. The allergy is never captured.
**Why it happens:** The streaming API delivers arbitrary byte boundaries, not semantic boundaries.
**How to avoid:** Always parse markers from `fullResponse` — the complete assembled string — after the stream loop finishes and before calling `flush()`.
**Warning signs:** Intermittent allergy capture failure (depends on response length and server chunking behavior).

### Pitfall 2: Spoken Text Contains Raw Markers
**What goes wrong:** TTS speaks "[ALLERGY:shellfish]" aloud, which sounds jarring and breaks immersion for a blind user.
**Why it happens:** `fullResponse` is passed to `ttsClientRef.current?.queueText(chunk)` during streaming — the chunks arrive before the full response is assembled. Markers in mid-stream chunks go directly to TTS.
**How to avoid:** There are two approaches:
  - Option A: Strip markers before sending each chunk to TTS. This requires a stateful buffer since markers can be split across chunks (see Pitfall 1).
  - Option B (recommended): Let TTS handle chunks as-is during streaming, then at flush time, speak a corrected final version only if markers were detected. This is simpler but introduces a "re-speak" edge case.
  - Cleanest solution: Emit markers at the END of the response (after all natural text), making it easy to strip the trailing markers before TTS flush.
**Warning signs:** User hears "[ALLERGY:" spoken in Claude's voice.

### Pitfall 3: idb `get()` Returns `undefined` Not `null`
**What goes wrong:** `const profile = await db.get('settings', 'profile')` returns `undefined` on first use (no profile saved yet). TypeScript types this as `UserProfile | undefined`, not `UserProfile | null`. Code written expecting `null` will fail the `=== null` check.
**Why it happens:** idb preserves IndexedDB's native behavior where missing keys return `undefined`.
**How to avoid:** Use `?? null` or `?? defaultProfile` when reading: `(await db.get('settings', 'profile')) ?? null`.
**Warning signs:** Profile appears to exist when it doesn't; allergy rules fire on empty profile.

### Pitfall 4: Settings Page Has No `'use client'` Directive
**What goes wrong:** IndexedDB is a browser API. Calling `getProfile()` in a Server Component causes a runtime error ("window is not defined").
**Why it happens:** Next.js App Router renders pages as Server Components by default.
**How to avoid:** Add `'use client'` at the top of `src/app/settings/page.tsx` (or create a client sub-component for the form). All IndexedDB access must be inside `useEffect` or event handlers, not at render time.
**Warning signs:** Build succeeds but page crashes with ReferenceError at runtime.

### Pitfall 5: System Prompt Rules Conflict on Safety Disclaimer Timing
**What goes wrong:** The safety disclaimer is added on every allergen warning instead of once per session.
**Why it happens:** Claude has no persistent memory of whether it already spoke the disclaimer in the current session. Without an explicit rule, it may repeat it.
**How to avoid:** Add explicit system prompt rule: "Speak the safety disclaimer exactly once per conversation — after the first allergen warning you give. Do not repeat it on subsequent allergen warnings in the same session." Claude's conversation history (which is passed on every turn) lets it track this.
**Warning signs:** User hears the disclaimer on every menu item discussed.

### Pitfall 6: DB Version Bump Needed for Schema Change
**What goes wrong:** If a future decision adds a new object store or index, incrementing `DB_VERSION` without an upgrade handler wipes the existing stores on some browsers.
**Why it happens:** IndexedDB `versionchange` events require careful handling of both old and new stores.
**How to avoid:** For this phase, no version bump is needed. The `settings` store already exists. Adding `get`/`put` functions is purely a code change. If a version bump is ever needed, always handle all previous stores in the `upgrade` callback.
**Warning signs:** All saved sessions disappear after a page reload.

---

## Code Examples

### Settings Store Read/Write (idb key/value pattern)
```typescript
// Source: idb docs + existing indexeddb.ts pattern in codebase
const db = await openDB('menuvoice', 1, { /* existing upgrade handler */ });

// Write (key/value store — key passed as third arg since no keyPath)
await db.put('settings', { allergies: ['dairy'], preferences: [], dislikes: [] }, 'profile');

// Read
const profile = await db.get('settings', 'profile'); // returns undefined if not set
```

### System Prompt Test Pattern (keyword assertion)
```typescript
// Source: existing chat-prompt.test.ts pattern in codebase
it('includes allergy rules when profile has allergies', () => {
  const profile = { allergies: ['dairy', 'nuts'], preferences: [], dislikes: [] };
  const prompt = buildSystemPrompt(testMenu, profile);
  expect(prompt).toContain('dairy');
  expect(prompt).toContain('nuts');
  expect(prompt).toContain('confirm with your server');
});
```

### Marker Regex with Global Flag (safe pattern)
```typescript
// Recreate regex each call to avoid stateful lastIndex
export function parseAllergyMarkers(text: string): ExtractedMarkers {
  const allergyRe = /\[ALLERGY:([^\]]+)\]/gi;
  const dislikeRe = /\[DISLIKE:([^\]]+)\]/gi;
  // ... exec loop
}
```

### useVoiceLoop Profile Loading
```typescript
// Inside useVoiceLoop — load on mount, reload after capture
useEffect(() => {
  getProfile().then((p) => { profileRef.current = p; });
}, []); // empty deps — fires once on mount
```

### /api/chat Route Body Type Extension
```typescript
// Before: { messages: ChatMessage[]; menu: Menu }
// After:
let body: { messages: ChatMessage[]; menu: Menu; profile?: UserProfile | null };
const { messages, menu, profile } = body;
const systemPrompt = buildSystemPrompt(menu, profile);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use / function calling for structured output | Inline text markers parsed client-side | This phase — streaming constraint | Avoids non-streaming API; markers are simpler to test |
| Separate localStorage for simple prefs | IndexedDB for all local storage | Phase 1 decision | Consistent storage layer; already implemented |

**Deprecated/outdated:**
- `localStorage` for profile: rejected in Phase 1 in favor of idb for consistency. Do not introduce it now.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond already-installed packages — IndexedDB is browser-native and mocked in jsdom for tests; no new CLI tools or services required).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALLERGY-01 | `getProfile()` returns null when no profile saved | unit | `npm test -- --reporter=verbose src/lib/__tests__/indexeddb.test.ts` | ❌ Wave 0 |
| ALLERGY-01 | `saveProfile()` persists profile to IndexedDB settings store | unit | `npm test -- --reporter=verbose src/lib/__tests__/indexeddb.test.ts` | ❌ Wave 0 |
| ALLERGY-01 | Settings page renders with loaded profile data | unit | `npm test -- --reporter=verbose src/app/settings/__tests__/page.test.tsx` | ❌ Wave 0 |
| ALLERGY-02 | `parseAllergyMarkers()` extracts `[ALLERGY:X]` from text | unit | `npm test -- --reporter=verbose src/lib/__tests__/allergy-marker.test.ts` | ❌ Wave 0 |
| ALLERGY-02 | `stripMarkers()` removes markers from spoken text | unit | `npm test -- --reporter=verbose src/lib/__tests__/allergy-marker.test.ts` | ❌ Wave 0 |
| ALLERGY-02 | `[DISLIKE:X]` markers are also extracted and stripped | unit | `npm test -- --reporter=verbose src/lib/__tests__/allergy-marker.test.ts` | ❌ Wave 0 |
| ALLERGY-03 | System prompt includes allergen warning rule when profile has allergies | unit | `npm test -- --reporter=verbose src/lib/__tests__/chat-prompt.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-04 | System prompt includes modification suggestion rule | unit | `npm test -- --reporter=verbose src/lib/__tests__/chat-prompt.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-05 | System prompt includes once-per-session safety disclaimer rule | unit | `npm test -- --reporter=verbose src/lib/__tests__/chat-prompt.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-05 | Disclaimer text contains "confirm with your server" or similar | unit | `npm test -- --reporter=verbose src/lib/__tests__/chat-prompt.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-06 | Profile survives re-calling `getDB()` (persistence across calls) | unit | `npm test -- --reporter=verbose src/lib/__tests__/indexeddb.test.ts` | ❌ Wave 0 |
| ALLERGY-02 | `useVoiceLoop` calls `saveProfile` when markers detected in response | unit | `npm test -- --reporter=verbose src/hooks/__tests__/useVoiceLoop.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-02 | `useVoiceLoop` strips markers before storing in conversationMessages | unit | `npm test -- --reporter=verbose src/hooks/__tests__/useVoiceLoop.test.ts` | ✅ (file exists, new tests needed) |
| ALLERGY-01 | `/api/chat` route accepts `profile` in request body | unit | `npm test -- --reporter=verbose src/app/api/chat/__tests__/route.test.ts` | ✅ (file exists, new tests needed) |

### Sampling Rate
- **Per task commit:** `npm test -- --reporter=verbose`
- **Per wave merge:** `npm test -- --reporter=verbose`
- **Phase gate:** Full suite green (all 189 existing + new tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/indexeddb.test.ts` — covers ALLERGY-01, ALLERGY-06 (profile CRUD)
- [ ] `src/lib/__tests__/allergy-marker.test.ts` — covers ALLERGY-02 (marker parsing and stripping)
- [ ] `src/app/settings/__tests__/page.test.tsx` — covers ALLERGY-01 settings page render

Note: idb requires a fake IndexedDB in jsdom. Use `fake-indexeddb` package or the `idb-keyval` pattern of calling `openDB` in each test. The existing codebase has no idb tests — `fake-indexeddb` will need to be added as a dev dependency for the indexeddb test file.

---

## Open Questions

1. **Marker placement in Claude responses — end vs. inline**
   - What we know: Markers split across streaming chunks cause parsing failures if parsed per-chunk. Parsing full assembled text avoids this.
   - What's unclear: Should system prompt instruct Claude to place markers at the END of the full response (after natural text), or inline where the mention occurs?
   - Recommendation: Instruct Claude to place markers at the END of each response that contains a capture. This makes `stripMarkers()` a simple trailing-truncation and avoids any mid-sentence weirdness in the spoken text.

2. **fake-indexeddb for jsdom tests**
   - What we know: jsdom does not implement IndexedDB. Existing tests mock higher-level abstractions (e.g., mock the whole `indexeddb.ts` module). New indexeddb.test.ts needs an actual IndexedDB implementation.
   - What's unclear: Whether to use `fake-indexeddb` npm package or mock the idb functions at the module level.
   - Recommendation: Install `fake-indexeddb` as a dev dependency and configure it in `src/test/setup.ts`. This allows testing the actual `getProfile`/`saveProfile` functions against real idb logic. See: https://github.com/dumbmatter/fakeIndexedDB

3. **Profile update conflict on concurrent sessions**
   - What we know: v1 is single-tab, single-session.
   - What's unclear: If user opens two tabs simultaneously and captures allergies in both, which write wins?
   - Recommendation: Not a concern for v1. Document as known limitation. idb's last-write-wins semantics are acceptable here.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/lib/indexeddb.ts`, `src/lib/chat-prompt.ts`, `src/lib/menu-schema.ts`, `src/app/api/chat/route.ts`, `src/hooks/useVoiceLoop.ts`, `src/app/settings/page.tsx` — all read directly
- `node_modules/idb/build/entry.d.ts` — idb 8.0.3 type definitions confirming `get(store, key)` and `put(store, value, key)` signatures
- `package.json` — confirmed all dependencies; no new packages needed (except `fake-indexeddb` for tests)
- Existing test suite — 189 passing tests, all patterns confirmed via code inspection

### Secondary (MEDIUM confidence)
- `fake-indexeddb` package — recommended for jsdom IndexedDB testing; widely used pattern in idb ecosystem. URL: https://github.com/dumbmatter/fakeIndexedDB

### Tertiary (LOW confidence)
- None — all findings based on direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; versions confirmed from package.json
- Architecture: HIGH — all integration points identified from direct code inspection; no speculative patterns
- Pitfalls: HIGH — pitfalls derived from actual code behavior (regex stateful flag, idb undefined return, Next.js SSR) confirmed from existing codebase patterns
- Test gaps: HIGH — existing test files confirmed present; wave 0 gaps are new files only

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack, no fast-moving dependencies)
