# MenuVoice Requirements

**Defined:** 2026-03-29
**Core Value:** A blind person can independently understand and choose from any restaurant menu through voice conversation.

---

## v1 Requirements

### Menu Capture & Processing (MENU)
- [ ] **MENU-01**: User can take photos of restaurant menu pages using device camera
- [ ] **MENU-02**: User can capture multiple menu pages in a single session
- [ ] **MENU-03**: App processes menu photos into structured menu data (categories, items, descriptions, prices) via AI vision
- [ ] **MENU-04**: App detects when a photo is unreadable and voice-guides user to retake it
- [ ] **MENU-05**: App presents a proactive spoken overview of the restaurant type and menu categories after processing

### Voice Interface (VOICE)
- [ ] **VOICE-01**: User can speak commands and questions using speech recognition
- [ ] **VOICE-02**: App responds with natural AI-generated voice via `<audio>` element (not SpeechSynthesis, to avoid screen reader conflict)
- [ ] **VOICE-03**: App falls back to browser SpeechSynthesis when AI TTS is unavailable
- [ ] **VOICE-04**: Voice loop uses strict state machine — listening OR speaking, never both
- [ ] **VOICE-05**: App provides audio feedback during processing ("thinking" cue) so user knows it's working
- [ ] **VOICE-06**: Speech recognition auto-restarts after silence/completion for continuous conversation

### Conversational Exploration (CONV)
- [ ] **CONV-01**: User can ask about menu categories ("What pasta do you have?")
- [ ] **CONV-02**: User can ask about specific items — ingredients, preparation, description
- [ ] **CONV-03**: User can ask for recommendations based on preferences ("Something light", "What's popular")
- [ ] **CONV-04**: App maintains conversation context across multiple turns
- [ ] **CONV-05**: App helps user narrow down choices and decide what to order
- [ ] **CONV-06**: App uses full extracted menu data in conversation context (no summarization)

### Allergy & Preference Management (ALLERGY)
- [ ] **ALLERGY-01**: User can create a profile with allergies and food preferences stored locally
- [ ] **ALLERGY-02**: User can mention allergies/dislikes during conversation and app captures them on the fly
- [ ] **ALLERGY-03**: App proactively warns when a mentioned menu item contains a known allergen or disliked ingredient
- [ ] **ALLERGY-04**: App suggests asking the server if a dish can be made without the allergen/disliked ingredient
- [ ] **ALLERGY-05**: App includes spoken safety disclaimer that allergy info is based on menu text and should be confirmed with staff
- [ ] **ALLERGY-06**: Profile persists across sessions via local browser storage (IndexedDB)

### Accessibility (A11Y)
- [ ] **A11Y-01**: All functionality accessible via voice alone — no visual interaction required
- [ ] **A11Y-02**: ARIA live regions announce app state changes to screen readers
- [ ] **A11Y-03**: High-contrast, large touch targets for any visual UI elements
- [ ] **A11Y-04**: Keyboard navigable for users with partial vision
- [ ] **A11Y-05**: TTS output uses `<audio>` element to avoid conflict with active screen readers
- [ ] **A11Y-06**: App announces its state clearly (listening, thinking, speaking, error)

---

## v2 Requirements
- Multi-language menu support (non-English menus translated and spoken in user's language)
- Native mobile app (iOS/Android) with deeper camera and audio integration
- Cloud account sync for profiles across devices
- Restaurant history — remember past visits and what was ordered
- Dietary mode presets (vegan, keto, halal, kosher, etc.)
- Server/whisper fallback for speech recognition when Web Speech API unavailable
- Offline mode with cached menu data and browser-only conversation
- Price comparison and budget filtering ("What can I get under $15?")
- Companion mode — sighted helper can see visual UI while blind user uses voice

---

## Out of Scope

| Feature | Reason |
|---|---|
| Payment/ordering integration | Different problem domain; adds complexity without serving core value |
| Restaurant database/menu pre-loading | Photo-first approach is more universal and doesn't require partnerships |
| Social features (reviews, sharing) | Scope creep; doesn't serve the core accessibility mission |
| Nutritional calculation | Unreliable from menu text alone; liability risk |
| Server/waitstaff-facing features | Different user entirely; future product |
| User accounts with authentication | Adds friction for blind users; local storage sufficient for v1 |

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| MENU-01 | Phase 1 | Pending |
| MENU-02 | Phase 1 | Pending |
| MENU-03 | Phase 1 | Pending |
| MENU-04 | Phase 6 | Pending |
| MENU-05 | Phase 3 | Pending |
| VOICE-01 | Phase 2 | Pending |
| VOICE-02 | Phase 2 | Pending |
| VOICE-03 | Phase 2 | Pending |
| VOICE-04 | Phase 2 | Pending |
| VOICE-05 | Phase 2 | Pending |
| VOICE-06 | Phase 2 | Pending |
| CONV-01 | Phase 3 | Pending |
| CONV-02 | Phase 3 | Pending |
| CONV-03 | Phase 4 | Pending |
| CONV-04 | Phase 4 | Pending |
| CONV-05 | Phase 4 | Pending |
| CONV-06 | Phase 3 | Pending |
| ALLERGY-01 | Phase 5 | Pending |
| ALLERGY-02 | Phase 5 | Pending |
| ALLERGY-03 | Phase 5 | Pending |
| ALLERGY-04 | Phase 5 | Pending |
| ALLERGY-05 | Phase 5 | Pending |
| ALLERGY-06 | Phase 5 | Pending |
| A11Y-01 | Phase 6 | Pending |
| A11Y-02 | Phase 6 | Pending |
| A11Y-03 | Phase 1 | Pending |
| A11Y-04 | Phase 1 | Pending |
| A11Y-05 | Phase 2 | Pending |
| A11Y-06 | Phase 2 | Pending |

**Coverage:** 29 requirements total | 29 mapped | 0 unmapped
