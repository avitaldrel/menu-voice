# Phase 07: Polish & Frontend Refinement — Research

**Researched:** 2026-03-31
**Domain:** CSS design tokens, CSS transitions/animation, iOS Safari autoplay, voice command routing, accessibility polish, IndexedDB session tracking
**Confidence:** HIGH (most findings drawn from current codebase + Tailwind v4 official docs + MDN)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Shift to warmer, friendlier aesthetic — softer colors, warm neutrals, teal/sage accent color for primary actions and interactive elements
- **D-02:** Background changes from stark #fafafa to warm off-white (cream tone)
- **D-03:** Keep minimal text logo ("MenuVoice") — update colors to match new warm/teal palette
- **D-04:** One hero action per screen — each state has ONE dominant button (Scan, Mic, Retry) that's large and prominent; secondary actions are smaller and subdued
- **D-05:** Simple text blocks for transcript display — current user text + assistant text in a clean container, polished to match new palette
- **D-07:** Smooth fade/slide transitions between major states (welcome, processing, results, conversation) — 300-500ms CSS transitions
- **D-08:** Pulsing status messages during extraction ("Reading your menu...", "Finding categories...", "Almost done...") with smooth text transitions
- **D-09:** Auto-overview then listen after processing completes — current behavior, just smoother transition into conversation mode
- **D-10:** Fade out + listen for interrupts — TTS fades out over ~200ms, brief pause, then mic activates
- **D-11:** Fix welcome TTS not playing on first load (iOS Safari autoplay compliance issue)
- **D-12:** Add ability to scan a new menu from results state — "Scan new menu" option without requiring page refresh
- **D-13:** Make settings more discoverable — gear icon more visible, VoiceOver announces it clearly
- **D-14:** Improve retake flow clarity — clearer guidance messaging and smoother retake-to-results transition
- **D-15:** Allow reviewing extracted menu summary while in voice conversation mode — menu data stays accessible
- **D-16:** Both tutorial + contextual hints — brief first-time spoken walkthrough, plus occasional contextual hints during early conversations
- **D-17:** Voice-accessible settings — user can say "open settings" or "add allergy" during conversation to navigate without touching the screen
- **D-18:** Hints always available but rare — contextual hints appear occasionally even for experienced users, decreasing in frequency over time

### Claude's Discretion

- Menu summary visual display style (D-06) — pick what fits the voice-first context
- Exact teal/sage shade and warm off-white tone selection
- Transition easing curves and animation details
- Pulsing status message content and rotation timing
- Hint frequency algorithm (decreasing over sessions)
- How to visually indicate "Scan new menu" is available in results state

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 7 is a no-new-capabilities phase: every change is a refinement of existing code across Phases 1-6. The work falls into five areas: (1) color/palette redesign using Tailwind v4's CSS-first `@theme` system; (2) CSS state transition animations between app states; (3) fixing the iOS Safari welcome TTS autoplay bug; (4) routing voice commands ("open settings", "add allergy") through the existing `triggerResponse` / `SpeechManager` pipeline; and (5) hint frequency tracking via IndexedDB.

The codebase is well-structured for this phase. All state is managed through discriminated union reducers (`appReducer`, `voiceReducer`) already in place. Tailwind v4 is already installed; the project uses `@import "tailwindcss"` in `globals.css`, which means custom design tokens belong in `@theme` blocks in that same file — no separate config file needed. The iOS Safari autoplay bug is well-understood: `speakWelcome` currently runs TTSClient from a ScanButton tap (user gesture), which is correct, but the `handleStart` path for the welcome screen still falls back to raw `SpeechSynthesis`, bypassing the gesture chain for the first-load case.

**Primary recommendation:** Work in clearly bounded waves — color tokens first (zero behavior risk), then state transitions, then bug fixes (iOS TTS, scan-new-menu, settings discoverability), then voice commands and hint system last (highest complexity).

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 7 |
|-----------|-------------------|
| TTS output MUST use `<audio>` element, NOT browser SpeechSynthesis | D-10 fade-out must manipulate `audioElement.volume` or use GainNode, NOT add SpeechSynthesis calls; D-11 fix must preserve TTSClient usage |
| Voice loop uses strict state machine: `idle | listening | processing | speaking | error` | Voice command routing (D-17) must dispatch actions through voiceReducer — no ad-hoc state bypasses |
| Photo capture via `<input type="file" capture="environment">` | D-12 scan-new-menu uses existing ScanButton pattern — no camera API changes |
| Full menu JSON in system prompt | No change needed for polish phase |
| Streaming + sentence buffering for TTS latency reduction | D-10 fade-out must not break mid-sentence TTS; fade happens at audioElement level only |
| Allergy information ALWAYS includes safety disclaimer | No change to chat-prompt.ts allergy logic |

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| tailwindcss | ^4.x (installed) | CSS utility classes + `@theme` design tokens | All palette changes go in globals.css `@theme` |
| Next.js | 16.2.1 (installed) | App Router, SSR | No upgrade needed |
| React | 19.2.4 (installed) | UI rendering | useReducer/useState/useEffect patterns already established |
| idb | ^8.0.3 (installed) | IndexedDB wrapper | Extend settings store for session count tracking (D-18) |

### No New Dependencies Needed

All decisions in this phase are achievable with the existing stack. Specifically:

- **CSS transitions:** Tailwind v4 utility classes (`transition-opacity`, `duration-300`, `ease-in-out`) — no react-transition-group needed. The project's state machine pattern (enum status + conditional classes) is sufficient.
- **TTS fade-out:** Direct `audioElement.volume` manipulation in TTSClient.stop() — no Web Audio API GainNode needed for a simple 200ms fade at stop time.
- **Voice commands:** Extend existing `SpeechManager` transcript handling in `useVoiceLoop.ts` — no new library.
- **Hint frequency:** Extend existing `getProfile`/`saveProfile` pattern in indexeddb.ts — add a `sessionCount` field to the settings store.

### Version Verification

Confirmed from `package.json` in the project root. No npm lookups needed — all packages are installed.

---

## Architecture Patterns

### Pattern 1: Tailwind v4 Design Tokens via `@theme`

**What:** In Tailwind v4, there is no `tailwind.config.js`. Custom colors, spacing, and animation tokens live in `globals.css` inside an `@theme` block. These tokens automatically generate utility classes and are exposed as CSS variables.

**When to use:** All palette changes (D-01, D-02, D-03) go here. One edit, all utilities update.

**Implementation in globals.css:**
```css
@import "tailwindcss";

@theme {
  /* Warm off-white background (D-02) */
  --color-background: oklch(97% 0.015 85);
  /* Warm foreground */
  --color-foreground: oklch(20% 0.01 85);
  /* Teal/sage accent for primary actions (D-01) */
  --color-accent: oklch(55% 0.12 185);
  --color-accent-hover: oklch(48% 0.12 185);
  --color-accent-foreground: oklch(99% 0 0);
  /* Warm neutral for secondary actions */
  --color-muted: oklch(90% 0.01 85);
  --color-muted-foreground: oklch(50% 0.01 85);
}

:root {
  background: var(--color-background);
  color: var(--color-foreground);
}
```

After this, utility classes `bg-accent`, `text-accent`, `bg-muted`, etc. are available everywhere via Tailwind v4's `--color-*` namespace convention.

**OKLCH shade selection guidance (Claude's Discretion):**
- Warm off-white: `oklch(97% 0.015 85)` — cream/warm hue angle 85 (yellow-orange warmth), very low chroma
- Teal/sage: `oklch(55% 0.12 185)` — hue angle 185 (cyan-teal), moderate chroma, mid lightness
- Dark mode: wrap overrides in `@media (prefers-color-scheme: dark)` as a second `@theme` block scoped to `.dark`

**Source:** Tailwind CSS v4 official docs — https://tailwindcss.com/docs/theme

---

### Pattern 2: CSS State Transitions via Opacity Classes

**What:** Between app states (welcome → idle → processing → results), wrap the state's container in a div with `transition-opacity duration-300 ease-in-out` and toggle `opacity-0` / `opacity-100` based on a short mount delay.

**When to use:** D-07 smooth fade/slide transitions.

**Key constraint:** React unmounts components immediately on state change — a pure `opacity-0` on an unmounted element produces no animation. The established pattern (without adding react-transition-group) is to add a one-render delay using `useEffect` + `useState`:

```tsx
// Example: fade-in wrapper for any state panel
function FadeIn({ children, key }: { children: React.ReactNode; key: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Next-tick to allow DOM insertion before opacity transition
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div
      className={`transition-opacity duration-300 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}
```

For fade-OUT (before a component unmounts), the app state machine already knows the NEXT state. A short `setTimeout` delay of 200ms before dispatching the transition action allows the old component to fade out. This is the simplest approach compatible with the existing reducer pattern.

**prefers-reduced-motion:** All transition CSS must be wrapped:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```
Add this to `globals.css`. This satisfies WCAG 2.3.3. (HIGH confidence — W3C C39 technique)

---

### Pattern 3: Pulsing Status Messages (D-08)

**What:** During extraction (`processing` state), cycle through reassuring text messages with a fade-in/fade-out between them.

**Implementation:** `ProcessingState` component already accepts a `message` prop. Extend it with internal `useState` cycling over a `MESSAGES` array, using `setInterval` at ~4-second intervals. Add Tailwind `animate-pulse` or a custom CSS keyframe for the text transition.

```tsx
const PROCESSING_MESSAGES = [
  'Reading your menu...',
  'Finding categories...',
  'Almost done...',
  'Just a moment...',
];

// Inside ProcessingState, when isVisible:
useEffect(() => {
  if (!isVisible) return;
  let idx = 0;
  const id = setInterval(() => {
    idx = (idx + 1) % PROCESSING_MESSAGES.length;
    setCurrentMessage(PROCESSING_MESSAGES[idx]);
  }, 4000);
  return () => clearInterval(id);
}, [isVisible]);
```

The message cycling is purely visual — the ARIA live region (`role="status"`) in ProcessingState should only announce changes once, not every 4 seconds (avoid spammy screen reader). Keep the ARIA region showing the static message from `page.tsx`; only the visible display cycles.

---

### Pattern 4: TTS Fade-Out for Interrupts (D-10)

**What:** When the user taps to interrupt TTS, fade the audio out over ~200ms instead of stopping instantly.

**Implementation in TTSClient.stop():** The `audioElement` already exists. A simple volume ramp:

```typescript
// In TTSClient.stop() — replace instant pause with fade
stop(): void {
  const audio = this.audioElement;
  const startVolume = audio.volume;
  const steps = 10;
  const stepTime = 20; // 10 steps × 20ms = 200ms
  let step = 0;
  const fade = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fade);
      audio.pause();
      audio.volume = 1; // reset for next use
      // ... rest of existing cleanup
    }
  }, stepTime);
}
```

**iOS caveat:** iOS Safari DOES support `HTMLAudioElement.volume` in the browser (not WKWebView). The volume ramp works correctly on Safari iOS. (MEDIUM confidence — iOS native Safari confirmed to support volume property; WKWebView restriction does not apply to web apps)

**CLAUDE.md constraint:** Do NOT use SpeechSynthesis for the fade. The TTSClient already uses the `<audio>` element per the hard constraint.

---

### Pattern 5: Voice Command Routing (D-17)

**What:** When the user says "open settings" or "add allergy" during conversation, navigate to settings or open the allergy input without touching the screen.

**Implementation:** Extend the `triggerResponse` callback path in `useVoiceLoop.ts`. Before sending transcript to the chat API, check for navigation commands:

```typescript
const VOICE_COMMANDS: Array<{ pattern: RegExp; handler: () => void }> = [
  {
    pattern: /open\s+settings|go\s+to\s+settings|settings/i,
    handler: () => router.push('/settings'),
  },
  {
    pattern: /add\s+(allergy|allergen)|i.m\s+allergic|new\s+allergy/i,
    handler: () => router.push('/settings#allergies'),
  },
];

// In triggerResponse, before fetch:
for (const cmd of VOICE_COMMANDS) {
  if (userText && cmd.pattern.test(userText)) {
    cmd.handler();
    // Speak confirmation via TTS then return
    ttsClientRef.current?.queueText('Opening settings.');
    ttsClientRef.current?.flush();
    return;
  }
}
```

**Next.js App Router navigation:** Use `useRouter` from `next/navigation` — already available in client components. `router.push('/settings')` for settings, `router.push('/settings')` for allergy (settings page handles the section scroll).

**Constraint:** This check runs BEFORE the chat API call. It is a short-circuit, not a Claude API call, so it has zero latency. The command list should be narrow and unambiguous to avoid false positives during normal menu conversation.

---

### Pattern 6: Hint Frequency via IndexedDB Session Tracking (D-18)

**What:** Track session count in IndexedDB settings store. Use count to determine hint frequency — hints appear on session 1 (tutorial), then less often as sessions increase.

**Implementation:** Add `sessionCount` to the settings store in `indexeddb.ts`. Increment on app start each session.

```typescript
// In indexeddb.ts — extend settings operations
export async function getSessionCount(): Promise<number> {
  const db = await getDB();
  return (await db.get('settings', 'sessionCount')) ?? 0;
}

export async function incrementSessionCount(): Promise<number> {
  const db = await getDB();
  const current = (await db.get('settings', 'sessionCount')) ?? 0;
  const next = current + 1;
  await db.put('settings', next, 'sessionCount');
  return next;
}
```

**Hint frequency algorithm (Claude's discretion — suggested):**
- Session 1: full spoken tutorial walkthrough
- Sessions 2-5: occasional contextual hints (30% chance per turn, max 1 per session)
- Sessions 6-10: rare hints (10% chance per turn, max 1 per session)
- Sessions 11+: very rare (5% chance, max 1 per session)

The hint logic lives in `useVoiceLoop` — after the overview TTS plays, check session count and optionally append a hint to the first response. No system prompt changes needed.

---

### Pattern 7: Scan New Menu from Results State (D-12)

**What:** Allow user to start over with a new menu from the results state without a page refresh.

**Current state:** `appReducer` RESET action returns to `welcome`. Results state already has a ScanButton at the bottom of the page. The issue is discoverability and labeling.

**Fix:** In `page.tsx` results section, make the existing ScanButton more prominent and relabel it "Scan New Menu". Wiring is already correct — `extract` is called from the button. The voice loop should also accept "scan new menu" as a voice command (covered by D-17 voice command routing above).

The appState flow for "scan new menu" is: results → dispatch RESET → welcome. The `triggerOverview` call in the `useEffect([state.status])` fires again when the user returns to results after scanning a new menu, because `state.status` changes to `results` again.

---

### Anti-Patterns to Avoid

- **Adding react-transition-group:** Not needed. The existing state machine + `requestAnimationFrame` fade-in pattern is sufficient for 300-500ms transitions. Adding a new library for this simple use case increases bundle size unnecessarily.
- **Using SpeechSynthesis anywhere:** Hard constraint from CLAUDE.md. All TTS must flow through TTSClient → audio element.
- **Modifying voiceReducer transitions for voice commands:** Voice commands should NOT add new states to the voice state machine. Route them as short-circuit handlers in `useVoiceLoop` before the chat API call.
- **Cycling ARIA live regions for processing messages:** The visible status message can cycle; the ARIA live region should only announce once to avoid screen reader noise every 4 seconds.
- **Using JavaScript config for Tailwind:** Tailwind v4 is CSS-first. Do not create `tailwind.config.js` — all customization goes in `globals.css` `@theme` blocks.
- **Direct `body` background class in layout.tsx instead of CSS variable:** layout.tsx currently has `bg-white` hardcoded on body. This must change to use the CSS variable `bg-background` (Tailwind v4 auto-generates this from `--color-background` in `@theme`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design token color palette | A JS config or manual hex strings scattered in JSX | Tailwind v4 `@theme` CSS variables | Single source of truth; auto-generates utility classes |
| State transition animation | A custom animation library | `transition-opacity duration-300` + `requestAnimationFrame` mount pattern | Tailwind's built-in transition utilities are sufficient for fade in/out |
| Voice command parsing | An NLP library or intent classifier | Simple `RegExp` array with short-circuit in `useVoiceLoop` | Commands are a closed set of ~5 phrases; regex is instant and zero-dependency |
| Session count persistence | A new database or localStorage key | Extend existing IndexedDB `settings` store via `getDB()` | Already imported and tested in the codebase |
| TTS interrupt fade | A Web Audio API GainNode graph | `audioElement.volume` ramp via `setInterval` in TTSClient.stop() | Volume property works on iOS Safari browser; simpler and no AudioContext needed |

**Key insight:** Every problem in this phase has an established pattern already in the codebase. The task is applying those patterns consistently, not introducing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: iOS Safari Autoplay — Welcome TTS on First Load (D-11)

**What goes wrong:** `TTSClient.queueText()` + `flush()` called in `speakWelcome()` works correctly when chained to a user gesture (ScanButton tap). However, `handleStart` in `page.tsx` (the Welcome state "Start" button) makes a raw `fetch('/api/tts')` + `new Audio()` call that is NOT routed through `TTSClient`. If the user taps "Start" before ever tapping ScanButton, the welcome path bypasses the TTSClient's audio element, which has not yet been "unlocked" by the user gesture.

**Why it happens:** iOS Safari requires that the `HTMLAudioElement.play()` call be directly synchronous with a user gesture. Any `await` or microtask gap between the gesture handler and `play()` breaks the gesture chain. Fetching audio over the network (which is async) then calling `.play()` on the result violates this constraint.

**How to avoid:** Chain the audio element creation and `play()` call synchronously within the click handler. The pattern is: create the `Audio()` element BEFORE the `fetch`, set up `onended`, and call `play()` inside a `.then()` immediately after the blob URL is set — this works because the tap event is still considered "active" for a short window. However, the MORE reliable approach is to pre-unlock the TTSClient audio element on the very first user gesture (any tap), and then enqueue TTS normally. This is how `speakWelcome` via ScanButton already works — extend this same unlock pattern to `handleStart`.

**Warning signs:** TTS plays fine on Android Chrome / desktop, fails silently on iOS Safari first load.

**Fix approach:** In `handleStart`, instead of creating a new `Audio()`, call `speakWelcome()` (which uses TTSClient) right at the start of the click handler, synchronously before any `await`. Remove the inline fetch-to-new-Audio pattern from `handleStart`. The camera auto-open after TTS ends should chain via `onSpeakingEnd` callback in TTSClient options, not via `audio.onended` on a one-off Audio object.

---

### Pitfall 2: Tailwind v4 Body Background

**What goes wrong:** `layout.tsx` has `bg-white` hardcoded on the `<body>`. Adding `--color-background` to `@theme` creates the `bg-background` utility class, but the existing `bg-white` class wins due to specificity order.

**How to avoid:** Replace `bg-white text-black` on body in layout.tsx with `bg-background text-foreground`. These are the Tailwind v4 auto-generated utilities from the `@theme` variables.

---

### Pitfall 3: Transition Flicker on Fast State Changes

**What goes wrong:** If the user scans a menu and it fails quickly (error state), the fade-in animation for the error state starts, then `RETRY` is dispatched before the animation completes, creating a partial-fade artifact.

**How to avoid:** Keep transition durations at 200-300ms (not 500ms) for error/retake states. Only use longer durations for the welcome-to-results "success path." The `requestAnimationFrame`-based fade-in does not need cleanup on fast unmount because `cancelAnimationFrame` is returned from the effect.

---

### Pitfall 4: ARIA Live Regions and Transition Animations

**What goes wrong:** Animating an element that is also an ARIA live region can cause screen readers to miss announcements if the element is `opacity-0` during the announcement window.

**How to avoid:** Never animate the ARIA live region elements themselves (`AppStateAnnouncer`, `VoiceStateIndicator`, `ProcessingState`). These are already `sr-only` or always-in-DOM. Only animate the VISUAL content wrappers. Keep the ARIA infrastructure untouched.

---

### Pitfall 5: Voice Command False Positives

**What goes wrong:** A user asks "what are the settings for an outdoor table?" and the word "settings" triggers navigation to the settings page.

**How to avoid:** Make voice command regexps require specific phrases or combinations, not single words. For example, `/(open|go to|take me to)\s+settings/i` rather than `/settings/i`. The "add allergy" command is less ambiguous and can use a simpler pattern.

---

### Pitfall 6: DB Schema Migration for Session Count

**What goes wrong:** The IndexedDB `menuvoice` database is at version 1. Adding `sessionCount` to the settings object store does NOT require a version bump — `settings` is a key-value store and accepts any key. However, if a new object store is added, the version MUST be incremented.

**How to avoid:** Do NOT increment `DB_VERSION`. The `settings` object store already exists and supports arbitrary keys. `db.put('settings', count, 'sessionCount')` works without any migration.

---

## Code Examples

### Tailwind v4 `@theme` palette in globals.css (verified pattern)
```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  --color-background: oklch(97% 0.015 85);
  --color-foreground: oklch(22% 0.01 85);
  --color-accent: oklch(55% 0.12 185);
  --color-accent-hover: oklch(48% 0.12 185);
  --color-accent-foreground: oklch(99% 0 0);
  --color-muted: oklch(93% 0.01 85);
  --color-muted-foreground: oklch(50% 0.01 85);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

### Fade-in mount pattern for state panels
```tsx
// No external library needed — pure React + Tailwind
function FadePanel({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`transition-opacity duration-300 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}
```

### TTSClient volume fade-out (replace TTSClient.stop() internals)
```typescript
// In TTSClient — fade audio volume to 0 over 200ms before stopping
private fadeAndStop(onDone: () => void): void {
  const audio = this.audioElement;
  const startVol = audio.volume;
  if (startVol === 0 || !this.isPlaying) { onDone(); return; }
  const STEPS = 10;
  const STEP_MS = 20;
  let step = 0;
  const id = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / STEPS));
    if (step >= STEPS) { clearInterval(id); onDone(); }
  }, STEP_MS);
}
```

### Voice command short-circuit in useVoiceLoop (before chat fetch)
```typescript
// Pattern: checked synchronously before triggerResponse sends to API
const VOICE_NAV_COMMANDS = [
  { pattern: /(open|go\s+to|take\s+me\s+to)\s+settings/i, path: '/settings' },
  { pattern: /add\s+(allergy|allergen)|(i.m|i\s+am)\s+allergic/i, path: '/settings' },
];

// At start of triggerResponse callback, before fetch:
if (userText) {
  for (const cmd of VOICE_NAV_COMMANDS) {
    if (cmd.pattern.test(userText)) {
      router.push(cmd.path);
      ttsClientRef.current?.queueText('Opening settings.');
      ttsClientRef.current?.flush();
      return;
    }
  }
}
```

### IndexedDB session count (no schema migration needed)
```typescript
// In indexeddb.ts — uses existing 'settings' store, no DB_VERSION bump
export async function getAndIncrementSessionCount(): Promise<number> {
  const db = await getDB();
  const count: number = (await db.get('settings', 'sessionCount')) ?? 0;
  await db.put('settings', count + 1, 'sessionCount');
  return count + 1; // returns the NEW count
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on This Phase |
|--------------|------------------|--------------|----------------------|
| tailwind.config.js color objects | CSS `@theme` block with `--color-*` variables | Tailwind v4 (2025) | Palette changes go in globals.css — no JS config |
| `rgb()`/`hsl()` color values | `oklch()` color space in Tailwind default palette | Tailwind v4 (2025) | Use OKLCH for new custom colors for wider gamut consistency |
| react-transition-group for fades | Conditional classes + `requestAnimationFrame` mount pattern | React 18+ / Tailwind v4 | Simpler, no additional library |
| SpeechRecognition result → direct action | Result → pattern match → either nav command OR API call | Phase 7 | Voice commands are a filter layer, not a new state |

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies beyond the already-running project stack (Next.js dev server, OpenAI TTS API, Anthropic API). All tools are confirmed installed from phases 1-6.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --reporter=dot` |
| Full suite command | `npm test` |

### Existing Test Coverage

All core modules have existing test files. Phase 7 changes touch these areas:

| Area | Files Changed | Existing Test File | Test Action |
|------|--------------|-------------------|-------------|
| globals.css `@theme` palette | globals.css | None (CSS-only) | Visual review only |
| TTSClient.stop() fade | tts-client.ts | `src/lib/__tests__/tts-client.test.ts` | Extend with fade-stop test |
| useVoiceLoop voice commands | useVoiceLoop.ts | `src/hooks/__tests__/useVoiceLoop.test.ts` | Add command routing tests |
| indexeddb.ts session count | indexeddb.ts | `src/lib/__tests__/indexeddb-profile.test.ts` | Add sessionCount tests |
| ProcessingState messages | ProcessingState (component) | `src/components/__tests__/ProcessingState.test.tsx` | Add cycling message test |
| VoiceButton accent color | VoiceButton.tsx | `src/components/__tests__/VoiceButton.test.tsx` | Update class assertions |
| Header settings icon | Header.tsx | `src/app/__tests__/layout.test.tsx` | Check aria-label update |

### Sampling Rate
- **Per task commit:** `npm test` (full suite — fast at ~5s currently)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers all testable behaviors. CSS visual changes and iOS Safari autoplay behavior require manual device testing (cannot be automated in jsdom).

---

## Open Questions

1. **D-15: Menu summary access during conversation**
   - What we know: Results state renders `<MenuSummary>` and the voice interface together. The `MenuSummary` is already visible during conversation.
   - What's unclear: Does D-15 require a new interaction pattern (scroll-to, collapse/expand), or just ensuring the summary is visually present and not hidden? The CONTEXT.md says "menu data stays accessible" without specifying a UI widget.
   - Recommendation: Planner should treat D-15 as a visual scroll/layout fix — ensure `MenuSummary` is not scrolled out of view when `VoiceButton` and transcript are visible. A sticky or always-visible summary panel may be needed. This is low risk to implement.

2. **D-08 Pulsing messages — ARIA announcement frequency**
   - What we know: ProcessingState has `role="status"` (polite live region). Cycling messages every 4 seconds would announce to screen readers every 4 seconds.
   - What's unclear: Is that level of announcement acceptable for blind users, or is it annoying?
   - Recommendation: Keep ARIA live region static ("Reading your menu...") while only the visual text cycles. This avoids repetitive screen reader announcements during potentially 10-30 second extraction. The periodic TTS reminder in page.tsx (currently using SpeechSynthesis — a bug!) handles audio feedback separately.

3. **D-11 Processing state TTS reminder still uses SpeechSynthesis**
   - What we know: `page.tsx` lines 87-107 use `speechSynthesis.speak()` for the "Still reading your menu" periodic reminder — this violates the CLAUDE.md hard constraint.
   - Recommendation: This should be fixed in the same wave as D-11 welcome TTS fix. Replace with TTSClient usage, chained to a user gesture unlock pattern. Flag for planner as a bug fix, not just polish.

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 `@theme` documentation — https://tailwindcss.com/docs/theme
- Tailwind CSS v4 colors — https://tailwindcss.com/docs/colors
- MDN: prefers-reduced-motion — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- W3C WCAG 2.3.3 technique C39 — https://www.w3.org/WAI/WCAG21/Techniques/css/C39
- MDN: Web Speech API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

### Secondary (MEDIUM confidence)
- MDN: Autoplay guide for media — https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay (iOS autoplay behavior)
- Tailwind v4 custom color palette guide — https://tailkits.com/blog/tailwind-v4-custom-colors/ (verified against official Tailwind docs)
- iOS HTMLAudioElement volume control — confirmed volume property works in Safari browser (not WKWebView) via Apple Developer Forums thread https://developer.apple.com/forums/thread/82939

### Tertiary (LOW confidence — verify before implementing)
- Exact iOS Safari version behavior for `audioElement.volume` ramp: confirmed in principle but not tested against iOS 18/Safari 18. Manual device test recommended during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, confirmed from package.json
- Architecture patterns: HIGH — patterns derived from existing codebase + official Tailwind v4 docs
- iOS Safari autoplay fix: MEDIUM — behavior well-documented, but specific fix requires device validation
- Voice command routing: HIGH — pure JS pattern, no external API
- Hint frequency algorithm: HIGH — IndexedDB pattern already established in codebase
- Pitfalls: HIGH — most derived from reading existing code; iOS pitfall is MEDIUM (device-dependent)

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (Tailwind v4 and Next.js 16 are stable; iOS Safari behavior could shift with new OS releases)
