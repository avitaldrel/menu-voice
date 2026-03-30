# Phase 1: Foundation & Menu Capture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-foundation-menu-capture
**Areas discussed:** Landing experience, Photo capture flow, Menu results display, Error handling, Menu data structure, App shell & navigation

---

## Landing Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — big camera button | App name at top, one large 'Scan Menu' button in center. Screen reader announces. Fastest path to action. | ✓ |
| Guided intro first time | First visit shows brief 3-step walkthrough. Subsequent visits go straight to camera. | |
| Profile setup prompt | First visit asks about allergies/preferences before scanning. | |

**User's choice:** Minimal — big camera button
**Notes:** User prioritizes getting to the action immediately.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Just the button | App name + scan button only. Ultra-clean. | |
| Button + recent sessions | Below scan button, list of recent restaurant visits. Empty on first visit. | ✓ |
| Button + allergy shortcut | Scan button + smaller 'Set up allergies' link below. | |

**User's choice:** Button + recent sessions
**Notes:** Recent visits provide value for returning users.

---

## Photo Capture Flow

| Option | Description | Selected |
|--------|-------------|----------|
| One-at-a-time with add more | Tap, take one photo, see it added, tap 'Add Another' or 'Process'. | |
| Batch upload | Select multiple photos at once from camera roll (multi-select file picker). | ✓ |
| Both options | Primary one-at-a-time, plus allow uploading from camera roll. | |

**User's choice:** Batch upload
**Notes:** Faster, leverages native multi-select.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail strip + process button | Small previews in horizontal strip, remove any, big 'Read Menu' button. | |
| Simple count + process | No thumbnails, just '3 pages ready' with 'Read Menu' button. | |
| Auto-process immediately | Start processing as soon as photos are selected. No confirmation. | ✓ |

**User's choice:** Auto-process immediately
**Notes:** Fastest path. No confirmation step needed.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Loading animation + status text | Visual spinner with 'Reading your menu...' Screen reader announces. | ✓ |
| Progress steps | Step-by-step: 'Uploading... Reading page 1 of 3... Organizing...' | |

**User's choice:** Loading animation + status text
**Notes:** Simple and clear status communication.

---

## Menu Results Display

| Option | Description | Selected |
|--------|-------------|----------|
| Category accordion | Menu categories as expandable sections. Tap to see items. | |
| Flat scrollable list | All items in one long list grouped by headers. | |
| Minimal — voice is the real UI | Just restaurant name and category summary. Detailed exploration via voice. | ✓ |

**User's choice:** Minimal — voice is the real UI
**Notes:** Target users are blind; visual detail is secondary.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strictly minimal | Just 'Menu loaded: Italian Restaurant — 5 categories, 42 items'. Full browsing via voice. | |
| Summary + expandable detail | Summary by default, tap categories to see items. Useful for companions/testing. | ✓ |

**User's choice:** Summary + expandable detail
**Notes:** Expandable detail serves sighted companions and development/testing.

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error + retry | Error message on screen with 'Try Again' button. Screen reader announces. | ✓ |
| Toast notification | Brief popup that auto-dismisses. Screen readers might miss it. | |
| Error within results | Process what it can, flag unreadable sections in results. | |

**User's choice:** Inline error + retry
**Notes:** Clear, actionable, accessible.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen error state | Clear message with retry. Can't do anything without API. | |
| Inline with retry | Same pattern as photo errors. Consistent handling. | |

**User's choice:** Other — "Announce through voice AND show error on screen"
**Notes:** Dual-channel feedback: voice announcement for blind users + visual error for sighted companions. This applies to network errors specifically.

---

## Menu Data Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Force categories | Always organize into categories even if menu doesn't have sections. | |
| Preserve menu structure | Keep whatever structure the menu has. | |
| AI-inferred categories | AI creates smart categories based on content. | ✓ |

**User's choice:** AI-inferred categories
**Notes:** Best of both — respects menu structure when clear, infers when not.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Name + price + description | The essentials only. | |
| Name + price + description + tags | Essentials plus AI-generated dietary tags. | |
| Everything possible | Name, price, description, tags, portion size, dietary indicators, modifiers. | ✓ |

**User's choice:** Everything possible
**Notes:** Maximizes data available for allergy filtering and voice exploration in later phases.

---

## App Shell & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Single page app | Everything on one page with state transitions. | |
| Multi-page with routes | Separate pages for Home, Menu View, Settings. | |
| Hybrid | Main flow single-page, Settings on separate route. | ✓ |

**User's choice:** Hybrid
**Notes:** Best of both — smooth main flow, clean separation for settings.

---

| Option | Description | Selected |
|--------|-------------|----------|
| App name + settings icon | 'MenuVoice' left, gear icon right. Minimal. | ✓ |
| App name + history + settings | Three elements in header. | |
| No persistent header | Maximize screen space, settings via menu button. | |

**User's choice:** App name + settings icon
**Notes:** Minimal header, keeps focus on content.

---

## Claude's Discretion

- Next.js project structure and file organization
- Tailwind configuration and theme setup
- Claude Vision API prompt engineering
- JSON schema design for menu data
- IndexedDB schema for recent sessions
- Loading animation implementation

## Deferred Ideas

None — discussion stayed within phase scope.
