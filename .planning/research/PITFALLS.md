# Domain Pitfalls

**Domain:** Voice-first accessibility web app (restaurant menu navigation for blind/visually impaired users)
**Project:** MenuVoice
**Researched:** 2026-03-29

---

## Critical Pitfalls

Mistakes that cause rewrites, user safety issues, or fundamental UX failures.

---

### Pitfall 1: Web Speech API and Screen Reader Audio Collision

**What goes wrong:** The app's TTS output (either browser SpeechSynthesis or streamed audio from OpenAI/ElevenLabs) collides with the user's active screen reader (NVDA, JAWS, VoiceOver). Both attempt to control the audio channel simultaneously, producing garbled overlapping speech that is incomprehensible. For a blind user, this is not a minor annoyance -- it renders the entire application unusable.

**Why it happens:** Screen readers intercept DOM changes via ARIA live regions and announce them. If the app uses `aria-live="assertive"` to announce status changes while simultaneously playing TTS audio, the screen reader will try to speak over the TTS. Conversely, if the app uses `SpeechSynthesis` (browser-native TTS), it occupies the same speech channel as the screen reader on some platforms, causing one to queue behind or interrupt the other.

**Consequences:**
- Blind users hear garbled overlapping speech
- Users may not be able to stop either audio stream
- Complete app abandonment

**Prevention:**
- Use `<audio>` element playback of API-generated TTS (OpenAI/ElevenLabs) rather than browser `SpeechSynthesis` for the main conversational voice. Audio element playback does NOT conflict with screen readers because it goes through the media audio channel, not the accessibility speech channel.
- Minimize ARIA live region announcements to brief status cues (e.g., "Processing...") and let the TTS audio handle all substantive content.
- Provide a clear mechanism for users to choose between "screen reader mode" (all output via ARIA live regions for their screen reader to voice) and "app voice mode" (all output via audio playback). Detect screen reader presence heuristically and default to the right mode.
- Never use `aria-live="assertive"` while TTS audio is playing. Queue status announcements for after audio ends.
- Test with actual screen readers: VoiceOver on iOS, NVDA on Windows, TalkBack on Android.

**Detection:** Test the app with a screen reader active. If you hear overlapping speech at any point, you have this bug.

**Confidence:** HIGH (based on MDN ARIA live regions documentation confirming `assertive` interrupts current speech, and well-established screen reader behavior)

---

### Pitfall 2: Allergy Information Accuracy and Liability

**What goes wrong:** The AI extracts menu text via OCR/vision, then answers user questions about allergens ("Does the pad thai contain peanuts?"). The AI provides incorrect allergy information -- either because the menu photo was blurry, the OCR misread an ingredient, the menu did not list all ingredients, or the AI hallucinated a confident answer. The user has an allergic reaction.

**Why it happens:**
- Menu photos taken in restaurants have variable quality: dim lighting, glare, camera shake, reflections
- Decorative fonts and handwritten menus cause OCR/vision errors
- Menus frequently do NOT list all ingredients, especially sub-ingredients (e.g., "house sauce" may contain peanuts without saying so)
- LLMs are prone to generating confident-sounding but incorrect answers, especially when asked to infer information not present in the source text
- Claude's vision capabilities are good but not infallible -- small text, unusual fonts, and low contrast reduce accuracy

**Consequences:**
- Anaphylactic shock or other severe allergic reactions (life-threatening)
- Potential legal liability for the app developer
- Loss of all user trust permanently

**Prevention:**
- **Hard rule: Never present allergy information as definitive.** Every allergy-related response MUST include a disclaimer: "Based on what I can read on the menu, [answer]. However, menus may not list all ingredients. Please confirm with your server before ordering."
- Instruct Claude via system prompt to ALWAYS caveat allergy responses and to say "I cannot determine this from the menu" when ingredients are not explicitly listed rather than guessing.
- When Claude's vision confidence for a menu item is low (blurry region, unreadable text), say so explicitly: "I had trouble reading this part of the menu clearly."
- Log allergy-related queries separately for quality monitoring.
- Include Terms of Service that explicitly state the app does not guarantee allergy information accuracy.
- Consider a prominent onboarding screen where users acknowledge that allergy information is best-effort and must be confirmed with restaurant staff.
- Design the conversation to actively suggest: "Would you like me to help you phrase a question for your server about allergens?"

**Detection:** Audit AI responses to allergy questions against known menu contents. Test with intentionally blurry menu photos.

**Confidence:** HIGH (this is a well-known liability pattern in food-tech applications; the AI hallucination risk is well-documented)

---

### Pitfall 3: Web Speech API Browser Incompatibility Breaks Core Functionality

**What goes wrong:** The SpeechRecognition API is marked as "not Baseline" on MDN -- it does not work consistently across all widely-used browsers. For a voice-first app where speech recognition IS the primary input method, this is not a graceful degradation scenario. If speech recognition fails, the app has no usable input method for blind users.

**Why it happens:**
- Firefox: SpeechRecognition has historically had limited or no support. Firefox has been slow to implement the Web Speech API recognition side.
- Safari/iOS: Uses `webkitSpeechRecognition` prefix. Behavior differs from Chrome in continuous mode, error handling, and session management.
- Chrome: Sends audio to Google servers for processing (requires internet, raises privacy concerns). Works most reliably but is server-dependent.
- The `continuous` property is explicitly flagged as "not Baseline" on MDN.
- Mobile browsers may terminate background audio/recognition when the screen locks or the browser is backgrounded.

**Known SpeechRecognition error types (from MDN):**
| Error | Cause | Impact |
|-------|-------|--------|
| `no-speech` | Silence detected | Common in noisy restaurants where user pauses |
| `audio-capture` | Microphone access failed | iOS permission quirks |
| `network` | Server-side recognition failed (Chrome) | Restaurant WiFi may be poor |
| `not-allowed` | Permission denied | User must re-grant permission |
| `language-not-supported` | Language pack unavailable | On-device recognition limitation |
| `service-not-allowed` | Browser policy blocks recognition | Enterprise/privacy browser settings |

**Consequences:**
- App is completely unusable on certain browsers
- Users in restaurants with poor WiFi cannot use Chrome's server-based recognition
- Continuous recognition stops unexpectedly, requiring manual restart the user may not realize is needed

**Prevention:**
- **Target Chrome (desktop + Android) and Safari (iOS) as primary browsers.** Do not promise Firefox support initially.
- Always use the prefix fallback: `window.SpeechRecognition || window.webkitSpeechRecognition`
- Implement robust reconnection logic: when `recognition.onend` fires unexpectedly, automatically restart recognition after a short delay (but cap retries to avoid infinite loops).
- Handle every error type explicitly with user-friendly voice feedback (not just console.log).
- For the `network` error: implement a retry with exponential backoff. If persistent, inform the user their connection may be poor.
- For `no-speech`: do NOT treat silence as an error. Reset the timeout and keep listening. In a restaurant, users may pause to talk to servers.
- Build a fallback text input (accessible via screen reader) for when speech recognition is unavailable.
- Test on actual iOS devices -- simulator behavior differs from real Safari.
- Monitor the `processLocally` experimental feature (on-device recognition) as a future privacy-friendly option.

**Detection:** Test on Safari iOS, Chrome Android, Chrome desktop, and Firefox. Track `onerror` events in production analytics.

**Confidence:** HIGH (MDN documentation explicitly states "not Baseline" for SpeechRecognition and continuous property; error types confirmed from MDN SpeechRecognitionErrorEvent documentation)

---

### Pitfall 4: TTS Latency Creates Unacceptable Conversational Pauses

**What goes wrong:** The user asks a question via voice. The app must: (1) finish speech recognition, (2) send text + menu context to Claude API, (3) receive Claude's response, (4) send response text to TTS API (OpenAI/ElevenLabs), (5) receive audio, (6) play audio. Total latency can easily exceed 3-5 seconds, creating awkward silence that makes blind users wonder if the app crashed.

**Why it happens:**
- Claude API latency: 1-3 seconds for a typical response (varies with prompt size; menu context can be large)
- TTS API latency: 0.5-2 seconds for audio generation (OpenAI TTS) depending on text length
- Network round-trips: two sequential API calls (Claude then TTS)
- Restaurant WiFi is often slow and unreliable
- Large menu context (full OCR text of multi-page menus) increases Claude input token processing time

**Consequences:**
- Users think the app froze and repeat their question (causing duplicate requests)
- Users give up and ask a companion or server instead
- Perception of the app as slow and unreliable

**Prevention:**
- **Implement an immediate audio "thinking" indicator.** Play a brief, distinctive sound (a gentle chime or short phrase like "Let me check...") within 200ms of recognizing the end of user speech. This is the single most important latency mitigation.
- **Use streaming for both APIs:**
  - Claude API: Use streaming responses. Begin processing the first sentence of Claude's response while the rest generates.
  - TTS: Use OpenAI's TTS streaming endpoint or ElevenLabs' streaming WebSocket. Begin audio playback of the first sentence while subsequent sentences are still being generated and converted.
- **Sentence-level pipelining:** Split Claude's streamed response at sentence boundaries. Send each sentence to TTS immediately. Play audio of sentence 1 while sentence 2 is being converted. This can reduce perceived latency to under 2 seconds.
- **Cache common queries:** "What's on the menu?" / "Read me the appetizers" / "What are the prices?" can have pre-computed responses after initial menu processing.
- **Keep menu context concise:** Don't send the entire raw OCR text every turn. Pre-process the menu into structured data (categories, items, prices, descriptions) and send only the relevant section for the user's question.
- **Consider Claude Haiku for simple queries** (reading menu items back) and Sonnet for complex queries (allergy analysis, recommendations). Haiku is significantly faster.
- **Measure and report:** Track p50/p95 latency for the full question-to-audio pipeline. Set a target of <2s for p50.

**Detection:** Measure time from end of user speech to first audio byte of response. If >3 seconds regularly, the UX is degraded.

**Confidence:** HIGH for the problem; MEDIUM for specific latency numbers (Claude and OpenAI TTS latencies based on training data, may have changed)

---

## Moderate Pitfalls

---

### Pitfall 5: Menu OCR/Vision Failure Modes

**What goes wrong:** Claude's vision capabilities fail to accurately extract text from menu photos, producing garbled, incomplete, or incorrect menu data that the entire conversation is then built upon.

**Common failure scenarios:**
| Scenario | Why It Fails | Frequency |
|----------|-------------|-----------|
| Decorative/script fonts | Ornate typography is hard for vision models | Common at upscale restaurants |
| Dim restaurant lighting | Low-contrast, noisy photos | Very common |
| Laminated menu glare | Reflections obscure text | Common |
| Handwritten specials boards | Cursive/artistic handwriting | Common |
| Multi-column layouts | Vision model may read across columns incorrectly | Common |
| Multi-language menus | Dish names in Italian/Japanese with English descriptions | Common |
| Folded/curved menus | Text distortion at fold lines | Moderate |
| Very long menus (10+ pages) | Multiple photos needed, context assembly | Moderate |
| QR code menus (link, not text) | Photo captures QR code, not menu content | Increasing |

**Prevention:**
- Provide photo-taking guidance via voice: "Hold the menu flat, make sure the flash is on, and take the photo in landscape orientation."
- Implement a confidence check: after extracting menu text, ask Claude to rate its confidence in the extraction. If low, ask the user to retake the photo.
- For multi-page menus, provide a clear voice flow: "I've captured page 1. Say 'next page' when you're ready to photograph page 2."
- Support QR code detection: if the image contains a QR code, inform the user and suggest they ask their server to read the URL or provide a physical menu.
- Pre-process images: auto-rotate, adjust brightness/contrast, crop to menu area before sending to Claude.
- For multi-column layouts, consider sending the image with a system prompt that says "This menu may have multiple columns. Read left column completely before right column."
- Store the raw extracted text so users can ask the AI to re-read or clarify specific items.

**Detection:** Track the ratio of "I can't read that" or low-confidence extractions. A/B test with image preprocessing vs. raw photos.

**Confidence:** MEDIUM (Claude vision capabilities are strong but specific failure modes with decorative fonts are based on general LLM vision limitations, not MenuVoice-specific testing)

---

### Pitfall 6: iOS Safari Camera and Microphone Permission Quirks

**What goes wrong:** iOS Safari has specific behaviors around camera/microphone permissions that differ from Android Chrome, causing the app to fail silently or present confusing permission flows on the platform where most blind users are (iPhone with VoiceOver).

**Known iOS-specific issues:**
- **getUserMedia requires HTTPS** (all browsers, but iOS enforces strictly) -- `navigator.mediaDevices` is literally `undefined` on HTTP.
- **The `capture` attribute on `<input type="file">` is "not Baseline"** per MDN -- behavior varies across browsers. On iOS, `capture="environment"` opens the camera directly; without it, users get a picker dialog that requires visual navigation.
- **Permission prompts are modal dialogs** that interrupt VoiceOver flow. The user must grant camera AND microphone permissions, often as separate prompts.
- **iOS may kill background audio/recognition** when the screen auto-locks. Users in restaurants may set their phone down between questions.
- **Safari does not auto-play audio** without a user gesture. The first TTS playback must be triggered by a user interaction (tap or voice command that triggers a click handler).
- **Camera orientation metadata** may not be consistent. Photos taken in portrait vs. landscape may need rotation correction before sending to Claude.
- **Permission re-prompting:** If a user accidentally denies camera/microphone, Safari does not re-prompt. They must go to Settings > Safari > Camera/Microphone to re-enable. The app must detect this and provide voice guidance.

**Prevention:**
- Use `<input type="file" accept="image/*" capture="environment">` for camera access rather than `getUserMedia` when possible. This is simpler and works more consistently on iOS for photo capture.
- Implement permission state detection: check `navigator.permissions.query()` (where supported) and provide clear voice instructions if permissions are denied.
- Keep the screen active during use: consider `navigator.wakeLock.request('screen')` to prevent auto-lock during a menu session (Wake Lock API).
- For audio autoplay: require a user gesture (button tap or speech command response) before the first TTS playback. The user's initial "start" interaction serves as the gesture.
- Handle orientation via EXIF data or CSS `image-orientation: from-image`.
- Test on actual iPhones with VoiceOver enabled -- this is the single most important test device.

**Detection:** Test the full flow on an iPhone with VoiceOver: launch app, grant permissions, take photo, have conversation, lock screen and return.

**Confidence:** MEDIUM (getUserMedia HTTPS requirement confirmed by MDN; capture attribute "not Baseline" confirmed by MDN; autoplay restrictions are well-documented; specific VoiceOver interaction details from training data)

---

### Pitfall 7: API Cost Explosion Per Restaurant Visit

**What goes wrong:** Each restaurant visit involves: (1) one or more large image inputs to Claude for menu extraction, (2) multiple conversational turns with Claude including the full menu context, (3) TTS API calls for every response. Costs can reach $0.50-2.00+ per visit, making the service financially unsustainable without a pricing model.

**Cost breakdown estimate (based on training data, verify current pricing):**
| Operation | Estimated Cost | Per Visit |
|-----------|---------------|-----------|
| Claude Sonnet vision (menu photo, ~1000 tokens image + extraction) | ~$0.01-0.05 per image | 1-4 images = $0.02-0.20 |
| Claude conversation turns (menu context ~2000 tokens + Q&A) | ~$0.01-0.03 per turn | 5-15 turns = $0.05-0.45 |
| OpenAI TTS (~100 words per response) | ~$0.006-0.015 per response | 5-15 responses = $0.03-0.23 |
| **Total per visit** | | **$0.10-0.88** |

With heavy users visiting restaurants 3-5x/week, monthly costs per user could reach $5-20 in API costs alone.

**Prevention:**
- **Use Claude Haiku for simple queries** (reading back menu items, prices) and reserve Sonnet for complex reasoning (dietary recommendations, allergy analysis). This can cut LLM costs by 5-10x for most turns.
- **Cache the extracted menu structure.** After the initial vision extraction, store the structured menu data in IndexedDB. Subsequent conversation turns reference the cached text, not the image. If the user returns to the same restaurant, skip extraction entirely.
- **Minimize per-turn context.** Don't send the entire menu every turn. Track what section the user is exploring and send only relevant items.
- **Use browser SpeechSynthesis as a fallback TTS** for simple responses (reading item names and prices) and reserve API TTS (OpenAI/ElevenLabs) for longer, more natural conversational responses.
- **Implement usage limits** for free tier and charge for premium (unlimited visits).
- **Consider ElevenLabs vs. OpenAI TTS pricing** -- compare per-character costs for the expected usage volume.
- **Batch menu processing:** extract the entire menu structure in one Claude call rather than multiple calls per page where possible (send multiple images in one request).

**Detection:** Track cost per user per visit. Set alerts if average cost exceeds $0.50/visit.

**Confidence:** LOW for specific dollar amounts (API pricing changes frequently; estimates based on training data pricing that may be outdated). HIGH for the general concern that multi-API-call conversational apps have real cost challenges.

---

### Pitfall 8: Focus Management and Keyboard Trap Anti-Patterns

**What goes wrong:** The app creates custom UI elements (modals, overlays, loading states) that trap keyboard/VoiceOver focus, preventing the user from navigating to the controls they need. Alternatively, focus is lost after dynamic content updates, leaving the user stranded on the page with no way to know where they are.

**Common anti-patterns for blind users:**
| Anti-Pattern | What Happens | Fix |
|-------------|-------------|-----|
| Modal without focus trap | User tabs out of modal into background content | Use `inert` attribute on background content |
| Focus trap without escape | User cannot close modal via keyboard | Always handle Escape key and provide close button |
| Dynamic content replaces focused element | Focus falls to `<body>`, user is lost | Move focus to the replacement content or a logical next element |
| Auto-playing audio on page load | Conflicts with screen reader's page announcement | Never auto-play; wait for user gesture |
| Loading spinner with no announcement | Blind user doesn't know app is working | Use `aria-live="polite"` with "Loading..." text |
| Custom buttons without roles | Screen reader doesn't announce clickability | Use `<button>` elements, not `<div onclick>` |
| Images without alt text | Menu photos are announced as "image" with no context | Provide descriptive alt: "Photo of restaurant menu page 1" |
| Touch gestures with no alternatives | Swipe-to-navigate conflicts with VoiceOver gestures | Provide button-based navigation alternatives |
| Status messages without live regions | User doesn't know the app state changed | Use `role="status"` with `aria-live="polite"` |

**Prevention:**
- Keep the UI extremely simple. A voice-first app should have minimal visual UI: a large "start" button, a status indicator, and a "take photo" button. Fewer elements = fewer focus management bugs.
- Use semantic HTML (`<button>`, `<main>`, `<nav>`, `<h1>`) rather than ARIA-heavy `<div>` soup.
- After every state change (photo taken, response received, error), explicitly manage focus: move it to the most relevant element.
- Test every flow with keyboard-only navigation (Tab, Shift+Tab, Enter, Escape).
- Use `aria-live="polite"` for status updates, NEVER `aria-live="assertive"` unless the house is on fire.
- Known VoiceOver iOS bug: combining `role="alert"` with `aria-live="assertive"` causes double-speaking. Use one or the other, not both (confirmed by MDN documentation).

**Detection:** Navigate the entire app using only VoiceOver on iOS. Every action should be discoverable and every state change should be announced.

**Confidence:** HIGH (ARIA live region double-speaking bug confirmed by MDN; focus management patterns are well-established accessibility best practices)

---

### Pitfall 9: Privacy Concerns with Menu Photos and Conversation Logs

**What goes wrong:** Menu photos contain EXIF metadata revealing the user's GPS location, timestamp, and device info. Combined with conversation logs ("I have a peanut allergy"), this creates a detailed profile of where a disabled person eats, when, what they order, and their medical conditions. A data breach exposes highly sensitive information.

**Specific risks:**
- **EXIF location data** in photos pinpoints the restaurant and the user's dining habits
- **Allergy/dietary information** is health data (potentially subject to health privacy regulations)
- **Voice recordings** (if stored) are biometric data (subject to laws like Illinois BIPA)
- **Conversation logs** reveal dietary restrictions, religious dietary laws, medical conditions
- **Claude API sends data to Anthropic's servers** for processing (menu images and conversation text leave the device)
- **TTS API sends text to OpenAI/ElevenLabs servers** (user's dietary questions are transmitted)

**Prevention:**
- **Strip EXIF data from photos before sending to any API.** Use client-side JavaScript (canvas redraw strips EXIF) or a library like `exif-js` to remove metadata.
- **Do not store conversation logs on any server.** Process conversations in-memory. Use IndexedDB for client-side caching of menu structures only (not personal health data).
- **Do not store or transmit voice recordings.** Use the Web Speech API's text output only; never record raw audio.
- **Implement a clear privacy policy** explaining: what data is sent to which APIs, what is cached locally, what is never stored.
- **Provide a "clear my data" button** that wipes IndexedDB and any cached menus.
- **Review Anthropic's and OpenAI's data retention policies** for API usage. Anthropic's API Terms (as of training data) state they do not train on API inputs, but verify current terms.
- **Consider on-device processing where possible:** browser SpeechSynthesis (no server call), on-device speech recognition (`processLocally = true` where supported).
- If operating in the EU, GDPR applies. Health-related data (allergies) may be "special category data" requiring explicit consent.

**Detection:** Audit all network requests from the app. Every request that leaves the device should be documented and justified.

**Confidence:** MEDIUM (EXIF stripping and privacy-by-design are standard practices; specific legal requirements depend on jurisdiction and should be reviewed by legal counsel)

---

## Minor Pitfalls

---

### Pitfall 10: SpeechSynthesis Voice List Timing Bug

**What goes wrong:** `speechSynthesis.getVoices()` returns an empty array on initial call in some browsers. The voice list is populated asynchronously, and the `voiceschanged` event fires at an unpredictable time after page load.

**Prevention:** Call `getVoices()` immediately AND listen for `voiceschanged`:
```javascript
let voices = [];
function populateVoices() {
  voices = speechSynthesis.getVoices();
}
populateVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoices;
}
```

This is relevant if using browser SpeechSynthesis as a fallback TTS. Not relevant if using only API-based TTS.

**Confidence:** HIGH (confirmed in MDN "Using the Web Speech API" guide)

---

### Pitfall 11: Speech Recognition Mishears Food-Specific Vocabulary

**What goes wrong:** Speech recognition misinterprets restaurant/food terminology. "Bruschetta" becomes "brew shelter." "Pho" becomes "foe." "Gnocchi" becomes "no key." Menu items from non-English cuisines are particularly problematic.

**Prevention:**
- Use the experimental `phrases` property for contextual biasing (where supported): after extracting the menu, create `SpeechRecognitionPhrase` objects for all dish names with high boost values.
- Implement fuzzy matching: if the recognized text doesn't exactly match a menu item, find the closest match using edit distance.
- For critical interactions (allergy queries, final order), repeat back what was understood: "I heard you ask about the pad thai. Is that correct?"
- MDN documents that `phrases` accepts boost values 0.0-10.0 for recognition likelihood.

**Confidence:** HIGH for the problem; MEDIUM for `phrases` as a solution (it is marked as "Experimental" on MDN and browser support may be limited)

---

### Pitfall 12: Continuous Recognition Auto-Stops

**What goes wrong:** Even with `recognition.continuous = true`, browsers may stop recognition after periods of silence, after a certain duration, or when the tab loses focus. The user does not realize recognition has stopped and speaks into the void.

**Prevention:**
- Listen for the `end` event and auto-restart recognition (with a retry counter to avoid infinite loops).
- Play a subtle audio cue when recognition restarts so the user knows it's listening again.
- Implement a heartbeat: if no speech events for 30+ seconds, play a gentle "I'm still here" sound.
- Set `recognition.continuous = true` AND `recognition.interimResults = true` to get feedback that recognition is active.

**Confidence:** HIGH (this is a universally reported issue with the Web Speech API)

---

### Pitfall 13: Restaurant Environment Noise

**What goes wrong:** Background noise in restaurants (music, other diners, kitchen sounds, air conditioning) degrades speech recognition accuracy. The `no-speech` error fires repeatedly.

**Prevention:**
- Prompt users to hold the phone close to their mouth.
- Implement noise detection: if recognition confidence is consistently low, suggest the user move to a quieter spot or use a headset with microphone.
- Consider offering a "type to ask" fallback accessible via screen reader for very noisy environments.
- Future: when `processLocally` is widely supported, on-device models may handle noise better than server-based ones due to avoiding compression/transmission artifacts.

**Confidence:** MEDIUM (noise impact on speech recognition is well-documented; specific mitigation effectiveness is untested)

---

### Pitfall 14: WCAG 2.2 Compliance Gaps

**What goes wrong:** The app claims to be built for accessibility but fails to meet WCAG 2.2 AA requirements, exposing the developer to legal risk (ADA lawsuits in the US) and, more importantly, failing the very users it's meant to serve.

**Key WCAG criteria for this app:**
| Criterion | Requirement | MenuVoice Risk |
|-----------|-------------|----------------|
| 1.1.1 Non-text Content (A) | All images need text alternatives | Menu photos need alt text describing what was captured |
| 1.3.1 Info and Relationships (A) | Programmatic structure | Conversation turns need semantic markup, not visual-only formatting |
| 1.4.3 Contrast (AA) | 4.5:1 text contrast | Any visual UI elements must meet contrast ratios |
| 2.1.1 Keyboard (A) | All functionality via keyboard | Every feature must work without touch/mouse |
| 2.1.2 No Keyboard Trap (A) | Users can navigate away from any component | Custom voice UI must not trap focus |
| 2.4.3 Focus Order (A) | Logical navigation sequence | After photo capture, focus must move logically |
| 2.4.7 Focus Visible (AA) | Visible focus indicator | Even if most users are blind, sighted helpers may use the app |
| 3.2.1 On Focus (A) | No unexpected context changes | Don't auto-navigate or auto-submit on focus |
| 3.3.1 Error Identification (A) | Errors described in text | Speech recognition failures need clear audio explanation |
| 4.1.2 Name, Role, Value (A) | All UI components have accessible names | Every button, input, and custom control needs proper labeling |
| 4.1.3 Status Messages (AA) | Status messages announced without focus change | Use `role="status"` for processing indicators |

**Prevention:**
- Integrate `axe-core` automated accessibility testing into CI/CD.
- Conduct manual testing with VoiceOver (iOS), NVDA (Windows), and TalkBack (Android).
- Use semantic HTML as the foundation; add ARIA only when semantic HTML is insufficient.
- Recruit blind beta testers early (not as an afterthought).
- Consider engaging an accessibility auditor before public launch.

**Detection:** Run `axe-core` in development. Perform manual screen reader testing for every new feature.

**Confidence:** HIGH (WCAG 2.2 criteria are well-established standards)

---

### Pitfall 15: Wake Lock and Background State

**What goes wrong:** The user sets their phone down on the table while the AI is processing or while they talk to their server. The phone screen locks, killing the speech recognition session, the audio playback, and potentially the in-flight API requests. When the user picks the phone back up, the app is in a broken state.

**Prevention:**
- Request a Wake Lock: `navigator.wakeLock.request('screen')` to prevent screen dimming during active sessions.
- Persist session state in IndexedDB: the current menu, conversation history, and position in the menu. On re-focus, restore state and announce: "Welcome back. We were looking at the appetizers."
- Listen for `visibilitychange` events to gracefully pause/resume recognition.
- Keep API requests fire-and-forget with response caching: if a Claude response arrives while the app is backgrounded, cache it and present it when the app comes back.

**Confidence:** MEDIUM (Wake Lock API is well-documented; specific behavior when screen locks varies by OS version)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Menu photo capture | iOS camera permission flow confuses VoiceOver users | Test on real iOS devices with VoiceOver from day 1 |
| Menu OCR/extraction | Decorative fonts and dim photos cause garbage extraction | Implement confidence scoring and retake prompts |
| Voice conversation | Screen reader collision with TTS | Use `<audio>` element for TTS, not SpeechSynthesis; minimize ARIA live region use |
| Voice conversation | Continuous recognition silently stops | Auto-restart on `end` event with audio cue |
| Allergy queries | AI provides incorrect allergy information | Hard-code disclaimers in system prompt; never present as definitive |
| TTS response | Unacceptable latency (>3s) | Sentence-level streaming pipeline; "thinking" audio cue |
| Deployment | WCAG compliance gaps | axe-core in CI; manual screen reader testing per feature |
| Scaling | API costs per visit too high | Haiku for simple queries; cache menu structures; usage limits |
| Privacy | EXIF data and health info exposure | Strip EXIF client-side; no server-side conversation storage |

---

## Sources

- MDN Web Docs: SpeechRecognition API (browser compatibility, error types, continuous property) -- confirmed "not Baseline" status
- MDN Web Docs: SpeechRecognitionErrorEvent.error -- complete error type enumeration (aborted, audio-capture, network, no-speech, not-allowed, language-not-supported, service-not-allowed)
- MDN Web Docs: Using the Web Speech API -- voice list timing bug, contextual biasing with phrases property, webkit prefix requirement
- MDN Web Docs: ARIA Live Regions -- polite vs assertive behavior, role="alert" double-speaking bug on VoiceOver iOS, content change requirements
- MDN Web Docs: getUserMedia -- HTTPS requirement, mobile camera constraints, error types (NotAllowedError, NotFoundError, OverconstrainedError)
- MDN Web Docs: capture attribute -- "not Baseline" status, user/environment values
- MDN Web Docs: SpeechSynthesis.speaking -- paused state returns true, voice list timing
- WCAG 2.2 Quick Reference (criteria numbers and requirements from training data -- verify against current W3C spec)
- API pricing estimates based on training data (LOW confidence -- verify current Anthropic and OpenAI pricing pages before finalizing cost model)
