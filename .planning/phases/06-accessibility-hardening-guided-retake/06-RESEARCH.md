# Phase 6: Accessibility Hardening & Guided Retake - Research

**Researched:** 2026-03-30
**Domain:** ARIA live regions, VoiceOver iOS Safari, guided retake UX, Next.js 16 route announcer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- All app state transitions need ARIA announcements: menu loaded, extraction started/complete, error occurred, listening started/stopped, speaking started, settings saved (A11Y-02). Audit all existing components for correct aria-live, role, and announce timing; fix any wrong or missing.
- Use Next.js route change detection + aria-live region in layout for page transitions; VoiceOver needs explicit announcement.
- Existing `<audio>` element approach per CLAUDE.md already avoids VoiceOver/TTS overlap — verify on iOS Safari; add short delay before ARIA announces after TTS ends.
- Detect unreadable photos via `extractionConfidence` from Claude Vision + `warnings[]` array — low confidence (<0.3) or warnings trigger retake guidance.
- Specific spoken advice via TTS: "The photo is too dark — try moving closer to a light source and retake" using warning text from extraction.
- Auto-prompt for retake: if quality is low, speak guidance and re-present capture button; user can retake or proceed with partial data.
- Unlimited retake attempts — user decides when to stop. After 2 low-quality attempts, offer "Would you like to proceed with what I have?"
- Welcome message on first load: "Welcome to MenuVoice. Tap anywhere to start, then photograph your menu." Focus lands on scan button.
- Settings page: standard form navigation with VoiceOver — already implemented in Phase 5 with aria-labels and descriptive buttons.
- Add "Skip to main content" link — standard a11y pattern, lightweight. (NOTE: Already present in layout.tsx — verify it works on VoiceOver iOS.)
- Test and fix iOS Safari-specific quirks: autoplay policy for TTS, getUserMedia for mic, input[capture] for camera. Document workarounds.

### Claude's Discretion

- Exact ARIA role and aria-live attribute choices per component.
- Welcome message exact wording.
- iOS Safari workaround implementations.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| A11Y-01 | All functionality accessible via voice alone — no visual interaction required | Welcome message, focus management, VoiceOver-compatible photo capture, guided retake via TTS |
| A11Y-02 | ARIA live regions announce app state changes to screen readers | Comprehensive audit of all app state transitions; new route announcer; ProcessingState/VoiceStateIndicator patterns already correct |
| MENU-04 | App detects when a photo is unreadable and voice-guides user to retake it | `extractionConfidence < 0.3` or non-empty `warnings[]` triggers retake flow; TTS guidance + re-present ScanButton |
</phase_requirements>

---

## Summary

Phase 6 finishes the accessibility story: a blind user must be able to complete the full MenuVoice flow — open app, photograph menu, explore items, get allergy warnings, decide on order — without any sighted assistance. Five concrete areas require work.

First, the existing ARIA live region coverage is mostly correct but incomplete. `ProcessingState` (role=status, always-in-DOM) and `VoiceStateIndicator` (role=status, always-in-DOM) are correct patterns. `ErrorState` uses role=alert correctly. What is missing: (1) an announcement when extraction completes and the results view appears, (2) a route change announcer for the settings page navigation, and (3) a welcome/onboarding announcement on first load so the user knows where they are.

Second, Next.js 16 ships with a built-in `next-route-announcer` that uses role=alert + aria-live=assertive. It announces by reading document.title, then h1, then pathname. This is present automatically — the task is to verify it works with VoiceOver iOS and ensure each page has a unique descriptive `<title>` tag.

Third, the guided retake flow is purely new logic. `useMenuExtraction` currently dispatches `EXTRACTION_SUCCESS` or `EXTRACTION_ERROR`. It must be extended to detect low-quality results (`extractionConfidence < 0.3` or `warnings.length > 0`) and dispatch a new app state that triggers TTS guidance and re-presents the capture button. After 2 failed attempts, offer to proceed anyway.

Fourth, iOS Safari has specific quirks for this app: (a) AudioContext must be resumed inside a user gesture — the existing `thinking-chime.ts` already handles this lazily, and TTS `<audio>` element playback may need a user gesture chain; (b) getUserMedia re-prompts on every page reload in Safari — already mitigated by the existing MicPermissionPrompt; (c) `input[type=file][capture=environment]` works on iOS Safari but the button must be tapped (not programmatically triggered) — already correct in ScanButton.tsx.

Fifth, the welcome message needs to be spoken via TTS on first load, not just rendered as sr-only h1. The h1 is already there but silent unless VoiceOver focus lands on it. Adding a TTS announcement that fires once on mount (inside a user gesture via the existing voice loop or a standalone useEffect + TTS call) is the right approach.

**Primary recommendation:** Extend `app-state.ts` with a `retake` state, add a `RetakeGuidance` component with always-in-DOM ARIA live region, add the welcome TTS on mount, verify Next.js route announcer page titles, and fix the one missing ARIA announcement (extraction complete).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / Next.js | 19.2.4 / 16.2.1 | Framework in use | Locked; already scaffolded |
| Vitest + React Testing Library | ^4.1.2 | Unit tests | Already in use; jsdom environment |
| @testing-library/user-event | (in use) | Simulating user interactions in tests | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | — | All a11y work is native HTML + ARIA attributes | No new npm deps for this phase |

**No new dependencies needed.** All accessibility features are implemented using native browser APIs (ARIA attributes, focus management, `<audio>` element) already present in the project.

---

## Architecture Patterns

### Existing Correct Patterns (keep as-is)

**Always-in-DOM live regions:** The established project pattern is to render ARIA live region containers unconditionally in the DOM and change their text content, never conditionally mount/unmount them. This is correct per spec and VoiceOver iOS behavior.

```tsx
// Source: ProcessingState.tsx — correct always-in-DOM pattern
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {isVisible ? message : ''}
</div>
```

**role=alert without aria-live=assertive:** `ErrorState.tsx` correctly uses only `role="alert"` (which implies assertive). Adding explicit `aria-live="assertive"` causes double-speak on VoiceOver iOS. Do not add it.

**sr-only live regions:** Use Tailwind `sr-only` class for live region containers that have no visual equivalent. Always have the container in the DOM before populating it.

### Pattern 1: Extraction Complete Announcement

The app transitions from `processing` to `results` but has no ARIA announcement for this. Add an always-in-DOM live region in `page.tsx` or a dedicated `AppStateAnnouncer` component:

```tsx
// New: AppStateAnnouncer — always in DOM, announces app-level state transitions
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {state.status === 'results'
    ? `Menu loaded. ${state.menu.restaurantName ?? 'Restaurant menu'} is ready.`
    : state.status === 'processing'
    ? `Reading your menu, ${state.fileCount} photo${state.fileCount === 1 ? '' : 's'}.`
    : ''}
</div>
```

This is separate from `ProcessingState` (which announces the start) — this announces completion.

### Pattern 2: Guided Retake App State

Extend `AppState` with a `retake` variant and `AppAction` with `EXTRACTION_LOW_QUALITY` and `RETAKE_CONFIRM`:

```typescript
// Extend app-state.ts
export type AppState =
  | { status: 'idle' }
  | { status: 'processing'; fileCount: number }
  | { status: 'results'; menu: Menu; sessionId: number }
  | { status: 'retake'; menu: Menu; sessionId: number; attemptCount: number; guidance: string }
  | { status: 'error'; message: string; retryable: boolean };

export type AppAction =
  // ... existing ...
  | { type: 'EXTRACTION_LOW_QUALITY'; menu: Menu; sessionId: number; guidance: string; attemptCount: number }
  | { type: 'PROCEED_ANYWAY' }  // from retake state -> results
  | { type: 'RETRY_CAPTURE' };  // from retake state -> idle
```

The `retake` state holds the partial menu so the user can choose to proceed anyway.

### Pattern 3: Guided Retake Detection Logic (useMenuExtraction)

After successful extraction, check quality before dispatching `EXTRACTION_SUCCESS`:

```typescript
// In useMenuExtraction.ts — after receiving menu from API
const isLowQuality = menu.extractionConfidence < 0.3 || menu.warnings.length > 0;

if (isLowQuality) {
  // Build spoken guidance from warnings
  const guidanceText = menu.warnings.length > 0
    ? `The photo quality was low. ${menu.warnings[0]} Try retaking for better results.`
    : 'The photo was difficult to read. Try retaking in better lighting.';

  // Get current attempt count from state (need to thread it through)
  dispatch({
    type: 'EXTRACTION_LOW_QUALITY',
    menu,
    sessionId,
    guidance: guidanceText,
    attemptCount: 1,  // tracked in retake state
  });
} else {
  dispatch({ type: 'EXTRACTION_SUCCESS', menu, sessionId });
}
```

The attempt count is carried in the `retake` state and incremented on each `EXTRACTION_LOW_QUALITY` dispatch. After `attemptCount >= 2`, the retake UI offers "Proceed with what I have."

### Pattern 4: RetakeGuidance Component

A component that renders in the `retake` app state. It has an always-in-DOM live region (announces the guidance text when state enters `retake`), plus the ScanButton for retake and an optional "Proceed anyway" button:

```tsx
// RetakeGuidance.tsx
interface RetakeGuidanceProps {
  guidance: string;
  attemptCount: number;
  onRetake: (files: File[]) => void;
  onProceed: () => void;
}

export function RetakeGuidance({ guidance, attemptCount, onRetake, onProceed }: RetakeGuidanceProps) {
  return (
    <>
      {/* Always-in-DOM live region — content change triggers announcement */}
      <div role="alert" aria-atomic="true" className="sr-only">
        {guidance}
      </div>
      {/* Visual guidance + retake button */}
      <div className="flex flex-col gap-4 py-6">
        <p className="text-base text-yellow-800 bg-yellow-50 rounded-lg p-4">{guidance}</p>
        <ScanButton onFilesSelected={onRetake} />
        {attemptCount >= 2 && (
          <button
            onClick={onProceed}
            className="min-h-[48px] px-6 text-lg font-semibold bg-gray-700 text-white rounded-2xl ..."
            aria-label="Proceed with partial menu data"
          >
            Proceed with what I have
          </button>
        )}
      </div>
    </>
  );
}
```

Note: use `role="alert"` (not `role="status"`) for retake guidance — it is urgent and needs immediate announcement on iOS VoiceOver which requires assertive live regions.

### Pattern 5: Welcome TTS on First Load

The existing sr-only h1 announces via VoiceOver when focus lands on it, but a blind user starting the app needs an immediate spoken welcome. Trigger a single TTS call on mount via `useVoiceLoop` or a dedicated `useWelcomeMessage` hook:

```typescript
// In page.tsx — fire once on mount, before voice loop starts
useEffect(() => {
  // Only if no recent session is loaded (truly first-visit feel)
  if (state.status === 'idle') {
    // Speak via TTS client once, then auto-start listening
    // Uses existing TTSClient instance from useVoiceLoop
    speakWelcome('Welcome to MenuVoice. Tap Scan Menu to photograph a restaurant menu.');
  }
}, []); // mount only
```

This requires `useVoiceLoop` to expose a `speakWelcome` function, or the welcome logic can be baked into the existing `triggerOverview` path by making it context-aware. The simpler implementation: add a one-shot `speakWelcome` export to `useVoiceLoop` that queues a TTS utterance from idle state.

### Pattern 6: Route Announcer Page Titles

Next.js 16 includes `next-route-announcer` automatically. It announces by reading `document.title`. Each page needs a unique title tag in its metadata:

```typescript
// src/app/page.tsx metadata
export const metadata: Metadata = {
  title: 'MenuVoice — Scan a Menu',
};

// src/app/settings/page.tsx metadata
export const metadata: Metadata = {
  title: 'Settings — MenuVoice',
};
```

The settings page is `'use client'` — it cannot export `metadata`. Use a `<title>` in a `<head>` via Next.js `<Head>` component workaround, or promote the static page wrapper. Alternatively, add a title in layout for the settings route via a `generateMetadata` in a server component wrapper.

### Anti-Patterns to Avoid

- **Dynamically mounting ARIA live regions:** Never add a live region to the DOM and immediately populate it. VoiceOver iOS ignores freshly-mounted live regions. Keep them empty in the DOM always, change content only.
- **Combining role=alert with aria-live=assertive:** Causes double-speak on VoiceOver iOS. Use one or the other, not both.
- **Identical repeated strings:** VoiceOver iOS does not re-announce a live region update if the new text is identical to the previous text. If retake guidance fires twice with the same text, append attempt number: "Attempt 2: ..." or clear the live region first (with a 150ms delay).
- **aria-live on conditionally-rendered elements:** If the element leaves and re-enters the DOM, VoiceOver re-registers it as new and will not announce the first content change. Always keep it in the DOM.
- **Triggering TTS without a user gesture chain:** iOS Safari will block `<audio>` play if there has been no prior user gesture in the current session. The existing voice loop handles this (TTS starts after mic tap). The welcome TTS case requires the first mic tap to have occurred, OR the app must be designed so the welcome plays in response to a tap event.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route change announcements | Custom router listener + aria-live | Next.js built-in `next-route-announcer` | Already present in Next.js 16; fires on every navigation; reads document.title |
| ARIA live region management library | Custom announcement queue | Native always-in-DOM + content swap | Simple pattern; existing project already uses it correctly; no library needed |
| TTS guidance text | Custom NLP for warning interpretation | Pass `menu.warnings[0]` directly into a template string | Warnings come from Claude Vision with human-readable text already |
| Repeat announcement for identical strings | Complex string diffing | Append `\u00A0` (no-break space) or include attempt count in message | Lightweight, proven VoiceOver iOS workaround |

---

## Common Pitfalls

### Pitfall 1: iOS VoiceOver Only Reliably Announces assertive Live Regions
**What goes wrong:** A `role="status"` / `aria-live="polite"` region fires but VoiceOver iOS stays silent during voice loop activity (the speech queue is always busy with TTS audio announcements).
**Why it happens:** VoiceOver iOS will not interrupt its current TTS output with a polite update. When the app is speaking (audio element playing), polite regions queue indefinitely.
**How to avoid:** For urgent user-action required announcements (retake guidance, errors), use `role="alert"` (assertive). For informational state updates (menu loaded, listening started), polite is fine since they fire when the app is otherwise quiet.
**Warning signs:** Manual VoiceOver testing shows the announcement never fires when triggered during speaking state.

### Pitfall 2: ARIA Live Region Not Registered Before Content Update
**What goes wrong:** The live region element is added to the DOM and populated in the same render cycle. VoiceOver iOS misses the announcement.
**Why it happens:** VoiceOver has not "registered" a live region that just appeared. It only watches live regions that existed when the page was traversed.
**How to avoid:** Always render live region containers unconditionally (they exist from page load). Only change their `textContent` to trigger announcements. The project already follows this pattern in `ProcessingState` and `VoiceStateIndicator` — maintain it for all new live regions.
**Warning signs:** Live region works in Chrome but not iOS Safari.

### Pitfall 3: Identical Repeated Live Region Content Not Re-Announced
**What goes wrong:** User retakes a photo twice and gets the same warning. The second ARIA announcement is silent.
**Why it happens:** VoiceOver iOS deduplicates: if the live region content is unchanged, it does not re-fire the AT event.
**How to avoid:** Include attempt count in announcement text ("Attempt 2: The photo is still blurry...") or momentarily clear the region before updating (with a ~150ms delay). Appending `\u00A0` also works.
**Warning signs:** First retake announcement works; second does not.

### Pitfall 4: iOS Safari TTS Blocked by Autoplay Policy
**What goes wrong:** Welcome message or retake guidance TTS call is blocked because no user gesture has occurred yet.
**Why it happens:** iOS Safari requires a user-initiated event to trigger `<audio>` element play. A `useEffect` on mount is not a user gesture.
**How to avoid:** Chain the welcome TTS to the first user tap. Do not attempt to play TTS automatically before any user interaction. The guided retake TTS fires in response to a file input change event (user tapped camera and selected photo) — this counts as a user gesture chain if triggered synchronously in the event handler.
**Warning signs:** TTS plays on Chrome/desktop but silently fails on iOS Safari.

### Pitfall 5: settings/page.tsx Cannot Export `metadata` (Client Component)
**What goes wrong:** Adding `export const metadata` to the settings page fails because it is `'use client'`.
**Why it happens:** Next.js metadata exports require server components.
**How to avoid:** Use a server component wrapper for the settings route or set the title via `<head>` using a client-compatible approach. Alternatively, update `layout.tsx` to include a title template that auto-generates unique titles per route.
**Warning signs:** Build error: "You are attempting to export 'metadata' from a component marked with 'use client'."

### Pitfall 6: ScanButton's Hidden File Input Already Removed from A11Y Tree
**What goes wrong:** Developer assumes the file input is the focusable element and tries to add aria-label to it, breaking the pattern.
**Why it happens:** The `<input type=file>` is `sr-only` + `aria-hidden` + `tabIndex=-1` by design — the visible `<button>` is the accessible control.
**How to avoid:** Keep the existing ScanButton pattern. The button's `aria-label` is "Scan Menu — tap to photograph a restaurant menu" and VoiceOver will announce this. Do not add labels to the hidden input.

---

## Code Examples

### Extracting Guidance Text from Menu Warnings
```typescript
// In useMenuExtraction.ts — after successful API response
function buildRetakeGuidance(menu: Menu): string {
  if (menu.warnings.length > 0) {
    // Use first warning — Claude Vision writes these as human-readable sentences
    return `${menu.warnings[0]} Please retake for a better result.`;
  }
  return 'The photo was difficult to read clearly. Please try retaking in better lighting.';
}
```

### Attempt Count Deduplication for Repeated Announcements
```typescript
// RetakeGuidance live region text — avoids VoiceOver iOS dedup
const announcementText = attemptCount > 1
  ? `Attempt ${attemptCount}: ${guidance}`
  : guidance;
```

### Next.js Route Announcer Title Pattern
```typescript
// src/app/settings/layout.tsx (new server component wrapping settings)
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Settings — MenuVoice' };
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Correct role=alert Usage for Retake (no aria-live duplication)
```tsx
// Good: role=alert implies assertive; no explicit aria-live needed
<div role="alert" aria-atomic="true" className="sr-only">
  {retakeAnnouncementText}
</div>

// Bad: double-speak on VoiceOver iOS
<div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
  {retakeAnnouncementText}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual route announcer | Next.js built-in `next-route-announcer` | Next.js 10+ | Free route announcement via document.title; no custom code needed |
| SpeechSynthesis for TTS | `<audio>` element (locked) | Phase 2 | Avoids VoiceOver conflict — never reverse |
| Dynamic live region injection | Always-in-DOM + content swap | Established project pattern | More reliable across VoiceOver iOS versions |

**Deprecated/outdated:**
- Using `aria-live="assertive"` on `role="alert"` elements: do not add it — role=alert already implies assertive.
- Mounting/unmounting ARIA live regions conditionally: replaced by always-in-DOM empty containers.

---

## iOS Safari Quirks Audit

### Audio/TTS (`<audio>` element)
- **Issue:** `<audio>.play()` blocked before first user gesture.
- **Current mitigation:** TTSClient is created lazily inside `startListening()` (a button tap handler). First TTS play follows a user gesture chain. No change needed for voice loop path.
- **Welcome TTS issue:** If a welcome message is played on mount via `useEffect`, iOS Safari will block it. Solution: trigger welcome TTS from inside the first user interaction (mic tap, or a dedicated "Start" button tap). The welcome plays as the first TTS utterance after the user taps the mic button, not on mount.
- **Retake TTS:** File input `onChange` fires after the user selects a photo — this is a user gesture chain. TTS play inside the extraction completion handler (async from onChange) may or may not be considered a user gesture. Safe approach: show the guidance in a `role="alert"` ARIA region (which VoiceOver reads immediately) and also attempt TTS. If TTS is blocked, the ARIA announcement is the fallback.

### Microphone (`getUserMedia`)
- **Issue:** Safari re-prompts for mic permission on page reload (not persistent).
- **Current mitigation:** `MicPermissionPrompt` shows a pre-prompt before triggering mic. This is correct. No change needed.
- **Audio output rerouting:** When `getUserMedia` is active, iOS Safari routes audio output to built-in speaker, overriding headphones. This is a known WebKit bug with no web API workaround. Document for testers; not fixable in code.

### Camera (`input[type=file][capture=environment]`)
- **Issue:** Must be triggered by direct user tap — the `button.onClick(() => input.click())` pattern in `ScanButton.tsx` works on iOS Safari per spec.
- **Current implementation:** `ScanButton.tsx` uses `inputRef.current?.click()` from a button's `onClick` — this is a user gesture chain and works on iOS Safari.
- **VoiceOver interaction:** VoiceOver users activate the "Scan Menu" button with a double-tap gesture. The button's `onClick` fires, which then programmatically clicks the hidden file input. iOS Safari treats this as a user gesture and opens the camera. No change needed.

---

## Comprehensive ARIA Audit Results

Current state of all components vs. what is needed:

| Component | Current ARIA | Status | Action Needed |
|-----------|-------------|--------|---------------|
| `ProcessingState` | role=status, aria-live=polite, aria-atomic=true, always-in-DOM | Correct | None |
| `VoiceStateIndicator` | role=status, aria-live=polite, aria-atomic=true, always-in-DOM | Correct | None |
| `ErrorState` | role=alert | Correct | None |
| `ScanButton` | aria-label on button; file input aria-hidden+sr-only | Correct | None |
| `VoiceButton` | aria-label per status, aria-disabled | Correct | None |
| `MenuSummary` | aria-label="Menu results", CategorySection aria-expanded | Correct | None |
| `MicPermissionPrompt` | role=status | Acceptable | No change needed |
| `TranscriptDisplay` | aria-live=off | Correct — TTS handles output | None |
| `Header` | role=banner, aria-label on settings link | Correct | None |
| `layout.tsx` | Skip-to-content link present | Correct | Verify on VoiceOver iOS |
| `page.tsx` | sr-only h1 present | Incomplete | Add AppStateAnnouncer for extraction-complete event |
| Route changes | Next.js route announcer (built-in) | Present but needs page titles | Add settings/layout.tsx with metadata |
| Welcome message | sr-only h1 only (silent unless focused) | Incomplete | Add welcome TTS on first mic tap |
| Retake guidance | Not implemented | Missing | New RetakeGuidance component + retake app state |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + React Testing Library |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| A11Y-02 | AppStateAnnouncer always in DOM with correct aria attrs | unit | `npx vitest run src/components/__tests__/AppStateAnnouncer.test.tsx` | Wave 0 |
| A11Y-02 | AppStateAnnouncer announces "Menu loaded" on results state | unit | same | Wave 0 |
| A11Y-02 | RetakeGuidance has role=alert, aria-atomic=true, sr-only region | unit | `npx vitest run src/components/__tests__/RetakeGuidance.test.tsx` | Wave 0 |
| MENU-04 | useMenuExtraction dispatches EXTRACTION_LOW_QUALITY for confidence < 0.3 | unit | `npx vitest run src/hooks/__tests__/useMenuExtraction.test.ts` | exists (extend) |
| MENU-04 | useMenuExtraction dispatches EXTRACTION_LOW_QUALITY when warnings not empty | unit | same | exists (extend) |
| MENU-04 | appReducer handles EXTRACTION_LOW_QUALITY -> retake state | unit | `npx vitest run src/lib/__tests__/app-state.test.ts` | Wave 0 |
| MENU-04 | appReducer handles PROCEED_ANYWAY -> results state | unit | same | Wave 0 |
| MENU-04 | RetakeGuidance shows "Proceed with what I have" after 2+ attempts | unit | `npx vitest run src/components/__tests__/RetakeGuidance.test.tsx` | Wave 0 |
| A11Y-01 | VoiceButton disabled state prevents interaction during processing | unit | `npx vitest run src/components/__tests__/VoiceButton.test.tsx` | exists (verify) |
| A11Y-01 | ScanButton aria-label present and descriptive | unit | `npx vitest run src/components/__tests__/ScanButton.test.tsx` | exists (verify) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/__tests__/AppStateAnnouncer.test.tsx` — covers A11Y-02 (new component)
- [ ] `src/components/__tests__/RetakeGuidance.test.tsx` — covers MENU-04 (new component)
- [ ] `src/lib/__tests__/app-state.test.ts` — covers MENU-04 retake state transitions (new test file for app-state reducer)

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code and config changes (ARIA attributes, new React components, hook logic). No external services, databases, or CLI tools beyond the project's own stack.

---

## Open Questions

1. **Welcome TTS timing: mount vs first tap**
   - What we know: iOS Safari blocks `<audio>` play before user gesture. TTS via `<audio>` in a `useEffect` on mount will silently fail on iOS.
   - What's unclear: Whether chaining from a real file input `onChange` event (for the retake guidance) counts as a sufficiently fresh user gesture to unblock TTS, or whether the async extraction pipeline breaks the gesture chain.
   - Recommendation: Design retake guidance to rely on the ARIA `role="alert"` announcement as the primary communication channel (guaranteed on VoiceOver), with TTS as enhancement. Test on real iOS device to confirm.

2. **settings/page.tsx page title for route announcer**
   - What we know: The file is `'use client'` so it cannot export `metadata`. Next.js route announcer reads `document.title`.
   - What's unclear: Current settings page title — the `<html>` title from root layout may show "MenuVoice" for all routes.
   - Recommendation: Add `src/app/settings/layout.tsx` as a server component that exports `metadata: { title: 'Settings — MenuVoice' }`. This wraps the client page and provides the title without changing the page component.

3. **Retake attempt count threading**
   - What we know: `useMenuExtraction` receives `dispatch` but not current state. The retake state carries `attemptCount`.
   - What's unclear: How to pass current attempt count from retake state into `useMenuExtraction` for the next extraction attempt.
   - Recommendation: Pass `attemptCount` as a parameter to the `extract` function, or read it from a ref in `page.tsx` and pass it down. The simplest approach: `extract(files, attemptCount)` signature where `attemptCount` defaults to 1 for initial scans and increments from the retake state.

---

## Sources

### Primary (HIGH confidence)
- Official ARIA spec, MDN — ARIA live regions, role=alert, role=status semantics
- Next.js Architecture / Accessibility docs — `next-route-announcer` behavior
- iOS Safari developer forums (bugs.webkit.org) — getUserMedia, file input behavior

### Secondary (MEDIUM confidence)
- [ARIA-live announcements cheatsheet](https://rightsaidjames.com/2025/08/aria-live-regions-when-to-use-polite-assertive/) — verified against MDN
- [Screen reader support for ARIA live regions (TPGi)](https://www.tpgi.com/screen-reader-support-aria-live-regions/) — cross-referenced with known project behavior
- [Next.js accessibility architecture](https://nextjs.org/docs/architecture/accessibility) — official docs
- [Getting Started With getUserMedia in 2026](https://blog.addpipe.com/getusermedia-getting-started/) — iOS Safari permission behavior
- [Autoplay guide — MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — iOS Safari autoplay policy
- [Understanding aria-live timing — Max Design](https://www.maxdesign.com.au/articles/aria-live-timing.html) — two-layer timing model

### Tertiary (LOW confidence — flag for device testing)
- VoiceOver iOS assertive-only behavior: sourced from multiple community reports; needs device verification
- 150ms delay workaround for repeated identical announcements: community finding, not in official spec

---

## Project Constraints (from CLAUDE.md)

All directives from CLAUDE.md that the planner must verify compliance with:

1. **TTS output MUST use `<audio>` element, NOT browser SpeechSynthesis** — retake guidance TTS must use TTSClient (audio element), not SpeechSynthesis fallback.
2. **Voice loop uses strict state machine: `idle | listening | processing | speaking | error`** — new retake state lives in `AppState` (page-level), not `VoiceState` (voice loop). These are separate state machines. Do not add `retake` to `VoiceState`.
3. **Photo capture uses `<input type="file" capture="environment">`** — the retake UI must re-use `ScanButton` as-is, not introduce a new capture mechanism.
4. **Allergy information ALWAYS includes safety disclaimer** — not directly relevant to this phase, but any new system prompts or TTS messages must not contradict this.
5. **Streaming + sentence buffering for TTS** — any new TTS calls (retake guidance, welcome) must use `TTSClient.queueText()` or a separate direct play method that does not break the streaming pipeline.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing dependencies
- Architecture patterns: HIGH — based on direct code inspection of all existing components + spec-verified ARIA patterns
- iOS Safari quirks: MEDIUM — autoplay and permission behavior verified via MDN + community reports; VoiceOver iOS assertive-only finding needs real device confirmation
- Pitfalls: HIGH for items derived from existing code; MEDIUM for iOS-specific timing behavior

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable domain; ARIA spec and Next.js route announcer behavior unlikely to change)
