# MenuVoice

## What This Is
A voice-first web application that helps blind and visually impaired people independently navigate restaurant menus. Users photograph menu pages, and the app uses AI vision to extract menu content, then engages in a natural voice conversation to help them explore options, understand ingredients, get allergy warnings, and decide what to order.

## Core Value
A blind person can independently understand and choose from any restaurant menu through voice conversation.

## Requirements

### Validated
- ✓ Capture photos of restaurant menu pages (multiple pages supported) — v1.0
- ✓ Process menu photos via AI vision into structured menu data — v1.0
- ✓ Screen reader and keyboard accessible — v1.0
- ✓ Fully voice-controlled interface (speech recognition + text-to-speech) — v1.0
- ✓ Natural AI voice output with browser TTS fallback — v1.0
- ✓ Proactive restaurant/menu overview after processing photos — v1.0
- ✓ Conversational menu exploration (categories, items, ingredients, prices) — v1.0
- ✓ Help user decide what to order through natural conversation — v1.0
- ✓ User profile with allergies and food preferences (stored locally) — v1.0
- ✓ In-conversation allergy/dislike capture (even without prior profile setup) — v1.0
- ✓ Proactive allergy/preference warnings on every mentioned item — v1.0
- ✓ Suggest asking server about allergen-free modifications — v1.0
- ✓ Guide user to retake photos when text is unreadable — v1.0
- ✓ Full VoiceOver/screen reader accessibility with ARIA live regions — v1.0
- ✓ Warm visual design with smooth state transitions — v1.0
- ✓ Voice commands for hands-free navigation (settings, scan new menu) — v1.0
- ✓ Tutorial and contextual hint system for new users — v1.0
- ✓ Security headers (CSP, Permissions-Policy) on all responses — v1.0
- ✓ Usage logging on all API routes — v1.0
- ✓ Deployed to Vercel production — v1.0

### Active
(None — fresh requirements needed for next milestone)

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
**v1.0 MVP shipped 2026-04-11** — Live at https://menu-voice.vercel.app/

Full voice-first menu navigation app: camera capture → Claude Vision extraction → streaming voice conversation with allergy awareness → OpenAI TTS responses. 8 phases, 24 plans, 296 tests, 7,055 LOC TypeScript. Deployed to Vercel with security headers and usage logging.

**Tech stack:** Next.js 15, Claude API (claude-sonnet-4-6), OpenAI TTS (tts-1/shimmer), Web Speech API, IndexedDB, Tailwind CSS.

**Known production issue:** Edge Runtime removed from extract route due to 504 timeouts — runs as Node.js serverless with maxDuration=60s.

## Key Decisions

| Decision | Context | Outcome |
|---|---|---|
| Web app before native | Faster to ship, broader access, no app store friction | ✓ Good — shipped in 13 days |
| Local storage over accounts | Zero friction for blind users, no login flow to navigate | ✓ Good — IndexedDB works well |
| Claude for AI backend | User preference; handles both vision and conversation well | ✓ Good — vision + chat in one SDK |
| AI TTS with browser fallback | Natural voice for best experience; fallback for reliability | ✓ Good — OpenAI TTS quality is excellent |
| Next.js framework | API routes hide keys; React ecosystem; good a11y support | ✓ Good — Vercel deploy seamless |
| Node.js serverless over Edge Runtime | Edge 25s timeout too short for Claude Vision | ✓ Good — 60s timeout works |

## Last Updated
2026-04-11 (after v1.0 milestone completion)
