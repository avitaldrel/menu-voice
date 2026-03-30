# Feature Landscape

**Domain:** Voice-first accessibility app for restaurant menu navigation (blind/visually impaired users)
**Researched:** 2026-03-29

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Menu photo capture | Core input mechanism; without it the app has no purpose | Medium | Must handle rear camera selection, provide voice feedback on capture success. Use `<input type="file" accept="image/*" capture="environment">` as primary (simplest, most accessible), with `getUserMedia` + `ImageCapture` API as enhanced path for live preview and guided retake. |
| AI-powered menu text extraction | Core processing; converts photo to usable data | Medium | Use Claude Vision API directly -- multimodal LLMs outperform traditional OCR for restaurant menus because they understand layout semantics (categories, item-price pairs, descriptions) not just raw text. Skip Google Vision / Azure OCR entirely. |
| Voice output of menu content | Primary output channel for blind users | Medium | AI TTS (OpenAI TTS or ElevenLabs) for natural voice; `SpeechSynthesis` API as fallback (widely supported since Sept 2018). Must support pause, resume, cancel, and rate adjustment. |
| Speech recognition input | Primary input channel for blind users | Medium | Web Speech API `SpeechRecognition` has LIMITED browser support (Chrome uses server-based recognition, Safari partial). Plan for fallback: a large "tap anywhere to speak" button, and typed input for desktop users. |
| Proactive menu overview | Users need orientation before exploration; "What kind of place is this?" is the first question | Low | After processing, the AI should summarize: restaurant type, number of categories, standout items, price range. Do not wait for the user to ask. |
| Conversational menu exploration | Users must be able to ask natural questions about the menu | Medium | "What soups do you have?" / "Tell me about the salmon" / "What's the cheapest entree?" -- this is the core value loop. Claude handles this natively via conversation context. |
| Allergy/preference warnings | Safety-critical; failing to warn about allergens is dangerous | Medium | Every item mentioned must be cross-referenced against the user's stored allergies. Warnings must be proactive (not wait to be asked), assertive (interrupt if needed), and suggest server confirmation. |
| Local allergy/preference storage | Users should not have to re-enter allergies every visit | Low | IndexedDB via a wrapper like `idb`. Store allergen list, dietary preferences (vegetarian, kosher, etc.), and dislikes. No account system -- local storage only per PROJECT.md constraints. |
| Screen reader compatibility | Some users will use VoiceOver/TalkBack alongside the app | Medium | Full ARIA markup. Use `aria-live="polite"` for menu responses, `role="alert"` for allergy warnings (assertive). Pre-prime all live regions in the DOM before populating content. |
| Screen wake lock | Phone screen must not turn off during a restaurant conversation | Low | Screen Wake Lock API (Baseline 2025). Request wake lock when conversation is active, release on exit. Essential -- a blind user cannot easily re-unlock their phone mid-meal. |
| Multi-page menu support | Restaurant menus are typically 2-6 pages | Medium | Must allow sequential photo capture with voice prompts: "Photo 1 captured. Take another page, or say 'done' to start exploring." Merge all pages into a single structured menu. |
| Keyboard accessibility | Screen reader users navigate via keyboard | Low | All interactive elements must be keyboard-reachable. Tab order must be logical. Skip-to-content links. Focus management when state changes. |

## Differentiators

Features that set the product apart. Not expected in generic accessibility tools, but highly valued here.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Guided photo retake | Most menu accessibility tools fail silently on bad photos; MenuVoice tells users specifically what went wrong and how to fix it | Medium | After Claude Vision processes a photo, evaluate text quality. If poor: "The bottom-left of the menu is blurry. Try holding the menu flatter and take another photo." This requires sending a quality assessment prompt alongside extraction. |
| In-conversation allergy discovery | User does not need to set up a profile beforehand; can say "Oh, I'm allergic to shellfish" mid-conversation and the system remembers for the rest of the session and saves to profile | Low | Parse user statements for allergy/preference mentions. Store in session context AND persist to IndexedDB. Confirm: "Got it, I'll flag shellfish for you from now on." |
| Decision support (not just Q&A) | Existing tools read menus; MenuVoice helps users DECIDE what to eat | Medium | Active recommendations: "Based on your preference for spicy food, you might enjoy the Thai basil chicken. It's also in your price range at $16." This requires maintaining conversation context about expressed preferences, budget hints, and dietary needs. |
| Modification suggestions | When an allergen is detected, suggest how to make it safe rather than just warning | Low | "The Caesar salad contains anchovies in the dressing. You could ask your server for a different dressing." This changes the experience from "no" to "here's how." |
| Menu section navigation | Voice commands to jump between menu sections efficiently | Low | "Take me to desserts" / "What are the appetizers?" / "Go back to entrees." The AI should understand section-based navigation and present items grouped logically. |
| Price awareness | Help users understand pricing context | Low | "The entrees range from $14 to $28, with most around $18-22." / "That's one of the more affordable options." Blind users cannot scan for prices visually. |
| Companion mode | A sighted companion takes the photos while the blind user has the voice conversation | Low | Not technically different from solo mode, but the voice guidance should acknowledge both scenarios: solo ("Point your camera at the menu") vs companion ("Have someone photograph the menu pages"). |
| Order summary | At the end, recap what the user has decided to order | Low | "You're thinking about the Caesar salad with a different dressing, the grilled salmon, and the chocolate cake. Want me to go over that again?" Helps the user communicate their order to the server. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Restaurant database / pre-loaded menus | Adds massive maintenance burden; creates expectation of coverage; violates the "any restaurant" promise | Photo-first approach. Every visit starts fresh from a photo. |
| Ordering / payment integration | Completely different product; restaurants use dozens of different POS systems; adds complexity without solving the core problem | Help the user decide, then they communicate their order verbally to the server. |
| Menu translation | Multi-language is a v2+ feature; adds OCR complexity for non-Latin scripts; doubles testing surface | English only for v1. Flag foreign-language items as "this appears to be in [language]" and attempt a basic translation in the conversation. |
| Visual menu display / rich UI | Contradicts voice-first design; blind users will not see it; engineering time wasted | Minimal visual UI: one or two large buttons, high contrast, designed for sighted companions taking photos. All information delivered via voice. |
| User accounts / cloud sync | Login flows are painful for screen reader users; no clear value in v1 for syncing across devices | Local IndexedDB storage. User can export/import their allergy profile later if needed. |
| Always-on listening | Battery drain, privacy concerns, triggers false positives in noisy restaurants | Push-to-talk model: large tap target to activate listening. Consider auto-stop after silence detection. |
| Nutritional analysis / calorie counting | Different user need; menus rarely have full nutritional data; misleading to estimate | If user asks about calories, honestly say "menus don't usually list full nutrition info, but I can tell you what ingredients are listed." |
| Server/waitstaff interface | Different user persona entirely; adds scope without helping the blind diner | Focus exclusively on the diner's experience. |

## Feature Dependencies

```
Photo Capture -> Menu Text Extraction -> Structured Menu Data
                                                |
                                                v
                            Proactive Menu Overview
                                                |
                                                v
Voice Input (Speech Recognition) + Voice Output (TTS) -> Conversational Exploration
                                                                    |
                                                                    v
                                    Allergy Profile (IndexedDB) -> Allergy Warnings
                                                                    |
                                                                    v
                                                            Decision Support
                                                                    |
                                                                    v
                                                            Order Summary

Photo Capture -> Photo Quality Assessment -> Guided Retake (loops back to Photo Capture)

Screen Wake Lock (independent, activated alongside conversation)
Screen Reader Compatibility (cross-cutting, applies to all features)
```

## Existing App Landscape Analysis

### Be My Eyes
- **What it does:** Connects blind users to sighted volunteers or AI (Be My AI) for visual assistance including reading menus.
- **Pattern:** Camera feed shared with a remote human or AI that describes what they see in real time.
- **Limitation for menus:** Generalist tool -- not optimized for menu structure, cannot track allergies, does not support multi-turn menu exploration. The AI describes what it sees but does not help with decision-making.
- **Takeaway:** MenuVoice differentiates by being menu-specialized with structured data, allergy awareness, and decision support rather than general-purpose image description.

### Seeing AI (Microsoft)
- **What it does:** Multiple "channels" including document reading, product identification, scene description.
- **Pattern:** Point camera at text, hear it read aloud. Short text channel reads immediately; document channel reads full pages.
- **Limitation for menus:** Reads text linearly without understanding menu structure. Cannot distinguish categories from items from prices. No conversational exploration.
- **Takeaway:** Linear text reading is insufficient for menus. Structure-aware extraction (which Claude Vision provides) is the key differentiator.

### Envision AI
- **What it does:** Smart glasses and phone app for text recognition, scene description, and document scanning.
- **Pattern:** Continuous OCR from camera feed, reads text as detected.
- **Limitation for menus:** Same as Seeing AI -- flat text, no structure, no conversation.
- **Takeaway:** The conversational layer on top of structured extraction is what makes MenuVoice different from all existing tools.

### Allergy Apps (Fig, Spokin, Yummly)
- **Pattern:** Users set up an allergen profile. When scanning a product barcode or searching a database, the app cross-references ingredients against the profile and shows red/green indicators.
- **Key UX patterns:**
  - **Traffic light system:** Green (safe), yellow (may contain), red (contains allergen). Visual -- needs voice equivalent.
  - **Profile-first setup:** Most apps require allergen setup before use. This is a friction point for blind users.
  - **Barcode-dependent:** Most allergy apps rely on product barcodes and packaged food databases. Useless for restaurant menus.
- **Takeaway for MenuVoice:**
  - Do NOT require profile setup before first use. Allow in-conversation allergy discovery.
  - Voice equivalent of traffic light: assertive warning tone for allergens, gentle note for "may contain," no interruption for safe items.
  - Restaurant menus rarely list every ingredient. Always recommend asking the server about specific allergens.

### Confidence: MEDIUM
These assessments are based on training knowledge of these apps' feature sets as of early 2025. Specific current features may have changed.

## Voice-First UI Design Patterns for Blind Users

### Critical Patterns

1. **Announce state changes proactively.** Never leave the user in silence. If processing takes time, say "Processing your photo, this may take a moment." Use ARIA live regions (`aria-live="polite"`) for status updates and `role="alert"` for urgent warnings (allergens).

2. **Push-to-talk, not always-on.** Restaurant environments are noisy. A large tap target (ideally the entire screen) activates listening. Provide audio feedback (a tone) when listening starts and stops. Auto-stop after 2-3 seconds of silence.

3. **Chunked information delivery.** Never read the entire menu at once. Provide a high-level overview first, then let the user drill down: "There are 6 sections: appetizers, soups, salads, entrees, sides, and desserts. Which would you like to explore?"

4. **Interruptible output.** Users must be able to interrupt TTS at any time by tapping or speaking. The `SpeechSynthesis.cancel()` method handles this. When interrupted, acknowledge: "Sure, what would you like to know?"

5. **Confirmation of actions.** After the user speaks, confirm what was understood before acting: "Looking for gluten-free options..." This prevents silent misrecognition.

6. **No dead ends.** Every state should offer a hint about what the user can do next: "You can ask about specific items, explore another section, or say 'what should I order' for a recommendation."

7. **Consistent audio landmarks.** Use distinct tones for: listening started, listening stopped, processing, allergy warning, error. These become spatial/temporal landmarks for blind users.

8. **Forgiveness in interaction.** Accept varied phrasings: "go back," "previous," "start over," "what was that again?" Claude's natural language understanding handles this, but the system prompt must encourage flexible interpretation.

### Screen Reader Interaction Model

The app must work in two modes:
- **Direct voice mode:** User interacts directly with the app's speech recognition and TTS (screen reader OFF or paused). This is the primary mode.
- **Screen reader mode:** User navigates with VoiceOver/TalkBack. All dynamic content announced via ARIA live regions. Interactive elements properly labeled.

**Key consideration:** When the app is speaking via TTS and the screen reader is also active, they will conflict. The app should detect if a screen reader is active (limited detection possible) and default to ARIA live regions instead of direct TTS in that case, or provide a setting to choose.

### Confidence: MEDIUM
Based on accessibility best practices from WCAG, ARIA documentation (verified via MDN), and established voice UI design principles. Specific screen reader interaction patterns may need user testing to validate.

## Menu OCR Challenges and Mitigations

### Challenge 1: Stylized / Decorative Fonts
- **Problem:** Restaurant menus frequently use cursive, script, or heavily stylized fonts for branding. Traditional OCR (Tesseract, Google Vision) struggles with non-standard fonts.
- **Mitigation:** Claude Vision (multimodal LLM) handles stylized fonts significantly better than traditional OCR because it understands visual context, not just character shapes. It can infer "Chicken Parmesan" from partially legible decorative text by understanding menu context.
- **Confidence:** HIGH (Claude's vision capabilities with text recognition are well-documented by Anthropic)

### Challenge 2: Multi-Column / Complex Layouts
- **Problem:** Menus use multi-column layouts, nested categories, sidebars for specials, dotted price leaders, and decorative borders that confuse linear OCR.
- **Mitigation:** Claude Vision understands spatial layout. The extraction prompt should explicitly ask for structured output: "Extract this menu into categories, with each item having a name, description, and price. Identify multi-column layouts." JSON output format ensures structure.
- **Confidence:** HIGH

### Challenge 3: Poor Lighting / Shadows / Glare
- **Problem:** Restaurant lighting is often dim, atmospheric, or produces glare on laminated menus.
- **Mitigation:**
  - Guided photo capture: instruct the user to use flash ("Would you like me to turn on the flash?")
  - Photo quality assessment: after capture, send to Claude Vision with a quality-check prompt before the full extraction
  - Retake guidance: specific feedback ("The image is too dark" / "There's glare on the right side")
- **Confidence:** MEDIUM (quality assessment via vision is feasible but the guidance-to-blind-user flow needs testing)

### Challenge 4: Handwritten Menus / Chalkboards
- **Problem:** Specials boards, chalkboard menus, and handwritten items. Azure OCR explicitly supports handwriting; Claude Vision also handles it.
- **Mitigation:** Claude Vision handles handwriting reasonably well. The prompt should note: "This may include handwritten text. Do your best to interpret it and flag any items you're uncertain about."
- **Confidence:** MEDIUM (handwriting accuracy varies significantly by quality)

### Challenge 5: Multi-Page Merging
- **Problem:** A 4-page menu produces 4 separate photos. These must be merged into a single coherent menu structure without duplication.
- **Mitigation:** Process each page separately, then use a merge prompt: "Here are menu items from multiple pages. Combine into a single structured menu, removing any duplicates (like repeated headers)." Each page extraction should note its page number for context.
- **Confidence:** HIGH (straightforward prompt engineering)

### Challenge 6: Non-Text Menu Elements
- **Problem:** Icons (chili pepper for spicy, leaf for vegetarian, star for popular), images of dishes, QR codes.
- **Mitigation:** Claude Vision can identify common icons: "There's a chili pepper icon next to this item, indicating it may be spicy." The extraction prompt should ask for icon/symbol interpretation.
- **Confidence:** MEDIUM (depends on icon clarity and standardization)

## Conversational AI Patterns for Decision Support

### Pattern 1: Progressive Disclosure
**What:** Start broad, let the user narrow down.
**Flow:** Overview -> Category -> Items -> Details -> Decision
**Example:**
- AI: "This is an Italian restaurant with pasta, pizza, seafood, and salads. What sounds good?"
- User: "Tell me about the pasta."
- AI: "There are 5 pasta dishes ranging from $14-19. The standout is the lobster ravioli at $19. Would you like me to go through each one?"

### Pattern 2: Preference-Aware Filtering
**What:** Use accumulated knowledge about the user to narrow options proactively.
**Flow:** User mentions a preference -> AI filters subsequent recommendations.
**Example:**
- User: "I don't eat red meat."
- AI: "Noted. Looking at the entrees, there are 4 chicken dishes, 3 seafood options, and 2 vegetarian plates. Want me to start with one of those categories?"

### Pattern 3: Comparison Framing
**What:** When the user is deciding between options, structure the comparison.
**Example:**
- User: "I'm torn between the salmon and the chicken."
- AI: "The salmon is grilled with a lemon butter sauce at $22. The chicken is roasted with herbs at $18. Both are gluten-free. The salmon is the pricier option but it's their specialty according to the menu description. Which matters more to you -- the flavor profile or the price?"

### Pattern 4: Proactive Allergen Interception
**What:** Do not wait for the user to ask about allergens. Flag them immediately when an item is mentioned.
**Example:**
- User: "Tell me about the pad thai."
- AI: "The pad thai is rice noodles with shrimp -- heads up, it lists peanuts, which is in your allergy profile. They also have a tofu pad thai that might work, or you could ask your server about a peanut-free version."

### Pattern 5: Decision Nudge
**What:** When the user seems ready but hasn't committed, gently prompt.
**Example:**
- AI: "You've been interested in the salmon, the Caesar salad, and the tiramisu. Want to go with those, or explore anything else?"

### Pattern 6: Graceful Uncertainty
**What:** When the menu does not have enough information, be honest and suggest asking the server.
**Example:**
- User: "Is the soup gluten-free?"
- AI: "The menu doesn't list ingredients for the tomato soup. It could contain flour as a thickener -- I'd recommend asking your server to be safe."

### Confidence: HIGH
These patterns are standard conversational AI design applied to the menu domain. Claude handles multi-turn contextual conversation natively.

## Camera Access in Web Apps -- Technical Details

### Two Approaches

**Approach 1: `<input type="file" capture="environment">` (Recommended as primary)**
- Simplest implementation
- Opens the native camera app directly
- No permission prompt needed (uses the OS camera app)
- Returns a file blob ready for upload
- Works on all mobile browsers
- **Best for accessibility:** The native camera UI is already optimized for the OS's accessibility features
- **Limitation:** No live preview, no quality assessment before capture, no torch/flash control

**Approach 2: `getUserMedia` + `ImageCapture` API (Enhanced path)**
- Live camera preview in a `<video>` element
- Programmatic photo capture via `ImageCapture.takePhoto()`
- Can access flash/torch via `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })`
- Resolution control via constraints
- **Limitation:** Requires HTTPS, explicit permission grant, `ImageCapture` has limited browser support (not in Firefox as of early 2025), and a live video preview is useless for blind users

### Recommended Strategy

Use `<input type="file" capture="environment">` as the primary capture method. It is:
1. Most accessible (native OS camera UI works with VoiceOver/TalkBack)
2. Most compatible (works everywhere)
3. Simplest to implement
4. No permission management needed

Add `getUserMedia` as an enhanced mode only if the sighted companion is taking photos and wants a preview. This is a v2 consideration.

### Camera Permissions & Constraints (verified via MDN)
- `getUserMedia` requires HTTPS (secure context)
- `facingMode: "environment"` for rear camera; use `{ exact: "environment" }` to require it
- `enumerateDevices()` lists available cameras but does NOT reliably distinguish front/rear
- Wake Lock API (Baseline 2025) keeps screen active during the session

### Confidence: HIGH
Camera APIs verified via MDN documentation. `<input capture>` behavior verified via MDN. ImageCapture API verified via MDN.

## Web Speech API Capabilities and Limitations

### Speech Recognition (`SpeechRecognition`)
- **Browser support: LIMITED.** Chrome uses server-based recognition (requires internet). Firefox does not support it. Safari has partial support.
- **Continuous mode:** `continuous: true` returns multiple results; `continuous: false` returns one result and stops.
- **Interim results:** `interimResults: true` provides real-time feedback as user speaks.
- **Key events:** `result`, `speechstart`, `speechend`, `error`, `nomatch`.
- **Critical limitation:** Chrome sends audio to Google servers for processing. Privacy implications. Does not work offline.
- **Fallback plan needed:** For unsupported browsers, provide a text input field. For production quality, consider a server-side speech-to-text API (Whisper, Deepgram) via WebSocket.

### Speech Synthesis (`SpeechSynthesis`)
- **Browser support: WIDE.** Baseline since September 2018. Works in all major browsers.
- **Voice selection:** `getVoices()` returns available voices. Quality varies enormously by OS and browser.
- **Controls:** `pitch` (0-2), `rate` (0.1-10), volume. Queue multiple utterances. `cancel()` to interrupt.
- **Key limitation:** Built-in voices sound robotic on most platforms. This is why the project spec calls for AI TTS (OpenAI/ElevenLabs) as primary with SpeechSynthesis as fallback.

### Recommended Strategy
- Use AI TTS (OpenAI TTS API or ElevenLabs) for all AI speech output -- natural-sounding voice is critical for extended menu conversations
- Use `SpeechSynthesis` only as a fallback when AI TTS fails or for quick confirmations
- Use `SpeechRecognition` where available, with server-side Whisper API as fallback for broader compatibility
- Audio output via standard `<audio>` element playing TTS-generated audio files/streams

### Confidence: HIGH
All Web Speech API details verified via MDN documentation.

## MVP Recommendation

Prioritize (in build order):

1. **Photo capture via `<input capture="environment">`** -- simplest, most accessible, unblocks everything
2. **Claude Vision menu extraction** -- core processing, returns structured JSON
3. **AI TTS voice output** -- primary output channel, user hears the menu
4. **Proactive menu overview** -- first thing users hear after photo processing
5. **Basic conversational exploration** -- ask about categories, items, prices
6. **Speech recognition input** -- voice input so users can ask questions
7. **Allergy profile storage** -- IndexedDB with basic allergen list
8. **Proactive allergy warnings** -- cross-reference every mentioned item
9. **Screen wake lock** -- prevent screen timeout during use

Defer to post-MVP:
- **Guided photo retake:** Requires additional quality-assessment prompt logic. Ship without it first, add when real users report photo quality issues.
- **Decision support / order summary:** Enhance the conversation prompt after the basic exploration flow is validated.
- **Multi-page merging:** Start with single-page support. Multi-page adds merge complexity.
- **In-conversation allergy discovery:** Start with explicit profile setup. Add NLP-based discovery as enhancement.
- **Screen reader dual-mode detection:** Complex interaction model. Start with voice-direct mode only.

## Sources

### Verified (MDN Documentation)
- MediaDevices.getUserMedia() -- camera access constraints, facingMode, permissions
- ImageCapture API -- takePhoto(), grabFrame(), photo capture from video streams
- enumerateDevices() -- device listing, limitations of camera identification
- Web Speech API -- SpeechRecognition and SpeechSynthesis capabilities and limitations
- SpeechRecognition -- properties, methods, events, continuous mode, browser support
- SpeechSynthesis -- voice control, queueing, cancellation, browser support
- Screen Wake Lock API -- keep screen active, Baseline 2025
- ARIA alert role -- assertive announcements, best practices
- ARIA Live Regions -- polite/assertive politeness, aria-atomic, aria-relevant
- `<input type="file" capture>` -- native camera capture, environment facing mode

### Verified (Microsoft Learn)
- Azure AI Vision OCR -- Read editions, printed/handwritten text support, input requirements, supported formats

### Training Knowledge (MEDIUM confidence)
- Be My Eyes, Seeing AI, Envision AI feature analysis
- Fig, Spokin, Yummly allergy app patterns
- Voice-first UI design patterns for blind users
- Conversational AI decision support patterns
- Menu OCR challenges with stylized fonts and layouts
