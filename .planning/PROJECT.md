# MenuVoice

## What This Is
A voice-first web application that helps blind and visually impaired people independently navigate restaurant menus. Users photograph menu pages, and the app uses AI vision to extract menu content, then engages in a natural voice conversation to help them explore options, understand ingredients, get allergy warnings, and decide what to order.

## Core Value
A blind person can independently understand and choose from any restaurant menu through voice conversation.

## Requirements

### Validated
- [x] Capture photos of restaurant menu pages (multiple pages supported) — Validated in Phase 1: Foundation & Menu Capture
- [x] Process menu photos via AI vision into structured menu data — Validated in Phase 1: Foundation & Menu Capture
- [x] Screen reader and keyboard accessible (foundation) — Validated in Phase 1: Foundation & Menu Capture
- [x] Fully voice-controlled interface (speech recognition + text-to-speech) — Validated in Phase 2: Voice Interface
- [x] Natural AI voice output with browser TTS fallback — Validated in Phase 2: Voice Interface
- [x] Proactive restaurant/menu overview after processing photos — Validated in Phase 3: Menu Exploration via Voice
- [x] Conversational menu exploration (categories, items, ingredients, prices) — Validated in Phase 3: Menu Exploration via Voice

- [x] Help user decide what to order through natural conversation — Validated in Phase 4: Smart Conversation & Decision Support

### Active
- [ ] Guide user to retake photos when text is unreadable
- [ ] User profile with allergies and food preferences (stored locally)
- [ ] In-conversation allergy/dislike capture (even without prior profile setup)
- [ ] Proactive allergy/preference warnings on every mentioned item
- [ ] Suggest asking server about allergen-free modifications
- [ ] Screen reader and keyboard accessible (full hardening)

### Out of Scope
- Native mobile app (deferred to future milestone)
- User accounts or cloud sync (local storage only for v1)
- Restaurant database or menu pre-loading (photo-only input)
- Payment or ordering integration
- Multi-language support (English only for v1)
- Server/waitstaff-facing features

## Context

**Problem:** Blind and visually impaired diners cannot read menus independently. When they ask servers to describe options, servers often struggle to convey the full menu, leading to limited choices and frustration.

**User:** Blind or visually impaired people dining at restaurants. They may have a sighted companion who helps take photos, or they may need voice guidance to photograph the menu themselves.

**Core User Flow:**
1. Open app -> voice greeting
2. Capture menu photos (voice-guided if needed)
3. AI processes photos -> structured menu data
4. App gives proactive overview: "This looks like a brunch spot - they have eggs, waffles, sandwiches..."
5. User explores via voice: "What pasta options do they have?" / "Tell me about the chicken dishes"
6. App flags allergens/dislikes on every item mentioned
7. If allergen present, suggests: "You could ask your server if this can be made without [allergen]"
8. User decides on their order

**Technical Environment:**
- Next.js (React) web application
- Claude API (Anthropic SDK) for vision (menu OCR) and conversation
- Web Speech API for speech recognition (browser-native)
- AI TTS API (OpenAI TTS or ElevenLabs) for natural voice output, browser SpeechSynthesis as fallback
- IndexedDB for local profile storage (allergies, preferences)
- Tailwind CSS for minimal, high-contrast, accessible UI

## Constraints

| Constraint | Rationale |
|---|---|
| Web app only (v1) | Lower barrier to entry; no app store approval needed; mobile native deferred |
| Local storage only | No login friction for blind users; privacy-first; no server-side user data |
| Claude API (Anthropic) | User preference; strong vision + conversation capabilities |
| Voice-first design | Primary users cannot see the screen; every interaction must work via voice |
| English only (v1) | Scope control; expand language support in future milestone |
| No pre-loaded menus | Every restaurant visit starts with fresh photo capture; no database dependency |

## Key Decisions

| Decision | Context | Outcome |
|---|---|---|
| Web app before native | Faster to ship, broader access, no app store friction | - Pending |
| Local storage over accounts | Zero friction for blind users, no login flow to navigate | - Pending |
| Claude for AI backend | User preference; handles both vision and conversation well | - Pending |
| AI TTS with browser fallback | Natural voice for best experience; fallback for reliability | - Pending |
| Next.js framework | API routes hide keys; React ecosystem; good a11y support | - Pending |

## Evolution
- Update after each phase completes with validated requirements and new decisions
- Move requirements to Validated once shipped and confirmed working
- Track decision outcomes as phases reveal what works

## Current State
Phase 4 complete — System prompt enhanced with 7 new response rules for recommendations, ordinal reference resolution, contrastive comparisons, and proactive decision support. 189 tests passing across 18 files. Ready for Phase 5: Allergy & Preference System.

## Last Updated
2026-03-31 (after Phase 4 completion)
