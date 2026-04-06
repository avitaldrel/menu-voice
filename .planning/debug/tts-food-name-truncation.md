---
status: awaiting_human_verify
trigger: "tts-food-name-truncation — food item names skipped or truncated during TTS playback"
created: 2026-04-05T00:00:00Z
updated: 2026-04-05T17:55:00Z
---

## Current Focus

hypothesis: CONFIRMED — splitSentences dropped trailing text without terminal punctuation, causing food names mid-stream to be silently lost. Fix applied.
test: Full test suite run — 296/296 passing including 8 new regression tests.
expecting: Human verification of fix in real app.
next_action: Await human confirmation that food names are fully spoken.

## Symptoms

expected: Every food item name is read in full by the TTS, followed by its description. No name should ever be skipped or truncated.
actual: Food item names — especially foreign, difficult-to-pronounce, or long compound names — are sometimes skipped, truncated, or not fully spoken.
errors: No error messages reported. The issue is silent — audio just doesn't include the full name.
reproduction: Scan a menu with foreign or complex food names. When the AI describes menu items via voice, some names are incomplete.
started: Not clear when it started. Affects both foreign/ethnic names and long compound names.

## Eliminated

- hypothesis: Chat prompt doesn't explicitly require full name reading
  evidence: chat-prompt.ts line 70 contains explicit rule: "Always say the full name of every menu item, even if it is in another language or hard to pronounce... Never skip or simplify a name". Prompt instructs Claude correctly.
  timestamp: 2026-04-05T17:30:00Z

- hypothesis: TTS API (OpenAI) truncates or errors on long/foreign text
  evidence: tts/route.ts has no length limit, no character sanitization, no transformation of the text before sending to OpenAI. Foreign characters pass through unchanged.
  timestamp: 2026-04-05T17:30:00Z

- hypothesis: Allergy marker regex strips name text (false positive)
  evidence: stripMarkers uses [ALLERGY:...], [DISLIKE:...], [PREFERENCE:...] patterns. No risk of false-positives on food names. The ttsAccum logic in useVoiceLoop.ts already strips markers before forwarding to TTS, and does so correctly.
  timestamp: 2026-04-05T17:35:00Z

- hypothesis: Raw markers fed to TTS disrupting sentence boundaries
  evidence: useVoiceLoop.ts already implements ttsAccum withholding logic — holds back text from the last '[' until ']' is found, then stripMarkers() before forwarding. This was a prior bug that was already fixed before this investigation.
  timestamp: 2026-04-05T17:35:00Z

## Evidence

- timestamp: 2026-04-05T17:40:00Z
  checked: splitSentences in src/lib/tts-client.ts (original implementation)
  found: The function used text.match(/[^.!?]+[.!?]+(\s|$)?/g) which returns ONLY text that ends with terminal punctuation. Any trailing fragment without .!? was completely absent from the return value — not as a final element, but simply lost.
  implication: When queueText set this.buffer = sentences[sentences.length - 1], it was setting the buffer to the last COMPLETE sentence, not to the actual trailing fragment. The fragment was permanently discarded.

- timestamp: 2026-04-05T17:42:00Z
  checked: queueText logic — sentences.length > 1 branch
  found: this.buffer = sentences[sentences.length - 1] assumes the last element is the incomplete trailing fragment. With the old splitSentences, this assumption was wrong: the last element was always a complete sentence, and the actual trailing text (e.g., "Pappardelle" or "Gochujang Glazed") was simply missing from the array.
  implication: Any food name that appeared after a complete sentence in the same buffer accumulation — a very common pattern in Claude's list-style responses ("Spaghetti Carbonara. Pappardelle. Shakshuka.") — would have its last-listed name lost whenever the stream chunked mid-name.

- timestamp: 2026-04-05T17:45:00Z
  checked: Concrete trace of "Spaghetti Carbonara. Pappardelle. Gochujang Glazed"
  found: Old splitSentences returned ["Spaghetti Carbonara.", "Pappardelle."] — "Gochujang Glazed" was gone. New splitSentences returns ["Spaghetti Carbonara.", "Pappardelle.", "Gochujang Glazed"]. queueText correctly keeps "Gochujang Glazed" in buffer until the next chunk (e.g., " Salmon.") completes it, then flush() releases it.
  implication: Root cause confirmed and reproducible with deterministic test cases.

- timestamp: 2026-04-05T17:50:00Z
  checked: Why foreign/complex names were more affected
  found: Claude's responses describing complex menu items tend to list items as "Name. Description." chains. For simple names, by chance the name was often at the start of a sentence, not trailing. For foreign or long compound names, Claude often ends one sentence and starts the next with the difficult name — making it the trailing fragment that was being dropped.
  implication: The bug was probabilistic for simple names but systematic for names in list-style responses.

## Resolution

root_cause: splitSentences in src/lib/tts-client.ts used text.match() which returns only regex-matched segments. Any text after the last sentence-terminating punctuation (.!?) was silently dropped because it never appeared in the match array. queueText assumed sentences[last] was the trailing incomplete fragment and set it as the next buffer — but with the old implementation, sentences[last] was actually a complete sentence, and the real trailing fragment (the food name) was lost permanently.

fix: Rewrote splitSentences to use RegExp.exec() in a loop, tracking lastIndex after each match. After all matches are consumed, text.slice(lastMatchEnd).trim() captures the true trailing fragment and appends it as the final element of the returned array. This ensures no text is ever dropped — the array now losslessly represents all input text as a sequence of segments, where all but possibly the last end with terminal punctuation.

verification: 296/296 tests pass. 8 new regression tests added — 6 to splitSentences unit tests covering trailing fragments with foreign names, long compound names, and multi-sentence buffers; 2 to useVoiceLoop integration tests verifying food names reach the TTS queue and are not dropped by the pipeline.

files_changed:
  - src/lib/tts-client.ts (splitSentences rewrite)
  - src/lib/__tests__/tts-client.test.ts (6 regression tests)
  - src/hooks/__tests__/useVoiceLoop.test.ts (2 regression tests)
