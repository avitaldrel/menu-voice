# Phase 4: Smart Conversation & Decision Support - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the conversation system so Claude provides intelligent recommendations, maintains multi-turn context awareness, and actively helps the user decide what to order. This is primarily a system prompt engineering phase — the streaming/history infrastructure from Phase 3 already handles conversation mechanics (CONV-04 partially satisfied). Phase 4 focuses on conversation quality and decision support behavior.

</domain>

<decisions>
## Implementation Decisions

### Recommendation Behavior
- "What's popular?" handled by suggesting items with rich descriptions, chef's specials, or highlighted items — Claude explains naturally these "stand out" rather than disclaiming lack of popularity data
- Ambiguous preferences ("something light") → ask one clarifying question, then suggest 2-3 items
- Recommendations reflect prior conversation interest — if user asked about pasta, weight later recs toward similar flavors
- 2-3 items per recommendation with brief descriptions, consistent with existing 5-item max listing rule

### Comparison & Decision Support
- Contrastive comparison format for voice: "The salmon is grilled while the chicken is breaded — salmon is $18, chicken is $14" — covers key differences in one pass
- Proactively offer to help decide after 3+ turns discussing items: "Would you like help narrowing it down?"
- Final decision support states a clear recommendation with reasoning: "Based on what you've been interested in, I'd suggest the..."
- "I can't decide" → ask about mood/hunger level, then give ONE clear recommendation

### Conversation Memory & Scope
- Keep all messages for v1 — restaurant sessions are short (10-20 turns), context window handles it
- Clear conversation history when a new menu is scanned — fresh context per restaurant visit
- No "start over" voice command in this phase — conversation naturally resets with new overview
- Phase is primarily system prompt enhancement + tests — existing streaming/history infrastructure from Phase 3 handles CONV-04 mechanics

### Claude's Discretion
- Exact wording of system prompt additions for recommendation/comparison behavior
- Test case design for verifying conversation quality programmatically

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/chat-prompt.ts` — `buildSystemPrompt(menu)` is the primary target for enhancement; already has persona and response rules
- `src/hooks/useVoiceLoop.ts` — `messagesRef` accumulates full conversation history across turns; `triggerResponse()` handles streaming
- `src/app/api/chat/route.ts` — Streaming POST endpoint with `claude-sonnet-4-6`, `max_tokens: 512`

### Established Patterns
- System prompt uses natural language rules (not structured JSON instructions)
- Response rules are concise directives: "Keep answers under 3 sentences", "List max 5 items"
- Voice-optimized: no markdown, no bullet characters, no special symbols
- Prices mentioned only when asked

### Integration Points
- `buildSystemPrompt()` is the single injection point for all conversation behavior
- `messagesRef.current` in `useVoiceLoop` — conversation history already flows to Claude on every turn
- New menu scan triggers `triggerOverview()` which resets `messagesRef` — natural conversation boundary

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for system prompt enhancement.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
