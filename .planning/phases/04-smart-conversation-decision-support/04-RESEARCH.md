# Phase 4: Smart Conversation & Decision Support — Research

**Researched:** 2026-03-30
**Domain:** Claude system prompt engineering, multi-turn conversation quality, voice-first decision support
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Recommendation Behavior**
- "What's popular?" handled by suggesting items with rich descriptions, chef's specials, or highlighted items — Claude explains naturally these "stand out" rather than disclaiming lack of popularity data
- Ambiguous preferences ("something light") → ask one clarifying question, then suggest 2-3 items
- Recommendations reflect prior conversation interest — if user asked about pasta, weight later recs toward similar flavors
- 2-3 items per recommendation with brief descriptions, consistent with existing 5-item max listing rule

**Comparison & Decision Support**
- Contrastive comparison format for voice: "The salmon is grilled while the chicken is breaded — salmon is $18, chicken is $14" — covers key differences in one pass
- Proactively offer to help decide after 3+ turns discussing items: "Would you like help narrowing it down?"
- Final decision support states a clear recommendation with reasoning: "Based on what you've been interested in, I'd suggest the..."
- "I can't decide" → ask about mood/hunger level, then give ONE clear recommendation

**Conversation Memory & Scope**
- Keep all messages for v1 — restaurant sessions are short (10-20 turns), context window handles it
- Clear conversation history when a new menu is scanned — fresh context per restaurant visit
- No "start over" voice command in this phase — conversation naturally resets with new overview
- Phase is primarily system prompt enhancement + tests — existing streaming/history infrastructure from Phase 3 handles CONV-04 mechanics

### Claude's Discretion
- Exact wording of system prompt additions for recommendation/comparison behavior
- Test case design for verifying conversation quality programmatically

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-03 | User can ask for recommendations based on preferences ("Something light", "What's popular") | System prompt recommendation rules; clarifying-question pattern before suggesting 2-3 items |
| CONV-04 | App maintains conversation context across multiple turns | Full `messagesRef` history already flows to Claude on every turn (Phase 3 infrastructure); system prompt tracks ordinal references and prior interest |
| CONV-05 | App helps user narrow down choices and decide what to order | System prompt comparison format, proactive narrowing-down trigger at 3+ item-discussion turns, "I can't decide" → one clear recommendation |
</phase_requirements>

---

## Summary

Phase 4 is a **system prompt engineering phase** with supporting test coverage. The streaming/history plumbing from Phase 3 already satisfies the mechanical side of CONV-04 — the full conversation history in `messagesRef` is sent to Claude on every call. What is missing is behavioral guidance: `buildSystemPrompt()` in `src/lib/chat-prompt.ts` does not yet tell Claude how to give recommendations, resolve ordinal references, compare items for voice, or proactively offer decision support.

The core engineering work is writing additional RESPONSE RULES in `buildSystemPrompt()` that encode the locked decisions from CONTEXT.md. Official Anthropic docs (verified March 2026) confirm that natural-language directives in the system prompt are the right mechanism for steering Claude's conversational behavior — structured JSON instructions are unnecessary and counterproductive for a voice-output context where prose quality matters most.

Tests for this phase must validate that the right rules appear in the generated system prompt (deterministic string assertions, same pattern as existing `chat-prompt.test.ts`) and that the overall voice loop still passes its 181-test suite unchanged.

**Primary recommendation:** Add ~8-10 RESPONSE RULES to `buildSystemPrompt()` covering recommendation, comparison, decision support, and context reference. No new API endpoints, no new hooks, no schema changes.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.80.0 | Claude API calls | Already in use; `client.messages.stream()` is the call site |
| `vitest` | ^4.1.2 | Unit tests | Established test runner for this project |
| `@testing-library/react` | ^16.3.2 | React hook tests | Used for `useVoiceLoop` tests |

### No New Packages Required

This phase touches only:
- `src/lib/chat-prompt.ts` (system prompt rules)
- `src/lib/__tests__/chat-prompt.test.ts` (prompt rule assertions)

No package installs needed.

---

## Architecture Patterns

### Where the Change Lives

```
src/
├── lib/
│   ├── chat-prompt.ts          ← PRIMARY CHANGE: add RESPONSE RULES to buildSystemPrompt()
│   └── __tests__/
│       └── chat-prompt.test.ts ← ADD: rule assertions for new behaviors
└── hooks/
    └── __tests__/
        └── useVoiceLoop.test.ts ← VERIFY: existing multi-turn tests still pass (no changes needed)
```

Everything else (API route, `useVoiceLoop`, `TTSClient`, state machine) is unchanged.

### Pattern 1: Natural-Language RESPONSE RULES in System Prompt

**What:** The existing `buildSystemPrompt()` already uses natural-language directives ("Keep answers under 3 sentences", "List max 5 items"). Adding more rules in the same style is the correct extension pattern.

**When to use:** Any time Claude behavior needs to be steered globally for the session.

**Why it works:** Official Anthropic docs (verified: `platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts`, March 2026) confirm that system prompts are the right mechanism for "persistent characteristics that should apply across all user interactions." They also note: "providing context or motivation behind your instructions helps Claude better understand your goals" — especially important for the voice output constraint.

**Current state:**
```typescript
// Source: src/lib/chat-prompt.ts (existing)
`RESPONSE RULES:
- Keep answers under 3 sentences unless the user explicitly asks for more detail.
- When listing items, give the name and a brief one-line description. List max 5 items then ask "Want to hear more?"
- Mention prices only when the user asks.
- If a query doesn't match anything on the menu, acknowledge it and suggest the closest available option.
- Do not say "based on the menu data" — speak naturally as if you know the menu.
- Responses will be spoken aloud — avoid markdown, bullet characters, or special symbols.`
```

**Target state — rules to add (see Code Examples section for full wording):**
- Recommendation rule (CONV-03)
- Preference-narrowing rule (CONV-03)
- Conversation context rule (CONV-04)
- Comparison format rule (CONV-05)
- Proactive narrowing trigger (CONV-05)
- Decisive recommendation rule (CONV-05)

### Pattern 2: Full Conversation History Already Flowing (CONV-04 Mechanics Done)

**What:** `messagesRef.current` accumulates every user + assistant turn. Every call to `triggerResponse()` sends the full array to `/api/chat`. Claude receives the complete conversation context automatically.

**Implication for CONV-04:** The mechanics are complete. The only gap is that the system prompt doesn't explicitly tell Claude to use prior conversation context for references like "tell me more about the second one." A single rule makes this explicit and reliable.

**Why explicit instruction helps:** Official docs note "Claude responds well to clear, explicit instructions" and "Think of Claude as a brilliant but new employee who lacks context on your norms." Without a rule, Claude will usually resolve ordinal references correctly, but the system prompt rule guarantees it and makes the behavior testable.

### Pattern 3: Voice-Optimized Comparison Format

**What:** For comparisons ("I'm deciding between the salmon and the chicken"), the response must be listenable in a single pass with no visual aids.

**Contrastive sentence structure:**
```
"The salmon is grilled and served with roasted vegetables — it's $18.
The chicken is breaded and pan-fried — it's $14.
The salmon is the lighter option if you want something less heavy."
```

**Why this format:**
- Single statement per item — easy to follow aurally
- Contrast words ("while", "whereas", "compared to") make differences clear without a visual table
- Price at end of description, not standalone — natural speech rhythm
- Recommendation follows comparison — completes the thought

### Anti-Patterns to Avoid

- **Structured JSON instructions in the system prompt:** The existing codebase uses natural language and that is correct. JSON/structured instructions are for tool-use schemas, not behavior steering.
- **Asking "what do you prefer" multiple times:** The rule should specify asking ONE clarifying question maximum, then committing to a suggestion. Voice users find repeated questioning frustrating.
- **Mentioning prices unprompted during comparison:** Existing rule says prices only when asked. The comparison is explicitly a case where the user is deciding — prices are directly relevant to the decision. The wording in the comparison rule must explicitly unlock price mention for comparison responses.
- **Long comparisons:** More than 3 items compared at once becomes impossible to follow aurally. The system prompt rule should cap comparison depth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Turn counting for proactive prompt | Custom counter in React state | System prompt instruction to track interest across turns | Adding a turn counter to `useVoiceLoop` adds state complexity; Claude already has full history and can infer when 3+ turns have discussed items |
| Conversation summarization | Custom summarizer for long sessions | Full history in messagesRef (locked decision) | Sessions are 10-20 turns; full history fits in context; summarization adds complexity and can lose nuance |
| Ordinal reference resolution ("second one") | Regex parser to extract position refs | Full message history + system prompt rule | Claude handles this natively when the full history is present |

**Key insight:** The conversation history is already flowing. Every CONV-03/04/05 behavior can be achieved through prompt rules alone. Building runtime logic for what Claude can do natively via instructions is unnecessary complexity.

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a system prompt enhancement phase, not a rename/refactor/migration phase. No stored data, live service config, OS-registered state, secrets, or build artifacts are being renamed or moved.

---

## Common Pitfalls

### Pitfall 1: Test Assertions Too Tightly Coupled to Exact Wording

**What goes wrong:** Tests that assert `expect(prompt).toContain('exact phrase here')` break whenever the prompt wording is refined, even if the behavior is preserved.

**Why it happens:** The Phase 3 tests for `chat-prompt.test.ts` (correctly) assert on conceptual presence ("3 sentences", "5 items", "prices only when asked") rather than exact sentences. If Phase 4 tests assert on overly specific phrasing, they become fragile.

**How to avoid:** Assert on the key keyword or concept present in the rule, not the full sentence. For example: `expect(prompt).toContain('clarifying question')` rather than `expect(prompt).toContain('ask one clarifying question before suggesting')`.

**Warning signs:** A test fails after a pure readability improvement to the system prompt wording.

### Pitfall 2: Price Rule Conflict for Comparison Mode

**What goes wrong:** The existing "Mention prices only when the user asks" rule will suppress prices during comparison responses if not addressed. But price is critical decision information for comparisons.

**Why it happens:** The existing rule is a blanket suppression. A comparison request ("help me decide between X and Y") is implicitly a request for decision-relevant information — including price.

**How to avoid:** The comparison rule must explicitly state that price is part of comparison output. Wording: "When comparing items at the user's request, include price as part of the comparison."

**Warning signs:** Claude's comparison responses omit price even when user is explicitly trying to decide between items.

### Pitfall 3: "Would you like help narrowing it down?" Triggers Too Early or Never

**What goes wrong:** The proactive narrowing trigger ("after 3+ turns discussing items") is a behavioral heuristic. If the system prompt wording is too vague, Claude may never trigger it, or may trigger it after every single turn.

**Why it happens:** Claude counts turns conservatively when the instruction is ambiguous. "3+ turns" needs to be phrased as a recognizable behavioral trigger, not a mechanical count.

**How to avoid:** Phrase as: "If the conversation has included 3 or more exchanges about specific menu items, naturally offer to help the user narrow down or decide." The word "exchanges" (not "turns") signals back-and-forth about items specifically, not just any turn.

**Warning signs:** In manual testing, the narrowing prompt either never appears or appears on the second response.

### Pitfall 4: "I Can't Decide" Response Gives Multiple Options Instead of One

**What goes wrong:** Claude's default helpfulness bias makes it want to provide options. For a user who says "I can't decide," being given more options is unhelpful.

**Why it happens:** Without an explicit instruction, Claude defaults to balanced, option-presenting responses.

**How to avoid:** The "can't decide" rule must explicitly say "give ONE clear recommendation." Single-item recommendation with brief reasoning is the correct behavior.

**Warning signs:** "I can't decide" responses end with "so you could go with either" or present multiple options.

---

## Code Examples

Verified patterns from existing codebase and official docs:

### Proposed System Prompt Rule Additions (Claude's Discretion per CONTEXT.md)

The following rules implement all three locked requirements. Exact wording is Claude's discretion per CONTEXT.md — these are the recommended additions to the existing RESPONSE RULES block in `buildSystemPrompt()`:

```typescript
// Source: recommended additions to src/lib/chat-prompt.ts

// After existing rules, append:

`- For recommendations ("something light", "what's popular", "what should I get"): ask one clarifying question if the preference is very broad, then suggest 2-3 items with name and one-line description. Draw on items that stand out for their description, preparation style, or being featured — present them naturally without disclaiming lack of popularity data.
- Let the conversation shape later recommendations: if the user showed interest in a category or flavor profile earlier, lean toward similar items when suggesting.
- When the user refers to "the first one", "that second dish", or other position references, resolve them from your prior responses in this conversation.
- When comparing items at the user's request, describe each item in one sentence covering key differences (preparation, key ingredients), then include price. Use a contrastive structure: "The [item A] is [description], at $X. The [item B] is [description], at $Y." Keep comparisons to 2-3 items maximum.
- If the conversation has included 3 or more exchanges about specific menu items, naturally offer: "Would you like help narrowing it down?"
- When asked to help decide or compare, end with a clear recommendation: "Based on what you've mentioned, I'd suggest the [item] because [brief reason]."
- If the user says they can't decide, ask one question about mood or hunger level, then give a single clear recommendation — not multiple options.`
```

### Existing Test Pattern to Follow

```typescript
// Source: src/lib/__tests__/chat-prompt.test.ts (existing — follow this pattern)
it('includes the "3 sentences" constraint', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('3 sentences');
});

// New tests follow same pattern — assert on concept keyword, not full sentence:
it('includes the recommendation clarifying question rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('clarifying question');
});

it('includes the ordinal reference resolution rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('prior responses');
});

it('includes the contrastive comparison format rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('comparing items');
});

it('includes the proactive narrowing trigger rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('narrowing it down');
});

it('includes the clear final recommendation rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain("I'd suggest");
});

it('includes the single-recommendation rule for undecided users', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain("can't decide");
});

it('includes price in comparison rule', () => {
  const prompt = buildSystemPrompt(testMenu);
  expect(prompt).toContain('price');
  // Verify the new rule references comparison + price together
  expect(prompt).toMatch(/compar.*price|price.*compar/is);
});
```

### Verifying Full Test Suite After Change

```bash
# Quick run — chat-prompt tests only (~7s)
npx vitest run src/lib/__tests__/chat-prompt.test.ts

# Full suite — all 181 tests, verify nothing regressed (~25s)
npx vitest run
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Separate "recommendation intent detection" logic in app code | System prompt rules handle recommendation behavior natively | No app code needed; Claude infers intent from natural speech |
| Session-level context stored separately (Redux, Zustand) | Full message array passed per call (stateless API) | Simpler architecture; conversation history is the source of truth |
| Multi-step API calls for comparison (extract items, then compare) | Single call with full history + comparison rule | Lower latency; one streaming response covers the full comparison |

**Deprecated/outdated:**
- Prefilled assistant responses: Deprecated in Claude 4.6 models per official docs. The `api/chat/route.ts` does not use prefills; this is already the correct approach.

---

## Open Questions

1. **How many conversation turns until context limit is a concern?**
   - What we know: Locked decision says "keep all messages for v1 — 10-20 turns." `claude-sonnet-4-6` has a 200K token context window. With max_tokens=512 per response and ~3-5K for the menu system prompt, 20 turns uses roughly 15K tokens — well under the limit.
   - What's unclear: No concern. Context window is not a bottleneck for v1 sessions.
   - Recommendation: No action needed. This is confirmed safe.

2. **Should `max_tokens: 512` be increased for comparison responses?**
   - What we know: Comparisons of 2-3 items with descriptions and prices fit comfortably in ~150-200 tokens. The 512 cap is generous.
   - What's unclear: Nothing material.
   - Recommendation: No change needed. 512 is sufficient.

3. **Can "3+ turns discussing specific items" be reliably triggered via prompt instruction?**
   - What we know: Official docs confirm Claude follows natural-language behavioral instructions well when phrased clearly.
   - What's unclear: Exact reliability in practice — this is behavioral, not deterministic.
   - Recommendation: Write the rule clearly (see Pitfall 3), then validate manually in the browser during verification. The unit test only validates rule presence, not Claude's execution of the rule.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies beyond the existing project stack. All required tools (`node`, `npx`, Anthropic API) are already operational from Phase 3.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONV-03 | Recommendation clarifying question rule present in system prompt | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-03 | Conversation interest carry-forward rule present | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-04 | Ordinal reference resolution rule present in system prompt | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-05 | Contrastive comparison format rule present | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-05 | Proactive narrowing trigger rule present | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-05 | Clear final recommendation rule present | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-05 | Single-recommendation "can't decide" rule present | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ (extend existing) |
| CONV-04 | Existing multi-turn history infrastructure unbroken | unit | `npx vitest run src/hooks/__tests__/useVoiceLoop.test.ts` | ✅ (no changes, just verify) |

**Note on CONV-04 mechanics:** The full conversation history already flows to Claude on every turn via `messagesRef` — this was completed in Phase 3. Phase 4 adds only the system prompt rule that tells Claude to use that history for reference resolution. The test validates rule presence; the live behavior is validated manually in the browser.

**Note on behavioral tests:** CONV-03, CONV-04, CONV-05 behaviors (Claude actually giving the right recommendation, resolving references, comparing correctly) cannot be tested in unit tests without a live Claude API call. These are validated manually during the phase verification step.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/chat-prompt.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (all 181+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The single file to modify (`chat-prompt.test.ts`) already exists with the correct structure and imports.

---

## Sources

### Primary (HIGH confidence)
- `platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts` — system prompt best practices, verified March 2026; confirms natural-language directives, motivation-behind-instructions pattern, few-shot examples approach
- `src/lib/chat-prompt.ts` — existing system prompt structure; direct read of codebase
- `src/lib/__tests__/chat-prompt.test.ts` — established test pattern; direct read of codebase
- `src/hooks/useVoiceLoop.ts` — confirmed `messagesRef` accumulates full history; direct read
- `src/app/api/chat/route.ts` — confirmed `messages` array passed to Claude on every call; direct read

### Secondary (MEDIUM confidence)
- Anthropic prompt engineering docs (multi-turn conversation management section): confirms stateless API requires full message array per call; role alternation rules; session memory patterns — fetched from official docs March 2026

### Tertiary (LOW confidence)
- None — all critical claims verified with official sources or direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing stack verified in codebase
- Architecture: HIGH — primary change is `buildSystemPrompt()` addition; confirmed by reading all relevant source files
- Pitfalls: HIGH — derived from existing code patterns, official docs guidance on Claude instruction following, and known voice UI constraints
- Test strategy: HIGH — follows established project test pattern exactly

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (system prompt engineering patterns are stable; Anthropic API surface is stable)
