# MenuVoice

Voice-first web app helping blind and visually impaired people navigate restaurant menus through AI-powered conversation.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **AI:** Claude API (Anthropic SDK) — vision for menu OCR, conversation for exploration
- **Voice In:** Web Speech API (browser-native speech recognition)
- **Voice Out:** OpenAI TTS via `<audio>` element (primary), browser SpeechSynthesis (fallback)
- **Storage:** IndexedDB via idb — local user profiles (allergies, preferences)
- **Styling:** Tailwind CSS

## Critical Architecture Decisions
- TTS output MUST use `<audio>` element, NOT browser SpeechSynthesis — avoids screen reader conflict
- Voice loop uses strict state machine: `idle | listening | processing | speaking | error`
- Photo capture uses `<input type="file" capture="environment">` — accessible to VoiceOver/TalkBack
- All menu photos sent in single Claude Vision call for cross-page context
- Full menu JSON injected into system prompt (~3-5K tokens) — no summarization
- Streaming + sentence buffering for TTS to reduce perceived latency
- Allergy information ALWAYS includes safety disclaimer — never present as definitive

## Project Structure
- `.planning/` — GSD workflow artifacts (roadmap, requirements, research, state)
- `CLAUDE.md` — this file

## Commands
_(to be added as project scaffolding is created)_
