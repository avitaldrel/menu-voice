# MenuVoice Requirements

**Defined:** 2026-03-29
**Core Value:** A blind person can independently understand and choose from any restaurant menu through voice conversation.

---

## v1 Requirements

### Menu Capture & Processing (MENU)
- [x] **MENU-01**: User can take photos of restaurant menu pages using device camera
- [x] **MENU-02**: User can capture multiple menu pages in a single session
- [x] **MENU-03**: App processes menu photos into structured menu data (categories, items, descriptions, prices) via AI vision
- [x] **MENU-04**: App detects when a photo is unreadable and voice-guides user to retake it
- [x] **MENU-05**: App presents a proactive spoken overview of the restaurant type and menu categories after processing

### Voice Interface (VOICE)
- [x] **VOICE-01**: User can speak commands and questions using speech recognition
- [x] **VOICE-02**: App responds with natural AI-generated voice via `<audio>` element (not SpeechSynthesis, to avoid screen reader conflict)
- [x] **VOICE-03**: App falls back to browser SpeechSynthesis when AI TTS is unavailable
- [x] **VOICE-04**: Voice loop uses strict state machine — listening OR speaking, never both
- [x] **VOICE-05**: App provides audio feedback during processing ("thinking" cue) so user knows it's working
- [x] **VOICE-06**: Speech recognition auto-restarts after silence/completion for continuous conversation

### Conversational Exploration (CONV)
- [x] **CONV-01**: User can ask about menu categories ("What pasta do you have?")
- [x] **CONV-02**: User can ask about specific items — ingredients, preparation, description
- [x] **CONV-03**: User can ask for recommendations based on preferences ("Something light", "What's popular")
- [x] **CONV-04**: App maintains conversation context across multiple turns
- [x] **CONV-05**: App helps user narrow down choices and decide what to order
- [x] **CONV-06**: App uses full extracted menu data in conversation context (no summarization)

### Allergy & Preference Management (ALLERGY)
- [x] **ALLERGY-01**: User can create a profile with allergies and food preferences stored locally
- [x] **ALLERGY-02**: User can mention allergies/dislikes during conversation and app captures them on the fly
- [x] **ALLERGY-03**: App proactively warns when a mentioned menu item contains a known allergen or disliked ingredient
- [x] **ALLERGY-04**: App suggests asking the server if a dish can be made without the allergen/disliked ingredient
- [x] **ALLERGY-05**: App includes spoken safety disclaimer that allergy info is based on menu text and should be confirmed with staff
- [x] **ALLERGY-06**: Profile persists across sessions via local browser storage (IndexedDB)

### Accessibility (A11Y)
- [x] **A11Y-01**: All functionality accessible via voice alone — no visual interaction required
- [x] **A11Y-02**: ARIA live regions announce app state changes to screen readers
- [x] **A11Y-03**: High-contrast, large touch targets for any visual UI elements
- [x] **A11Y-04**: Keyboard navigable for users with partial vision
- [x] **A11Y-05**: TTS output uses `<audio>` element to avoid conflict with active screen readers
- [x] **A11Y-06**: App announces its state clearly (listening, thinking, speaking, error)

### Phase 7 Design Decisions (D)
- [x] **D-01**: Warmer aesthetic — teal/sage accent for primary actions and interactive elements
- [x] **D-02**: Background from #fafafa to warm off-white cream tone
- [x] **D-03**: Logo colors updated to warm/teal palette
- [x] **D-04**: One hero action per screen — dominant button large and prominent, secondary subdued
- [x] **D-05**: Transcript display polished with warm palette clean container
- [x] **D-06**: Menu summary display warm aesthetic (Claude's discretion)
- [x] **D-07**: Smooth fade/slide transitions between states (300ms CSS transitions)
- [x] **D-08**: Pulsing status messages during extraction with smooth text transitions
- [x] **D-09**: Auto-overview then listen — smoother transition into conversation mode
- [x] **D-10**: TTS fade out over 200ms on interrupt, brief pause, then mic activates
- [x] **D-11**: Welcome TTS plays on first load (iOS Safari autoplay compliance fix)
- [x] **D-12**: Scan new menu from results state without page refresh
- [x] **D-13**: Settings gear discoverable — 44px tap target, descriptive aria-label
- [x] **D-14**: Retake flow clarity — clearer guidance messaging and smoother transition
- [x] **D-15**: Menu summary accessible while in voice conversation mode
- [x] **D-16**: Tutorial and contextual hints for new users
- [x] **D-17**: Voice-accessible settings — say "open settings" during conversation
- [x] **D-18**: Hints decrease in frequency over sessions

### Production Deployment (DEPLOY)
- [ ] **DEPLOY-01**: Security headers (CSP, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) on all HTTP responses
- [ ] **DEPLOY-02**: /api/menu/extract runs on Edge Runtime for streaming timeout resilience
- [ ] **DEPLOY-03**: All API routes validate Content-Type header and reject malformed requests with 415
- [ ] **DEPLOY-04**: All API routes log structured JSON (event, IP, timestamp) for usage/spend monitoring via Vercel Runtime Logs
- [ ] **DEPLOY-05**: Production build succeeds with Edge Runtime bundle within Vercel Hobby tier limits
- [ ] **DEPLOY-06**: .env.example documents all required environment variables with setup instructions
- [ ] **DEPLOY-07**: App is live at a public Vercel URL with full user flow working end-to-end

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
| MENU-01 | Phase 1 | Complete |
| MENU-02 | Phase 1 | Complete |
| MENU-03 | Phase 1 | Complete |
| MENU-04 | Phase 6 | Complete |
| MENU-05 | Phase 3 | Complete |
| VOICE-01 | Phase 2 | Complete |
| VOICE-02 | Phase 2 | Complete |
| VOICE-03 | Phase 2 | Complete |
| VOICE-04 | Phase 2 | Complete |
| VOICE-05 | Phase 2 | Complete |
| VOICE-06 | Phase 2 | Complete |
| CONV-01 | Phase 3 | Complete |
| CONV-02 | Phase 3 | Complete |
| CONV-03 | Phase 4 | Complete |
| CONV-04 | Phase 4 | Complete |
| CONV-05 | Phase 4 | Complete |
| CONV-06 | Phase 3 | Complete |
| ALLERGY-01 | Phase 5 | Complete |
| ALLERGY-02 | Phase 5 | Complete |
| ALLERGY-03 | Phase 5 | Complete |
| ALLERGY-04 | Phase 5 | Complete |
| ALLERGY-05 | Phase 5 | Complete |
| ALLERGY-06 | Phase 5 | Complete |
| A11Y-01 | Phase 6 | Complete |
| A11Y-02 | Phase 6 | Complete |
| A11Y-03 | Phase 1 | Complete |
| A11Y-04 | Phase 1 | Complete |
| A11Y-05 | Phase 2 | Complete |
| A11Y-06 | Phase 2 | Complete |
| D-01 | Phase 7 | Complete |
| D-02 | Phase 7 | Complete |
| D-03 | Phase 7 | Complete |
| D-04 | Phase 7 | Complete |
| D-05 | Phase 7 | Complete |
| D-06 | Phase 7 | Complete |
| D-07 | Phase 7 | Complete |
| D-08 | Phase 7 | Complete |
| D-09 | Phase 7 | Complete |
| D-10 | Phase 7 | Complete |
| D-11 | Phase 7 | Complete |
| D-12 | Phase 7 | Complete |
| D-13 | Phase 7 | Complete |
| D-14 | Phase 7 | Complete |
| D-15 | Phase 7 | Complete |
| D-16 | Phase 7 | Complete |
| D-17 | Phase 7 | Complete |
| D-18 | Phase 7 | Complete |
| DEPLOY-01 | Phase 8 | Planned |
| DEPLOY-02 | Phase 8 | Planned |
| DEPLOY-03 | Phase 8 | Planned |
| DEPLOY-04 | Phase 8 | Planned |
| DEPLOY-05 | Phase 8 | Planned |
| DEPLOY-06 | Phase 8 | Planned |
| DEPLOY-07 | Phase 8 | Planned |

**Coverage:** 54 requirements total | 54 mapped | 0 unmapped
