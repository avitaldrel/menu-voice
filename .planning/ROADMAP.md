# Roadmap: MenuVoice

## Overview

MenuVoice delivers voice-first menu navigation for blind and visually impaired users across six phases. We start with the foundation (photo capture and AI menu extraction), then build the voice interface (the highest technical risk), layer on conversational exploration (basic then smart), add the allergy safety system, and finish with accessibility hardening and guided retake. Each phase delivers a verifiable capability, and the ordering de-risks the hardest pieces early.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Menu Capture** - Project scaffolding, camera input, AI vision extraction of menu data (completed 2026-03-30)
- [x] **Phase 2: Voice Interface** - Speech recognition, AI TTS via audio element, state machine, fallback TTS (completed 2026-03-30)
- [ ] **Phase 3: Menu Exploration via Voice** - Basic conversational Q&A about menu categories, items, and prices
- [ ] **Phase 4: Smart Conversation & Decision Support** - Multi-turn context, recommendations, and order decision help
- [ ] **Phase 5: Allergy & Preference System** - Local allergy profiles, proactive warnings, safety disclaimers
- [ ] **Phase 6: Accessibility Hardening & Guided Retake** - Voice-only validation, ARIA live regions, photo retake guidance

## Phase Details

### Phase 1: Foundation & Menu Capture
**Goal**: User can photograph restaurant menu pages and receive structured menu data extracted by AI
**Depends on**: Nothing (first phase)
**Requirements**: MENU-01, MENU-02, MENU-03, A11Y-03, A11Y-04
**Success Criteria** (what must be TRUE):
  1. User can open the app on a mobile browser and take a photo of a menu page using the device camera
  2. User can capture multiple menu pages before triggering processing
  3. App sends photos to AI vision and returns structured data with categories, items, descriptions, and prices
  4. All visual UI elements have high contrast and large touch targets
  5. All interactive elements are keyboard navigable
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, types, utilities, test infrastructure
- [x] 01-02-PLAN.md — App shell and UI components (layout, header, all visual components)
- [x] 01-03-PLAN.md — Claude Vision API route and menu extraction pipeline
- [x] 01-04-PLAN.md — Page integration, unit tests, and visual verification

### Phase 2: Voice Interface
**Goal**: User can speak and hear natural voice responses through a reliable, non-conflicting voice loop
**Depends on**: Phase 1
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, A11Y-05, A11Y-06
**Success Criteria** (what must be TRUE):
  1. User can speak a question and hear a spoken response via AI-generated voice played through an audio element
  2. Voice loop never has microphone and TTS active simultaneously (state machine enforced)
  3. If AI TTS is unavailable, app automatically falls back to browser SpeechSynthesis
  4. User hears an audio thinking cue while the app is processing their input
  5. After the app finishes speaking, speech recognition automatically restarts for the next utterance
  6. App announces its current state (listening, thinking, speaking, error) clearly to screen readers
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Voice state machine, test mocks, TTS API route
- [x] 02-02-PLAN.md — Speech recognition, TTS client with sentence buffering, thinking chime
- [x] 02-03-PLAN.md — Voice UI components (VoiceButton, VoiceStateIndicator, TranscriptDisplay, MicPermissionPrompt, TextInputFallback)
- [x] 02-04-PLAN.md — useVoiceLoop hook, page integration, and human verification
- [x] 02-05-PLAN.md — Gap closure: fix voice loop auto-restart after speaking ends

### Phase 3: Menu Exploration via Voice
**Goal**: User can ask about the menu by voice and get accurate spoken answers about categories, items, and prices
**Depends on**: Phase 2
**Requirements**: CONV-01, CONV-02, CONV-06, MENU-05
**Success Criteria** (what must be TRUE):
  1. After menu processing, app proactively speaks an overview of the restaurant type and menu categories
  2. User can ask "What pasta do you have?" and hear a list of items in that category with prices
  3. User can ask about a specific item and hear its description, ingredients, and price
  4. Conversation uses the full extracted menu JSON as context (no summarization or truncation)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Chat API route, system prompt builder with full menu JSON, unit tests
- [x] 03-02-PLAN.md — Voice loop chat integration, proactive overview trigger, human verification

### Phase 4: Smart Conversation & Decision Support
**Goal**: App maintains conversation context across turns and helps the user narrow down choices and decide what to order
**Depends on**: Phase 3
**Requirements**: CONV-03, CONV-04, CONV-05
**Success Criteria** (what must be TRUE):
  1. User can ask for recommendations ("something light", "what's popular") and receive relevant suggestions from the menu
  2. App remembers what was discussed in previous turns (e.g., "tell me more about the second one" works correctly)
  3. User can say "I'm deciding between the salmon and the chicken" and the app helps compare them and reach a decision
**Plans**: 1 plan

Plans:
- [ ] 04-01-PLAN.md — System prompt response rules for recommendations, comparison, and decision support

### Phase 5: Allergy & Preference System
**Goal**: User's allergies and food preferences are tracked locally and applied proactively during menu conversation
**Depends on**: Phase 4
**Requirements**: ALLERGY-01, ALLERGY-02, ALLERGY-03, ALLERGY-04, ALLERGY-05, ALLERGY-06
**Success Criteria** (what must be TRUE):
  1. User can create a profile with allergies and food preferences that persists across browser sessions via IndexedDB
  2. User can mention an allergy during conversation ("I'm allergic to shellfish") and the app captures it without requiring profile setup
  3. When any menu item containing a known allergen is discussed, the app proactively warns the user before they need to ask
  4. App suggests asking the server about allergen-free modifications ("You could ask if they can make it without peanuts")
  5. App speaks a safety disclaimer that allergy information is based on menu text and must be confirmed with restaurant staff
**Plans**: TBD

### Phase 6: Accessibility Hardening & Guided Retake
**Goal**: App works flawlessly via voice alone on iOS Safari with VoiceOver, with no sighted interaction required at any step
**Depends on**: Phase 5
**Requirements**: A11Y-01, A11Y-02, MENU-04
**Success Criteria** (what must be TRUE):
  1. A VoiceOver user can complete the entire flow (open app, capture photos, explore menu, get allergy warnings, decide on order) without any sighted assistance
  2. All app state changes (new menu loaded, error occurred, listening started) are announced via ARIA live regions to screen readers
  3. When a captured photo is unreadable, the app voice-guides the user to retake it with specific advice (e.g., "The photo is too dark, try moving closer to a light source")
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Menu Capture | 4/4 | Complete   | 2026-03-30 |
| 2. Voice Interface | 5/5 | Complete | 2026-03-30 |
| 3. Menu Exploration via Voice | 2/2 | Complete |  2026-03-30 |
| 4. Smart Conversation & Decision Support | 0/1 | Not started | - |
| 5. Allergy & Preference System | 0/TBD | Not started | - |
| 6. Accessibility Hardening & Guided Retake | 0/TBD | Not started | - |
