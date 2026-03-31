# Phase 7: Polish & Frontend Refinement - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Finalize all features from manual testing feedback, improve frontend visual design, and ensure the full user flow is smooth and polished. No new capabilities — this phase refines what's already built across phases 1-6.

</domain>

<decisions>
## Implementation Decisions

### Visual Design Direction
- **D-01:** Shift to warmer, friendlier aesthetic — softer colors, warm neutrals, teal/sage accent color for primary actions and interactive elements
- **D-02:** Background changes from stark #fafafa to warm off-white (cream tone)
- **D-03:** Keep minimal text logo ("MenuVoice") — update colors to match new warm/teal palette
- **D-04:** One hero action per screen — each state has ONE dominant button (Scan, Mic, Retry) that's large and prominent; secondary actions are smaller and subdued

### Conversation Display
- **D-05:** Simple text blocks for transcript display — current user text + assistant text in a clean container, polished to match new palette
- **D-06:** Menu summary display is Claude's discretion — pick what best fits the warmer aesthetic and voice-first context

### State Transitions & Flow
- **D-07:** Smooth fade/slide transitions between major states (welcome, processing, results, conversation) — 300-500ms CSS transitions
- **D-08:** Pulsing status messages during extraction ("Reading your menu...", "Finding categories...", "Almost done...") with smooth text transitions
- **D-09:** Auto-overview then listen after processing completes — current behavior, just smoother transition into conversation mode
- **D-10:** Fade out + listen for interrupts — TTS fades out over ~200ms, brief pause, then mic activates

### Manual Testing Fixes
- **D-11:** Fix welcome TTS not playing on first load (iOS Safari autoplay compliance issue)
- **D-12:** Add ability to scan a new menu from results state — "Scan new menu" option without requiring page refresh
- **D-13:** Make settings more discoverable — gear icon more visible, VoiceOver announces it clearly
- **D-14:** Improve retake flow clarity — clearer guidance messaging and smoother retake-to-results transition
- **D-15:** Allow reviewing extracted menu summary while in voice conversation mode — menu data stays accessible

### Interaction Hints & Discoverability
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture constraints
- `CLAUDE.md` — TTS must use audio element (not SpeechSynthesis), voice loop state machine, full menu JSON in system prompt, streaming + sentence buffering

### State management
- `src/lib/app-state.ts` — AppState discriminated union (welcome|idle|processing|results|retake|error) and appReducer
- `src/lib/voice-state.ts` — VoiceState discriminated union (idle|listening|processing|speaking|error) and voiceReducer

### Current UI components
- `src/app/page.tsx` — Main page with all state transitions, inline TTS logic
- `src/app/layout.tsx` — Root layout with skip-nav, Header, main content area
- `src/components/Header.tsx` — Logo and settings icon
- `src/components/ScanButton.tsx` — Camera capture button
- `src/components/VoiceButton.tsx` — Mic button with state-based styling
- `src/components/RetakeGuidance.tsx` — Retake flow guidance
- `src/components/MenuSummary.tsx` — Extracted menu display
- `src/components/VoiceStateIndicator.tsx` — State label and visual cue
- `src/components/TranscriptDisplay.tsx` — Conversation display

### Voice/TTS
- `src/hooks/useVoiceLoop.ts` — Main voice interaction hook with speakWelcome
- `src/lib/tts-client.ts` — TTSClient with sentence buffering and SpeechSynthesis fallback
- `src/app/api/tts/route.ts` — OpenAI TTS proxy endpoint

### Styling
- `src/app/globals.css` — Global styles and Tailwind configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TTSClient** (`src/lib/tts-client.ts`): Sentence buffering, OpenAI TTS with browser fallback — extend for fade-out interrupt
- **voiceReducer/appReducer**: Strict state machines — add transition metadata for animations
- **useVoiceLoop**: Already has speakWelcome — extend for tutorial and contextual hints
- **IndexedDB utilities** (`src/lib/indexeddb.ts`): getProfile/saveProfile — can track session count for hint frequency
- **AppStateAnnouncer**: ARIA live region — coordinate with new transition animations

### Established Patterns
- **Discriminated union state machines**: All state changes go through reducers — new states (if any) follow this pattern
- **Tailwind CSS**: All styling is utility-first — design tokens can be added via tailwind.config
- **Component composition**: Each state renders its own component tree in page.tsx switch statement
- **ARIA live regions**: role=status (polite) and role=alert (assertive) always in DOM

### Integration Points
- **page.tsx state switch**: New visual transitions wrap around existing state component rendering
- **useVoiceLoop triggerResponse**: Voice commands ("open settings") integrate here
- **buildSystemPrompt** (`src/lib/chat-prompt.ts`): Contextual hints can be added as system prompt instructions
- **Header component**: Settings icon visibility improvement
- **globals.css / tailwind.config**: Color palette changes centralized here

</code_context>

<specifics>
## Specific Ideas

- Warmer restaurant-friendly feel — think dining context, not a tech tool
- Teal/sage accent feels trustworthy and calming — appropriate for an accessibility app
- Pulsing status messages during extraction should feel reassuring, not anxious
- Voice commands for settings ("add allergy", "open settings") should feel natural in conversation flow
- Contextual hints should be woven into conversation naturally, not robotic or tutorial-like

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-polish-frontend-refinement*
*Context gathered: 2026-03-31*
