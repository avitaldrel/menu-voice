# Phase 7: Polish & Frontend Refinement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 07-polish-frontend-refinement
**Areas discussed:** Visual design refresh, User flow smoothness, Manual testing fixes, Interaction hints

---

## Visual Design Refresh

### Design Direction

| Option | Description | Selected |
|--------|-------------|----------|
| Refine what's there | Keep current black/white/minimal, fix inconsistencies | |
| Warmer & friendlier | Softer colors, warm neutrals, subtle brand accent | ✓ |
| Bold & confident | Strong brand color, distinctive personality | |

**User's choice:** Warmer & friendlier
**Notes:** None

### Button Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| One hero action per screen | Each state has ONE dominant button, secondary actions subdued | ✓ |
| Uniform medium buttons | All buttons same moderate size, differ by color/weight | |
| You decide | Claude picks a consistent system | |

**User's choice:** One hero action per screen
**Notes:** None

### Brand Accent Color

| Option | Description | Selected |
|--------|-------------|----------|
| Warm accent (amber/orange) | Restaurant-friendly warmth | |
| Calm accent (teal/sage) | Approachable, calming, trustworthy | ✓ |
| No accent, warm neutrals only | Neutral warm tones, color from state indicators only | |

**User's choice:** Calm accent (teal/sage)
**Notes:** None

### Header/Logo Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Keep minimal text logo | Update colors to match new palette | ✓ |
| Add a simple icon | Mic + menu/utensil motif alongside text | |
| You decide | Claude picks header treatment | |

**User's choice:** Keep minimal text logo
**Notes:** None

### Background Feel

| Option | Description | Selected |
|--------|-------------|----------|
| Warm off-white | Cream or warm white throughout | ✓ |
| Subtle gradient | Warm gradient (cream to light sage) | |
| Keep current light gray | Current #fafafa, update component colors | |

**User's choice:** Warm off-white
**Notes:** None

### Menu Summary Display

| Option | Description | Selected |
|--------|-------------|----------|
| Card-based categories | Each category in its own card with shadow | |
| Clean list with dividers | Simple list with category headers | |
| Keep current accordion | Update styling to match new palette | |

**User's choice:** "what you think is right" — delegated to Claude's discretion
**Notes:** User deferred to Claude

### Transcript Display

| Option | Description | Selected |
|--------|-------------|----------|
| Chat bubbles | Distinct bubbles like iMessage | |
| Simple text blocks | Current approach, polish styling | ✓ |
| You decide | Claude picks | |

**User's choice:** Simple text blocks
**Notes:** None

---

## User Flow Smoothness

### State Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth fade/slide | Gentle CSS transitions, 300-500ms | ✓ |
| Instant with entry animation | Instant swap, elements animate in | |
| Keep instant | Current instant swaps | |

**User's choice:** Smooth fade/slide
**Notes:** None

### Processing/Extraction Progress

| Option | Description | Selected |
|--------|-------------|----------|
| Pulsing status messages | Rotating messages with smooth transitions | ✓ |
| Simple spinner + timer | Current spinner with elapsed time | |
| You decide | Claude picks processing feedback | |

**User's choice:** Pulsing status messages
**Notes:** None

### Voice Conversation Start

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-overview then listen | Current behavior, smoother | ✓ |
| Brief pause then overview | 1-2s calm before overview | |
| Keep current behavior | Current auto-start, refine visuals | |

**User's choice:** Auto-overview then listen
**Notes:** None

### Interrupt Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate stop + listen | TTS stops instantly, mic activates | |
| Fade out + listen | TTS fades out ~200ms, pause, mic activates | ✓ |
| Keep current behavior | Current instant stop | |

**User's choice:** Fade out + listen
**Notes:** None

---

## Manual Testing Fixes

### Issue Categories Reported

| Category | Selected |
|----------|----------|
| Voice/TTS issues | ✓ |
| Visual/layout bugs | |
| Flow/navigation issues | ✓ |
| Accessibility gaps | ✓ (later clarified: none specific) |

### Voice/TTS Issues

| Issue | Selected |
|-------|----------|
| TTS cuts off mid-sentence | |
| Mic doesn't restart after TTS | |
| Welcome message doesn't play | ✓ |
| Thinking chime issues | |

### Flow/Navigation Issues

| Issue | Selected |
|-------|----------|
| No way to scan a new menu | |
| Settings hard to find/reach | ✓ |
| Retake flow confusing | ✓ |
| Can't go back to menu summary | ✓ |

### Accessibility Gaps

**User's response:** "none" — no specific accessibility gaps identified beyond existing coverage

---

## Interaction Hints

### Teaching Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Spoken hints during use | Contextual hints woven into conversation | |
| Welcome tutorial flow | First-time spoken walkthrough | |
| Both — tutorial + contextual | Brief tutorial + occasional contextual hints | ✓ |
| You decide | Claude picks approach | |

**User's choice:** Both — tutorial + contextual
**Notes:** None

### Settings Surfacing

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent "Set up allergies" prompt | Visible+spoken prompt on first use | |
| Voice-accessible settings | Say "open settings" or "add allergy" during conversation | ✓ |
| Keep gear icon only | Make icon more visible | |

**User's choice:** Voice-accessible settings
**Notes:** None

### Hint Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| First 3 sessions only | Hints stop after 3 uses | |
| Always available but rare | Hints decrease in frequency over time | ✓ |
| You decide | Claude picks frequency | |

**User's choice:** Always available but rare
**Notes:** None

---

## Claude's Discretion

- Menu summary visual display style
- Exact teal/sage shade and warm off-white tone
- Transition easing curves and animation details
- Pulsing status message content and rotation timing
- Hint frequency algorithm
- "Scan new menu" UI placement in results state

## Deferred Ideas

None — discussion stayed within phase scope
