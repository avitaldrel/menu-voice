# Phase 1: Foundation & Menu Capture - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding (Next.js App Router + Tailwind), camera-based menu photo capture via native file input, AI vision extraction of menu data into structured JSON via Claude, and a minimal visual UI with screen reader accessibility. Voice interaction is NOT in this phase (Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Landing Experience
- **D-01:** Minimal landing page — app name at top, one large "Scan Menu" button in the center. Screen reader announces: "MenuVoice. Tap Scan Menu to photograph a restaurant menu."
- **D-02:** Below the scan button, show a list of recent restaurant visits (if any exist in local storage). Empty on first visit.
- **D-03:** No onboarding walkthrough or profile setup prompt on first visit. Straight to action.

### Photo Capture Flow
- **D-04:** Batch upload via multi-select file picker (`<input type="file" capture="environment" multiple>`). User selects one or more photos at once.
- **D-05:** Auto-process immediately after photo selection — no confirmation step, no thumbnail preview, no remove-before-processing flow.
- **D-06:** While processing, show a loading animation with status text ("Reading your menu..."). Screen reader announces the status via ARIA live region.

### Menu Results Display
- **D-07:** Default view is minimal summary: restaurant name (AI-inferred) and category names with item counts. E.g., "Italian Restaurant — 5 categories, 42 items."
- **D-08:** Categories are expandable — tapping a category reveals items with name, price, and description. For sighted companions or testing purposes.
- **D-09:** Full detailed exploration happens via voice in Phase 3. This visual display is a complement, not the primary interface.

### Error Handling
- **D-10:** Photo errors (blurry, unreadable, not a menu) shown as inline error message with a "Try Again" button. Screen reader announces the error.
- **D-11:** Network errors (no internet, API timeout) communicated through BOTH voice announcement AND visual error on screen. Dual feedback for blind users and sighted companions.
- **D-12:** Retry button available for all error states.

### Menu Data Structure
- **D-13:** AI infers categories from menu content even if the menu doesn't have clear sections. A burger joint gets "Burgers, Sides, Drinks" even if the menu is a flat list.
- **D-14:** Extract maximum detail per item: name, price, description, AI-inferred dietary tags (vegetarian, spicy, gluten-free, etc.), portion size if mentioned, dietary indicators, and any modifiers/add-ons listed.
- **D-15:** Full menu JSON stored in memory for injection into conversation system prompt in Phase 3.

### App Shell & Navigation
- **D-16:** Hybrid routing: main flow (scan -> results -> conversation) is single-page with state transitions. Settings/Profile on a separate route (/settings).
- **D-17:** Simple header: "MenuVoice" on the left, gear icon on the right linking to /settings.
- **D-18:** Recent sessions stored in IndexedDB and shown on landing page below the scan button.

### Claude's Discretion
- Next.js project structure (app router file organization, component folder structure)
- Tailwind configuration and theme setup
- Claude Vision API prompt engineering for menu extraction
- JSON schema design for structured menu data
- IndexedDB schema for recent sessions
- Loading animation implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, tech stack decisions
- `.planning/REQUIREMENTS.md` — Full requirements with MENU-01 through MENU-03, A11Y-03, A11Y-04
- `.planning/research/SUMMARY.md` — Research synthesis with critical architecture decisions
- `.planning/research/STACK.md` — Tech stack recommendations (Next.js, Claude SDK, idb)
- `.planning/research/FEATURES.md` — Feature patterns (native file input, OCR approaches)
- `.planning/research/ARCHITECTURE.md` — Architecture patterns (API routes, menu data schema)
- `.planning/research/PITFALLS.md` — Risks and mitigations (iOS Safari, screen reader conflicts)
- `CLAUDE.md` — Project-level coding instructions and critical architecture rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — greenfield project. No existing code.

### Established Patterns
None yet — Phase 1 establishes the foundational patterns.

### Integration Points
None — this is the first phase. Patterns established here will be consumed by Phases 2-6.

</code_context>

<specifics>
## Specific Ideas

- Error feedback must be dual-channel: voice announcement AND visual display (D-11)
- Auto-process on photo selection (D-05) — no confirmation step, optimized for speed
- AI-inferred categories (D-13) — don't rely on menu having clear sections
- Extract "everything possible" from menu items (D-14) — including dietary tags and modifiers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-menu-capture*
*Context gathered: 2026-03-29*
