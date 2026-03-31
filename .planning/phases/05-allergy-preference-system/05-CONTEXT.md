# Phase 5: Allergy & Preference System - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a local allergy/preference profile that persists in IndexedDB and integrates into the conversation system. Users can create profiles via voice or settings page. Claude proactively warns about allergens when menu items are discussed and suggests server modifications. Always includes a safety disclaimer.

</domain>

<decisions>
## Implementation Decisions

### Profile Storage & Access
- Voice-first allergy management: say "I'm allergic to shellfish" in conversation and it's captured automatically (ALLERGY-02). Settings page for explicit setup/review.
- Profile stored in existing IndexedDB `settings` store: `{ allergies: string[], preferences: string[], dislikes: string[] }`
- Profile injected into system prompt alongside menu JSON — Claude sees allergies on every turn
- Allergy captures require confirmation: Claude confirms before saving — "I'll remember that you're allergic to shellfish. Is that right?"

### In-Conversation Allergy Capture
- Claude outputs a structured marker (e.g., `[ALLERGY:shellfish]`) when user mentions allergy — client parses and saves to IndexedDB
- Natural conversation triggers: "I'm allergic to X", "I can't eat X", "I don't like Y" — Claude recognizes and confirms
- Claude distinguishes allergies from dislikes by asking: "Is that an allergy or just a preference?" — different safety level for each
- If profile has allergies, Claude mentions them in the overview: "I have your shellfish and peanut allergies noted"

### Proactive Warning & Safety Disclaimer
- Allergen warnings delivered every time a menu item with a matching allergen is discussed — proactive, before user asks (ALLERGY-03)
- Warning format: "Heads up — the alfredo has dairy. You could ask if they can make it dairy-free." Combines warning + modification suggestion (ALLERGY-04)
- Safety disclaimer spoken once per session, after the first allergen warning: "Just so you know, allergy information is based on the menu text — always confirm with your server" (ALLERGY-05)
- Uncertain allergen info: if menu item has no allergen data but description hints at allergens (e.g., "cream sauce"), Claude flags it: "This might contain dairy based on the description — worth checking with your server"

### Claude's Discretion
- Exact structured marker format for allergy capture
- Settings page UI design and layout
- Profile migration strategy if DB version needs incrementing

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/indexeddb.ts` — Already has `settings` object store created in DB upgrade. Uses `idb` package.
- `src/lib/menu-schema.ts` — `MenuItem.allergens: string[]` and `MenuItem.dietaryFlags: string[]` already exist
- `src/lib/chat-prompt.ts` — `buildSystemPrompt(menu)` is the injection point for allergy profile data
- `src/app/settings/page.tsx` — Placeholder page exists, ready to implement
- `src/app/api/menu/extract/route.ts` — Already extracts allergens from menu descriptions during OCR

### Established Patterns
- System prompt rules in `buildSystemPrompt()` — natural language directives with keyword assertions in tests
- IndexedDB accessed via `idb` package with `openDB()` pattern
- Settings store already exists but has no read/write functions yet
- All voice responses go through streaming `/api/chat` → TTS pipeline

### Integration Points
- `buildSystemPrompt()` needs to accept profile parameter alongside menu
- `useVoiceLoop` needs to pass profile to chat API calls
- `/api/chat` route needs to accept and forward profile data
- Settings page needs IndexedDB read/write for profile CRUD
- Client-side parser needed to detect `[ALLERGY:X]` markers in Claude responses and save to IndexedDB

</code_context>

<specifics>
## Specific Ideas

- Menu extraction already infers allergens from descriptions ("cream sauce" → dairy). These are in `MenuItem.allergens[]`.
- The `settings` object store in IndexedDB was created in Phase 1 but never used — ready for profile data.
- CLAUDE.md mandates: "Allergy information ALWAYS includes safety disclaimer — never present as definitive"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
