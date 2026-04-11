# Milestones

## v1.0 MVP (Shipped: 2026-04-11)

**Phases completed:** 8 phases, 24 plans, 48 tasks

**Key accomplishments:**

- 1. [Rule 3 - Blocking] Scaffolded into temp dir due to npm naming restriction
- Seven accessible React components implementing the full Phase 1 interface: skip-link layout, camera-capture scan button, ARIA live loading state, error recovery, expandable menu results, and IndexedDB recent sessions
- POST /api/menu/extract sends labeled multi-page images to claude-sonnet-4-6 and returns structured Menu JSON; useMenuExtraction hook orchestrates the full resize-to-dispatch pipeline
- Main page wired with useReducer(appReducer) driving idle/processing/results/error states, 39 unit tests passing across all components, hooks, and state machine
- Voice state machine discriminated union (idle|listening|processing|speaking|error) with strict transition enforcement plus OpenAI TTS proxy route (tts-1/nova) and jsdom mocks for SpeechRecognition, AudioContext, and speechSynthesis
- SpeechManager (single-turn recognition with iOS fallback and auto-restart), TTSClient (sentence buffering, audio queue, blob URL cleanup, SpeechSynthesis fallback with retry), and ThinkingChime (440Hz Web Audio API oscillator every 2s) — all fully tested
- Five accessible voice UI components — VoiceButton (80px mic with state aria-labels), VoiceStateIndicator (always-mounted ARIA live region), TranscriptDisplay, MicPermissionPrompt, TextInputFallback — with 41 passing tests
- useVoiceLoop hook wires SpeechManager, TTSClient, and thinking chime through the voiceReducer state machine; page.tsx integrates the complete voice UI into the results state with auto-start listening (D-01), 14 passing tests, 155 total suite green
- Auto-restart gap closed: useEffect now calls speechManagerRef.current.start() on the speaking->listening transition, enabling continuous hands-free voice conversation
- Streaming Claude chat endpoint with full-menu system prompt injection using ReadableStream + Anthropic stream.on('text') pipeline
- Claude chat streaming wired into voice loop with conversation history, AbortController cancellation, and proactive menu overview auto-spoken on extraction completion
- `src/lib/chat-prompt.ts`
- UserProfile IndexedDB CRUD and allergy marker parsing utilities — foundational data layer for all downstream Phase 5 plans
- Allergy-aware system prompt with proactive warning, once-per-session disclaimer, in-conversation marker capture, and profile piped from IndexedDB through useVoiceLoop to /api/chat on every turn
- Extended AppState with retake variant (5 status values), AppStateAnnouncer sr-only live region for extraction transitions, and per-route page titles for Next.js route announcer — 15 new tests, 255 total passing
- RetakeGuidance component with VoiceOver-safe ARIA alert, quality detection in useMenuExtraction dispatching EXTRACTION_LOW_QUALITY for low-confidence/warned extractions, and page.tsx fully wired for retake cycle with attemptCount threading
- One-shot welcome TTS wired to first ScanButton tap via TTSClient audio element, satisfying iOS Safari autoplay policy and completing A11Y-01 VoiceOver end-to-end accessibility
- globals.css
- FadePanel.tsx
- src/lib/indexeddb.ts
- Warm palette migration completed in VoiceStateIndicator and settings page (border-accent, text-accent, bg-destructive, bg-muted), and Phase 7 design decisions D-01 through D-18 added to REQUIREMENTS.md traceability table
- Security headers (CSP with blob:, Permissions-Policy microphone/camera), Edge Runtime on extract route, Content-Type 415 validation, and structured JSON usage logging on all three API routes — production build passes, Edge bundle is 110 KB gzipped
- Updated .env.example with complete Vercel deployment instructions; 296 tests pass, build clean; Phase 7 polish committed — codebase ready to push to GitHub and deploy on Vercel

---
